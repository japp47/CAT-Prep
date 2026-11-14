package ai

import (
	"encoding/json"
	"fmt"
	"strings"
	"testing"
)

// sampleArticle is three paragraphs of about 400 words; sentence numbers run 1 to 18.
func sampleArticle() *ArticleIn {
	s := func(n int) string {
		return fmt.Sprintf("Sentence %d argues that cities may grow because cheap land at the edge draws firms and families outward over many years.", n)
	}
	a := &ArticleIn{Title: "Why cities grow", Site: "Example", Paras: [][]string{{}, {}, {}}}
	for n := 1; n <= 18; n++ {
		a.Paras[(n-1)/6] = append(a.Paras[(n-1)/6], s(n))
	}
	return a
}

// goodWriter is a writer reply that passes every check.
func goodWriter() map[string]any {
	q := func(t string) map[string]any {
		return map[string]any{"type": t, "stem": "According to the passage, what drives the growth of cities?",
			"options": []string{"Cheap land at the edge", "Better roads alone", "Rising birth rates", "Government decree"},
			"answer":  0, "notes": []string{"Sentence 1 says cheap land draws firms.", "Roads are not named as the cause.", "Births are not discussed at all.", "No decree is mentioned anywhere."},
			"traps": []string{"", "Out of scope", "Out of scope", "Distorts the passage"}, "lines": []int{1}}
	}
	return map[string]any{"title": "Why cities grow outward", "questions": []any{q("main"), q("inference"), q("tone"), q("detail")},
		"summary": map[string]any{"model": "Cities may grow because cheap land at the edge draws firms and families outward over the years.",
			"claim": "cheap land at the edge draws firms", "qualifier": "may", "tone": "analytical",
			"toneCue": "cities may grow because cheap land", "toneWhy": "It weighs a cause rather than simply reporting facts."}}
}

func TestValidArticleHoldsTheLimits(t *testing.T) {
	a := sampleArticle()
	if why := validArticle(a); why != "" {
		t.Fatalf("a fine article refused: %s", why)
	}
	short := &ArticleIn{Paras: [][]string{{"Too short to practise."}}}
	if why := validArticle(short); !strings.Contains(why, "350 to 1200 words") {
		t.Errorf("short: %q", why)
	}
	long := sampleArticle()
	for i := 0; i < 3; i++ {
		long.Paras = append(long.Paras, long.Paras...)
	}
	if validArticle(long) == "" {
		t.Error("a long article accepted")
	}
	if validArticle(&ArticleIn{Title: strings.Repeat("x", 201), Paras: sampleArticle().Paras}) == "" {
		t.Error("a long title accepted")
	}
	for _, link := range []string{"javascript:alert(1)", "data:text/html,hi", "ftp://x.example/a", "not a link"} {
		if validArticle(&ArticleIn{Link: link, Paras: sampleArticle().Paras}) == "" {
			t.Errorf("link %q accepted", link)
		}
	}
	if why := validArticle(&ArticleIn{Link: "https://aeon.co/essays/x", Paras: sampleArticle().Paras}); why != "" {
		t.Errorf("a web link refused: %s", why)
	}
}

func TestArticleKeyIgnoresCaseAndSpacing(t *testing.T) {
	a, b := sampleArticle(), sampleArticle()
	b.Paras[0][0] = "  " + strings.ToUpper(b.Paras[0][0]) + " "
	if string(articleKey(a)) != string(articleKey(b)) {
		t.Error("the same text gave two keys")
	}
	b.Paras[1][2] = "A different sentence entirely, about rivers and the sea and nothing else of note here."
	if string(articleKey(a)) == string(articleKey(b)) {
		t.Error("different text gave one key")
	}
}

