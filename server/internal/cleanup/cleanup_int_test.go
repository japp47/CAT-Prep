package cleanup

import (
	"context"
	"io"
	"log/slog"
	"os"
	"testing"

	"github.com/japp47/CAT-Prep/server/internal/codes"
	"github.com/japp47/CAT-Prep/server/internal/ids"
	"github.com/japp47/CAT-Prep/server/internal/store"
	"github.com/japp47/CAT-Prep/server/migrations"
)

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
	defer db.Close()
	if err := store.Migrate(ctx, db, migrations.FS, slog.New(slog.NewTextHandler(io.Discard, nil))); err != nil {
		t.Fatal(err)
	}
	identity, oldDev, newDev := ids.New(), ids.New(), ids.New()
	exec := func(sql string, args ...any) {
		t.Helper()
		if _, err := db.Exec(ctx, sql, args...); err != nil {
			t.Fatal(err)
		}
	}
	exec(`insert into account.identities (id) values ($1)`, identity)
	exec(`insert into account.devices (id, identity_id, secret_hash, revoked_at, revoked_reason) values
		($1, $3, $4, now() - interval '91 days', 'removed'),
		($2, $3, $5, now() - interval '89 days', 'removed')`, oldDev, newDev, identity, codes.Hash(codes.New(16)), codes.Hash(codes.New(16)))
	exec(`insert into account.link_codes (code_hash, identity_id, created_at, expires_at) values
		($2, $1, now() - interval '3 days', now() - interval '2 days'),
		($3, $1, now() - interval '1 hour', now() - interval '1 minute')`, identity, codes.Hash(codes.New(8)), codes.Hash(codes.New(8)))
	exec(`insert into audit.events (action, actor_type, subject_identity_id, created_at) values
		('test.old', 'system', $1, now() - interval '401 days'), ('test.new', 'system', $1, now() - interval '399 days')`, identity)

	item := "rc:cleanup-" + identity[24:] + ":0"
	exec(`insert into support.feedback (page, item_id, kind, status, handled_at) values
		('/p', $1, 'typo', 'fixed', now() - interval '366 days'), ('/p', $1, 'typo', 'wont_fix', now() - interval '364 days'),
		('/p', $1, 'typo', 'seen', null)`, item)
	if _, err := Run(ctx, db); err != nil {
		t.Fatal(err)
	}
	var devs, links, events int
	_ = db.QueryRow(ctx, `select count(*) from account.devices where identity_id = $1`, identity).Scan(&devs)
	_ = db.QueryRow(ctx, `select count(*) from account.link_codes where identity_id = $1`, identity).Scan(&links)
	_ = db.QueryRow(ctx, `select count(*) from audit.events where subject_identity_id = $1`, identity).Scan(&events)
	if devs != 1 || links != 1 || events != 1 {
		t.Fatalf("left: %d devices, %d codes, %d events; want 1 of each", devs, links, events)
	}
	var reports int
	_ = db.QueryRow(ctx, `select count(*) from support.feedback where item_id = $1`, item).Scan(&reports)
	if reports != 2 {
		t.Fatalf("left %d problem reports, want the recent closed one and the open one", reports)
	}
	exec(`delete from account.identities where id = $1`, identity)
}
