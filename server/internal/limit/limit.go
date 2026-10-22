// Package limit counts requests per key in fixed windows, in memory. The free Render service runs one instance,
// and a restart forgetting the counts is harmless (docs/database.md §5.6).
package limit

import (
	"sync"
	"time"
)

// Limiter allows max events per key in each window.
type Limiter struct {
	max    int
	window time.Duration
	now    func() time.Time

	mu   sync.Mutex
	seen map[string]*bucket
}

type bucket struct {
	start time.Time
	n     int
}

// New returns a limiter allowing max events per key per window.
func New(max int, window time.Duration) *Limiter {
	return &Limiter{max: max, window: window, now: time.Now, seen: map[string]*bucket{}}
}

// Allow counts one event for key. ok is false once the key is over its limit in this window; first is true only
// for the first refusal in a window, so a caller can log it once instead of once per request.
func (l *Limiter) Allow(key string) (ok, first bool) {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	if len(l.seen) > 10_000 {
		for k, b := range l.seen {
			if now.Sub(b.start) >= l.window {
				delete(l.seen, k)
			}
		}
	}
	b := l.seen[key]
	if b == nil || now.Sub(b.start) >= l.window {
		b = &bucket{start: now}
		l.seen[key] = b
	}
	b.n++
	return b.n <= l.max, b.n == l.max+1
}

// Over reports whether key has already used up this window, without counting an event.
func (l *Limiter) Over(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	b := l.seen[key]
	return b != nil && l.now().Sub(b.start) < l.window && b.n >= l.max
}

// Reset forgets key, for counts of failures in a row that end with a success.
func (l *Limiter) Reset(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.seen, key)
}
