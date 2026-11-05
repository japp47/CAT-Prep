package notify

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"strings"
)

// Unsubscribe scopes: what one link turns off.
const (
	ScopeReminders = "reminders" // reminder emails (email_mode off); push and the rest stay
	ScopeWeekly    = "weekly"    // the Sunday review email
)

// ScopeOf is the scope a message kind's unsubscribe link carries.
func ScopeOf(kind string) string {
	if kind == "weekly" {
		return ScopeWeekly
	}
	return ScopeReminders
}

var b64 = base64.RawURLEncoding

// Tokens signs and checks unsubscribe tokens, so a link works without signing in and cannot be made up for
// somebody else. A token never expires: an old email's link must still work.
type Tokens struct{ Key []byte }

// Make returns the token for a student and scope.
func (t Tokens) Make(identity, scope string) string {
	body := identity + "|" + scope
	return b64.EncodeToString([]byte(body)) + "." + b64.EncodeToString(t.mac(body))
}

// Check returns the student and scope of a token, or an error if it was not made with this key.
func (t Tokens) Check(token string) (identity, scope string, err error) {
	bad := errors.New("not a valid unsubscribe link")
	p, s, ok := strings.Cut(token, ".")
	if !ok || len(t.Key) == 0 {
		return "", "", bad
	}
	body, err1 := b64.DecodeString(p)
	sig, err2 := b64.DecodeString(s)
	if err1 != nil || err2 != nil || !hmac.Equal(sig, t.mac(string(body))) {
		return "", "", bad
	}
	identity, scope, ok = strings.Cut(string(body), "|")
	if !ok || identity == "" || (scope != ScopeReminders && scope != ScopeWeekly) {
		return "", "", bad
	}
	return identity, scope, nil
}

func (t Tokens) mac(body string) []byte {
	h := hmac.New(sha256.New, t.Key)
	h.Write([]byte("99ile unsubscribe v1\x00" + body))
	return h.Sum(nil)[:16]
}
