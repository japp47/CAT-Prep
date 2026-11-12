package admin

import (
	"errors"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/japp47/CAT-Prep/server/internal/audit"
	"github.com/japp47/CAT-Prep/server/internal/httpx"
	"github.com/japp47/CAT-Prep/server/internal/notify"
)

// The owner's Reminders panel (F65 R2, D97, docs/design/notifications.md §15.3): counts only, as everywhere in admin
// (D14), and two actions: send yourself any wording with sample data, and mark an address bounced when Google's
// bounce did not name it.

// ReminderSetup is how this server's reminders are set up, for the panel's first line.
type ReminderSetup struct {
	Worker      bool `json:"worker"`      // the job runs in this API (NOTIFY_WORKER=1)
	Dry         bool `json:"dry"`         // plans and renders, sends nothing
	Email       bool `json:"email"`       // an email channel is on
	Push        bool `json:"push"`        // a push channel is on
	BounceCheck bool `json:"bounceCheck"` // bounces are read from the team inbox
	EmailCap    int  `json:"emailCap"`    // emails in a rolling day
}

// WithReminders gives the panel its setup and, where email or push is on, the test sender.
func (s *Service) WithReminders(set ReminderSetup, t *notify.Tester) *Service {
	s.remSetup, s.tester = set, t
	return s
}

// ReminderStats is the panel: the setup, who has what switched on, and the last 14 days of messages, as counts.
type ReminderStats struct {
	Setup         ReminderSetup `json:"setup"`
	EmailsLastDay int64         `json:"emailsLastDay"`
	Students      struct {
		RemindersOn int64 `json:"remindersOn"`
		WeeklyOn    int64 `json:"weeklyOn"`
		EmailOn     int64 `json:"emailOn"`
		PushDevices int64 `json:"pushDevices"`
		Bounced     int64 `json:"bounced"`
		Paused      int64 `json:"paused"`
	} `json:"students"`
	Kinds []struct {
		Kind      string `json:"kind"`
		Channel   string `json:"channel"`
		Sent      int64  `json:"sent"`
		Skipped   int64  `json:"skipped"`
		Failed    int64  `json:"failed"`
		Practised int64  `json:"practised"` // practice within two hours of a sent message
	} `json:"kinds"`
	Days []struct {
		Day  string `json:"day"`
		Sent int64  `json:"sent"`
	} `json:"days"`
	Skips []struct {
		Reason string `json:"reason"`
		N      int64  `json:"n"`
	} `json:"skips"`
	Bounces struct {
		Read    int64 `json:"read"`
		Matched int64 `json:"matched"`
	} `json:"bounces"`
	Unsubscribes struct {
		Reminders int64 `json:"reminders"`
		Weekly    int64 `json:"weekly"`
	} `json:"unsubscribes"`
	// Wordings are what "Send me a test" can send, by kind; empty when nothing can be sent from this server.
	Wordings []struct {
		Kind string   `json:"kind"`
		IDs  []string `json:"ids"`
	} `json:"wordings"`
}

