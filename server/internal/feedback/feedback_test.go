package feedback

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

var quiet = slog.New(slog.NewTextHandler(io.Discard, nil))

func post(t *testing.T, h http.Handler, body any) (int, string) {
	t.Helper()
	b, _ := json.Marshal(body)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/v1/feedback", bytes.NewReader(b)))
	var out struct{ Error struct{ Code string } }
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	return rec.Code, out.Error.Code
}

func good() map[string]string {
	return map[string]string{"page": "/practice/rc/econ-1?review=abc&q=2", "itemId": "rc:econ-1:1", "kind": "answer_key", "note": "  B fits the passage better.  "}
}

func TestSavesACleanReport(t *testing.T) {
	var got []Report
	s := New(func(_ context.Context, r Report) error { got = append(got, r); return nil }, quiet, 10)
	if code, _ := post(t, s.Handler(), good()); code != http.StatusCreated {
		t.Fatalf("status %d", code)
	}
	want := Report{Page: "/practice/rc/econ-1", ItemID: "rc:econ-1:1", Kind: "answer_key", Note: "B fits the passage better."}
	if len(got) != 1 || got[0] != want {
		t.Fatalf("got %+v", got)
	}
}

func TestRefusesBadReports(t *testing.T) {
	s := New(func(context.Context, Report) error { t.Fatal("a bad report was saved"); return nil }, quiet, 100)
	cases := map[string]func(m map[string]string){
		"unknown kind":   func(m map[string]string) { m["kind"] = "rude" },
		"bad item":       func(m map[string]string) { m["itemId"] = "rc:<script>" },
		"empty item":     func(m map[string]string) { m["itemId"] = "" },
		"page not path":  func(m map[string]string) { m["page"] = "https://evil.example/x" },
		"long note":      func(m map[string]string) { m["note"] = strings.Repeat("é", NoteMax+1) },
		"unknown fields": func(m map[string]string) { m["email"] = "a@b.c" },
	}
	for name, change := range cases {
		m := good()
		change(m)
		if code, _ := post(t, s.Handler(), m); code != http.StatusBadRequest {
			t.Errorf("%s: status %d", name, code)
		}
	}
	m := good()
	m["note"] = strings.Repeat("é", NoteMax) // characters, not bytes
	s2 := New(func(context.Context, Report) error { return nil }, quiet, 10)
	if code, _ := post(t, s2.Handler(), m); code != http.StatusCreated {
		t.Fatalf("a note of exactly %d characters: %d", NoteMax, code)
	}
}

func TestTheEleventhReportInAnHourIsRefused(t *testing.T) {
	saved := 0
	s := New(func(context.Context, Report) error { saved++; return nil }, quiet, 10)
	for i := 0; i < 10; i++ {
		if code, _ := post(t, s.Handler(), good()); code != http.StatusCreated {
			t.Fatalf("report %d: %d", i+1, code)
		}
	}
	if code, c := post(t, s.Handler(), good()); code != http.StatusTooManyRequests || c != "rate_limited" {
		t.Fatalf("11th: %d %s", code, c)
	}
	if saved != 10 {
		t.Fatalf("saved %d", saved)
	}
}

func TestAStoreFailureIs500(t *testing.T) {
	s := New(func(context.Context, Report) error { return errors.New("down") }, quiet, 10)
	if code, c := post(t, s.Handler(), good()); code != http.StatusInternalServerError || c != "internal" {
		t.Fatalf("%d %s", code, c)
	}
}
