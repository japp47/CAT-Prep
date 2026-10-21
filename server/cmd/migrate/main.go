// Command migrate brings the database schema up to date. It is a separate step from running the API:
// it connects as the database owner (MIGRATE_DATABASE_URL), while the API connects as the restricted cat_app
// (DATABASE_URL) and cannot change the schema (docs/database.md §2).
//
//	go run ./cmd/migrate            apply new migrations
//	go run ./cmd/migrate -status    print the database's version and the version this build expects
//
// Locally: make migrate. Live: the deploy runs it before the new server version starts.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net/url"
	"os"
	"os/signal"
	"syscall"

	"github.com/japp47/CAT-Prep/server/internal/store"
	"github.com/japp47/CAT-Prep/server/migrations"
)

func main() {
	if err := run(); err != nil {
		slog.Error("migrate failed", "error", err)
		os.Exit(1)
	}
}

func run() error {
	status := flag.Bool("status", false, "print the schema version and exit")
	flag.Parse()

	dsn := os.Getenv("MIGRATE_DATABASE_URL")
	if dsn == "" {
		return errors.New("MIGRATE_DATABASE_URL is required: the owner's connection (see server/.env.example)")
	}
	if u, err := url.Parse(dsn); err != nil || (u.Scheme != "postgres" && u.Scheme != "postgresql") {
		return errors.New("MIGRATE_DATABASE_URL must start with postgres://")
	} else if u.User.Username() == "cat_app" || u.User.Username() == "cat_readonly" {
		return fmt.Errorf("MIGRATE_DATABASE_URL uses %s, which cannot change the schema; use the owner", u.User.Username())
	}

	log := slog.New(slog.NewTextHandler(os.Stdout, nil))
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := store.OpenWithRetry(ctx, dsn, 8, log)
	if err != nil {
		return err
	}
	defer pool.Close()

	if *status {
		v, err := store.SchemaVersion(ctx, pool)
		if err != nil {
			v = 0
		}
		fmt.Printf("database: %d\nthis build: %d\n", v, migrations.Latest())
		return nil
	}
	return store.Migrate(ctx, pool, migrations.FS, log)
}
