// Package ids makes the uuid v7 ids the server gives identities and devices (docs/database.md §1). Postgres 17
// has no uuidv7(), so the server makes them: 48 bits of Unix milliseconds, then random bits, so ids sort by creation.
package ids

import (
	"crypto/rand"
	"fmt"
	"regexp"
	"time"
)

// New returns a new uuid v7 as text.
func New() string { return at(time.Now()) }

func at(t time.Time) string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	ms := uint64(t.UnixMilli())
	for i := 0; i < 6; i++ {
		b[i] = byte(ms >> (40 - 8*i))
	}
	b[6] = b[6]&0x0f | 0x70 // version 7
	b[8] = b[8]&0x3f | 0x80 // RFC 9562 variant
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

var uuidText = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

// Valid reports whether s is a lower-case uuid in text form.
func Valid(s string) bool { return uuidText.MatchString(s) }
