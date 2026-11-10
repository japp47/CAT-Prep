package cleanup

import (
	"context"
	"io"
	"log/slog"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/japp47/CAT-Prep/server/internal/codes"
	"github.com/japp47/CAT-Prep/server/internal/ids"
	"github.com/japp47/CAT-Prep/server/internal/store"
	"github.com/japp47/CAT-Prep/server/migrations"
)

// Every package's tests share one database and run side by side, so this one counts only the rows it made itself:
// a count over a whole table would follow whatever another package happened to be doing at that moment. Its rows go
// at the end even when an assertion fails, so a failed run leaves nothing behind for the next one.
func TestOldRowsGoAndRecentOnesStay(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	ctx := context.Background()
	db, err := store.Open(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(db.Close) // registered first, so it runs last: the rows below go while the pool is still open
	if err := store.Migrate(ctx, db, migrations.FS, slog.New(slog.NewTextHandler(io.Discard, nil))); err != nil {
		t.Fatal(err)
	}
	exec := func(sql string, args ...any) {
		t.Helper()
		if _, err := db.Exec(ctx, sql, args...); err != nil {
			t.Fatal(err)
		}
	}
	gone, recent, owned := ids.New(), ids.New(), ids.New()
	identity := ids.New()
	oldTicket, newTicket := codes.Hash(codes.New(16)), codes.Hash(codes.New(16))
	item := "rc:cleanup-" + identity[24:] + ":0"
	t.Cleanup(func() {
		for _, q := range []struct {
			sql  string
			args []any
		}{
			{`delete from account.identities where id = any($1)`, []any{[]string{identity, gone, recent, owned}}},
			{`delete from support.feedback where item_id = $1`, []any{item}},
			{`delete from account.signin_tickets where token_hash = any($1)`, []any{[][]byte{oldTicket, newTicket}}},
		} {
			if _, err := db.Exec(ctx, q.sql, q.args...); err != nil {
				t.Errorf("tidying up: %v", err)
			}
		}
	})

	oldDev, newDev := ids.New(), ids.New()
	exec(`insert into account.identities (id) values ($1)`, identity)
	exec(`insert into account.devices (id, identity_id, secret_hash, revoked_at, revoked_reason) values
		($1, $3, $4, now() - interval '91 days', 'removed'),
		($2, $3, $5, now() - interval '89 days', 'removed')`, oldDev, newDev, identity, codes.Hash(codes.New(16)), codes.Hash(codes.New(16)))
	exec(`insert into account.link_codes (code_hash, identity_id, created_at, expires_at) values
		($2, $1, now() - interval '3 days', now() - interval '2 days'),
		($3, $1, now() - interval '1 hour', now() - interval '1 minute')`, identity, codes.Hash(codes.New(8)), codes.Hash(codes.New(8)))
	exec(`insert into audit.events (action, actor_type, subject_identity_id, created_at) values
		('test.old', 'system', $1, now() - interval '401 days'), ('test.new', 'system', $1, now() - interval '399 days')`, identity)

	// Each report is kept by its own id, so a failure says which one was wrong rather than how many there were.
	report := func(status, handled string) int64 {
		t.Helper()
		var id int64
		if err := db.QueryRow(ctx, `insert into support.feedback (page, item_id, kind, status, handled_at)
			values ('/p', $1, 'typo', $2, case when $3 = '' then null else now() - $3::interval end) returning id`,
			item, status, handled).Scan(&id); err != nil {
			t.Fatal(err)
		}
		return id
	}
	oldClosed, recentClosed, open := report("fixed", "366 days"), report("wont_fix", "364 days"), report("seen", "")

	// D29: three identities with no device left. Only the anonymous one quiet for 30 days goes.
	exec(`insert into account.identities (id, last_seen_at) values ($1, now() - interval '31 days'), ($2, now() - interval '29 days'), ($3, now() - interval '31 days')`, gone, recent, owned)
	exec(`insert into account.users (id, identity_id, email, email_verified) values ($1, $2, 'a@example.com', true)`, ids.New(), owned)
	exec(`insert into account.signin_tickets (token_hash, provider, subject, email, created_at, expires_at) values
		($1, 'google', 's', 'a@example.com', now() - interval '3 days', now() - interval '2 days'),
		($2, 'google', 's', 'a@example.com', now(), now() + interval '1 hour')`, oldTicket, newTicket)

	if _, err := Run(ctx, db); err != nil {
		t.Fatal(err)
	}

	var devs, links, events int
	_ = db.QueryRow(ctx, `select count(*) from account.devices where identity_id = $1`, identity).Scan(&devs)
	_ = db.QueryRow(ctx, `select count(*) from account.link_codes where identity_id = $1`, identity).Scan(&links)
	_ = db.QueryRow(ctx, `select count(*) from audit.events where subject_identity_id = $1`, identity).Scan(&events)
	if devs != 1 || links != 1 || events != 1 {
		t.Errorf("left: %d devices, %d codes, %d events; want 1 of each", devs, links, events)
	}
	for _, c := range []struct {
		what  string
		id    string
		stays bool
	}{
		{"the anonymous identity quiet for 31 days", gone, false},
		{"the identity seen 29 days ago", recent, true},
		{"the identity with an account", owned, true},
	} {
		if here(ctx, t, db, `select count(*) from account.identities where id = $1`, c.id) != c.stays {
			t.Errorf("%s: still there = %v, want %v", c.what, !c.stays, c.stays)
		}
	}
	for _, c := range []struct {
		what  string
		hash  []byte
		stays bool
	}{
		{"a sign-in ticket two days past its expiry", oldTicket, false},
		{"a sign-in ticket good for another hour", newTicket, true},
	} {
		if here(ctx, t, db, `select count(*) from account.signin_tickets where token_hash = $1`, c.hash) != c.stays {
			t.Errorf("%s: still there = %v, want %v", c.what, !c.stays, c.stays)
		}
	}
	for _, c := range []struct {
		what  string
		id    int64
		stays bool
	}{
		{"a report closed 366 days ago", oldClosed, false},
		{"a report closed 364 days ago", recentClosed, true},
		{"an open report", open, true},
	} {
		if here(ctx, t, db, `select count(*) from support.feedback where id = $1`, c.id) != c.stays {
			t.Errorf("%s: still there = %v, want %v", c.what, !c.stays, c.stays)
		}
	}
}

// here reports whether the row the query counts is still in the database.
func here(ctx context.Context, t *testing.T, db *pgxpool.Pool, sql string, arg any) bool {
	t.Helper()
	var n int
	if err := db.QueryRow(ctx, sql, arg).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n > 0
}
