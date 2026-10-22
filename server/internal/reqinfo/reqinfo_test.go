package reqinfo

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/japp47/CAT-Prep/server/internal/config"
)

func serve(cfg config.Config, mod func(r *http.Request)) (*httptest.ResponseRecorder, string) {
	var seen string
	h := Gate(cfg)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { seen = IP(r.Context()) }))
	r := httptest.NewRequest(http.MethodPost, "/v1/sync/pull", nil)
	r.RemoteAddr = "10.0.0.9:5555"
	if mod != nil {
		mod(r)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, r)
	return rec, seen
}

func TestDevUsesTheConnectionAddress(t *testing.T) {
	rec, ip := serve(config.Config{Env: "dev"}, func(r *http.Request) { r.Header.Set("X-Client-Ip", "1.2.3.4") })
	if rec.Code != 200 || ip != "10.0.0.9" {
		t.Fatalf("code %d ip %q: a client header must not be trusted without the proxy secret", rec.Code, ip)
	}
	if rec.Header().Get("Cache-Control") != "no-store" {
		t.Error("API answers must not be cached")
	}
}

func TestProdWithoutSecretsIsUnavailable(t *testing.T) {
	rec, _ := serve(config.Config{Env: "prod"}, nil)
	if rec.Code != http.StatusServiceUnavailable || !strings.Contains(rec.Body.String(), "sync_unavailable") {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
}

func TestProxySecret(t *testing.T) {
	cfg := config.Config{Env: "prod", ProxySecret: strings.Repeat("s", 32), IPHashKey: bytes.Repeat([]byte{1}, 32), TurnstileSecret: "x"}
	if rec, _ := serve(cfg, nil); rec.Code != http.StatusForbidden {
		t.Fatalf("no secret: %d", rec.Code)
	}
	rec, ip := serve(cfg, func(r *http.Request) {
		r.Header.Set("X-Proxy-Secret", cfg.ProxySecret)
		r.Header.Set("X-Client-Ip", "2001:db8::1")
	})
	if rec.Code != 200 || ip != "2001:db8::1" {
		t.Fatalf("with secret: %d %q", rec.Code, ip)
	}
}

func TestHash(t *testing.T) {
	h := NewHasher(config.Config{IPHashKey: bytes.Repeat([]byte{7}, 32), IPKeyID: 3})
	a, id := h.Hash("1.2.3.4")
	b, _ := h.Hash("1.2.3.4")
	c, _ := h.Hash("1.2.3.5")
	if len(a) != 32 || id != 3 || !bytes.Equal(a, b) || bytes.Equal(a, c) {
		t.Fatalf("hash: %x %d %x %x", a, id, b, c)
	}
	if x, id := h.Hash(""); x != nil || id != 0 {
		t.Fatal("no address, no hash")
	}
	if _, id := NewHasher(config.Config{}).Hash("1.2.3.4"); id != 0 {
		t.Fatal("dev key id is 0")
	}
}
