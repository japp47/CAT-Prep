package main

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/japp47/CAT-Prep/server/internal/config"
)

var quiet = slog.New(slog.NewTextHandler(io.Discard, nil))

type fakeDB struct{ err error }

func (f fakeDB) Ping(context.Context) error { return f.err }

func testHandler(db pinger) http.Handler {
	return newHandler(config.Config{AllowedOrigin: "http://localhost:5173"}, db, quiet)
}

func TestHealthHandler(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()

	healthHandler(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Header().Get("Content-Type"); got != "application/json; charset=utf-8" {
		t.Errorf("content type = %q, want application/json; charset=utf-8", got)
	}
	if got, want := rec.Body.String(), "{\"status\":\"ok\"}\n"; got != want {
		t.Errorf("body = %q, want %q", got, want)
	}
}

func TestHealthRouteOnlyAcceptsGet(t *testing.T) {
	rec := httptest.NewRecorder()
	testHandler(fakeDB{}).ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/healthz", nil))

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusMethodNotAllowed)
	}
	if !strings.Contains(rec.Body.String(), `"method_not_allowed"`) {
		t.Errorf("body = %q", rec.Body.String())
	}
}

func TestHealthDoesNotNeedTheDatabase(t *testing.T) {
	rec := httptest.NewRecorder()
	testHandler(fakeDB{err: errors.New("down")}).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/healthz", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
}

func TestReady(t *testing.T) {
	rec := httptest.NewRecorder()
	testHandler(fakeDB{}).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/readyz", nil))
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"ready"`) {
		t.Fatalf("ready: %d %q", rec.Code, rec.Body.String())
	}

	rec = httptest.NewRecorder()
	testHandler(fakeDB{err: errors.New("connection refused")}).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/readyz", nil))
	if rec.Code != http.StatusServiceUnavailable || !strings.Contains(rec.Body.String(), `"not_ready"`) {
		t.Fatalf("not ready: %d %q", rec.Code, rec.Body.String())
	}
	if strings.Contains(rec.Body.String(), "connection refused") {
		t.Error("the database error must not reach the client")
	}
}

func TestEveryResponseHasARequestID(t *testing.T) {
	for _, path := range []string{"/healthz", "/readyz", "/missing"} {
		rec := httptest.NewRecorder()
		testHandler(fakeDB{}).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
		if rec.Header().Get("X-Request-Id") == "" {
			t.Errorf("%s: no X-Request-Id", path)
		}
	}
}

func TestPostFromAnotherSiteIsRefused(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/healthz", nil)
	req.Header.Set("Origin", "https://evil.example")
	rec := httptest.NewRecorder()
	testHandler(fakeDB{}).ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d", rec.Code)
	}
}
