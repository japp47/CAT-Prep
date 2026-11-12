package notify

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestWorkerMarksBouncedStudents(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	s := service(t, db, &fakeChannel{name: Email})
	a := student(t, db, EmailDaily, 0)
	other := student(t, db, EmailDaily, 0)
	var addr string
	if err := db.QueryRow(ctx, `select email from account.users where identity_id = $1`, a).Scan(&addr); err != nil {
		t.Fatal(err)
	}
	// Bounce ids are unique per test run, as Gmail's are.
	b1, b2 := "b1-"+a[:8], "b2-"+a[:8]
	reader, opened := fakeGmailInbox(t, BounceLabel, map[string]string{b1: "Someone <" + addr + ">", b2: ""}, http.StatusOK)
	w := &Worker{Service: s, Bounces: reader, Log: silent}
	w.checkBounces(ctx)

	state := func(id string) string {
		var st string
		_ = db.QueryRow(ctx, `select email_state from notify.prefs where identity_id = $1`, id).Scan(&st)
		return st
	}
	if state(a) != "bounced" || state(other) != "ok" {
		t.Fatalf("after the check: %s and %s, want bounced and ok", state(a), state(other))
	}
	var n, matched int
	_ = db.QueryRow(ctx, `select count(*), count(*) filter (where matched) from notify.bounces where gmail_id in ($1, $2)`, b1, b2).Scan(&n, &matched)
	if n != 2 || matched != 1 {
		t.Errorf("bounces kept: %d, matched %d; want 2 and 1 (the one without a header is kept, unmatched)", n, matched)
	}
	// The planner now sends a's daily email to push only, and a has no device: nothing for a.
	if _, _, err := s.Plan(ctx, false); err != nil {
		t.Fatal(err)
	}
	if got := statuses(t, db, a); got != "" {
		t.Errorf("a bounced student was planned an email: %s", got)
	}
	// An hour later the same bounces are not read again, and a student who turned email back on stays on.
	if _, err := db.Exec(ctx, `update notify.prefs set email_state = 'ok' where identity_id = $1`, a); err != nil {
		t.Fatal(err)
	}
	*opened = nil
	w.bounced = time.Time{}
	w.checkBounces(ctx)
	if len(*opened) != 0 || state(a) != "ok" {
		t.Errorf("second check opened %v and left a %s", *opened, state(a))
	}
	// The owner's fallback marks by address, whatever its case.
	if marked, err := s.Store.MarkBounced(ctx, "  "+strings.ToUpper(addr[:1])+addr[1:]); err != nil || marked != 1 || state(a) != "bounced" {
		t.Errorf("mark by hand: %d, %v, %s", marked, err, state(a))
	}
}
