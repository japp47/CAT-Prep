// Command api is the 99ile server. It reads its settings from the environment (internal/config), connects to
// Postgres, brings the schema up to date, and serves the API until it is stopped.
//
//	go run ./cmd/api            serve
//	go run ./cmd/api -migrate   apply migrations and exit
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/japp47/CAT-Prep/server/internal/config"
	"github.com/japp47/CAT-Prep/server/internal/httpx"
	"github.com/japp47/CAT-Prep/server/internal/store"
	"github.com/japp47/CAT-Prep/server/migrations"
)

func main() {
	if err := run(); err != nil {
		slog.Error("API server stopped", "error", err)
		os.Exit(1)
	}
}

func run() error {
	migrateOnly := flag.Bool("migrate", false, "apply database migrations and exit")
	flag.Parse()

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
	if err := store.Migrate(ctx, pool, migrations.FS, log); err != nil {
		return err
	}
	if *migrateOnly {
		return nil
	}

	server := &http.Server{
		Addr:              ":" + strconv.Itoa(cfg.Port),
		Handler:           newHandler(cfg, pool, log),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	serverErrors := make(chan error, 1)
	go func() {
		log.Info("API server listening", "addr", server.Addr, "env", cfg.Env)
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

// newLogger writes JSON logs in prod (Cloud Run reads them) and readable text on a laptop.
func newLogger(cfg config.Config) *slog.Logger {
	opts := &slog.HandlerOptions{Level: cfg.LogLevel}
	if cfg.Prod() {
		return slog.New(slog.NewJSONHandler(os.Stdout, opts))
	}
	return slog.New(slog.NewTextHandler(os.Stdout, opts))
}

// pinger is the part of the database pool that /readyz needs, so tests can fake it.
type pinger interface {
	Ping(ctx context.Context) error
}

// newHandler builds the routes and wraps them in the shared middleware (docs/architecture.md §4.4).
func newHandler(cfg config.Config, db pinger, log *slog.Logger) http.Handler {
	rt := httpx.NewRouter()
	rt.HandleFunc("GET /healthz", healthHandler)
	rt.Handle("GET /readyz", readyHandler(db, log))
	return httpx.Chain(rt,
		httpx.RequestID,
		httpx.AccessLog(log),
		httpx.Recover(log),
		httpx.BodyLimit(64<<10),
		httpx.SameOrigin(cfg.AllowedOrigin),
	)
}

// healthHandler says the process is up. It does not touch the database, so a slow database
// never makes the platform restart a healthy server.
func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write([]byte("{\"status\":\"ok\"}\n")); err != nil {
		slog.Error("write health response", "error", err)
	}
}

// readyHandler says whether the server can do real work: the database answers within 2 seconds.
func readyHandler(db pinger, log *slog.Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := db.Ping(ctx); err != nil {
			log.Warn("readyz: database not answering", "error", err, "request_id", httpx.RequestIDFrom(r.Context()))
			httpx.WriteError(w, http.StatusServiceUnavailable, "not_ready", "The server cannot reach its database right now.")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready"})
	})
}