func TestCheckWriterTurnsReferencesIntoLinesAndRefusesBadSets(t *testing.T) {
	a := sampleArticle()
	raw, _ := json.Marshal(goodWriter())
	set, err := checkWriter(string(raw), a)
	if err != nil || len(set.Questions) != 4 || set.Questions[0].Lines[0] != [2]int{0, 0} || set.Summary.Tone != "analytical" || set.Title != "Why cities grow outward" {
		t.Fatalf("a good set refused: %v %+v", err, set)
	}
	// Three traps, one per wrong option, get an empty slot at the answer.
	three := goodWriter()
	three["questions"].([]any)[2].(map[string]any)["traps"] = []string{"Out of scope", "Out of scope", "Distorts the passage"}
	raw, _ = json.Marshal(three)
	if set, err := checkWriter(string(raw), a); err != nil || set.Questions[2].Traps[0] != "" || set.Questions[2].Traps[3] != "Distorts the passage" {
		t.Errorf("three traps: %v", err)
	}
	// A main idea citing five sentences keeps its paragraphs for the review but offers no Prove it.
	wide := goodWriter()
	wide["questions"].([]any)[0].(map[string]any)["lines"] = []int{1, 2, 7, 8, 13}
	raw, _ = json.Marshal(wide)
	if set, err := checkWriter(string(raw), a); err != nil || set.Questions[0].Lines != nil || fmt.Sprint(set.Questions[0].Proof) != "[0 1 2]" {
		t.Errorf("five lines: %v %+v", err, set)
	}
	for name, change := range map[string]func(m map[string]any){
		"three questions":      func(m map[string]any) { m["questions"] = m["questions"].([]any)[:3] },
		"a sentence not there": func(m map[string]any) { m["questions"].([]any)[1].(map[string]any)["lines"] = []int{99} },
		"no line at all":       func(m map[string]any) { m["questions"].([]any)[1].(map[string]any)["lines"] = []int{} },
		"a trap on the answer": func(m map[string]any) {
			m["questions"].([]any)[0].(map[string]any)["traps"] = []string{"Out of scope", "Out of scope", "Out of scope", "Out of scope"}
		},
		"an unknown trap": func(m map[string]any) {
			m["questions"].([]any)[0].(map[string]any)["traps"] = []string{"", "Silly", "Out of scope", "Out of scope"}
		},
		"an unknown type": func(m map[string]any) { m["questions"].([]any)[2].(map[string]any)["type"] = "vocabulary" },
		"a repeated option": func(m map[string]any) {
			m["questions"].([]any)[0].(map[string]any)["options"] = []string{"A", "A", "B", "C"}
		},
		"a cue not in the text": func(m map[string]any) { m["summary"].(map[string]any)["toneCue"] = "words the author never wrote" },
		"a claim not in it":     func(m map[string]any) { m["summary"].(map[string]any)["claim"] = "something else" },
		"a link": func(m map[string]any) {
			m["summary"].(map[string]any)["model"] = "See https://x.example for why cities may grow on cheap land at the edge."
		},
	} {
		m := goodWriter()
		change(m)
		raw, _ := json.Marshal(m)
		if _, err := checkWriter(string(raw), a); err == nil {
			t.Errorf("%s: accepted", name)
		}
	}
}

func TestTheCheckerDropsQuestionsItMisses(t *testing.T) {
	raw, _ := json.Marshal(goodWriter())
	set, _ := checkWriter(string(raw), sampleArticle())
	set.Questions[3].Answer = 2
	dropped, err := keepAgreed(`{"answers":[{"question":1,"line":1,"choice":0},{"question":2,"line":1,"choice":0},{"question":3,"line":2,"choice":1},{"question":4,"line":1,"choice":2},{"question":9,"line":1,"choice":0}]}`, set)
	if err != nil || dropped != 1 || len(set.Questions) != 3 || set.Dropped != 1 || set.Questions[2].Answer != 2 {
		t.Errorf("dropped %d, kept %d: %v", dropped, len(set.Questions), err)
	}
	// The checker sees no key, note or trap.
	p := checkerPrompt(sampleArticle(), set)
	if strings.Contains(p, "Out of scope") || strings.Contains(p, "Sentence 1 says") || !strings.Contains(p, "A. Cheap land at the edge") {
		t.Error("the checker prompt leaks the key or lacks the options")
	}
}
