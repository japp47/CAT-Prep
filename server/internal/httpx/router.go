package httpx

import (
	"net/http"
)

// Router is the standard ServeMux with JSON answers for unknown paths and wrong methods,
// so every response from the API has the same error shape.
type Router struct{ *http.ServeMux }

// NewRouter returns an empty router.
func NewRouter() *Router { return &Router{http.NewServeMux()} }

// discard records the status ServeMux would send for a request with no route, and drops its plain-text body.
type discard struct {
	h      http.Header
	status int
}

func (d *discard) Header() http.Header         { return d.h }
func (d *discard) Write(b []byte) (int, error) { return len(b), nil }
func (d *discard) WriteHeader(s int)           { d.status = s }

func (rt *Router) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h, pattern := rt.Handler(r)
	if pattern != "" {
		h.ServeHTTP(w, r)
		return
	}
	// No route: ServeMux answers 404, or 405 with an Allow header when the path exists for another method.
	d := &discard{h: http.Header{}}
	h.ServeHTTP(d, r)
	if allow := d.h.Get("Allow"); allow != "" {
		w.Header().Set("Allow", allow)
	}
	if d.status == http.StatusMethodNotAllowed {
		WriteError(w, http.StatusMethodNotAllowed, "method_not_allowed", "That method is not allowed here.")
		return
	}
	WriteError(w, http.StatusNotFound, "not_found", "There is nothing at this address.")
}
