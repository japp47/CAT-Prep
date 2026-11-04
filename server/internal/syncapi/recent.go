package syncapi

import (
	"sync"
	"time"
)

// recent says whether something happened for a key less than `every` ago, and if not, notes that it happens now.
// It keeps "last synced" writes to one a minute per device without asking the database each time.
type recent struct {
	mu    sync.Mutex
	m     map[string]time.Time
	every time.Duration
	cap   int
}

func newRecent(every time.Duration, capacity int) *recent {
	return &recent{m: map[string]time.Time{}, every: every, cap: capacity}
}

func (r *recent) due(key string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	if t, ok := r.m[key]; ok && time.Since(t) < r.every {
		return false
	}
	if len(r.m) >= r.cap {
		r.m = map[string]time.Time{}
	}
	r.m[key] = time.Now()
	return true
}
