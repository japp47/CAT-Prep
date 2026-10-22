package main

import (
	"os"
	"regexp"
	"slices"
	"strings"
	"testing"
)

// The server's allow-list and the browser's list of kinds must be the same, or a kind would sync from one side
// only: the browser would push it and get 400, or the server would accept a kind no browser understands.
func TestSyncKindsMatchTheBrowser(t *testing.T) {
	src, err := os.ReadFile("../../../src/lib/sync/records.ts")
	if err != nil {
		t.Fatal(err)
	}
	m := regexp.MustCompile(`export const KINDS = \[([^\]]*)\]`).FindSubmatch(src)
	if m == nil {
		t.Fatal("KINDS not found in records.ts")
	}
	var browser []string
	for _, k := range strings.Split(string(m[1]), ",") {
		if k = strings.Trim(strings.TrimSpace(k), `"`); k != "" {
			browser = append(browser, k)
		}
	}
	if !slices.Equal(browser, SyncKinds) {
		t.Fatalf("browser kinds %v\nserver kinds  %v", browser, SyncKinds)
	}
}
