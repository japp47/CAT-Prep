// Command cleanup deletes what is kept only for a while (internal/cleanup), as the owner (MIGRATE_DATABASE_URL).
// Run daily by .github/workflows/cleanup.yml; by hand: make cleanup-prod.
package main

import (
	"context"
	"errors"
	"log/slog"
	"os"

	"github.com/japp47/CAT-Prep/server/internal/cleanup"
	"github.com/japp47/CAT-Prep/server/internal/store"
)

// dbTries is how often a scheduled job retries the database before giving up, about twenty seconds in all. The free
// database's pooler sometimes takes longer than a single ping allows, and a daily job can afford to wait.
const dbTries = 8

func main() {
	log := slog.New(slog.NewTextHandler(os.Stdout, nil))
	if err := run(log); err != nil {
		log.Error("cleanup failed", "error", err)
		os.Exit(1)
	}
}

func run(log *slog.Logger) error {
	dsn := os.Getenv("MIGRATE_DATABASE_URL")
	if dsn == "" {
		return errors.New("MIGRATE_DATABASE_URL is required: the owner's connection")
	}
	ctx := context.Background()
	db, err := store.OpenWithRetry(ctx, dsn, dbTries, log)
	if err != nil {
		return err
	}
	defer db.Close()
	counts, err := cleanup.Run(ctx, db)
	for name, n := range counts {
		log.Info("cleaned", "what", name, "rows", n)
	}
	return err
}
