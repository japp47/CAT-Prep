package digest

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/japp47/CAT-Prep/server/internal/ids"
	"github.com/japp47/CAT-Prep/server/internal/store"
	"github.com/japp47/CAT-Prep/server/migrations"
)

var ist = time.FixedZone("IST", 5*3600+1800)

func at(s string) time.Time { t, _ := time.Parse(time.RFC3339, s); return t }

func sample() Pending {
	return Pending{Groups: []Group{
		{ItemID: "rc:econ-1:2", Kind: "answer_key", Count: 2, First: at("2026-10-23T03:00:00Z"), Last: at("2026-10-23T09:30:00Z"), IDs: []int64{4, 7}},
		{ItemID: "pj:bees", Kind: "typo", Count: 1, First: at("2026-10-23T10:00:00Z"), Last: at("2026-10-23T10:00:00Z"), IDs: []int64{9}},
	}, StillOpen: 1}
}

func TestMarkdownListsQuestionsAndCounts(t *testing.T) {
	md := Markdown(sample(), ist)
	for _, want := range []string{"**3 new problem reports** on 2 questions", "| `rc:econ-1:2` (Q3) | wrong answer key | 2 | 23 Oct 08:30 to 23 Oct 15:00 |", "| `pj:bees` | typo | 1 | 23 Oct 15:30 |", "Also 1 earlier report is seen but not closed yet.", "Notes are kept out"} {
		if !strings.Contains(md, want) {
			t.Errorf("missing %q in\n%s", want, md)
		}
	}
	if got := sample().IDs(); len(got) != 3 || got[2] != 9 {
		t.Fatalf("ids %v", got)
	}
}

// fakeGitHub answers like the REST API; hasIssue and failComment pick the case.
func fakeGitHub(t *testing.T, hasIssue, labelExists, failComment bool) (*httptest.Server, *[]string) {
	var calls []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer tok" {
			t.Errorf("no token on %s", r.URL)
		}
		calls = append(calls, r.Method+" "+r.URL.Path)
		switch {
		case r.Method == "POST" && r.URL.Path == "/repos/o/r/labels":
			if labelExists {
				w.WriteHeader(http.StatusUnprocessableEntity)
				return
			}
			w.WriteHeader(http.StatusCreated)
		case r.Method == "GET" && r.URL.Path == "/repos/o/r/issues":
			if r.URL.Query().Get("labels") != Label || r.URL.Query().Get("state") != "open" {
				t.Errorf("query %s", r.URL.RawQuery)
			}
			if hasIssue {
				_, _ = w.Write([]byte(`[{"number":12,"html_url":"https://github.com/o/r/issues/12"}]`))
				return
			}
			_, _ = w.Write([]byte(`[]`))
		case r.Method == "POST" && r.URL.Path == "/repos/o/r/issues":
			var in struct {
				Title, Body string
				Labels      []string
			}
			_ = json.NewDecoder(r.Body).Decode(&in)
			if in.Title != IssueTitle || len(in.Labels) != 1 || !strings.Contains(in.Body, "new problem") {
				t.Errorf("new issue %+v", in)
			}
			w.WriteHeader(http.StatusCreated)
			_, _ = w.Write([]byte(`{"html_url":"https://github.com/o/r/issues/13"}`))
		case r.Method == "POST" && r.URL.Path == "/repos/o/r/issues/12/comments":
			if failComment {
				w.WriteHeader(http.StatusForbidden)
				_, _ = w.Write([]byte(`{"message":"Resource not accessible by integration"}`))
				return
			}
			w.WriteHeader(http.StatusCreated)
		default:
			t.Errorf("unexpected %s %s", r.Method, r.URL)
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	t.Cleanup(srv.Close)
	return srv, &calls
}

func TestPostCommentsOnTheOpenIssue(t *testing.T) {
	srv, calls := fakeGitHub(t, true, true, false)
	url, err := GitHub{API: srv.URL, Repo: "o/r", Token: "tok", HTTP: srv.Client()}.Post(context.Background(), "**1 new problem report**")
	if err != nil || url != "https://github.com/o/r/issues/12" {
		t.Fatalf("%q %v", url, err)
	}
	if want := "POST /repos/o/r/labels,GET /repos/o/r/issues,POST /repos/o/r/issues/12/comments"; strings.Join(*calls, ",") != want {
		t.Fatalf("calls %v", *calls)
	}
}

func TestPostOpensAnIssueWhenNoneIsOpen(t *testing.T) {
	srv, _ := fakeGitHub(t, false, false, false)
	url, err := GitHub{API: srv.URL, Repo: "o/r", Token: "tok", HTTP: srv.Client()}.Post(context.Background(), "**1 new problem report**")
	if err != nil || url != "https://github.com/o/r/issues/13" {
		t.Fatalf("%q %v", url, err)
	}
}

func TestPostReportsAGitHubError(t *testing.T) {
	srv, _ := fakeGitHub(t, true, true, true)
	if _, err := (GitHub{API: srv.URL, Repo: "o/r", Token: "tok", HTTP: srv.Client()}).Post(context.Background(), "x"); err == nil || !strings.Contains(err.Error(), "403") {
		t.Fatalf("err %v", err)
	}
}

func TestLoadAndMarkSeenKeepNotesOut(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	ctx := context.Background()
	db, err := store.Open(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if err := store.Migrate(ctx, db, migrations.FS, slog.New(slog.NewTextHandler(io.Discard, nil))); err != nil {
		t.Fatal(err)
	}
	item := "rc:digest-" + ids.New()[24:] + ":0" // the random tail of a v7 id
	if _, err := db.Exec(ctx, `insert into support.feedback (page, item_id, kind, note) values
		('/p', $1, 'answer_key', 'SECRET-NOTE my phone is 98...'), ('/p', $1, 'answer_key', ''), ('/p', $1, 'typo', '')`, item); err != nil {
		t.Fatal(err)
	}
	// One more, already fixed: it never appears.
	if _, err := db.Exec(ctx, `insert into support.feedback (page, item_id, kind, status, handled_at) values ('/p', $1, 'other', 'fixed', now())`, item); err != nil {
		t.Fatal(err)
	}
	p, err := Load(ctx, db)
	if err != nil {
		t.Fatal(err)
	}
	var mine []Group
	for _, g := range p.Groups {
		if g.ItemID == item {
			mine = append(mine, g)
		}
	}
	if len(mine) != 2 || mine[0].Kind != "answer_key" || mine[0].Count != 2 || mine[1].Count != 1 {
		t.Fatalf("groups %+v", mine)
	}
	if len(mine[0].Notes) != 1 || !strings.HasPrefix(mine[0].Notes[0].Text, "SECRET-NOTE") || mine[0].Notes[0].Page != "/p" {
		t.Fatalf("notes %+v", mine[0].Notes)
	}
	if strings.Contains(Markdown(p, ist), "SECRET-NOTE") {
		t.Fatal("a note reached the public digest")
	}
	if _, body := Email(p, ist, ""); !strings.Contains(body, "SECRET-NOTE") {
		t.Fatal("the private email lost the note")
	}
	n, err := MarkSeen(ctx, db, p.IDs())
	if err != nil || n < 3 {
		t.Fatalf("marked %d, %v", n, err)
	}
	var left int
	_ = db.QueryRow(ctx, `select count(*) from support.feedback where item_id = $1 and status = 'new'`, item).Scan(&left)
	if left != 0 {
		t.Fatalf("%d still new", left)
	}
	again, _ := Load(ctx, db)
	for _, g := range again.Groups {
		if g.ItemID == item {
			t.Fatal("a digested report came back")
		}
	}
}
