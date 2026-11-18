//go:build articleeval

package ai

// The article eval (D108): sets made from a few articles on the real models, measured for the giveaways that make a
// question easier than CAT's. Run before changing the writer's prompt or checks:
//
//	cd server && set -a && . ./.env && set +a && go test -tags articleeval -run TestArticleEval -timeout 30m -v ./internal/ai
//
// EXTRA_ARTICLE names a JSON article ({title, paras}) to add. Needs GROQ_API_KEYS and dist/ai/rc.json. Never prints a key.

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"testing"
)

func TestArticleEval(t *testing.T) {
	raw, err := os.ReadFile("../../../dist/ai/rc.json")
	if err != nil {
		t.Fatalf("build the site first: %v", err)
	}
	var pack Pack
	_ = json.Unmarshal(raw, &pack)
	var arts []ArticleIn
	for _, s := range pack.Sets {
		if s.ID == "econ-cities" || s.ID == "sci-wood" {
			arts = append(arts, ArticleIn{Title: s.Title, Paras: s.Paras})
		}
	}
	if p := os.Getenv("EXTRA_ARTICLE"); p != "" {
		var a ArticleIn
		b, _ := os.ReadFile(p)
		if json.Unmarshal(b, &a) == nil {
			arts = append(arts, a)
		}
	}
	quiet := slog.New(slog.DiscardHandler)
	r, err := LoadRouter("", nil, os.Getenv, quiet)
	if err != nil {
		t.Fatal(err)
	}
	s := &Service{Router: r, Log: quiet}
	var qs, longest, absolutes, lifted, dropped, failed int
	letters := map[int]int{}
	for _, a := range arts {
		set, used, err := s.makeArticleSet(context.Background(), &a, nil)
		if err != nil {
			failed++
			t.Logf("%q: no set (%v), %d tokens", a.Title, err, used)
			continue
		}
		dropped += set.Dropped
		t.Logf("%q: %d questions, %d dropped by the checker, %d tokens", a.Title, len(set.Questions), set.Dropped, used)
		for i, q := range set.Questions {
			qs++
			letters[q.Answer]++
			g := giveaways(q, tokens(articleText(&a)))
			if g.longest {
				longest++
			}
			if g.absolutes >= 2 {
				absolutes++
			}
			if g.lifted {
				lifted++
			}
			t.Logf("  Q%d (%s) %s", i+1, q.Type, q.Stem)
			for oi, o := range q.Options {
				mark := " "
				if oi == q.Answer {
					mark = "*"
				}
				t.Logf("     %s%c) %s  [%s]", mark, 'A'+oi, o, q.Traps[oi])
			}
		}
	}
	t.Logf("SUMMARY: %d sets failed of %d; %d questions; right option the longest in %d; two or more extreme wrong options in %d; right option copied from the text in %d; %d dropped by the checker; answers by letter %v",
		failed, len(arts), qs, longest, absolutes, lifted, dropped, fmt.Sprint(letters))
}
