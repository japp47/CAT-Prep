//go:build r2

package blob

// A live check of the R2 bucket (run with -tags r2 and the R2_* settings): put, get, delete one small object.
// It never prints a key.

import (
	"context"
	"os"
	"testing"
)

func TestR2RoundTrip(t *testing.T) {
	s := NewR2(os.Getenv("R2_ACCOUNT_ID"), os.Getenv("R2_BUCKET"), os.Getenv("R2_ACCESS_KEY_ID"), os.Getenv("R2_SECRET_ACCESS_KEY"))
	ctx := context.Background()
	key := "check/round-trip.txt"
	if err := s.Put(ctx, key, []byte("99ile r2 check")); err != nil {
		t.Fatalf("put: %v", err)
	}
	b, err := s.Get(ctx, key)
	if err != nil || string(b) != "99ile r2 check" {
		t.Fatalf("get: %q %v", b, err)
	}
	if err := s.Delete(ctx, key); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, err := s.Get(ctx, key); err != ErrNotFound {
		t.Fatalf("after delete: %v", err)
	}
	t.Log("put, get and delete worked")
}
