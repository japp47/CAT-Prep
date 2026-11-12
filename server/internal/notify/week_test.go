package notify

import (
	"strings"
	"testing"
	"time"
)

// weeklyBase: base() with the weekly review on and four days of practice this week. 15 Nov 2026 is a Sunday; its
// week began on Monday 9 Nov.
func weeklyBase() Student {
	s := base()
	s.Weekly = true
	s.WeekDays = 4
	return s
}

func TestDecideWeekly(t *testing.T) {
	p := policy(t)
	sunday := "2026-11-15"
	cases := []struct {
		name string
		edit func(*Student)
		now  time.Time
		want string
	}{
		{"weekly review off: nothing on a Sunday morning", func(s *Student) { s.Weekly = false }, at(sunday, "09:00"), ""},
		{"before the Sunday time", nil, at(sunday, "08:59"), ""},
		{"at the Sunday time: by email", nil, at(sunday, "09:00"), "weekly/email"},
		{"practised this morning: the review still goes", func(s *Student) { s.LastDay = sunday }, at(sunday, "09:30"), "weekly/email"},
		{"a bounced address: by push", func(s *Student) { s.EmailOK = false }, at(sunday, "09:00"), "weekly/push"},
		{"three emails this week already: by push", func(s *Student) { s.EmailsThisWeek = 3 }, at(sunday, "09:00"), "weekly/push"},
		{"no address and no device: nothing", func(s *Student) { s.EmailOK = false; s.PushDevices = 0 }, at(sunday, "09:00"), ""},
		{"email off for nudges does not stop the review", func(s *Student) { s.EmailMode = EmailOff }, at(sunday, "09:00"), "weekly/email"},
		{"a quiet week, practised 10 days ago: the quiet-week email", func(s *Student) { s.WeekDays = 0; s.LastDay = "2026-11-05" }, at(sunday, "09:00"), "weekly/email"},
		{"a quiet week, practised 40 days ago: nothing", func(s *Student) { s.WeekDays = 0; s.LastDay = "2026-10-06" }, at(sunday, "09:00"), ""},
		{"never practised: nothing", func(s *Student) { s.WeekDays = 0; s.LastDay = "" }, at(sunday, "09:00"), ""},
		{"a Saturday morning: nothing", nil, at("2026-11-14", "09:00"), ""},
		{"paused", func(s *Student) { s.PausedUntil = at(sunday, "12:00") }, at(sunday, "09:00"), ""},
		{"inside quiet hours", func(s *Student) { s.QuietFrom, s.QuietTo = 8*60, 10*60 }, at(sunday, "09:00"), ""},
		{"the exam day (29 Nov 2026, a Sunday): nothing", nil, at("2026-11-29", "09:00"), ""},
		{"turned on this morning: not yet", func(s *Student) { s.EnabledAt = at(sunday, "08:00") }, at(sunday, "09:00"), ""},
		{"a nudge went at 7:00: the review still goes", func(s *Student) { s.SentTodayKind = "daily" }, at(sunday, "09:00"), "weekly/email"},
		{"the evening after the review: the nudge is held back", func(s *Student) { s.SentTodayKind = "weekly"; s.LastDay = "2026-11-13" }, at(sunday, "19:45"), "weekly/email"},
	}
	for _, c := range cases {
		s := weeklyBase()
		if c.edit != nil {
			c.edit(&s)
		}
		if got := show(p.Decide(s, c.now)); got != c.want {
			t.Errorf("%s: got %q, want %q", c.name, got, c.want)
		}
	}
}

// The review's key is its week, whichever channel it takes: one a week, never two.
func TestWeeklyKeyIsTheWeek(t *testing.T) {
	p := policy(t)
	s := weeklyBase()
	email := p.Decide(s, at("2026-11-15", "09:00"))
	s.EmailOK = false
	push := p.Decide(s, at("2026-11-15", "10:00"))
	if len(email) != 1 || len(push) != 1 || email[0].Key != "id1:weekly:2026-11-09" || push[0].Key != email[0].Key {
		t.Fatalf("keys %v and %v, want both id1:weekly:2026-11-09", email, push)
	}
	if email[0].Priority != p.priority("weekly") {
		t.Errorf("priority %d, want the weekly priority", email[0].Priority)
	}
}

func TestMondayOf(t *testing.T) {
	for day, want := range map[string]string{"2026-11-09": "2026-11-09", "2026-11-12": "2026-11-09", "2026-11-15": "2026-11-09", "2026-11-16": "2026-11-16"} {
		d, _ := time.ParseInLocation(time.DateOnly, day, ist)
		if got := mondayOf(d); got != want {
			t.Errorf("mondayOf(%s) = %s, want %s", day, got, want)
		}
	}
}

func pct(n int) *int { return &n }

func goodWeek() WeekMail {
	return WeekMail{Monday: "2026-11-09", Studied: 5, DaysSoFar: 7, Questions: 64, Correct: 50, Acc: pct(78), Minutes: 200, Planned: 300,
		Improved: &Move{"Para summary", 55, 72}, Slipped: &Move{"RC", 70, 58}, Trap: &Trap{"Too narrow", 4},
		Redo: Redo{Cleared: 6, Due: 3}, Focus: &Focus{"Para jumbles", 12, pct(67)}}
}

