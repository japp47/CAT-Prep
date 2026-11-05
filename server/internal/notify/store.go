package notify

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Facts is a student as the rules see them, plus what a message needs to reach them.
type Facts struct {
	Student
	Email string // verified address, "" without one
	Name  string // first name from Google, "" without one
}

// Store reads and writes what the planner and worker need, apart from the queue.
type Store struct{ DB *pgxpool.Pool }

// Students loads every student with reminders on (ids nil), or just these ones, as of now. Day boundaries are
// worked out in each student's own time zone; a zone Go does not know leaves Loc nil, so the rules send nothing.
func (s Store) Students(ctx context.Context, ids []string, now time.Time) ([]Facts, error) {
	rows, err := s.DB.Query(ctx, `
		select p.identity_id, p.enabled, p.at_minute, p.days, p.tz, p.quiet_from, p.quiet_to, p.email_mode,
			p.paused_until, p.enabled_at, p.email_state = 'ok' and coalesce(u.email_verified, false),
			coalesce(u.email, ''), coalesce(u.display_name, ''),
			coalesce(to_char(a.last_day, 'YYYY-MM-DD'), ''), coalesce(a.streak, 0),
			(select count(*) from notify.push_subs x where x.identity_id = p.identity_id),
			coalesce((select m.kind from notify.messages m where m.identity_id = p.identity_id and m.status = 'sent'
				and (m.sent_at at time zone p.tz)::date = ($2::timestamptz at time zone p.tz)::date order by m.sent_at desc limit 1), ''),
			(select max(m.sent_at) from notify.messages m where m.identity_id = p.identity_id and m.status = 'sent'
				and (m.sent_at at time zone p.tz)::date < ($2::timestamptz at time zone p.tz)::date),
			(select count(*) from notify.messages m where m.identity_id = p.identity_id and m.channel = 'email' and m.status = 'sent'
				and m.sent_at > $2::timestamptz - interval '7 days')
		from notify.prefs p
		join account.identities i on i.id = p.identity_id and i.status = 'active'
		left join account.users u on u.identity_id = p.identity_id
		left join notify.activity a on a.identity_id = p.identity_id
		where p.enabled and ($1::uuid[] is null or p.identity_id = any($1::uuid[]))`, ids, now)
	if err != nil {
		return nil, fmt.Errorf("load students: %w", err)
	}
	return pgx.CollectRows(rows, func(r pgx.CollectableRow) (Facts, error) {
		var f Facts
		var tz string
		var paused, enabledAt, lastBefore *time.Time
		err := r.Scan(&f.Identity, &f.Enabled, &f.At, &f.Days, &tz, &f.QuietFrom, &f.QuietTo, &f.EmailMode,
			&paused, &enabledAt, &f.EmailOK, &f.Email, &f.Name, &f.LastDay, &f.Streak, &f.PushDevices,
			&f.SentTodayKind, &lastBefore, &f.EmailsThisWeek)
		for _, x := range []struct {
			from *time.Time
			to   *time.Time
		}{{paused, &f.PausedUntil}, {enabledAt, &f.EnabledAt}, {lastBefore, &f.LastSentBefore}} {
			if x.from != nil {
				*x.to = *x.from
			}
		}
		if loc, e := time.LoadLocation(tz); e == nil {
			f.Loc = loc
		}
		if f.Email == "" {
			f.EmailOK = false
		}
		f.Name, _, _ = strings.Cut(strings.TrimSpace(f.Name), " ")
		return f, err
	})
}

// LastVariants is the wording each student got last, per kind, so the next one differs.
func (s Store) LastVariants(ctx context.Context, ids []string) (map[[2]string]string, error) {
	rows, err := s.DB.Query(ctx, `
		select distinct on (identity_id, kind) identity_id, kind, variant from notify.messages
		where identity_id = any($1::uuid[]) and status in ('queued', 'working', 'sent')
		order by identity_id, kind, created_at desc`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[[2]string]string{}
	for rows.Next() {
		var id, kind, v string
		if err := rows.Scan(&id, &kind, &v); err != nil {
			return nil, err
		}
		out[[2]string{id, kind}] = v
	}
	return out, rows.Err()
}

// Subs is every push subscription of a student.
func (s Store) Subs(ctx context.Context, identity string) ([]Subscription, error) {
	rows, err := s.DB.Query(ctx, `select endpoint, p256dh, auth from notify.push_subs where identity_id = $1`, identity)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(r pgx.CollectableRow) (Subscription, error) {
		var x Subscription
		return x, r.Scan(&x.Endpoint, &x.P256dh, &x.Auth)
	})
}

// PushResult records a push: gone endpoints are removed; the rest of the student's devices are marked working.
func (s Store) PushResult(ctx context.Context, identity string, gone []string, ok bool) error {
	if len(gone) > 0 {
		if _, err := s.DB.Exec(ctx, `delete from notify.push_subs where endpoint = any($1)`, gone); err != nil {
			return err
		}
	}
	if ok {
		_, err := s.DB.Exec(ctx, `update notify.push_subs set last_ok_at = now(), failures = 0 where identity_id = $1`, identity)
		return err
	}
	return nil
}

// Bounced stops email for a student whose address was refused; Settings says so until they turn email on again.
func (s Store) Bounced(ctx context.Context, identity string) error {
	_, err := s.DB.Exec(ctx, `update notify.prefs set email_state = 'bounced' where identity_id = $1`, identity)
	return err
}

// EmailsSince counts emails sent since a time: the Gmail budget (a rolling day).
func (s Store) EmailsSince(ctx context.Context, since time.Time) (int, error) {
	var n int
	err := s.DB.QueryRow(ctx, `select count(*) from notify.messages where channel = 'email' and status = 'sent' and sent_at > $1`, since).Scan(&n)
	return n, err
}

// Forget removes messages older than keepDays; the cleanup job runs it.
func (s Store) Forget(ctx context.Context, keepDays int) (int64, error) {
	tag, err := s.DB.Exec(ctx, `delete from notify.messages where created_at < now() - make_interval(days => $1)`, keepDays)
	return tag.RowsAffected(), err
}
