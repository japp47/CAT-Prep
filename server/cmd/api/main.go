// Command api is the 99ile server. It reads its settings from the environment (internal/config), connects to
// Postgres as the restricted cat_app role, and serves the API until it is stopped.
//
// It never changes the schema: migrations are a separate step (cmd/migrate) run with the owner's connection
// before a new version starts. If the database is older than this build expects, the server still starts, logs
// it, and /readyz answers 503 until the migration has run (docs/database.md §2).
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/japp47/CAT-Prep/server/internal/account"
	"github.com/japp47/CAT-Prep/server/internal/config"
	"github.com/japp47/CAT-Prep/server/internal/httpx"
	"github.com/japp47/CAT-Prep/server/internal/reqinfo"
	"github.com/japp47/CAT-Prep/server/internal/store"
	"github.com/japp47/CAT-Prep/server/internal/syncapi"
	"github.com/japp47/CAT-Prep/server/migrations"
)

func main() {
	if err := run(); err != nil {
		slog.Error("API server stopped", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("configuration:\n%w", err)
	}
	log := newLogger(cfg)
	slog.SetDefault(log)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := store.OpenWithRetry(ctx, cfg.DatabaseURL, 8, log)
	if err != nil {
		return err
	}
	defer pool.Close()
	ready := func(ctx context.Context) error {
		if err := store.Ping(ctx, pool); err != nil {
			return err
		}
		return store.CheckSchema(ctx, pool, migrations.Latest())
	}
	if err := ready(ctx); err != nil {
		log.Error("not ready at start; /readyz answers 503 until this is fixed", "error", err)
	}

	server := &http.Server{
		Addr:              ":" + strconv.Itoa(cfg.Port),
		Handler:           newHandler(cfg, ready, log, newV1(cfg, pool, log)),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	serverErrors := make(chan error, 1)
	go func() {
		log.Info("API server listening", "addr", server.Addr, "env", cfg.Env, "commit", cfg.Commit, "sync", cfg.SyncReady())
		serverErrors <- server.ListenAndServe()
	}()

	select {
	case err := <-serverErrors:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return fmt.Errorf("listen and serve: %w", err)
	case <-ctx.Done():
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shut down server: %w", err)
	}
	return nil
}

// newLogger writes JSON logs in prod (Render shows them) and readable text on a laptop.
func newLogger(cfg config.Config) *slog.Logger {
	opts := &slog.HandlerOptions{Level: cfg.LogLevel}
	if cfg.Prod() {
		return slog.New(slog.NewJSONHandler(os.Stdout, opts))
	}
	return slog.New(slog.NewTextHandler(os.Stdout, opts))
}

// readyFunc says whether the server can do real work: the database answers and has this build's schema.
type readyFunc func(ctx context.Context) error

// newHandler builds the routes and wraps them in the shared middleware (docs/architecture.md §4.4). v1 is the
// student API under /v1/ (nil in tests that do not need it).
func newHandler(cfg config.Config, ready readyFunc, log *slog.Logger, v1 http.Handler) http.Handler {
	rt := httpx.NewRouter()
	if v1 != nil {
		rt.Handle("/v1/", v1)
	}
	rt.Handle("GET /healthz", healthHandler(cfg.Commit))
	rt.Handle("GET /readyz", readyHandler(ready, log))
	return httpx.Chain(rt,
		httpx.RequestID,
		httpx.AccessLog(log),
		httpx.Recover(log),
		httpx.BodyLimit(64<<10),
		httpx.SameOrigin(cfg.AllowedOrigin),
	)
}

// healthHandler says the process is up and which commit it runs. It does not touch the database, so a slow
// database never makes the platform restart a healthy server.
func healthHandler(commit string) http.Handler {
	body := map[string]string{"status": "ok", "commit": commit}
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, body)
	})
}

// readyHandler answers 200 when the database answers within 2 seconds and has this build's schema.
func readyHandler(ready readyFunc, log *slog.Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := ready(ctx); err != nil {
			log.Warn("readyz: not ready", "error", err, "request_id", httpx.RequestIDFrom(r.Context()))
			msg := "The server cannot reach its database right now."
			if errors.Is(err, store.ErrSchemaBehind) {
				msg = "The server is waiting for a database update."
			}
			httpx.WriteError(w, http.StatusServiceUnavailable, "not_ready", msg)
			return
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready"})
	})
}

// SyncKinds are the record kinds this build syncs. B2 proves the path with RC attempts; B3 adds the rest.
var SyncKinds = []string{"rc"}

// newV1 builds the student API (docs/architecture.md §5, §6), behind reqinfo.Gate.
func newV1(cfg config.Config, pool *pgxpool.Pool, log *slog.Logger) http.Handler {
	return v1Routes(cfg, pool, log, syncapi.Options{Kinds: SyncKinds, MaxRecords: 20_000, MaxBytes: 8 << 20, PerMinute: 120})
}

func v1Routes(cfg config.Config, pool *pgxpool.Pool, log *slog.Logger, opt syncapi.Options) http.Handler {
	hash := reqinfo.NewHasher(cfg)
	perHour := 5
	if !cfg.Prod() {
		perHour = 100 // two browsers and many restarts while developing
	}
	acc := account.New(pool, hash, log, perHour)
	sy := syncapi.New(pool, hash, log, opt)

	rt := httpx.NewRouter()
	rt.Handle("POST /v1/identity", acc.CreateHandler())
	rt.Handle("GET /v1/identity", acc.Require(acc.ShowHandler()))
	rt.Handle("POST /v1/sync/pull", acc.Require(sy.PullHandler()))
	rt.Handle("POST /v1/sync/push", acc.Require(sy.PushHandler()))
	if !cfg.Prod() {
		rt.Handle("POST /v1/dev/join", acc.JoinHandler())
	}
	return reqinfo.Gate(cfg)(rt)
}
