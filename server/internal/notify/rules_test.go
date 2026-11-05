package notify

import (
	"fmt"
	"strings"
	"testing"
	"time"
)

var ist = time.FixedZone("IST", 5*3600+1800)

func policy(t *testing.T) Policy {
	t.Helper()
	p, err := LoadPolicy()
	if err != nil {
		t.Fatal(err)
	}
	return p
}

// at is a moment on a day in India. 10 Nov 2026 is a Tuesday.
func at(day, clock string) time.Time {
	t, err := time.ParseInLocation("2006-01-02 15:04", day+" "+clock, ist)
	if err != nil {
		panic(err)
	}
	return t
}

// base: reminders at 19:30, email only when days are missed, one phone, practised yesterday, a 2-day streak.
func base() Student {
	return Student{Identity: "id1", Enabled: true, At: 19*60 + 30, Days: 127, Loc: ist, QuietFrom: 23 * 60, QuietTo: 7 * 60,
		EmailMode: EmailMissed, EmailOK: true, PushDevices: 1, EnabledAt: at("2026-11-01", "10:00"), LastDay: "2026-11-09", Streak: 2}
}

func show(in []Intent) string {
	var s []string
	for _, i := range in {
		s = append(s, i.Kind+"/"+i.Channel)
	}
	return strings.Join(s, " ")
}

func TestDecide(t *testing.T) {
	p := policy(t)
	cases := []struct {
		name string
		edit func(*Student)
		now  time.Time
		want string
	}{
		{"before the student's time", nil, at("2026-11-10", "19:15"), ""},
		{"at the student's time: a push", nil, at("2026-11-10", "19:30"), "daily/push"},
		{"practised today on any device", func(s *Student) { s.LastDay = "2026-11-10" }, at("2026-11-10", "20:00"), ""},
		{"daily email chosen: the same message by both", func(s *Student) { s.EmailMode = EmailDaily }, at("2026-11-10", "19:45"), "daily/push daily/email"},
		{"no push device and email only for missed days: nothing", func(s *Student) { s.PushDevices = 0 }, at("2026-11-10", "19:45"), ""},
		{"a streak of 3 still alive", func(s *Student) { s.Streak = 3 }, at("2026-11-10", "19:45"), "daily-streak/push"},
		{"a streak of 3 already broken: plain wording", func(s *Student) { s.Streak = 3; s.LastDay = "2026-11-07" }, at("2026-11-10", "19:45"), "daily/push"},
		{"the second missed day: an email", func(s *Student) { s.LastDay = "2026-11-08" }, at("2026-11-10", "19:45"), "missed-2/email"},
		{"the second missed day, email off: a push", func(s *Student) { s.LastDay = "2026-11-08"; s.EmailMode = EmailOff }, at("2026-11-10", "19:45"), "missed-2/push"},
		{"the second missed day, bounced address: a push", func(s *Student) { s.LastDay = "2026-11-08"; s.EmailOK = false }, at("2026-11-10", "19:45"), "missed-2/push"},
		{"the second missed day, three emails this week: a push", func(s *Student) { s.LastDay = "2026-11-08"; s.EmailsThisWeek = 3 }, at("2026-11-10", "19:45"), "missed-2/push"},
		{"daily email ignores the weekly cap", func(s *Student) { s.LastDay = "2026-11-08"; s.EmailsThisWeek = 3; s.EmailMode = EmailDaily }, at("2026-11-10", "19:45"), "missed-2/email"},
		{"the third missed day: the daily push", func(s *Student) { s.LastDay = "2026-11-07" }, at("2026-11-10", "19:45"), "daily/push"},
		{"the fifth missed day", func(s *Student) { s.LastDay = "2026-11-05" }, at("2026-11-10", "19:45"), "missed-5/email"},
		{"the twelfth missed day: the last one", func(s *Student) { s.LastDay = "2026-10-29"; s.EnabledAt = at("2026-10-01", "10:00") }, at("2026-11-10", "19:45"), "missed-12/email"},
		{"the thirteenth missed day: silence", func(s *Student) { s.LastDay = "2026-10-28"; s.EnabledAt = at("2026-10-01", "10:00") }, at("2026-11-10", "19:45"), ""},
		{"never practised: counted from turning on", func(s *Student) { s.LastDay = ""; s.EnabledAt = at("2026-11-08", "09:00") }, at("2026-11-10", "19:45"), "missed-2/email"},
		{"turned on today: nothing until tomorrow", func(s *Student) { s.EnabledAt = at("2026-11-10", "08:00") }, at("2026-11-10", "19:45"), ""},
		{"turned on yesterday", func(s *Student) { s.EnabledAt = at("2026-11-09", "22:00") }, at("2026-11-10", "19:45"), "daily/push"},
		{"quiet hours", func(s *Student) { s.At = 23*60 + 15 }, at("2026-11-10", "23:30"), ""},
		{"quiet hours across midnight", func(s *Student) { s.At = 0 }, at("2026-11-10", "00:30"), ""},
		{"no reminders on this weekday (Tuesday off)", func(s *Student) { s.Days = 127 &^ (1 << 2) }, at("2026-11-10", "19:45"), ""},
		{"paused for a week", func(s *Student) { s.PausedUntil = at("2026-11-12", "00:00") }, at("2026-11-10", "19:45"), ""},
		{"a pause that has ended", func(s *Student) { s.PausedUntil = at("2026-11-10", "12:00") }, at("2026-11-10", "19:45"), "daily/push"},
		{"exam day", func(s *Student) { s.LastDay = "2026-11-28" }, at("2026-11-29", "19:45"), ""},
		{"the day before the exam", func(s *Student) { s.LastDay = "2026-11-27" }, at("2026-11-28", "19:45"), ""},
		{"two days before the exam", func(s *Student) { s.LastDay = "2026-11-26" }, at("2026-11-27", "19:45"), "daily/push"},
		{"reminders off", func(s *Student) { s.Enabled = false }, at("2026-11-10", "19:45"), ""},
		{"no time zone: fail closed", func(s *Student) { s.Loc = nil }, at("2026-11-10", "19:45"), ""},
		{"already sent today: the same message may finish on its other channel", func(s *Student) { s.EmailMode = EmailDaily; s.SentTodayKind = "daily" }, at("2026-11-10", "20:00"), "daily/push daily/email"},
		{"already sent another kind today: nothing", func(s *Student) { s.SentTodayKind = "missed-2" }, at("2026-11-10", "20:00"), ""},
		{"less than 12 hours since yesterday's message", func(s *Student) { s.At = 7 * 60; s.LastSentBefore = at("2026-11-09", "22:00") }, at("2026-11-10", "07:30"), ""},
		{"12 hours since yesterday's message", func(s *Student) { s.At = 7 * 60; s.LastSentBefore = at("2026-11-09", "19:30") }, at("2026-11-10", "07:30"), "daily/push"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			s := base()
			if c.edit != nil {
				c.edit(&s)
			}
			if got := show(p.Decide(s, c.now)); got != c.want {
				t.Errorf("got %q, want %q", got, c.want)
			}
		})
	}
}

