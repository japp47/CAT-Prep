package notify

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"sync"
	"time"
)

// Worker runs the pipeline inside the API, on a clock (D91, docs/design/notifications.md §7): every Every it plans
// and sends what is due. The API is always on, so a reminder set for 7:30 goes out by about 7:32. Any number of
// workers may run at once (the queue's SKIP LOCKED and the dedupe keys keep each message to one send), so a second
// instance, a deploy that overlaps the old one, or the manual GitHub job never sends twice.
type Worker struct {
	Service *Service
	Every   time.Duration // 2 minutes
	Dry     bool
	// Alert tells the team when a channel is paused (an email to 99ile.team), at most once per AlertGap.
	Alert    func(ctx context.Context, subject, body string) error
	AlertGap time.Duration
	// DailyFrom fetches the site's daily.json (the day's RC) every hour; nil leaves Service.Daily as it is.
	DailyFrom func(ctx context.Context) (Daily, error)
	// Bounces reads the team inbox's bounce label once an hour (R2, §15.2); nil when email is not on Gmail's API.
	Bounces *BounceReader
	Log     *slog.Logger

	alerted      time.Time
	fetched      time.Time
	forgot       time.Time
	bounced      time.Time
	bounceWarned time.Time
}

// Run ticks until ctx ends; a tick in progress finishes its message first. done is closed on return.
func (w *Worker) Run(ctx context.Context, done *sync.WaitGroup) {
	defer done.Done()
	t := time.NewTicker(w.Every)
	defer t.Stop()
	w.Log.Info("reminder worker started", "every", w.Every.String(), "dry", w.Dry)
	for {
		w.Tick(ctx)
		select {
		case <-ctx.Done():
			w.Log.Info("reminder worker stopped")
			return
		case <-t.C:
		}
	}
}

// Tick is one pass: fresh daily.json once an hour, plan, send for up to most of a period, forget old rows once a day.
func (w *Worker) Tick(ctx context.Context) {
	s := w.Service
	now := s.now()
	if w.DailyFrom != nil && now.Sub(w.fetched) >= time.Hour {
		if d, err := w.DailyFrom(ctx); err == nil {
			s.Daily, w.fetched = d, now
		} else {
			w.Log.Warn("no daily.json; messages point at Today", "error", err)
			w.fetched = now.Add(-50 * time.Minute) // try again in ten minutes
		}
	}
	planned, queued, err := s.Plan(ctx, w.Dry)
	if err != nil {
		w.Log.Error("reminders: plan", "error", err)
		return
	}
	if w.Dry {
		if planned > 0 {
			w.Log.Info("reminders: dry run, nothing queued", "would_queue", planned)
		}
		return
	}
	c, err := s.Drain(ctx, now.Add(w.Every*3/4))
	// Gmail drops a connection left idle between passes; each pass logs in afresh.
	for _, ch := range s.Channels {
		if cl, ok := ch.(interface{ Close() }); ok {
			cl.Close()
		}
	}
	if queued+c.Sent+c.Skipped+c.Failed+c.Retried+c.Dead > 0 {
		w.Log.Info("reminders", "queued", queued, "sent", c.Sent, "skipped", c.Skipped, "skips", c.Skips, "failed", c.Failed, "retried", c.Retried, "dead", c.Dead)
	}
	if errors.Is(err, ErrBreaker) {
		w.alert(ctx, err)
	} else if err != nil && ctx.Err() == nil {
		w.Log.Error("reminders: send", "error", err)
	}
	if now.Sub(w.forgot) >= 24*time.Hour {
		if n, err := s.Store.Forget(ctx, s.Policy.KeepMessagesDays); err != nil {
			w.Log.Warn("reminders: forget old messages", "error", err)
		} else {
			w.forgot = now
			if n > 0 {
				w.Log.Info("reminders: forgot old messages", "rows", n)
			}
		}
		if n, err := s.Store.ForgetOld(ctx); err != nil {
			w.Log.Warn("reminders: forget old weeks and bounces", "error", err)
		} else if n > 0 {
			w.Log.Info("reminders: forgot old practice days, weeks and bounces", "rows", n)
		}
	}
	if w.Bounces != nil && !w.Dry && now.Sub(w.bounced) >= time.Hour {
		w.bounced = now
		w.checkBounces(ctx)
	}
}

// checkBounces marks the students whose address a new bounce names. A token without the header scope or a missing
// label is said once a day in the log, and sending carries on regardless.
func (w *Worker) checkBounces(ctx context.Context) {
	s := w.Service
	got, err := w.Bounces.Read(ctx, s.Store.SeenBounces)
	marked := 0
	for _, b := range got {
		n, e := s.Store.RecordBounce(ctx, b)
		if e != nil {
			err = errors.Join(err, e)
			break
		}
		marked += n
	}
	if len(got) > 0 {
		w.Log.Info("reminders: bounces read", "new", len(got), "students_marked", marked)
	}
	if err == nil {
		return
	}
	if errors.Is(err, ErrBounceScope) || errors.Is(err, ErrNoBounceLabel) {
		if time.Since(w.bounceWarned) >= 24*time.Hour {
			w.bounceWarned = time.Now()
			w.Log.Warn("reminders: bounce check is off", "why", err.Error())
		}
		return
	}
	w.Log.Warn("reminders: bounce check", "error", err)
}

func (w *Worker) alert(ctx context.Context, err error) {
	w.Log.Error("reminders: channel paused", "error", err)
	if w.Alert == nil || time.Since(w.alerted) < w.AlertGap {
		return
	}
	w.alerted = time.Now()
	body := "A reminder channel failed five times in a row and is paused until the next pass:\n\n" + err.Error() +
		"\n\nCheck the API's logs on Render and server/README.md (Study reminders). The other channel keeps sending." +
		"\nThis email is sent at most every few hours while the problem lasts."
	if e := w.Alert(ctx, "99ile: reminders need attention", body); e != nil {
		w.Log.Error("reminders: alert email", "error", e)
	}
}

// SiteDaily reads site + /daily.json, for Worker.DailyFrom.
func SiteDaily(site string) func(ctx context.Context) (Daily, error) {
	client := &http.Client{Timeout: 15 * time.Second}
	return func(ctx context.Context) (Daily, error) { return FetchDaily(ctx, client, site) }
}
