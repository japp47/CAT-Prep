package admin

import (
	"io/fs"
	"strings"
	"testing"

	"github.com/japp47/CAT-Prep/server/migrations"
)

// Every permission this package checks is seeded, so a typo in a key can never lock staff out (or in).
func TestPermissionKeysAreSeeded(t *testing.T) {
	// The seed is 00011_access.sql and any later migration that adds a permission (00015: reminders.manage).
	names, err := fs.Glob(migrations.FS, "*.sql")
	if err != nil {
		t.Fatal(err)
	}
	var seed string
	for _, n := range names {
		b, err := fs.ReadFile(migrations.FS, n)
		if err != nil {
			t.Fatal(err)
		}
		seed += string(b)
	}
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
