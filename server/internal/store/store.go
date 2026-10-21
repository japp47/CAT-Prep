// Package store opens the Postgres pool and keeps the schema up to date.
package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io/fs"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"github.com/pressly/goose/v3/lock"
)

// Open connects to Postgres and checks the connection. The pool is small on purpose: the free database
// allows few connections, and Cloud Run runs at most two instances (docs/plan.md 2I).
func Open(ctx context.Context, url string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, fmt.Errorf("parse DATABASE_URL: %w", err)
	}
	cfg.MaxConns = 5
	cfg.MaxConnIdleTime = 5 * time.Minute
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}
	if err := Ping(ctx, pool); err != nil {
		pool.Close()
		return nil, err
	}
	return pool, nil
}

// Ping checks the database answers within 2 seconds.
func Ping(ctx context.Context, pool *pgxpool.Pool) error {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	if err := pool.Ping(ctx); err != nil {
		return fmt.Errorf("ping database: %w", err)
	}
	return nil
}

// OpenWithRetry tries Open a few times with growing waits, so a database that is still starting
// (docker compose, a restarted instance) does not stop the server.
func OpenWithRetry(ctx context.Context, url string, tries int, log *slog.Logger) (*pgxpool.Pool, error) {
	wait := 500 * time.Millisecond
	for i := 1; ; i++ {
		pool, err := Open(ctx, url)
		if err == nil || i >= tries {
			return pool, err
		}
		log.Warn("database not ready, retrying", "try", i, "wait", wait, "error", err)
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(wait):
		}
		wait = min(wait*2, 5*time.Second)
	}
}

// ErrSchemaBehind means the database has not had this build's migrations yet.
var ErrSchemaBehind = errors.New("database schema is older than this server expects")

// SchemaVersion is the latest migration applied to the database, read from goose's table.
// It needs only select on public.goose_db_version, which cat_app has.
func SchemaVersion(ctx context.Context, pool *pgxpool.Pool) (int64, error) {
	var v int64
	err := pool.QueryRow(ctx, "select coalesce(max(version_id), 0) from public.goose_db_version where is_applied").Scan(&v)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "42P01" {
		return 0, nil // no version table yet: no migration has ever run here
	}
	if err != nil {
		return 0, fmt.Errorf("read schema version (run the migrate command first): %w", err)
	}
	return v, nil
}

// CheckSchema reports ErrSchemaBehind when the database is older than want. A newer database is fine:
// migrations are deployed before the server, and an older server may still be running for a moment.
func CheckSchema(ctx context.Context, pool *pgxpool.Pool, want int64) error {
	v, err := SchemaVersion(ctx, pool)
	if err != nil {
		return err
	}
	if v < want {
		return fmt.Errorf("%w: database is at %d, server needs %d", ErrSchemaBehind, v, want)
	}
	return nil
}

// Migrate applies every migration in fsys that has not run yet. Only the migrate command calls it, with the
// owner's connection; the API never changes the schema. A Postgres advisory lock makes two
// instances starting together take turns instead of racing.
func Migrate(ctx context.Context, pool *pgxpool.Pool, fsys fs.FS, log *slog.Logger) error {
	db := stdlib.OpenDBFromPool(pool)
	defer func(db *sql.DB) { _ = db.Close() }(db)
	locker, err := lock.NewPostgresSessionLocker()
	if err != nil {
		return fmt.Errorf("migration lock: %w", err)
	}
	p, err := goose.NewProvider(goose.DialectPostgres, db, fsys, goose.WithSessionLocker(locker))
	if err != nil {
		return fmt.Errorf("load migrations: %w", err)
	}
	results, err := p.Up(ctx)
	if err != nil {
		return fmt.Errorf("run migrations: %w", err)
	}
	for _, r := range results {
		log.Info("migration applied", "version", r.Source.Version, "file", r.Source.Path, "took", r.Duration)
	}
	v, err := p.GetDBVersion(ctx)
	if err != nil {
		return fmt.Errorf("read schema version: %w", err)
	}
	log.Info("schema up to date", "version", v)
	return nil
}
