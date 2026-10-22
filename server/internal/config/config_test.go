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
	_, err := load(env(map[string]string{"DATABASE_URL": "postgres://x@db/cat", "PROXY_SECRET": "short", "IP_HASH_KEY": "zz"}))
	for _, want := range []string{"PROXY_SECRET", "IP_HASH_KEY"} {
		if err == nil || !strings.Contains(err.Error(), want) {
			t.Errorf("want %s error, got %v", want, err)
		}
	}
}
