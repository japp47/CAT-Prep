package turnstile

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

// A stand-in for Cloudflare that behaves like its test secrets: the always-pass key accepts, others refuse.
func fake(t *testing.T) *httptest.Server {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		if r.Form.Get("secret") == "1x0000000000000000000000000000000AA" && r.Form.Get("response") != "" {
			_, _ = w.Write([]byte(`{"success":true}`))
			return
		}
		_, _ = w.Write([]byte(`{"success":false,"error-codes":["invalid-input-response"]}`))
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestVerify(t *testing.T) {
	srv := fake(t)
	pass := New("1x0000000000000000000000000000000AA")
	pass.Endpoint = srv.URL
	if err := pass.Verify(context.Background(), "XXXX.DUMMY.TOKEN.XXXX", "1.2.3.4"); err != nil {
		t.Fatalf("pass: %v", err)
	}
	if err := pass.Verify(context.Background(), "", ""); !errors.Is(err, ErrFailed) {
		t.Fatalf("no token: %v", err)
	}
	fail := New("2x0000000000000000000000000000000AA")
	fail.Endpoint = srv.URL
	if err := fail.Verify(context.Background(), "XXXX.DUMMY.TOKEN.XXXX", ""); !errors.Is(err, ErrFailed) {
		t.Fatalf("fail: %v", err)
	}
	down := New("1x0000000000000000000000000000000AA")
	down.Endpoint = "http://127.0.0.1:1"
	if err := down.Verify(context.Background(), "XXXX.DUMMY.TOKEN.XXXX", ""); err == nil || errors.Is(err, ErrFailed) {
		t.Fatalf("Cloudflare unreachable must be a separate error: %v", err)
	}
}
