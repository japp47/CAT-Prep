package store

import (
	"context"
	"testing"
	"time"
)

// A port nothing listens on: connecting fails at once, so these tests measure the waiting, not a timeout.
const dead = "postgres://u:p@127.0.0.1:1/cat?sslmode=disable"

func TestOpenWithRetryWaitsBetweenTriesThenGivesUp(t *testing.T) {
	start := time.Now()
	pool, err := OpenWithRetry(context.Background(), dead, 3, quiet)
	took := time.Since(start)
	if err == nil {
		pool.Close()
		t.Fatal("a database that is not there was reported as open")
	}
	// Three tries wait 500 ms and then 1 s; the last try does not wait.
	if took < 1400*time.Millisecond {
		t.Errorf("gave up after %v; it should wait between tries", took)
	}
	if took > 10*time.Second {
		t.Errorf("took %v, far longer than the waits ask for", took)
	}
}

func TestOpenWithRetryStopsWhenItsContextDoes(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 300*time.Millisecond)
	defer cancel()
	start := time.Now()
	if pool, err := OpenWithRetry(ctx, dead, 100, quiet); err == nil {
		pool.Close()
		t.Fatal("a database that is not there was reported as open")
	}
	if took := time.Since(start); took > 3*time.Second {
		t.Errorf("kept trying for %v after its context ended", took)
	}
}
