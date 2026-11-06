package notify

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"math/rand/v2"
	"slices"
	"time"
)

// Service runs the pipeline: Plan fills the queue, Drain empties it (docs/design/notifications.md §3).
type Service struct {
	Policy   Policy
	Render   *Renderer
	Queue    Queue
	Store    Store
	Channels map[string]Channel // by name; a channel left out is switched off
	Tokens   Tokens
	Site     string // https://99ile.pages.dev
	Daily    Daily
	EmailCap int // emails in a rolling day, across every run
	Log      *slog.Logger
	Now      func() time.Time
}

func (s *Service) now() time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

// Plan asks the rules about every student with reminders on and queues what they say. With dry set it only
// counts and renders, so a new deployment can be watched for a week before anything is sent.
func (s *Service) Plan(ctx context.Context, dry bool) (planned, queued int, err error) {
	now := s.now()
	students, err := s.Store.Students(ctx, nil, now)
	if err != nil {
		return 0, 0, err
	}
	var ids []string
	for _, f := range students {
		ids = append(ids, f.Identity)
	}
	last, err := s.Store.LastVariants(ctx, ids)
	if err != nil {
		return 0, 0, err
	}
	var ms []Planned
	for _, f := range students {
		for _, in := range s.Policy.Decide(f.Student, now) {
			v := Vars{Name: f.Name, Streak: in.Streak, Missed: in.Missed}
			task := s.Daily.Task(in.Day)
			v.Task = &task
			variant := s.Render.NextVariant(in.Kind, last[[2]string{f.Identity, in.Kind}])
			if _, err := s.Render.Render(in.Kind, variant, v, Links{Site: s.Site}); err != nil {
				return len(ms), 0, fmt.Errorf("%s for %s: %w", in.Kind, f.Identity, err) // a wording that cannot render stops the run
			}
			ms = append(ms, Planned{Identity: f.Identity, Kind: in.Kind, Channel: in.Channel, Key: in.Key, Variant: variant, Vars: v, Priority: in.Priority, RunAt: now})
		}
	}
	if dry {
		for _, m := range ms {
			s.Log.Info("would queue", "kind", m.Kind, "channel", m.Channel, "variant", m.Variant)
		}
		return len(ms), 0, nil
	}
	queued, err = s.Queue.Enqueue(ctx, ms)
	return len(ms), queued, err
}

// Counts is one drain's outcome, for the run's log.
type Counts struct {
	Sent, Skipped, Failed, Retried, Dead, Released int
	Skips                                          map[string]int
}

// backoff is the wait before each retry; after the last, a message is dead.
var backoff = []time.Duration{time.Minute, 5 * time.Minute, 30 * time.Minute}

// Drain claims due messages until none are left or the deadline passes. Each is checked against the rules again
// just before it goes, so a student who practised, paused or turned email off in the meantime gets nothing.
func (s *Service) Drain(ctx context.Context, until time.Time) (Counts, error) {
	c := Counts{Skips: map[string]int{}}
	sentEmails, err := s.Store.EmailsSince(ctx, s.now().Add(-24*time.Hour))
	if err != nil {
		return c, err
	}
	failsInARow, lastErr := map[string]int{}, map[string]error{}
	const breaker = 5
	for s.now().Before(until) {
		batch, err := s.Queue.Claim(ctx, 50, 2*time.Minute)
		if err != nil {
			return c, err
		}
		if len(batch) == 0 {
			break
		}
		for _, m := range batch {
			if ctx.Err() != nil || !s.now().Before(until) {
				_ = s.Queue.Release(ctx, m.ID, s.now()) // its turn comes in the next run
				c.Released++
				continue
			}
			ch, on := s.Channels[m.Channel]
			if on && failsInARow[m.Channel] >= breaker {
				_ = s.Queue.Release(ctx, m.ID, s.now().Add(15*time.Minute))
				c.Released++
				continue
			}
			skip := func(why string) {
				c.Skipped++
				c.Skips[why]++
				if err := s.Queue.Finish(ctx, m.ID, "skipped", why); err != nil {
					s.Log.Error("finish", "id", m.ID, "error", err)
				}
			}
			switch {
			case !on:
				skip("channel off")
				continue
			case s.now().Sub(m.CreatedAt) > time.Duration(s.Policy.StaleAfterHours)*time.Hour:
				skip("stale")
				continue
			case m.Channel == Email && sentEmails >= s.EmailCap:
				skip("email cap")
				continue
			}
			facts, err := s.Store.Students(ctx, []string{m.Identity}, s.now())
			if err != nil {
				return c, err
			}
			if len(facts) == 0 {
				skip("reminders off")
				continue
			}
			f := facts[0]
			if !slices.ContainsFunc(s.Policy.Decide(f.Student, s.now()), func(in Intent) bool { return in.Kind == m.Kind && in.Channel == m.Channel }) {
				skip("no longer due")
				continue
			}
			out := Out{ID: m.ID, Identity: m.Identity, Kind: m.Kind, To: f.Email}
			if m.Channel == Push {
				if out.Subs, err = s.Store.Subs(ctx, m.Identity); err != nil {
					return c, err
				}
			}
			out.Rendered, err = s.Render.Render(m.Kind, m.Variant, m.Vars, Links{Site: s.Site, MessageID: m.ID, Token: s.Tokens.Make(m.Identity, ScopeOf(m.Kind))})
			if err != nil {
				c.Failed++
				_ = s.Queue.Finish(ctx, m.ID, "failed", err.Error())
				continue
			}
			res, sendErr := ch.Send(ctx, out)
			if m.Channel == Push {
				if err := s.Store.PushResult(ctx, m.Identity, res.Gone, sendErr == nil); err != nil {
					s.Log.Error("push result", "error", err)
				}
			}
			if res.Bounced {
				if err := s.Store.Bounced(ctx, m.Identity); err != nil {
					s.Log.Error("bounced", "error", err)
				}
			}
			switch {
			case sendErr == nil:
				failsInARow[m.Channel] = 0
				c.Sent++
				if m.Channel == Email {
					sentEmails++
				}
				err = s.Queue.Finish(ctx, m.ID, "sent", "")
			case IsPermanent(sendErr):
				c.Failed++
				err = s.Queue.Finish(ctx, m.ID, "failed", sendErr.Error())
			case m.Attempts > len(backoff):
				failsInARow[m.Channel]++
				c.Dead++
				err = s.Queue.Finish(ctx, m.ID, "dead", sendErr.Error())
			default:
				failsInARow[m.Channel]++
				c.Retried++
				wait := backoff[m.Attempts-1]
				wait += time.Duration(rand.Int64N(int64(wait / 5))) // jitter, so retries do not arrive together
				err = s.Queue.Retry(ctx, m.ID, s.now().Add(wait), sendErr.Error())
			}
			if err != nil {
				return c, err
			}
			if sendErr != nil {
				lastErr[m.Channel] = sendErr
				s.Log.Warn("reminder not sent", "id", m.ID, "kind", m.Kind, "channel", m.Channel, "attempt", m.Attempts, "permanent", IsPermanent(sendErr), "error", sendErr)
			}
			if failsInARow[m.Channel] == breaker {
				s.Log.Error("channel paused for this run after failures in a row", "channel", m.Channel, "last_error", sendErr)
			}
		}
	}
	for ch, n := range failsInARow {
		if n >= breaker {
			return c, fmt.Errorf("%w: %s: %v", ErrBreaker, ch, lastErr[ch])
		}
	}
	return c, nil
}

// ErrBreaker is returned by a run that paused a channel, so the job fails visibly and the owner is told.
var ErrBreaker = errors.New("a channel was paused after failures in a row")
