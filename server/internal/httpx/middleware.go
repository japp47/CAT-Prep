package httpx

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
	"regexp"
	"runtime/debug"
	"time"
)

// Middleware wraps a handler.
type Middleware func(http.Handler) http.Handler

// Chain applies middleware so the first one listed runs first.
func Chain(h http.Handler, m ...Middleware) http.Handler {
	for i := len(m) - 1; i >= 0; i-- {
		h = m[i](h)
	}
	return h
}

type ctxKey struct{}

// RequestIDFrom returns the request id set by RequestID, or "".
func RequestIDFrom(ctx context.Context) string {
	id, _ := ctx.Value(ctxKey{}).(string)
	return id
}

var goodID = regexp.MustCompile(`^[A-Za-z0-9._-]{8,64}$`)

// RequestID gives every request an id, echoed in X-Request-Id and in the logs. An id from the proxy is kept
// when it looks safe, so one request can be followed from Cloudflare to the database.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-Id")
		if !goodID.MatchString(id) {
			b := make([]byte, 12)
			_, _ = rand.Read(b)
			id = hex.EncodeToString(b)
		}
		w.Header().Set("X-Request-Id", id)
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxKey{}, id)))
	})
}

// statusWriter remembers the status a handler wrote, for the access log.
type statusWriter struct {
	http.ResponseWriter
	status int
}

func (s *statusWriter) WriteHeader(code int) {
	if s.status == 0 {
		s.status = code
	}
	s.ResponseWriter.WriteHeader(code)
}

func (s *statusWriter) Write(b []byte) (int, error) {
	if s.status == 0 {
		s.status = http.StatusOK
	}
	return s.ResponseWriter.Write(b)
}

func (s *statusWriter) Unwrap() http.ResponseWriter { return s.ResponseWriter }

// AccessLog logs one line per request: method, path, status, duration and request id.
// Never bodies, query strings, cookies or headers (docs/plan.md 2J).
func AccessLog(log *slog.Logger) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			sw := &statusWriter{ResponseWriter: w}
			next.ServeHTTP(sw, r)
			if sw.status == 0 {
				sw.status = http.StatusOK
			}
			log.LogAttrs(r.Context(), slog.LevelInfo, "request",
				slog.String("method", r.Method), slog.String("path", r.URL.Path), slog.Int("status", sw.status),
				slog.Duration("took", time.Since(start)), slog.String("request_id", RequestIDFrom(r.Context())))
		})
	}
}

// Recover turns a panic into a 500 with the shared error shape, and logs the stack.
func Recover(log *slog.Logger) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if v := recover(); v != nil {
					if v == http.ErrAbortHandler {
						panic(v)
					}
					log.Error("panic", "value", v, "request_id", RequestIDFrom(r.Context()), "stack", string(debug.Stack()))
					WriteError(w, http.StatusInternalServerError, "internal", "Something went wrong on our side. Your progress is safe on this device.")
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

// BodyLimit refuses request bodies over max bytes: at once when the length is declared, and while reading
// otherwise (the handler's read fails with *http.MaxBytesError).
func BodyLimit(max int64) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.ContentLength > max {
				WriteError(w, http.StatusRequestEntityTooLarge, "too_large", "That request is too big.")
				return
			}
			r.Body = http.MaxBytesReader(w, r.Body, max)
			next.ServeHTTP(w, r)
		})
	}
}

// SameOrigin refuses requests that change data (anything but GET, HEAD, OPTIONS) when the browser says they
// come from another site. Browsers always send Origin on such requests; tools like curl send none and carry no
// student's cookie, so a missing Origin is allowed. With SameSite=Lax cookies this blocks CSRF.
func SameOrigin(allowed string) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			switch r.Method {
			case http.MethodGet, http.MethodHead, http.MethodOptions:
			default:
				if o := r.Header.Get("Origin"); o != "" && o != allowed {
					WriteError(w, http.StatusForbidden, "bad_origin", "This request did not come from 99ile.")
					return
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}
