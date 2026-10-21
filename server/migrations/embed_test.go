package migrations

import (
	"fmt"
	"io/fs"
	"regexp"
	"testing"
)

func TestFileNamesAreNumberedInOrder(t *testing.T) {
	files, err := fs.Glob(FS, "*.sql")
	if err != nil || len(files) == 0 {
		t.Fatalf("no migrations: %v", err)
	}
	name := regexp.MustCompile(`^\d{5}_[a-z0-9_]+\.sql$`)
	for i, f := range files {
		if !name.MatchString(f) {
			t.Errorf("%s: want 00001_name.sql (five digits, so files sort the same as numbers)", f)
		}
		if want := fmt.Sprintf("%05d", i+1); f[:5] != want {
			t.Errorf("%s: want version %s, no gaps or repeats", f, want)
		}
	}
	if Latest() != int64(len(files)) {
		t.Errorf("Latest() = %d, want %d", Latest(), len(files))
	}
}
