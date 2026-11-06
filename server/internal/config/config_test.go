package config

import (
	"log/slog"
	"strings"
	"testing"
)

func env(m map[string]string) func(string) string { return func(k string) string { return m[k] } }

func TestDevDefaults(t *testing.T) {
	c, err := load(env(map[string]string{"DATABASE_URL": "postgres://u:p@localhost:5433/cat"}))
	if err != nil {
		t.Fatal(err)
	}
	if c.Env != "dev" || c.Port != 8080 || c.AllowedOrigin != "http://localhost:5173" || c.LogLevel != slog.LevelInfo || c.Commit != "dev" {
		t.Fatalf("defaults = %+v", c)
	}
}

func TestCommitComesFromRender(t *testing.T) {
	c, err := load(env(map[string]string{"DATABASE_URL": "postgres://u:p@localhost:5433/cat", "RENDER_GIT_COMMIT": "4f2a9c1"}))
	if err != nil || c.Commit != "4f2a9c1" {
		t.Fatalf("commit = %q, %v", c.Commit, err)
	}
}

func TestEveryProblemIsReportedAtOnce(t *testing.T) {
	_, err := load(env(map[string]string{"ENV": "staging", "PORT": "eighty", "LOG_LEVEL": "loud"}))
	if err == nil {
		t.Fatal("want an error")
	}
	for _, want := range []string{"ENV must be", "PORT must be", "DATABASE_URL is required", "ALLOWED_ORIGIN must be", "LOG_LEVEL must be"} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("error %q does not mention %q", err, want)
		}
	}
}

func TestProdNeedsAnHTTPSOrigin(t *testing.T) {
	base := map[string]string{"ENV": "prod", "DATABASE_URL": "postgres://x@db/cat"}
	if _, err := load(env(base)); err == nil || !strings.Contains(err.Error(), "ALLOWED_ORIGIN") {
		t.Fatalf("prod without an origin: err = %v", err)
	}
	base["ALLOWED_ORIGIN"] = "http://99ile.pages.dev"
	if _, err := load(env(base)); err == nil || !strings.Contains(err.Error(), "https") {
		t.Fatalf("prod with http: err = %v", err)
	}
	base["ALLOWED_ORIGIN"] = "https://99ile.pages.dev/"
	c, err := load(env(base))
	if err != nil || c.AllowedOrigin != "https://99ile.pages.dev" || !c.Prod() {
		t.Fatalf("prod with https: %+v, %v", c, err)
	}
}

func TestOriginMustNotHaveAPath(t *testing.T) {
	_, err := load(env(map[string]string{"DATABASE_URL": "postgres://x@db/cat", "ALLOWED_ORIGIN": "https://99ile.pages.dev/today"}))
	if err == nil {
		t.Fatal("an origin with a path must be refused")
	}
}

func TestDatabaseURLMustBePostgres(t *testing.T) {
	_, err := load(env(map[string]string{"DATABASE_URL": "mysql://x@db/cat"}))
	if err == nil || !strings.Contains(err.Error(), "postgres://") {
		t.Fatalf("err = %v", err)
	}
}

func TestSyncNeedsProxySecretAndIPKeyInProd(t *testing.T) {
	base := map[string]string{"ENV": "prod", "DATABASE_URL": "postgres://x@db/cat", "ALLOWED_ORIGIN": "https://99ile.pages.dev"}
	c, err := load(env(base))
	if err != nil || c.SyncReady() {
		t.Fatalf("prod without secrets: ready=%v err=%v", c.SyncReady(), err)
	}
	base["PROXY_SECRET"] = strings.Repeat("s", 32)
	base["IP_HASH_KEY"] = strings.Repeat("ab", 32)
	if c, _ := load(env(base)); c.SyncReady() {
		t.Fatal("prod without the Turnstile secret must not serve /v1")
	}
	base["TURNSTILE_SECRET"] = "0x4AAAAAAA"
	c, err = load(env(base))
	if err != nil || !c.SyncReady() || c.IPKeyID != 1 || len(c.IPHashKey) != 32 {
		t.Fatalf("prod with secrets: %+v %v", c, err)
	}
	if c, _ := load(env(map[string]string{"DATABASE_URL": "postgres://x@db/cat"})); !c.SyncReady() {
		t.Error("dev should always serve /v1")
	}
}

