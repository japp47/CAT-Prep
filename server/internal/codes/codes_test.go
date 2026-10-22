package codes

import "testing"

func TestNewCodesUseTheAlphabetAndDiffer(t *testing.T) {
	a, b := New(RecoveryLen), New(RecoveryLen)
	if len(a) != 16 || a == b || Normalize(a, RecoveryLen) != a {
		t.Fatalf("%q %q", a, b)
	}
}

func TestNormalizeForgivesHowPeopleType(t *testing.T) {
	for in, want := range map[string]string{
		"abcd-efgh":    "ABCDEFGH",
		" ab cd ef gh": "ABCDEFGH",
		"IL0O-1234":    "11001234",
		"ABCD-EFGU":    "", // U is not in the alphabet
		"ABCD-EFG":     "", // too short
		"ABCD-EFGH-J":  "", // too long
		"ABCD!EFGH":    "",
	} {
		if got := Normalize(in, LinkLen); got != want {
			t.Errorf("Normalize(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestFormat(t *testing.T) {
	if got := Format("ABCDEFGHJKMNPQRS"); got != "ABCD-EFGH-JKMN-PQRS" {
		t.Fatal(got)
	}
}
