// Package migrations holds the database schema as numbered SQL files. They are applied by the separate migrate
// command, run with the owner's connection (cmd/migrate), never by the API at start.
// Files are never edited once merged: a change is a new file (docs/architecture.md §9).
package migrations

import (
	"embed"
	"io/fs"
	"strconv"
	"strings"
)

// FS is every migration, built into the binaries.
//
//go:embed *.sql
var FS embed.FS

// Latest is the highest migration version in FS: the schema version this build of the server expects.
func Latest() int64 {
	var max int64
	files, _ := fs.Glob(FS, "*.sql")
	for _, f := range files {
		n, _, ok := strings.Cut(f, "_")
		if !ok {
			continue
		}
		if v, err := strconv.ParseInt(n, 10, 64); err == nil && v > max {
			max = v
		}
	}
	return max
}
