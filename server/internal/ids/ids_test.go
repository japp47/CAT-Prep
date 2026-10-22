package ids

import (
	"testing"
	"time"
)

func TestNewIsAVersion7UUIDThatSortsByTime(t *testing.T) {
	a := at(time.UnixMilli(1_700_000_000_000))
	b := at(time.UnixMilli(1_700_000_000_001))
	if !Valid(a) || !Valid(b) {
		t.Fatalf("not uuids: %s %s", a, b)
	}
	if a[14] != '7' || (a[19] != '8' && a[19] != '9' && a[19] != 'a' && a[19] != 'b') {
		t.Fatalf("version or variant wrong: %s", a)
	}
	if !(a < b) {
		t.Fatalf("ids do not sort by time: %s >= %s", a, b)
	}
	if New() == New() {
		t.Fatal("two ids are equal")
	}
}

func TestValid(t *testing.T) {
	for _, s := range []string{"", "x", "0192F000-0000-7000-8000-000000000001", "0192f000-0000-7000-8000-00000000000"} {
		if Valid(s) {
			t.Errorf("%q should not be valid", s)
		}
	}
}
