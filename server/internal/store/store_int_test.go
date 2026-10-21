package store

import (
	"context"
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