func TestDecideKeysAndPriority(t *testing.T) {
	p := policy(t)
	s := base()
	s.EmailMode = EmailDaily
	got := p.Decide(s, at("2026-11-10", "19:45"))
	if len(got) != 2 || got[0].Key != "id1:daily:push:2026-11-10" || got[1].Key != "id1:daily:email:2026-11-10" || got[0].Day != "2026-11-10" {
		t.Fatalf("daily keys: %+v", got)
	}
	// A missed-days message is keyed by the day of the last practice, so each step goes once per spell.
	s.LastDay = "2026-11-08"
	got = p.Decide(s, at("2026-11-10", "19:45"))
	if len(got) != 1 || got[0].Key != "id1:missed-2:email:2026-11-08" || got[0].Missed != 2 {
		t.Fatalf("missed key: %+v", got)
	}
	if !(p.priority("missed-5") < p.priority("weekly") && p.priority("weekly") < p.priority("daily-streak")) {
		t.Error("missed days go first, then the weekly review, then daily reminders")
	}
}

// The student's own time zone decides the day and the hour: 19:30 in London is after midnight in India.
func TestDecideUsesTheStudentsTimeZone(t *testing.T) {
	p := policy(t)
	london, err := time.LoadLocation("Europe/London")
	if err != nil {
		t.Skip("no time zone data")
	}
	s := base()
	s.Loc = london
	if got := show(p.Decide(s, at("2026-11-11", "01:15"))); got != "daily/push" { // 19:45 in London, 10 Nov
		t.Errorf("London evening: got %q", got)
	}
	if got := show(p.Decide(s, at("2026-11-10", "19:45"))); got != "" { // 14:15 in London
		t.Errorf("London afternoon: got %q", got)
	}
}

func TestQuiet(t *testing.T) {
	for _, c := range []struct {
		m, from, to int
		want        bool
	}{{1379, 1380, 420, false}, {1380, 1380, 420, true}, {0, 1380, 420, true}, {419, 1380, 420, true}, {420, 1380, 420, false},
		{600, 540, 720, true}, {720, 540, 720, false}, {100, 0, 0, false}} {
		if got := quiet(c.m, c.from, c.to); got != c.want {
			t.Errorf("quiet(%d, %d, %d) = %v", c.m, c.from, c.to, got)
		}
	}
}

func TestPolicyChecks(t *testing.T) {
	good := policy(t)
	for name, edit := range map[string]func(*Policy){
		"time off the clock":     func(p *Policy) { p.DefaultTime = 1500 },
		"time off a step":        func(p *Policy) { p.DefaultTime = 1171 },
		"two messages a day":     func(p *Policy) { p.MaxStudyMessagesPerDay = 2 },
		"missed days not rising": func(p *Policy) { p.MissedDays = []int{5, 2} },
		"missed day 1":           func(p *Policy) { p.MissedDays = []int{1, 5} },
		"no missed days":         func(p *Policy) { p.MissedDays = nil },
		"exam not a date":        func(p *Policy) { p.Exams = []string{"29 Nov"} },
		"unknown priority":       func(p *Policy) { p.EmailPriority = []string{"news"} },
		"no stale limit":         func(p *Policy) { p.StaleAfterHours = 0 },
	} {
		p := good
		p.MissedDays = append([]int(nil), good.MissedDays...)
		edit(&p)
		if p.check() == nil {
			t.Errorf("%s: accepted", name)
		}
	}
	if fmt.Sprint(good.MissedDays) != "[2 5 12]" {
		t.Errorf("the spec's series is 2, 5, 12; policy.json has %v", good.MissedDays)
	}
}