func TestShortSecretsAreRefused(t *testing.T) {
	_, err := load(env(map[string]string{"DATABASE_URL": "postgres://x@db/cat", "PROXY_SECRET": "short", "IP_HASH_KEY": "zz", "NOTIFY_TOKEN_SECRET": "abcd"}))
	for _, want := range []string{"PROXY_SECRET", "IP_HASH_KEY", "NOTIFY_TOKEN_SECRET"} {
		if err == nil || !strings.Contains(err.Error(), want) {
			t.Errorf("want %s error, got %v", want, err)
		}
	}
}

func TestGoogleSignInNeedsBothSettings(t *testing.T) {
	if _, err := load(env(map[string]string{"GOOGLE_CLIENT_ID": "x.apps.googleusercontent.com"})); err == nil {
		t.Fatal("a client id without its secret was accepted")
	}
	if _, err := load(env(map[string]string{"GOOGLE_CLIENT_ID": "not-a-client-id", "GOOGLE_CLIENT_SECRET": "s"})); err == nil {
		t.Fatal("a malformed client id was accepted")
	}
	c, err := load(env(map[string]string{"DATABASE_URL": "postgres://u:p@localhost:5433/cat", "GOOGLE_CLIENT_ID": "x.apps.googleusercontent.com", "GOOGLE_CLIENT_SECRET": "s"}))
	if err != nil || c.SignInRedirect() != "http://localhost:5173/api/v1/auth/google/callback" {
		t.Fatalf("%v %q", err, c.SignInRedirect())
	}
}

func TestReminderKeys(t *testing.T) {
	c, err := load(env(map[string]string{"DATABASE_URL": "postgres://x@db/cat", "NOTIFY_TOKEN_SECRET": strings.Repeat("ab", 32), "NOTIFY_VAPID_PUBLIC": "BPub"}))
	if err != nil || len(c.NotifyTokenKey) != 32 || c.NotifyVAPIDPublic != "BPub" {
		t.Fatalf("got %d bytes, %q, %v", len(c.NotifyTokenKey), c.NotifyVAPIDPublic, err)
	}
}

func TestReminderWorkerSettings(t *testing.T) {
	base := map[string]string{"DATABASE_URL": "postgres://x@db/cat", "NOTIFY_WORKER": "1", "NOTIFY_SMTP_USER": "t@example.com", "NOTIFY_SMTP_PASSWORD": "p", "NOTIFY_DRY": "1", "NOTIFY_PUSH": "off"}
	c, err := load(env(base))
	if err != nil || !c.NotifyWorker || !c.NotifyDry || !c.NotifyPushOff || c.NotifyEmailOff || c.NotifyEmailCap != 300 || len(c.NotifyTokenKey) != 32 {
		t.Fatalf("worker settings: %+v, %v", c, err)
	}
	prod := map[string]string{"ENV": "prod", "ALLOWED_ORIGIN": "https://99ile.pages.dev", "DATABASE_URL": "postgres://x@db/cat", "NOTIFY_WORKER": "1"}
	if _, err := load(env(prod)); err == nil || !strings.Contains(err.Error(), "NOTIFY_TOKEN_SECRET") {
		t.Errorf("a prod worker without the token secret: %v", err)
	}
	half := map[string]string{"DATABASE_URL": "postgres://x@db/cat", "NOTIFY_WORKER": "1", "NOTIFY_VAPID_PRIVATE": "k"}
	if _, err := load(env(half)); err == nil || !strings.Contains(err.Error(), "NOTIFY_VAPID_PUBLIC") {
		t.Errorf("half a VAPID pair: %v", err)
	}
	bad := map[string]string{"DATABASE_URL": "postgres://x@db/cat", "NOTIFY_EMAIL_DAILY_CAP": "lots"}
	if _, err := load(env(bad)); err == nil {
		t.Error("a cap that is not a number was accepted")
	}
}

func TestGmailAPISettingsGoTogether(t *testing.T) {
	two := map[string]string{"DATABASE_URL": "postgres://x@db/cat", "NOTIFY_GMAIL_CLIENT_ID": "c", "NOTIFY_GMAIL_CLIENT_SECRET": "s"}
	if _, err := load(env(two)); err == nil || !strings.Contains(err.Error(), "NOTIFY_GMAIL_REFRESH_TOKEN") {
		t.Errorf("two of three: %v", err)
	}
	two["NOTIFY_GMAIL_REFRESH_TOKEN"] = "r"
	if c, err := load(env(two)); err != nil || c.NotifyGmailToken != "r" {
		t.Errorf("all three: %v", err)
	}
}