func TestWeekMailCheck(t *testing.T) {
	sunday, _ := time.Parse(time.DateOnly, "2026-11-15")
	if err := goodWeek().Check(sunday); err != nil {
		t.Fatalf("a good week was refused: %v", err)
	}
	bad := map[string]func(*WeekMail){
		"not a Monday":             func(w *WeekMail) { w.Monday = "2026-11-10" },
		"a week long ago":          func(w *WeekMail) { w.Monday = "2026-10-19" },
		"a week far ahead":         func(w *WeekMail) { w.Monday = "2026-11-23" },
		"more days than passed":    func(w *WeekMail) { w.Studied = 6; w.DaysSoFar = 5 },
		"more right than answered": func(w *WeekMail) { w.Correct = 65 },
		"a percentage over 100":    func(w *WeekMail) { w.Acc = pct(101) },
		"a link for a name":        func(w *WeekMail) { w.Trap.Name = "https://x.example" },
		"a long name":              func(w *WeekMail) { w.Improved.Name = strings.Repeat("a", 41) },
		"markup for a name":        func(w *WeekMail) { w.Focus.Name = "<b>RC</b>" },
		"minutes beyond a week":    func(w *WeekMail) { w.Minutes = 7*24*60 + 1 },
		"negative redo":            func(w *WeekMail) { w.Redo.Due = -1 },
	}
	for name, edit := range bad {
		w := goodWeek()
		edit(&w)
		if w.Check(sunday) == nil {
			t.Errorf("%s: accepted", name)
		}
	}
}

func TestWeeklyVariant(t *testing.T) {
	g := goodWeek()
	light := goodWeek()
	light.Light = true
	few := goodWeek()
	few.Studied = 2
	for _, c := range []struct {
		m    *WeekMail
		days int
		want string
	}{{&g, 5, WeeklyGood}, {&light, 5, WeeklyLight}, {&few, 2, WeeklyLight}, {nil, 3, WeeklyDays}, {nil, 0, WeeklyQuiet}, {&g, 0, WeeklyQuiet}} {
		if got := WeeklyVariant(c.m, c.days); got != c.want {
			t.Errorf("WeeklyVariant(%v, %d) = %s, want %s", c.m != nil, c.days, got, c.want)
		}
	}
}

// The figures read as the review page shows them, from messages.json's week wording.
func TestWeekFigures(t *testing.T) {
	r := renderer(t)
	g := goodWeek()
	w, err := r.Week(&g, 5)
	if err != nil {
		t.Fatal(err)
	}
	tiles := []Tile{{"5 of 7", "days studied"}, {"64", "questions, 78% right"}, {"3 h 20 min", "of 5 h planned"}}
	for i, want := range tiles {
		if i >= len(w.Tiles) || w.Tiles[i] != want {
			t.Errorf("tile %d = %v, want %v", i, w.Tiles, want)
		}
	}
	lines := []string{"Most improved: Para summary, 55% to 72%.", "Slipped: RC, 70% to 58%.", "The trap that cost most: Too narrow, 4 times.",
		"Redo queue: 6 cleared, 3 still due.", "Last week's focus, Para jumbles: 12 questions, 67% right."}
	if strings.Join(w.Lines, "|") != strings.Join(lines, "|") {
		t.Errorf("lines\n got %q\nwant %q", w.Lines, lines)
	}
	if w.Days != 5 || w.Questions != 64 {
		t.Errorf("days %d, questions %d", w.Days, w.Questions)
	}

	// Few questions: no accuracy; no plan: minutes alone; an untouched focus says so; nothing else moved.
	thin := WeekMail{Monday: "2026-11-09", Studied: 2, DaysSoFar: 7, Questions: 9, Correct: 6, Minutes: 45, Focus: &Focus{Name: "RC"}}
	w, err = r.Week(&thin, 2)
	if err != nil {
		t.Fatal(err)
	}
	if w.Tiles[1].Label != "questions" || w.Tiles[2] != (Tile{"45 min", "studied"}) {
		t.Errorf("thin tiles %v", w.Tiles)
	}
	if len(w.Lines) != 1 || w.Lines[0] != "Last week's focus, RC: not practised this week." {
		t.Errorf("thin lines %q", w.Lines)
	}

	// No summary from the browser: one tile of the server's days; a quiet week: none.
	if w, err = r.Week(nil, 3); err != nil || len(w.Tiles) != 1 || w.Tiles[0] != (Tile{"3", "days with practice"}) || len(w.Lines) != 0 {
		t.Errorf("days only: %v %v", w, err)
	}
	if w, err = r.Week(nil, 0); err != nil || len(w.Tiles) != 0 {
		t.Errorf("quiet: %v %v", w, err)
	}
}

// Every weekly wording renders with each kind of week it is chosen for.
func TestWeeklyWordingsRender(t *testing.T) {
	r := renderer(t)
	g := goodWeek()
	for _, c := range []struct {
		m    *WeekMail
		days int
	}{{&g, 5}, {&g, 2}, {nil, 1}, {nil, 3}, {nil, 0}} {
		id := WeeklyVariant(c.m, c.days)
		w, err := r.Week(c.m, c.days)
		if err != nil {
			t.Fatal(err)
		}
		v := sample
		v.Week = w
		m, err := r.Render("weekly", id, v, links)
		if err != nil {
			t.Fatalf("%s: %v", id, err)
		}
		if strings.Contains(m.Text, "<no value>") || (c.days == 1 && !strings.Contains(m.Text, "on 1 day this week")) {
			t.Errorf("%s: %q", id, m.Text)
		}
		wantTo := "/review"
		if id == WeeklyQuiet {
			wantTo = sample.Task.Path
		}
		if !strings.Contains(m.URL, wantTo) {
			t.Errorf("%s: button goes to %s, want %s", id, m.URL, wantTo)
		}
	}
}

func TestDuration(t *testing.T) {
	for min, want := range map[int]string{0: "0 min", 45: "45 min", 60: "1 h", 200: "3 h 20 min"} {
		if got := duration(min); got != want {
			t.Errorf("duration(%d) = %q, want %q", min, got, want)
		}
	}
}
