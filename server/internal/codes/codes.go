// Package codes makes and reads the codes people type or scan: recovery codes (16 characters, 80 random bits) and
// link codes (8 characters, 40 bits, valid 10 minutes, used once). Crockford base32: no I, L, O or U, and typing
// I or L as 1 and O as 0 is forgiven, so codes survive being read aloud or copied by hand. Only SHA-256 of a code
// is stored (docs/architecture.md §5.1).
package codes

import (
	"crypto/rand"
	"crypto/sha256"
	"strings"
)

const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

// Lengths in characters (5 bits each).
const (
	RecoveryLen = 16
	LinkLen     = 8
)

// New returns a random code of n characters, without dashes.
func New(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	for i := range b {
		b[i] = alphabet[b[i]&31]
	}
	return string(b)
}

// Format groups a code in fours for showing: ABCD-EFGH.
func Format(code string) string {
	var parts []string
	for i := 0; i < len(code); i += 4 {
		parts = append(parts, code[i:min(i+4, len(code))])
	}
	return strings.Join(parts, "-")
}

// Normalize reads what a person typed: case, spaces and dashes do not matter, I and L count as 1 and O as 0.
// It returns "" if anything else is not in the alphabet or the length is not n.
func Normalize(s string, n int) string {
	var b strings.Builder
	for _, r := range strings.ToUpper(s) {
		switch r {
		case ' ', '-', '\t':
			continue
		case 'I', 'L':
			r = '1'
		case 'O':
			r = '0'
		}
		if !strings.ContainsRune(alphabet, r) {
			return ""
		}
		b.WriteRune(r)
	}
	if b.Len() != n {
		return ""
	}
	return b.String()
}

// Hash is what the database keeps.
func Hash(code string) []byte {
	h := sha256.Sum256([]byte(code))
	return h[:]
}
