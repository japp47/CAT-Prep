package limit

import (
	"testing"
	"time"
)

func TestAllowCountsPerKeyAndWindow(t *testing.T) {
	now := time.Unix(0, 0)
	l := New(2, time.Minute)
	l.now = func() time.Time { return now }
	for i, want := range []bool{true, true, false, false} {
		ok, first := l.Allow("a")
		if ok != want {
			t.Fatalf("call %d: ok = %v", i, ok)
		}
		if first != (i == 2) {
			t.Fatalf("call %d: first = %v", i, first)
		}
	}
	if ok, _ := l.Allow("b"); !ok {
		t.Fatal("another key has its own count")
	}
	now = now.Add(time.Minute)
	if ok, _ := l.Allow("a"); !ok {
		t.Fatal("a new window starts again")
	}
}
