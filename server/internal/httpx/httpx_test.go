package httpx

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

var quiet = slog.New(slog.NewTextHandler(io.Discard, nil))

func decodeError(t *testing.T, rec *httptest.ResponseRecorder) (code, message string) {
	t.Helper()
	var b errorBody
	if err := json.Unmarshal(rec.Body.Bytes(), &b); err != nil {
		t.Fatalf("body %q is not the error shape: %v", rec.Body.String(), err)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Errorf("content type = %q", ct)
	}
	return b.Error.Code, b.Error.Message
}

func TestErrorShape(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteError(rec, http.StatusTeapot, "teapot", "Short and stout.")
	if rec.Code != http.StatusTeapot {
		t.Fatalf("status = %d", rec.Code)
	}
	if code, msg := decodeError(t, rec); code != "teapot" || msg != "Short and stout." {
		t.Fatalf("got %q %q", code, msg)
	}
}

func TestUnknownPathAndWrongMethodUseTheErrorShape(t *testing.T) {
	rt := NewRouter()
	rt.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) })

	rec := httptest.NewRecorder()
	rt.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/nope", nil))
	if code, _ := decodeError(t, rec); rec.Code != http.StatusNotFound || code != "not_found" {
		t.Fatalf("unknown path: %d %q", rec.Code, code)
	}

	rec = httptest.NewRecorder()
	rt.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/healthz", nil))
	if code, _ := decodeError(t, rec); rec.Code != http.StatusMethodNotAllowed || code != "method_not_allowed" {
		t.Fatalf("wrong method: %d %q", rec.Code, code)
	}
	if allow := rec.Header().Get("Allow"); !strings.Contains(allow, "GET") {
		t.Errorf("Allow = %q", allow)
	}

	rec = httptest.NewRecorder()
	rt.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/healthz", nil))
	if rec.Code != http.StatusNoContent {
		t.Fatalf("known route: %d", rec.Code)
	}
}

func TestRequestIDIsSetEchoedAndKeptWhenSafe(t *testing.T) {
	var seen string
	h := RequestID(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) { seen = RequestIDFrom(r.Context()) }))

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	if len(seen) != 24 || rec.Header().Get("X-Request-Id") != seen {
		t.Fatalf("new id %q, header %q", seen, rec.Header().Get("X-Request-Id"))
	}

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Request-Id", "cf-abc123-def")
	h.ServeHTTP(httptest.NewRecorder(), req)
	if seen != "cf-abc123-def" {
		t.Fatalf("kept id = %q", seen)
	}

	req.Header.Set("X-Request-Id", "bad id\nwith newline")
	h.ServeHTTP(httptest.NewRecorder(), req)
	if seen == "bad id\nwith newline" || len(seen) != 24 {
		t.Fatalf("unsafe id was kept: %q", seen)
	}
}

func TestRecoverAnswers500AndLogsTheRequestID(t *testing.T) {
	var buf strings.Builder
	log := slog.New(slog.NewTextHandler(&buf, nil))
	h := Chain(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { panic("boom") }), RequestID, Recover(log))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	if code, _ := decodeError(t, rec); rec.Code != 500 || code != "internal" {
		t.Fatalf("got %d %q", rec.Code, code)
	}
	if !strings.Contains(buf.String(), rec.Header().Get("X-Request-Id")) {
		t.Errorf("log %q has no request id", buf.String())
	}
}

func TestBodyLimit(t *testing.T) {
	var readErr error
	h := BodyLimit(10)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, readErr = io.ReadAll(r.Body)
		w.WriteHeader(http.StatusNoContent)
	}))

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/", strings.NewReader(strings.Repeat("x", 11))))
	if code, _ := decodeError(t, rec); rec.Code != http.StatusRequestEntityTooLarge || code != "too_large" {
		t.Fatalf("declared length: %d %q", rec.Code, code)
	}

	// Length not declared (chunked): the read itself fails.
	req := httptest.NewRequest(http.MethodPost, "/", io.NopCloser(strings.NewReader(strings.Repeat("x", 11))))
	req.ContentLength = -1
	h.ServeHTTP(httptest.NewRecorder(), req)
	if _, ok := readErr.(*http.MaxBytesError); !ok {
		t.Fatalf("read error = %v", readErr)
	}

	readErr = nil
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "/", strings.NewReader("small")))
	if readErr != nil {
		t.Fatalf("small body: %v", readErr)
	}
}

func TestSameOrigin(t *testing.T) {
	h := SameOrigin("https://99ile.pages.dev")(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) }))
	cases := []struct {
		method, origin string
		want           int
	}{
		{http.MethodPost, "https://evil.example", http.StatusForbidden},
		{http.MethodDelete, "https://99ile.pages.dev.evil.example", http.StatusForbidden},
		{http.MethodPost, "https://99ile.pages.dev", http.StatusNoContent},
		{http.MethodPost, "", http.StatusNoContent},
		{http.MethodGet, "https://evil.example", http.StatusNoContent},
	}
	for _, c := range cases {
		req := httptest.NewRequest(c.method, "/", nil)
		if c.origin != "" {
			req.Header.Set("Origin", c.origin)
		}
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != c.want {
			t.Errorf("%s from %q: %d, want %d", c.method, c.origin, rec.Code, c.want)
		}
	}
}

func TestAccessLogHasNoQueryString(t *testing.T) {
	var buf strings.Builder
	log := slog.New(slog.NewTextHandler(&buf, nil))
	h := Chain(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusAccepted) }), RequestID, AccessLog(log))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/v1/x?code=SECRET", nil))
	out := buf.String()
	if strings.Contains(out, "SECRET") || !strings.Contains(out, "status=202") || !strings.Contains(out, "path=/v1/x") {
		t.Fatalf("log line = %q", out)
	}
}
