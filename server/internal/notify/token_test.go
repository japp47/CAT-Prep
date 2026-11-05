package notify

import "testing"

func TestTokens(t *testing.T) {
	k := Tokens{Key: []byte("0123456789abcdef0123456789abcdef")}
	tok := k.Make("0190f0a2-7b7e-7c3d-9a10-3f2b5c6d7e8f", ScopeWeekly)
	id, scope, err := k.Check(tok)
	if err != nil || id != "0190f0a2-7b7e-7c3d-9a10-3f2b5c6d7e8f" || scope != ScopeWeekly {
		t.Fatalf("round trip: %q %q %v", id, scope, err)
	}
	other := Tokens{Key: []byte("another key, just as long as it.")}
	forged := other.Make("0190f0a2-7b7e-7c3d-9a10-3f2b5c6d7e8f", ScopeReminders)
	for name, bad := range map[string]string{
		"another key":   forged,
		"empty":         "",
		"no signature":  tok[:len(tok)-23],
		"edited body":   "eA" + tok[2:],
		"unknown scope": k.Make("id", "everything"),
	} {
		if _, _, err := k.Check(bad); err == nil {
			t.Errorf("%s: accepted", name)
		}
	}
	if _, _, err := (Tokens{}).Check(tok); err == nil {
		t.Error("no key: accepted")
	}
	if ScopeOf("weekly") != ScopeWeekly || ScopeOf("missed-5") != ScopeReminders {
		t.Error("scopes")
	}
}
