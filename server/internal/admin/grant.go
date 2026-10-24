package admin

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/japp47/CAT-Prep/server/internal/audit"
)

// ErrNoUser means no account has that email: the person must sign in once first.
var ErrNoUser = errors.New("no account with that email; ask them to sign in with Google once, then try again")

// Grant gives role to the account with email, or revokes it, as the owner (cmd/grant, docs/database.md §4 rule 8).
// It is audited as the system. It reports whether anything changed: granting a role already held, or revoking one
// not held, changes nothing.
func Grant(ctx context.Context, db *pgxpool.Pool, email, role, reason string, revoke bool) (bool, error) {
	changed := false
	err := pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		rows, err := tx.Query(ctx, `select id::text, identity_id::text from account.users where lower(email) = lower($1)`, email)
		if err != nil {
			return err
		}
		type u struct{ id, identity string }
		users, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (u, error) {
			var x u
			return x, row.Scan(&x.id, &x.identity)
		})
		if err != nil {
			return err
		}
		switch {
		case len(users) == 0:
			return ErrNoUser
		case len(users) > 1:
			return fmt.Errorf("%d accounts have that email; grant by hand in SQL with the right account.users id", len(users))
		}
		user := users[0]
		var id int64
		action := "role.granted"
		if revoke {
			action = "role.revoked"
			err = tx.QueryRow(ctx, `update access.grants set revoked_at = now() where user_id = $1 and role_key = $2 and revoked_at is null returning id`,
				user.id, role).Scan(&id)
		} else {
			err = tx.QueryRow(ctx, `insert into access.grants (user_id, role_key, reason) values ($1, $2, $3)
				on conflict (user_id, role_key) where revoked_at is null do nothing returning id`, user.id, role, reason).Scan(&id)
		}
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		if err != nil {
			return err
		}
		changed = true
		return audit.Write(ctx, tx, audit.Event{Action: action, ActorType: audit.System, SubjectIdentity: user.identity,
			TargetType: "grant", TargetID: itoa(id), Meta: map[string]any{"role": role}})
	})
	return changed, err
}