// RemindersHandler is GET /v1/admin/reminders.
func (s *Service) RemindersHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		st := ReminderStats{Setup: s.remSetup, Kinds: nil}
		err := s.db.QueryRow(ctx, `select
			(select count(*) from notify.messages where channel = 'email' and status = 'sent' and sent_at > now() - interval '1 day'),
			(select count(*) from notify.prefs where enabled),
			(select count(*) from notify.prefs where enabled and weekly),
			(select count(*) from notify.prefs where enabled and email_mode <> 'off'),
			(select count(*) from notify.push_subs),
			(select count(*) from notify.prefs where email_state = 'bounced'),
			(select count(*) from notify.prefs where enabled and paused_until > now()),
			(select count(*) from notify.bounces where seen_at > now() - interval '30 days'),
			(select count(*) from notify.bounces where matched and seen_at > now() - interval '30 days'),
			(select coalesce(sum(n), 0) from notify.unsubscribes where scope = 'reminders' and day > current_date - 14),
			(select coalesce(sum(n), 0) from notify.unsubscribes where scope = 'weekly' and day > current_date - 14)`).Scan(
			&st.EmailsLastDay, &st.Students.RemindersOn, &st.Students.WeeklyOn, &st.Students.EmailOn, &st.Students.PushDevices,
			&st.Students.Bounced, &st.Students.Paused, &st.Bounces.Read, &st.Bounces.Matched, &st.Unsubscribes.Reminders, &st.Unsubscribes.Weekly)
		if err != nil {
			s.fail(w, r, err)
			return
		}
		rows, err := s.db.Query(ctx, `select kind, channel, count(*) filter (where status = 'sent'), count(*) filter (where status = 'skipped'),
				count(*) filter (where status in ('failed', 'dead')), count(*) filter (where status = 'sent' and practised_at is not null)
			from notify.messages where created_at > now() - interval '14 days' group by kind, channel order by kind, channel`)
		if err == nil {
			err = collect(rows, &st.Kinds, func(row pgx.CollectableRow, k *struct {
				Kind      string `json:"kind"`
				Channel   string `json:"channel"`
				Sent      int64  `json:"sent"`
				Skipped   int64  `json:"skipped"`
				Failed    int64  `json:"failed"`
				Practised int64  `json:"practised"`
			}) error {
				return row.Scan(&k.Kind, &k.Channel, &k.Sent, &k.Skipped, &k.Failed, &k.Practised)
			})
		}
		if err == nil {
			rows, err = s.db.Query(ctx, `select to_char(d, 'YYYY-MM-DD'), (select count(*) from notify.messages m where m.status = 'sent' and m.sent_at::date = d)
				from generate_series(current_date - 13, current_date, interval '1 day') d order by d`)
			if err == nil {
				err = collect(rows, &st.Days, func(row pgx.CollectableRow, d *struct {
					Day  string `json:"day"`
					Sent int64  `json:"sent"`
				}) error {
					return row.Scan(&d.Day, &d.Sent)
				})
			}
		}
		if err == nil {
			rows, err = s.db.Query(ctx, `select reason, count(*) from notify.messages where status = 'skipped' and created_at > now() - interval '14 days'
				group by reason order by count(*) desc, reason limit 6`)
			if err == nil {
				err = collect(rows, &st.Skips, func(row pgx.CollectableRow, k *struct {
					Reason string `json:"reason"`
					N      int64  `json:"n"`
				}) error {
					return row.Scan(&k.Reason, &k.N)
				})
			}
		}
		if err != nil {
			s.fail(w, r, err)
			return
		}
		if s.tester != nil {
			for _, kind := range s.tester.Render.Kinds() {
				st.Wordings = append(st.Wordings, struct {
					Kind string   `json:"kind"`
					IDs  []string `json:"ids"`
				}{kind, s.tester.Render.Variants(kind)})
			}
		}
		httpx.WriteJSON(w, http.StatusOK, st)
	})
}

// collect scans every row into a new element of out.
func collect[T any](rows pgx.Rows, out *[]T, scan func(pgx.CollectableRow, *T) error) error {
	got, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (T, error) {
		var t T
		return t, scan(row, &t)
	})
	*out = append((*out)[:0], got...)
	return err
}

// RemindersTestHandler is POST /v1/admin/reminders/test with {kind, id}: that wording, with sample data, to the
// staff member's own address and devices. At most ten an hour each; audited.
func (s *Service) RemindersTestHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var b struct {
			Kind string `json:"kind"`
			ID   string `json:"id"`
		}
		if !httpx.DecodeJSON(w, r, &b, false) {
			return
		}
		if s.tester == nil {
			httpx.WriteError(w, http.StatusServiceUnavailable, "reminders_off", "Neither email nor push is set up on this server, so a test cannot be sent.")
			return
		}
		st := from(r.Context())
		if ok, _ := s.tests.Allow(st.UserID); !ok {
			httpx.WriteError(w, http.StatusTooManyRequests, "rate_limited", "That is ten tests in an hour. Try again later.")
			return
		}
		reached, err := s.tester.Send(r.Context(), b.Kind, b.ID, st.Device.IdentityID, st.Email)
		if errors.Is(err, notify.ErrNoWording) {
			httpx.WriteError(w, http.StatusBadRequest, "bad_request", "There is no such wording.")
			return
		}
		if err := audit.Write(r.Context(), s.db, s.event(r, st, "reminders.test_sent", "wording", b.ID,
			map[string]any{"kind": b.Kind, "channels": reached, "ok": err == nil})); err != nil {
			s.log.Warn("audit", "error", err)
		}
		if err != nil && len(reached) == 0 {
			s.log.Warn("reminder test", "error", err)
			httpx.WriteError(w, http.StatusBadGateway, "not_sent", "The test was not sent: "+err.Error())
			return
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"channels": reached, "to": st.Email})
	})
}

// RemindersBouncedHandler is POST /v1/admin/reminders/bounced with {email}: the fallback when a bounce did not name
// the address. Email stops for that student until they turn it on again. Audited with the count, not the address.
func (s *Service) RemindersBouncedHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var b struct {
			Email string `json:"email"`
		}
		if !httpx.DecodeJSON(w, r, &b, false) {
			return
		}
		addr := strings.TrimSpace(b.Email)
		if len(addr) < 3 || len(addr) > 254 || !strings.Contains(addr, "@") {
			httpx.WriteError(w, http.StatusBadRequest, "bad_request", "Type the email address that bounced.")
			return
		}
		marked, err := notify.Store{DB: s.db}.MarkBounced(r.Context(), addr)
		if err != nil {
			s.fail(w, r, err)
			return
		}
		if err := audit.Write(r.Context(), s.db, s.event(r, from(r.Context()), "reminders.bounce_marked", "", "", map[string]any{"marked": marked})); err != nil {
			s.log.Warn("audit", "error", err)
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"marked": marked})
	})
}
