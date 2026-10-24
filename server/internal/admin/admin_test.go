package admin

import (
	"io/fs"
	"strings"
	"testing"

	"github.com/japp47/CAT-Prep/server/migrations"
)

// Every permission this package checks is seeded, so a typo in a key can never lock staff out (or in).
func TestPermissionKeysAreSeeded(t *testing.T) {
	b, err := fs.ReadFile(migrations.FS, "00011_access.sql")
	if err != nil {
		t.Fatal(err)
	}
	seed := string(b)
	for _, k := range Used {
		if !strings.Contains(seed, "('"+k+"', '") {
			t.Errorf("permission %q is not in the seed", k)
		}
		if !strings.Contains(seed, "('admin', '"+k+"')") {
			t.Errorf("admin does not have %q", k)
		}
	}
	if strings.Contains(seed, "'records.read')") {
		t.Error("a role was given records.read (D14)")
	}
}
