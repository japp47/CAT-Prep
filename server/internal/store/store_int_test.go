package store

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"os"
	"sync"
	"testing"

	"github.com/japp47/CAT-Prep/server/migrations"
)

// Integration tests need a real Postgres. They run when TEST_DATABASE_URL is set (make test-int, CI) and
// are skipped otherwise. Never point it at a database with real data.
func testURL(t *testing.T) string {
	t.Helper()
	u := os.Getenv("TEST_DATABASE_URL")
	if u == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	return u
}

var quiet = slog.New(slog.NewTextHandler(io.Discard, nil))

func TestOpenPingAndMigrateTwice(t *testing.T) {
	ctx := context.Background()
	pool, err := Open(ctx, testURL(t))
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	for i := 0; i < 2; i++ {
		if err := Migrate(ctx, pool, migrations.FS, quiet); err != nil {
			t.Fatalf("run %d: %v", i+1, err)
		}
	}
	var v int64
	if err := pool.QueryRow(ctx, "select max(version_id) from goose_db_version where is_applied").Scan(&v); err != nil || v < 1 {
		t.Fatalf("schema version = %d, %v", v, err)
	}
}

func TestTwoInstancesMigratingAtOnce(t *testing.T) {
	ctx := context.Background()
	url := testURL(t)
	var wg sync.WaitGroup
	errs := make([]error, 2)
	for i := range errs {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			pool, err := Open(ctx, url)
			if err != nil {
				errs[i] = err
				return
			}
			defer pool.Close()
			errs[i] = Migrate(ctx, pool, migrations.FS, quiet)
		}(i)
	}
	wg.Wait()
	for i, err := range errs {
		if err != nil {
			t.Errorf("instance %d: %v", i, err)
		}
	}
}

func TestOpenFailsClearlyWhenTheDatabaseIsDown(t *testing.T) {
	_, err := Open(context.Background(), "postgres://nobody:x@127.0.0.1:1/none?connect_timeout=1")
	if err == nil {
		t.Fatal("want an error")
	}
}

func TestSchemaVersionAndCheck(t *testing.T) {
	ctx := context.Background()
	pool, err := Open(ctx, testURL(t))
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	if err := Migrate(ctx, pool, migrations.FS, quiet); err != nil {
		t.Fatal(err)
	}
	v, err := SchemaVersion(ctx, pool)
	if err != nil || v != migrations.Latest() {
		t.Fatalf("version = %d, %v; want %d", v, err, migrations.Latest())
	}
	if err := CheckSchema(ctx, pool, v); err != nil {
		t.Fatalf("same version: %v", err)
	}
	if err := CheckSchema(ctx, pool, v+1); !errors.Is(err, ErrSchemaBehind) {
		t.Fatalf("server newer than database: %v", err)
	}
}

// The server's role must be able to read the schema version but never change the schema.
func TestAppRoleCannotChangeTheSchema(t *testing.T) {
	ctx := context.Background()
	pool, err := Open(ctx, testURL(t))
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	if err := Migrate(ctx, pool, migrations.FS, quiet); err != nil {
		t.Fatal(err)
	}
	as := func(role, sql string) error {
		tx, err := pool.Begin(ctx)
		if err != nil {
			t.Fatal(err)
		}
		defer func() { _ = tx.Rollback(ctx) }()
		if _, err := tx.Exec(ctx, "set local role "+role); err != nil {
			t.Fatal(err)
		}
		_, err = tx.Exec(ctx, sql)
		return err
	}
	for _, role := range []string{"cat_app", "cat_readonly"} {
		if err := as(role, "select max(version_id) from public.goose_db_version"); err != nil {
			t.Errorf("%s cannot read the schema version: %v", role, err)
		}
		for _, ddl := range []string{"create table app.x (id int)", "create table public.x (id int)", "create schema y", "drop schema app"} {
			if err := as(role, ddl); err == nil {
				t.Errorf("%s could run %q", role, ddl)
			}
		}
	}
}
