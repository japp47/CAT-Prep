// Command api is the 99ile server. It reads its settings from the environment (internal/config), connects to
// Postgres as the restricted cat_app role, and serves the API until it is stopped.
//
// It never changes the schema: migrations are a separate step (cmd/migrate) run with the owner's connection
// before a new version starts. If the database is older than this build expects, the server still starts, logs
// it, and /readyz answers 503 until the migration has run (docs/database.md §2).
package main

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"sync"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/japp47/CAT-Prep/server/internal/account"
	"github.com/japp47/CAT-Prep/server/internal/admin"
	"github.com/japp47/CAT-Prep/server/internal/ai"
	"github.com/japp47/CAT-Prep/server/internal/auth"
	"github.com/japp47/CAT-Prep/server/internal/config"
	"github.com/japp47/CAT-Prep/server/internal/feedback"
	"github.com/japp47/CAT-Prep/server/internal/httpx"
	"github.com/japp47/CAT-Prep/server/internal/limit"
	"github.com/japp47/CAT-Prep/server/internal/notify"
	"github.com/japp47/CAT-Prep/server/internal/reqinfo"
	"github.com/japp47/CAT-Prep/server/internal/store"
	"github.com/japp47/CAT-Prep/server/internal/syncapi"
	"github.com/japp47/CAT-Prep/server/internal/turnstile"
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
	if cfg.AIEnabled {
		// A bad models.json, an unknown name in AI_EXPLAIN or AI_SUMMARY, or a task with no key stops the start here.
		if _, err := ai.LoadRouter(cfg.AICatalog, cfg.AIOrders, os.Getenv, log); err != nil {
			return fmt.Errorf("AI settings: %w", err)
		}
	}

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

	// The reminder job runs here, on the API's clock (D91); it stops with the server and finishes its message first.
	var work sync.WaitGroup
	if cfg.NotifyWorker {
		if w, err := reminderWorker(cfg, pool, log); err != nil {
			log.Error("reminder worker not started", "error", err)
		} else {
			work.Add(1)
			go w.Run(ctx, &work)
		}
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
	err = server.Shutdown(shutdownCtx)
	stopped := make(chan struct{})
	go func() { work.Wait(); close(stopped) }()
	select {
	case <-stopped:
	case <-shutdownCtx.Done():
		log.Warn("reminder worker still busy at shutdown; its message is sent again after the lease (no double send)")
	}
	if err != nil {
		return fmt.Errorf("shut down server: %w", err)
	}
	return nil
}

// reminderWorker builds the reminder job from the NOTIFY_* settings (internal/notify, D91).
func reminderWorker(cfg config.Config, pool *pgxpool.Pool, log *slog.Logger) (*notify.Worker, error) {
	set := notifySettings(cfg)
	svc, err := notify.NewService(pool, set, log)
	if err != nil {
		return nil, err
	}
	if len(svc.Channels) == 0 {
		return nil, errors.New("no channel: set NOTIFY_VAPID_PRIVATE for push, or NOTIFY_SMTP_USER with the three NOTIFY_GMAIL_* settings for email")
	}
	if svc.Channels[notify.Email] == nil && cfg.NotifySMTPUser != "" && !cfg.NotifyEmailOff {
		log.Warn("reminder email is off: set the three NOTIFY_GMAIL_* settings (Render blocks the SMTP ports)")
	}
	return &notify.Worker{Service: svc, Every: 2 * time.Minute, Dry: cfg.NotifyDry, Alert: notify.TeamAlert(set), AlertGap: 6 * time.Hour,
		DailyFrom: notify.SiteDaily(cfg.AllowedOrigin), Bounces: notify.BounceReaderFor(set), Log: log}, nil
}

