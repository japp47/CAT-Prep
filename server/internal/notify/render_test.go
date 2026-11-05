package notify

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"testing"
	"unicode/utf8"
)

func renderer(t *testing.T) *Renderer {
	t.Helper()
	r, err := NewRenderer()
	if err != nil {
		t.Fatal(err)
	}
	return r
}

var sample = Vars{Streak: 12, Missed: 5,
	Task: &Task{Label: "RC of the day", Title: "The ethics of nudging", Detail: "4 questions, about 7 minutes", Path: "/practice/rc/rc-ethics-nudging", Mins: 7},
	Week: &Week{Days: 5, Questions: 62, Tiles: []Tile{{"5 of 7", "days you practised"}, {"62", "questions answered"}, {"71%", "right first time"}},
		Lines: []string{"Work on next: para jumbles, 4 of 10 right."}}}

var links = Links{Site: "https://99ile.pages.dev", MessageID: 42, Token: "tok"}

// The content test (docs/design/notifications.md §1): every wording renders, fits, and can be stopped.
func TestEveryWordingRendersAndFits(t *testing.T) {
	r := renderer(t)
	p := policy(t)
	want := []string{"daily", "daily-streak", "weekly"}
	for _, d := range p.MissedDays {
		want = append(want, fmt.Sprintf("missed-%d", d))
	}
	for _, k := range want {
		if len(r.Variants(k)) == 0 {
			t.Errorf("no wording for %s, which the rules can send", k)
		}
	}
	for _, kind := range r.Kinds() {
		for _, id := range r.Variants(kind) {
			for _, name := range []string{"", "Aarav"} {
				v := sample
				v.Name = name
				m, err := r.Render(kind, id, v, links)
				if err != nil {
					t.Errorf("%s: %v", id, err)
					continue
				}
				if n := utf8.RuneCountInString(m.Subject); n == 0 || n > 50 {
					t.Errorf("%s: subject %q is %d characters (1 to 50)", id, m.Subject, n)
				}
				if n := utf8.RuneCountInString(m.PushTitle + m.PushBody); m.PushTitle == "" || n > 120 {
					t.Errorf("%s: push %q / %q is %d characters (at most 120)", id, m.PushTitle, m.PushBody, n)
				}
				for _, part := range []string{m.HTML, m.Text, m.Subject, m.PushTitle, m.PushBody} {
					if strings.Contains(part, "<no value>") || strings.Contains(part, "{{") {
						t.Errorf("%s: an unfilled placeholder in %q", id, part)
					}
				}
				for _, must := range []string{"https://99ile.pages.dev/unsubscribe?t=tok", "https://99ile.pages.dev/settings?from=reminder-" + kind + "&m=42#reminders"} {
					if !strings.Contains(m.Text, must) || !strings.Contains(m.HTML, strings.ReplaceAll(must, "&", "&amp;")) {
						t.Errorf("%s: missing %s", id, must)
					}
				}
				if !strings.HasPrefix(m.URL, "https://99ile.pages.dev/") || !strings.Contains(m.URL, "from=reminder-"+kind) {
					t.Errorf("%s: button goes to %s", id, m.URL)
				}
				if m.UnsubscribeURL != "https://99ile.pages.dev/api/v1/unsubscribe?t=tok" {
					t.Errorf("%s: one-click address %s", id, m.UnsubscribeURL)
				}
			}
		}
	}
}

func TestButtonsGoWhereTheWordingSays(t *testing.T) {
	r := renderer(t)
	for kind, path := range map[string]string{"daily": "/practice/rc/rc-ethics-nudging", "missed-2": "/practice/rc/rc-ethics-nudging", "missed-12": "/today", "weekly": "/review"} {
		m, err := r.Render(kind, r.Variants(kind)[0], sample, links)
		if err != nil {
			t.Fatal(err)
		}
		if !strings.HasPrefix(m.URL, "https://99ile.pages.dev"+path+"?") {
			t.Errorf("%s: button %s, want %s", kind, m.URL, path)
		}
	}
	m, _ := r.Render("missed-12", r.Variants("missed-12")[0], sample, links)
	if strings.Contains(m.HTML, "The ethics of nudging") {
		t.Error("the last reminder shows no task card")
	}
}

func TestLayoutHasNoSmallText(t *testing.T) {
	raw, err := files.ReadFile("templates/layout.html")
	if err != nil {
		t.Fatal(err)
	}
	for _, m := range regexp.MustCompile(`font-size:\s*(\d+)px`).FindAllStringSubmatch(string(raw), -1) {
		if n, _ := strconv.Atoi(m[1]); n > 0 && n < 14 {
			t.Errorf("font-size %spx: no text under 14px (docs/design/redesign-plan.md)", m[1])
		}
	}
}

func TestMissingPlaceholderIsAnError(t *testing.T) {
	r := renderer(t)
	if _, err := r.Render("daily", r.Variants("daily")[0], Vars{}, links); err == nil {
		t.Error("a daily reminder without its task rendered")
	}
	if _, err := r.Render("daily", "no-such", sample, links); err == nil {
		t.Error("an unknown wording rendered")
	}
}

func TestStudentTextIsEscaped(t *testing.T) {
	r := renderer(t)
	v := sample
	task := *sample.Task
	task.Title = `<script>x</script>`
	v.Task = &task
	m, err := r.Render("daily", r.Variants("daily")[0], v, links)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(m.HTML, "<script>") {
		t.Error("a title reached the HTML unescaped")
	}
}

func TestNextVariantRotates(t *testing.T) {
	r := renderer(t)
	ids := r.Variants("daily")
	if len(ids) < 2 {
		t.Skip("one wording")
	}
	if r.NextVariant("daily", "") != ids[0] || r.NextVariant("daily", ids[0]) != ids[1] || r.NextVariant("daily", ids[len(ids)-1]) != ids[0] {
		t.Error("wordings do not rotate in file order")
	}
}
