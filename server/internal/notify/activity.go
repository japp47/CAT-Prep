package notify

import (
	"context"
	"slices"

	"github.com/jackc/pgx/v5"
)

// AttemptKinds are the synced record kinds that mean the student practised (docs/architecture.md §6.1).
var AttemptKinds = []string{"rc", "va", "cr", "lr", "lrDrill", "arena", "speed", "sectional"}

// Practised reports whether any of these newly written kinds is practice.
func Practised(kinds []string) bool {
	for _, k := range kinds {
		if slices.Contains(AttemptKinds, k) {
			return true
		}
	}
	return false
}

// RecordPractice runs inside a sync push that wrote a new attempt. It moves the student's last practice to today
// in their time zone (India when they have no reminder choices), extends or restarts the streak, and marks the
// latest message sent in the last two hours as followed by practice: the measure F65 is judged by.
func RecordPractice(ctx context.Context, tx pgx.Tx, identity string, withinHours int) error {
	if _, err := tx.Exec(ctx, `
		with z as (select coalesce((select tz from notify.prefs where identity_id = $1), 'Asia/Kolkata') as tz)
		insert into notify.activity (identity_id, last_at, last_day, streak)
		select $1, now(), (now() at time zone z.tz)::date, 1 from z
		on conflict (identity_id) do update set
			streak = case
				when notify.activity.last_day = excluded.last_day then notify.activity.streak
				when notify.activity.last_day = excluded.last_day - 1 then notify.activity.streak + 1
				else 1 end,
			last_day = greatest(notify.activity.last_day, excluded.last_day),
			last_at = excluded.last_at`, identity); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, `
		update notify.messages set practised_at = now()
		where id = (select id from notify.messages where identity_id = $1 and status = 'sent' and practised_at is null
			and sent_at > now() - make_interval(hours => $2) order by sent_at desc limit 1)`, identity, withinHours)
	return err
}