// notifySettings reads the NOTIFY_* settings the worker and the admin panel share.
func notifySettings(cfg config.Config) notify.Settings {
	return notify.Settings{Site: cfg.AllowedOrigin, TokenKey: cfg.NotifyTokenKey, VAPIDPublic: cfg.NotifyVAPIDPublic, VAPIDPrivate: cfg.NotifyVAPIDPrivate,
		SMTPUser: cfg.NotifySMTPUser, SMTPPassword: cfg.NotifySMTPPass, EmailOff: cfg.NotifyEmailOff, PushOff: cfg.NotifyPushOff, EmailCap: cfg.NotifyEmailCap,
		GmailClientID: cfg.NotifyGmailID, GmailClientSecret: cfg.NotifyGmailSecret, GmailRefreshToken: cfg.NotifyGmailToken}
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

// turnstileEndpoint is Cloudflare's; tests point it at a stand-in.
var turnstileEndpoint = turnstile.SiteVerify

// SyncKinds are the record kinds the browser may push: every kind in docs/architecture.md §6.1. It must match
// KINDS in src/lib/sync/records.ts (a test checks).
var SyncKinds = []string{"rc", "va", "cr", "lr", "lrDrill", "arena", "speed", "sectional", "mockReview", "summary", "error", "word", "mock",
	"practice", "recommendation", "weekReview", "redo", "day", "tick", "setting", "profile"}

// newV1 builds the student API (docs/architecture.md §5, §6), behind reqinfo.Gate.
func newV1(cfg config.Config, pool *pgxpool.Pool, log *slog.Logger) http.Handler {
	return v1Routes(cfg, pool, log, syncapi.Options{Kinds: SyncKinds, MaxRecords: 20_000, MaxBytes: 8 << 20, PerMinute: 120, Practice: practiceHook()})
}

// practiceHook tells reminders that a sync push carried a new attempt (internal/notify, F65).
func practiceHook() func(ctx context.Context, tx pgx.Tx, identity string, kinds []string) error {
	within := notify.MustPolicy().PractisedWithinHours
	return func(ctx context.Context, tx pgx.Tx, identity string, kinds []string) error {
		if !notify.Practised(kinds) {
			return nil
		}
		return notify.RecordPractice(ctx, tx, identity, within)
	}
}

// signInProvider is Google when it is configured; tests replace it with a fake provider.
var signInProvider = func(cfg config.Config) auth.Provider {
	if cfg.GoogleClientID == "" {
		return nil
	}
	return &auth.OIDC{Issuer: auth.GoogleIssuer, ClientID: cfg.GoogleClientID, ClientSecret: cfg.GoogleClientSecret, RedirectURL: cfg.SignInRedirect()}
}

func v1Routes(cfg config.Config, pool *pgxpool.Pool, log *slog.Logger, opt syncapi.Options) http.Handler {
	hash := reqinfo.NewHasher(cfg)
	lim := account.Limits{NewIdentities: 5, CodeTries: 10, WrongInARow: 5}
	if !cfg.Prod() {
		lim.NewIdentities, lim.CodeTries = 100, 100 // two browsers and many restarts while developing
	}
	var bot account.BotCheck
	if cfg.TurnstileSecret != "" {
		v := turnstile.New(cfg.TurnstileSecret)
		v.Endpoint = turnstileEndpoint
		bot = v
	}
	acc := account.New(pool, hash, log, lim, bot)
	sy := syncapi.New(pool, hash, log, opt)
	if p := signInProvider(cfg); p != nil {
		acc.WithSignIn(account.SignIn{Provider: p, Starts: limit.New(30, time.Hour)})
	}

	fbPerHour := 10
	if !cfg.Prod() {
		fbPerHour = 100
	}
	fb := feedback.New(feedback.Postgres(pool), log, fbPerHour)

	rt := httpx.NewRouter()
	rt.Handle("POST /v1/identity", acc.CreateHandler())
	rt.Handle("GET /v1/identity", acc.Require(acc.ShowHandler()))
	rt.Handle("POST /v1/sync/pull", acc.Require(sy.PullHandler()))
	rt.Handle("POST /v1/sync/push", acc.Require(sy.PushHandler()))
	rt.Handle("POST /v1/identity/recovery-code", acc.Require(acc.RecoveryCodeHandler()))
	rt.Handle("POST /v1/identity/link-codes", acc.Require(acc.LinkCodeHandler()))
	rt.Handle("POST /v1/identity/link", acc.LinkHandler())
	rt.Handle("POST /v1/identity/recover", acc.RecoverHandler())
	rt.Handle("GET /v1/devices", acc.Require(acc.DevicesHandler()))
	rt.Handle("DELETE /v1/devices/{id}", acc.Require(acc.RemoveDeviceHandler()))
	rt.Handle("GET /v1/me/export", acc.Require(sy.ExportHandler()))
	rt.Handle("DELETE /v1/me", acc.Require(acc.DeleteHandler()))
	rt.Handle("POST /v1/feedback", acc.Optional(fb.Handler()))
	rt.Handle("GET /v1/auth/google/start", acc.StartHandler())
	rt.Handle("GET /v1/auth/google/callback", acc.CallbackHandler())
	rt.Handle("POST /v1/auth/ticket", acc.TicketHandler())
	rt.Handle("POST /v1/auth/complete", acc.CompleteHandler())

	tokenKey := cfg.NotifyTokenKey
	if len(tokenKey) == 0 && !cfg.Prod() {
		// config.Load makes a dev key; this covers a Config built by hand, as the tests do.
		tokenKey = make([]byte, 32)
		_, _ = rand.Read(tokenKey)
	}
	nt := notify.NewAPI(pool, notify.Tokens{Key: tokenKey}, cfg.NotifyVAPIDPublic, cfg.AllowedOrigin, notify.MustPolicy(), log)
	rt.Handle("GET /v1/notify/prefs", acc.Require(nt.PrefsHandler()))
	rt.Handle("PUT /v1/notify/prefs", acc.Require(nt.SavePrefsHandler()))
	rt.Handle("PUT /v1/notify/week", acc.Require(nt.WeekHandler()))
	rt.Handle("GET /v1/notify/push-key", nt.PushKeyHandler())
	rt.Handle("POST /v1/notify/push", acc.Require(nt.SubscribeHandler()))
	rt.Handle("DELETE /v1/notify/push", acc.Require(nt.UnsubscribePushHandler()))
	rt.Handle("POST /v1/notify/opened", acc.Require(nt.OpenedHandler()))
	rt.Handle("GET /v1/unsubscribe", nt.UnsubscribeHandler())
	rt.Handle("POST /v1/unsubscribe", nt.UnsubscribeHandler())

	// AI (F35, D100): off unless AI_ENABLED=1 with a model; the site then keeps its written notes.
	// New generations need a Google account, room under the address's hourly limit, the student's cap and the day's
	// budget (internal/ai/guard.go).
	aiSvc := &ai.Service{DB: pool, DailyBudget: cfg.AIDailyTokens, PerStudent: cfg.AIPerStudent, IPs: limit.New(cfg.AIPerAddress, time.Hour), Log: log}
	if cfg.AIEnabled {
		// run() has already checked the catalog, so an error here only happens in tests; AI then stays off.
		if r, err := ai.LoadRouter(cfg.AICatalog, cfg.AIOrders, os.Getenv, log); err != nil {
			log.Error("ai: off", "error", err)
		} else {
			r.Record = aiSvc.RecordCall
			aiSvc.Router = r
			aiSvc.Content = &ai.Content{URL: cfg.AIContentURL, TTL: time.Hour}
		}
	}
	rt.Handle("GET /v1/ai", acc.Optional(aiSvc.StatusHandler()))
	rt.Handle("POST /v1/ai/explain", acc.Require(aiSvc.ExplainHandler()))
	rt.Handle("POST /v1/ai/flag", acc.Require(aiSvc.FlagHandler()))
	rt.Handle("POST /v1/ai/summary", acc.Require(aiSvc.SummaryHandler()))
	rt.Handle("POST /v1/ai/summary/fix", acc.Require(aiSvc.FixHandler()))

	adm := admin.New(pool, hash, log)
	// The Reminders panel (R2): its setup, and a test sender when email or push is on here.
	nset := notifySettings(cfg)
	nset.TokenKey = tokenKey
	channels := notify.ChannelsFor(nset)
	var tester *notify.Tester
	if len(channels) > 0 {
		if r, err := notify.NewRenderer(); err == nil {
			tester = &notify.Tester{Render: r, Channels: channels, Tokens: notify.Tokens{Key: tokenKey}, Store: notify.Store{DB: pool}, Site: cfg.AllowedOrigin}
		}
	}
	emailCap := cfg.NotifyEmailCap
	if emailCap <= 0 {
		emailCap = 300
	}
	adm.WithReminders(admin.ReminderSetup{Worker: cfg.NotifyWorker, Dry: cfg.NotifyDry, Email: channels[notify.Email] != nil, Push: channels[notify.Push] != nil,
		BounceCheck: notify.BounceReaderFor(nset) != nil, EmailCap: emailCap}, tester)
	rt.Handle("GET /v1/admin/me", acc.Optional(adm.MeHandler()))
	rt.Handle("GET /v1/admin/reports", acc.Optional(adm.Require(admin.FeedbackRead, adm.ReportsHandler())))
	rt.Handle("POST /v1/admin/reports/status", acc.Optional(adm.Require(admin.FeedbackResolve, adm.StatusHandler())))
	rt.Handle("GET /v1/admin/overview", acc.Optional(adm.Require(admin.StatsRead, adm.OverviewHandler())))
	rt.Handle("GET /v1/admin/ai", acc.Optional(adm.Require(admin.StatsRead, aiSvc.AdminHandler())))
	rt.Handle("GET /v1/admin/reminders", acc.Optional(adm.Require(admin.StatsRead, adm.RemindersHandler())))
	rt.Handle("POST /v1/admin/reminders/test", acc.Optional(adm.Require(admin.RemindersManage, adm.RemindersTestHandler())))
	rt.Handle("POST /v1/admin/reminders/bounced", acc.Optional(adm.Require(admin.RemindersManage, adm.RemindersBouncedHandler())))
	return reqinfo.Gate(cfg)(deadline(10 * time.Second)(rt))
}

// deadline gives every /v1 call a time limit: a query still running then is cancelled, and the call answers with the
// usual JSON error, so a slow database cannot pile up waiting requests (docs/design/scale-10k.md, phase 1).
func deadline(d time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx, cancel := context.WithTimeout(r.Context(), d)
			defer cancel()
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
