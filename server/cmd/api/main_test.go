package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/japp47/CAT-Prep/server/internal/config"
	"github.com/japp47/CAT-Prep/server/internal/store"
)

var quiet = slog.New(slog.NewTextHandler(io.Discard, nil))

// fakeDB stands in for the database check: nil is ready, an error is not.
func fakeDB(err error) readyFunc { return func(context.Context) error { return err } }

func testHandler(ready readyFunc) http.Handler {
	return newHandler(config.Config{AllowedOrigin: "http://localhost:5173"}, ready, quiet)
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
	testHandler(fakeDB(nil)).ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/healthz", nil))

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusMethodNotAllowed)
	}
	if !strings.Contains(rec.Body.String(), `"method_not_allowed"`) {
		t.Errorf("body = %q", rec.Body.String())
	}
}

func TestHealthDoesNotNeedTheDatabase(t *testing.T) {
	rec := httptest.NewRecorder()
	testHandler(fakeDB(errors.New("down"))).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/healthz", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
}

func TestReady(t *testing.T) {
	rec := httptest.NewRecorder()
	testHandler(fakeDB(nil)).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/readyz", nil))
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"ready"`) {
		t.Fatalf("ready: %d %q", rec.Code, rec.Body.String())
	}

	rec = httptest.NewRecorder()
	testHandler(fakeDB(errors.New("connection refused"))).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/readyz", nil))
	if rec.Code != http.StatusServiceUnavailable || !strings.Contains(rec.Body.String(), `"not_ready"`) {
		t.Fatalf("not ready: %d %q", rec.Code, rec.Body.String())
	}
	if strings.Contains(rec.Body.String(), "connection refused") {
		t.Error("the database error must not reach the client")
	}

	rec = httptest.NewRecorder()
	behind := fmt.Errorf("%w: database is at 1, server needs 2", store.ErrSchemaBehind)
	testHandler(fakeDB(behind)).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/readyz", nil))
	if rec.Code != http.StatusServiceUnavailable || !strings.Contains(rec.Body.String(), "waiting for a database update") {
		t.Fatalf("schema behind: %d %q", rec.Code, rec.Body.String())
	}
}

func TestEveryResponseHasARequestID(t *testing.T) {
	for _, path := range []string{"/healthz", "/readyz", "/missing"} {
		rec := httptest.NewRecorder()
		testHandler(fakeDB(nil)).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
		if rec.Header().Get("X-Request-Id") == "" {
			t.Errorf("%s: no X-Request-Id", path)
		}
	}
}

func TestPostFromAnotherSiteIsRefused(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/healthz", nil)
	req.Header.Set("Origin", "https://evil.example")
	rec := httptest.NewRecorder()
	testHandler(fakeDB(nil)).ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d", rec.Code)
	}
}
