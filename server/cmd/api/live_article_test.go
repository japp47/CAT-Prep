//go:build live

package main

// The article flow end to end through 99ile's API with the real AI provider (run with -tags live, GROQ_API_KEYS and
// TEST_DATABASE_URL; ARTICLE_JSON names the article). It never prints a key.

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/japp47/CAT-Prep/server/internal/blob"
	"github.com/japp47/CAT-Prep/server/internal/config"
	"github.com/japp47/CAT-Prep/server/internal/store"
	"github.com/japp47/CAT-Prep/server/migrations"
)

func TestLiveArticle(t *testing.T) {
	ctx := context.Background()
	admin, err := store.Open(ctx, os.Getenv("TEST_DATABASE_URL"))
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	if err := store.Migrate(ctx, admin, migrations.FS, quiet); err != nil {
		t.Fatal(err)
	}
	_, _ = admin.Exec(ctx, `delete from ai.jobs; delete from ai.article_daily; delete from ai.usage; delete from ai.daily; delete from ai.student_articles; delete from ai.article_texts`)
	texts := &blob.Memory{}
	was := articleStore
	articleStore = func(config.Config) blob.Store { return texts }
	defer func() { articleStore = was }()
	cfg := config.Config{Env: "dev", AllowedOrigin: "http://localhost:5173", NotifyTokenKey: notifyKey,
		AIEnabled: true, AIContentURL: "http://127.0.0.1:1/ai/rc.json", AIDailyTokens: 150000, AIPerStudent: 10, AIPerAddress: 30}
	srv := httptest.NewTLSServer(newHandler(cfg, fakeDB(nil), quiet, v1Routes(t.Context(), cfg, appPool(t), quiet, testOpts)))
	defer srv.Close()
	d := student(t, srv, admin)

	var body map[string]any
	b, _ := os.ReadFile(os.Getenv("ARTICLE_JSON"))
	_ = json.Unmarshal(b, &body)
	var started struct{ Job string }
	start := time.Now()
	if code := d.send("POST", "/v1/ai/article", body, &started); code != http.StatusAccepted {
		t.Fatalf("start: %d", code)
	}
	last := ""
	for {
		var j struct {
			State, Stage, Error string
			Ahead               int
			Set                 struct {
				Title     string
				Dropped   int
				Questions []struct {
					Type, Stem string
					Options    []string
					Answer     int
				}
				Summary struct{ Model, Tone string }
			}
		}
		if code := d.get("/v1/ai/article/"+started.Job, &j); code != http.StatusOK {
			t.Fatalf("poll: %d", code)
		}
		if s := j.State + "/" + j.Stage; s != last {
			t.Logf("%5.1fs %s", time.Since(start).Seconds(), s)
			last = s
		}
		if j.State == "failed" {
			t.Fatalf("failed: %s", j.Error)
		}
		if j.State == "done" {
			t.Logf("done in %s: %q, %d questions, %d dropped, tone %s", time.Since(start).Round(time.Second), j.Set.Title, len(j.Set.Questions), j.Set.Dropped, j.Set.Summary.Tone)
			for i, q := range j.Set.Questions {
				t.Logf("Q%d (%s) %s\n      A) %s\n      B) %s\n      C) %s\n      D) %s\n      key: %c", i+1, q.Type, q.Stem, q.Options[0], q.Options[1], q.Options[2], q.Options[3], 'A'+q.Answer)
			}
			t.Logf("model summary: %s", j.Set.Summary.Model)
			break
		}
		if time.Since(start) > 5*time.Minute {
			t.Fatal("took over five minutes")
		}
		time.Sleep(2 * time.Second)
	}
	var text struct{ Paras []string }
	if code := d.get("/v1/ai/article/"+started.Job+"/text", &text); code != http.StatusOK || len(text.Paras) == 0 {
		t.Errorf("text: %d, %d paragraphs", code, len(text.Paras))
	} else {
		t.Logf("text kept: %d paragraphs, readable by this student", len(text.Paras))
	}
}
