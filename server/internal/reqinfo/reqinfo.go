// Package reqinfo guards the /v1 API: it checks that a request came through our proxy, finds the student's
// address, and turns that address into the keyed hash kept in audit.events (D16). The address itself is never
// stored or logged.
package reqinfo

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"net"
	"net/http"
	"net/netip"

	"github.com/japp47/CAT-Prep/server/internal/config"
	"github.com/japp47/CAT-Prep/server/internal/httpx"
)

type ipKey struct{}

// IP returns the student's address found by Gate, or "".
func IP(ctx context.Context) string {
	ip, _ := ctx.Value(ipKey{}).(string)
	return ip
}

// Gate wraps the /v1 API. In prod without the proxy secret and IP key it answers 503, so the live server can run
// before sync is switched on. With a proxy secret, a request without it is refused: the API is only reachable
// through the site's own /api proxy. Responses are never cached.
func Gate(cfg config.Config) httpx.Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Cache-Control", "no-store")
			if !cfg.SyncReady() {
				httpx.WriteError(w, http.StatusServiceUnavailable, "sync_unavailable", "Sync is not available yet. Your progress is safe on this device.")
				return
			}
			ip := remoteIP(r.RemoteAddr)
			if cfg.ProxySecret != "" {
				if subtle.ConstantTimeCompare([]byte(r.Header.Get("X-Proxy-Secret")), []byte(cfg.ProxySecret)) != 1 {
					httpx.WriteError(w, http.StatusForbidden, "bad_origin", "This request did not come from 99ile.")
					return
				}
				if a, err := netip.ParseAddr(r.Header.Get("X-Client-Ip")); err == nil {
					ip = a.String()
				}
			}
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ipKey{}, ip)))
		})
	}
}

func remoteIP(addr string) string {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		host = addr
	}
	if a, err := netip.ParseAddr(host); err == nil {
		return a.String()
	}
	return ""
}

// Hasher turns an address into HMAC-SHA256 with a server key, so one address making many identities can be
// spotted without keeping addresses. Hashes made with different keys never match (ip_key says which key).
type Hasher struct {
	key []byte
	id  int16
}

// NewHasher uses the configured key, or a random one for this run (key id 0) when none is set (dev).
func NewHasher(cfg config.Config) Hasher {
	if len(cfg.IPHashKey) > 0 {
		return Hasher{key: cfg.IPHashKey, id: cfg.IPKeyID}
	}
	k := make([]byte, 32)
	_, _ = rand.Read(k)
	return Hasher{key: k}
}

// Hash returns the hash of ip and the key id, or nil and 0 when there is no address.
func (h Hasher) Hash(ip string) ([]byte, int16) {
	if ip == "" {
		return nil, 0
	}
	m := hmac.New(sha256.New, h.key)
	m.Write([]byte(ip))
	return m.Sum(nil), h.id
}
