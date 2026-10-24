// Package cleanup deletes what the privacy page says is kept only for a while (docs/database.md §7): link codes a
// day after they expire, removed devices after 90 days, audit events after 400 days, problem reports a year after
// they are closed, sign-in tickets a day after expiry, and anonymous progress no device has synced for 30 days. It runs as the owner, because
// the server's own role may not delete audit events.
package cleanup

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Rule is one kind of clean-up.
type Rule struct {
	Name, SQL string
}

// Rules, each one statement. The audit event for a deletion is written before rows go, so history keeps it.
var Rules = []Rule{
	{"link codes a day after expiry", `delete from account.link_codes where expires_at < now() - interval '1 day'`},
	{"devices removed over 90 days ago", `delete from account.devices where revoked_at < now() - interval '90 days'`},
	{"audit events over 400 days old", `delete from audit.events where created_at < now() - interval '400 days'`},
	{"sign-in tickets a day after expiry", `delete from account.signin_tickets where expires_at < now() - interval '1 day'`},
	// D29: progress with no account that no device has synced for 30 days (every device signed out or removed).
	// Its devices keep their copy; the recovery code works until then.
	{"anonymous progress no device has synced for 30 days", `delete from account.identities i
		where i.last_seen_at < now() - interval '30 days'
		  and not exists (select 1 from account.users u where u.identity_id = i.id)
		  and not exists (select 1 from account.devices d where d.identity_id = i.id and d.revoked_at is null)`},
	{"problem reports closed over a year ago", `delete from support.feedback where status in ('fixed', 'wont_fix') and handled_at < now() - interval '365 days'`},
}

// Run applies every rule and returns how many rows each removed.
func Run(ctx context.Context, db *pgxpool.Pool) (map[string]int64, error) {
	out := map[string]int64{}
	for _, r := range Rules {
		tag, err := db.Exec(ctx, r.SQL)
		if err != nil {
			return out, fmt.Errorf("%s: %w", r.Name, err)
		}
		out[r.Name] = tag.RowsAffected()
	}
	return out, nil
}
