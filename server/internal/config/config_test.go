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
	if c.Env != "dev" || c.Port != 8080 || c.AllowedOrigin != "http://localhost:5173" || c.LogLevel != slog.LevelInfo {
		t.Fatalf("defaults = %+v", c)
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
