// Package migrations holds the database schema as numbered SQL files, run by goose when the server starts.
// Files are never edited once merged: a change is a new file (docs/architecture.md §9).
package migrations

import "embed"

// FS is every migration, built into the server binary.
//
//go:embed *.sql
var FS embed.FS
