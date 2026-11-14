//go:build eval

package ai

// The summary eval (D106): the cases in testdata/summary_eval.json run through each model on the real provider,
// scored against the right verdicts, and run twice to catch a model that changes its mind. Run it before changing a
// model, a setting or the prompt:
//
//	cd server && set -a && . ./.env && set +a && go test -tags eval -run TestSummaryEval -timeout 60m -v ./internal/ai
//
// EVAL_MODELS (default every model in the summary order), EVAL_RUNS (default 2) and EVAL_MIN (default 0.9) adjust it;
// it needs GROQ_API_KEYS and dist/ai/rc.json from a site build. It never prints a key.

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
)

type evalCase struct{ Set, Text, Want, Why string }

func TestSummaryEval(t *testing.T) {
	raw, err := os.ReadFile("../../../dist/ai/rc.json")
	if err != nil {
		t.Fatalf("build the site first (npm run build): %v", err)
	}
	var pack Pack
	if err := json.Unmarshal(raw, &pack); err != nil {
		t.Fatal(err)
	}
	sets := map[string]*Set{}
	for i := range pack.Sets {
		sets[pack.Sets[i].ID] = &pack.Sets[i]
	}
	var file struct{ Cases []evalCase }
	b, _ := os.ReadFile("testdata/summary_eval.json")
	if err := json.Unmarshal(b, &file); err != nil {
		t.Fatal(err)
	}
	quiet := slog.New(slog.DiscardHandler)
	base, err := LoadRouter("", nil, os.Getenv, quiet)
	if err != nil {
		t.Fatal(err)
	}
	models := base.Status().Tasks[TaskSummary]
	if v := os.Getenv("EVAL_MODELS"); v != "" {
		models = strings.Split(v, ",")
	}
	runs, minAcc := 2, 0.9
	if n, err := strconv.Atoi(os.Getenv("EVAL_RUNS")); err == nil && n > 0 {
		runs = n
	}
	if f, err := strconv.ParseFloat(os.Getenv("EVAL_MIN"), 64); err == nil {
		minAcc = f
	}

	type result struct {
		verdicts [][]bool // per run, per check; nil when no verdict
		notes    []string
		tokens   int
	}
	results := map[string][]result{}
	var mu sync.Mutex
	var wg sync.WaitGroup
	for _, m := range models {
		r, err := LoadRouter("", map[string][]string{TaskSummary: {m}}, os.Getenv, quiet)
		if err != nil {
			t.Fatal(err)
		}
		res := make([]result, len(file.Cases))
		wg.Add(1)
		// One model at a time per goroutine: each model has its own per-minute quota.
		go func(m string, r *Router) {
			defer wg.Done()
			for run := 0; run < runs; run++ {
				for i, c := range file.Cases {
					set := sets[c.Set]
					var checks []SummaryCheck
					for try := 0; ; try++ {
						rep, err := r.JSON(context.Background(), TaskSummary, "", summarySystem, summaryPrompt(set, c.Text), "summary_checks", summarySchema)
						if errors.Is(err, ErrBusy) {
							// A per-minute limit clears in seconds; two minutes of refusals is the day's allowance gone.
							if try >= 15 {
								t.Errorf("%s: the provider kept refusing for two minutes, so the day's free allowance is probably used up; run the eval again tomorrow (%v)", m, err)
								mu.Lock()
								results[m] = res
								mu.Unlock()
								return
							}
							time.Sleep(8 * time.Second)
							continue
						}
						res[i].tokens += rep.Tokens
						if err == nil {
							checks, err = checkSummary(rep.Raw, c.Text)
						}
						if err != nil {
							res[i].notes = append(res[i].notes, fmt.Sprintf("run %d: %v", run+1, err))
						}
						break
					}
					var v []bool
					for _, ch := range checks {
						v = append(v, ch.OK)
						if run == 0 {
							res[i].notes = append(res[i].notes, fmt.Sprintf("%s %v %q: %s", ch.ID, ch.OK, ch.Words, ch.Note))
						}
					}
					res[i].verdicts = append(res[i].verdicts, v)
				}
			}
			mu.Lock()
			results[m] = res
			mu.Unlock()
		}(m, r)
	}
	wg.Wait()

	out := &strings.Builder{}
	failed := false
	for _, m := range models {
		res := results[m]
		right, scored, flips, missing, tokens := 0, 0, 0, 0, 0
		fmt.Fprintf(out, "\n================ %s ================\n", m)
		for i, c := range file.Cases {
			tokens += res[i].tokens
			line := ""
			for run, v := range res[i].verdicts {
				if len(v) != 4 {
					missing++
					line += " [no verdict]"
					continue
				}
				got := ""
				for k, ok := range v {
					g := "n"
					if ok {
						g = "y"
					}
					got += g
					if c.Want[k] == '?' {
						continue
					}
					scored++
					if g[0] == c.Want[k] {
						right++
					}
					if run > 0 && len(res[i].verdicts[0]) == 4 && res[i].verdicts[0][k] != ok && c.Want[k] != '?' {
						flips++
					}
				}
				line += " " + got
			}
			mark := "ok"
			for _, v := range res[i].verdicts {
				for k, ok := range v {
					if c.Want[k] != '?' && ok != (c.Want[k] == 'y') {
						mark = "MISS"
					}
				}
			}
			fmt.Fprintf(out, "%-4s %-13s want %s got%s  (%s) %q\n", mark, c.Set, c.Want, line, c.Why, c.Text)
			if mark == "MISS" {
				for _, n := range res[i].notes {
					fmt.Fprintf(out, "       %s\n", n)
				}
			}
		}
		acc := float64(right) / float64(max(scored, 1))
		fmt.Fprintf(out, "%s: %d of %d scored checks right (%.0f%%), %d flips between runs, %d replies without a verdict, %d tokens\n",
			m, right, scored, acc*100, flips, missing, tokens)
		t.Logf("%s: %.0f%% right, %d flips, %d without a verdict", m, acc*100, flips, missing)
		if acc < minAcc {
			failed = true
		}
	}
	if p := os.Getenv("EVAL_OUT"); p != "" {
		_ = os.WriteFile(p, []byte(out.String()), 0o600)
	} else {
		fmt.Print(out.String())
	}
	if failed {
		t.Errorf("a model is below %.0f%%", minAcc*100)
	}
}
