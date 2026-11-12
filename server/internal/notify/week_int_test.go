package notify

import (
	"context"
	"encoding/json"
	"testing"
	"time"
)

// thisSunday is the Sunday ending the current week in India, at 10:00: the planner's clock for weekly tests. A
// practice recorded now falls inside its week.
func thisSunday() time.Time {
	kolkata, _ := time.LoadLocation("Asia/Kolkata")
	now := time.Now().In(kolkata)
	d := now.AddDate(0, 0, (7-int(now.Weekday()))%7)
	return time.Date(d.Year(), d.Month(), d.Day(), 10, 0, 0, 0, kolkata)
}

func TestWeeklyPlan(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	s := service(t, db, &fakeChannel{name: Push}, &fakeChannel{name: Email})
	sunday := thisSunday()
	s.Now = func() time.Time { return sunday }
	monday := mondayOf(sunday)
	exec := func(sql string, args ...any) {
		t.Helper()
		if _, err := db.Exec(ctx, sql, args...); err != nil {
			t.Fatal(err)
		}
	}
	weekly := func(id string) { exec(`update notify.prefs set weekly = true where identity_id = $1`, id) }

	// a: practised this week, and the browser sent its summary.
	a := student(t, db, EmailMissed, 0)
	weekly(a)
	practise(t, db, a)
	g := goodWeek()
	g.Monday = monday
	data, _ := json.Marshal(g)
	exec(`insert into notify.weeks (identity_id, monday, data) values ($1, $2, $3::jsonb)`, a, monday, string(data))
	// b: practised this week, no summary from the browser.
	b := student(t, db, EmailMissed, 0)
	weekly(b)
	practise(t, db, b)
	// c: weekly on, last practised 40 days ago, nothing this week.
	c := student(t, db, EmailMissed, 0)
	weekly(c)
	exec(`update notify.activity set last_day = current_date - 40 where identity_id = $1`, c)
	// d: practised this week, weekly off.
	d := student(t, db, EmailMissed, 0)
	practise(t, db, d)

	if _, _, err := s.Plan(ctx, false); err != nil {
		t.Fatal(err)
	}
	for id, want := range map[string]string{a: "weekly/email=queued", b: "weekly/email=queued", c: "", d: ""} {
		if got := statuses(t, db, id); got != want {
			t.Errorf("%s: got %q, want %q", id[:8], got, want)
		}
	}
	var variant, dedupe string
	var vars []byte
	if err := db.QueryRow(ctx, `select variant, dedupe_key, vars from notify.messages where identity_id = $1`, a).Scan(&variant, &dedupe, &vars); err != nil {
		t.Fatal(err)
	}
	var v Vars
	_ = json.Unmarshal(vars, &v)
	if variant != WeeklyGood || dedupe != a+":weekly:"+monday || v.Week == nil || v.Week.Questions != 64 || len(v.Week.Lines) != 5 {
		t.Errorf("a: variant %s, key %s, week %+v", variant, dedupe, v.Week)
	}
	if err := db.QueryRow(ctx, `select variant, vars from notify.messages where identity_id = $1`, b).Scan(&variant, &vars); err != nil {
		t.Fatal(err)
	}
	v = Vars{}
	_ = json.Unmarshal(vars, &v)
	if variant != WeeklyDays || v.Week == nil || v.Week.Days != 1 || len(v.Week.Tiles) != 1 {
		t.Errorf("b: variant %s, week %+v", variant, v.Week)
	}
	if _, queued, _ := s.Plan(ctx, false); queued != 0 {
		t.Errorf("a second plan queued %d weekly messages", queued)
	}

	// The cleanup forgets days and weeks older than eight weeks, and keeps this week's.
	old := mondayOf(sunday.AddDate(0, 0, -70))
	exec(`insert into notify.days (identity_id, day) values ($1, $2::date)`, a, old)
	exec(`insert into notify.weeks (identity_id, monday, data) values ($1, $2, '{}'::jsonb)`, a, old)
	if _, err := s.Store.ForgetOld(ctx); err != nil {
		t.Fatal(err)
	}
	var days, weeks int
	_ = db.QueryRow(ctx, `select (select count(*) from notify.days where identity_id = $1), (select count(*) from notify.weeks where identity_id = $1)`, a).Scan(&days, &weeks)
	if days != 1 || weeks != 1 {
		t.Errorf("after cleanup: %d days and %d weeks, want this week's one of each", days, weeks)
	}
}
