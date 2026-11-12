package main

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/japp47/CAT-Prep/server/internal/notify"
)

// The weekly review's figures (R2, D97): stored only while the weekly review is on, refused when they are not a
// week's figures, deleted when it is switched off or unsubscribed, exported, and gone with the identity.
func TestWeeklyReviewFigures(t *testing.T) {
	srv, admin := notifyServer(t)
	ctx := context.Background()
	d := newDevice(t, srv).turnOn()
	if _, err := admin.Exec(ctx, `insert into account.users (id, identity_id, email, email_verified) values (gen_random_uuid(), $1, 'w@example.com', true)`, d.ID.IdentityID); err != nil {
		t.Fatal(err)
	}
	kolkata, _ := time.LoadLocation("Asia/Kolkata")
	now := time.Now().In(kolkata)
	monday := now.AddDate(0, 0, -((int(now.Weekday()) + 6) % 7)).Format(time.DateOnly)
	week := map[string]any{"monday": monday, "studied": 1, "daysSoFar": (int(now.Weekday())+6)%7 + 1, "questions": 12, "correct": 9, "acc": nil,
		"minutes": 40, "planned": 90, "light": false, "improved": nil, "slipped": nil, "trap": map[string]any{"name": "Too narrow", "n": 2},
		"redo": map[string]any{"cleared": 1, "due": 2}, "focus": nil}
	prefs := map[string]any{"on": true, "at": 1170, "days": []int{0, 1, 2, 3, 4, 5, 6}, "timeZone": "Asia/Kolkata", "quietFrom": 1380, "quietTo": 420,
		"email": "off", "weekly": false, "pausedUntil": nil}
	stored := func() int {
		var n int
		_ = admin.QueryRow(ctx, `select count(*) from notify.weeks where identity_id = $1`, d.ID.IdentityID).Scan(&n)
		return n
	}

	if code := d.send("PUT", "/v1/notify/prefs", prefs, nil); code != http.StatusOK {
		t.Fatalf("prefs: %d", code)
	}
	if code := d.send("PUT", "/v1/notify/week", week, nil); code != http.StatusNoContent || stored() != 0 {
		t.Fatalf("weekly off: %d, %d stored; want 204 and nothing kept", code, stored())
	}
	prefs["weekly"] = true
	if code := d.send("PUT", "/v1/notify/prefs", prefs, nil); code != http.StatusOK {
		t.Fatalf("weekly on: %d", code)
	}
	if code := d.send("PUT", "/v1/notify/week", week, nil); code != http.StatusNoContent || stored() != 1 {
		t.Fatalf("weekly on: %d, %d stored", code, stored())
	}
	week["questions"] = 20
	if code := d.send("PUT", "/v1/notify/week", week, nil); code != http.StatusNoContent || stored() != 1 {
		t.Errorf("a rewrite: %d, %d rows", code, stored())
	}
	for name, edit := range map[string]func(map[string]any){
		"not a Monday":   func(m map[string]any) { m["monday"] = now.AddDate(0, 0, 7).Format("2006-01-02") + "x" },
		"an extra field": func(m map[string]any) { m["answers"] = []string{"B"} },
		"a link as name": func(m map[string]any) { m["trap"] = map[string]any{"name": "https://evil.example", "n": 2} },
		"too much text":  func(m map[string]any) { m["trap"] = map[string]any{"name": strings.Repeat("a", 3000), "n": 2} },
	} {
		m := map[string]any{}
		for k, v := range week {
			m[k] = v
		}
		edit(m)
		if code := d.send("PUT", "/v1/notify/week", m, nil); code != http.StatusBadRequest && code != http.StatusRequestEntityTooLarge {
			t.Errorf("%s: %d", name, code)
		}
	}

	// A synced attempt records the day, for the server's own count.
	if _, code := d.push(change("rc:week-1", `{"c":3}`, 0)); code != http.StatusOK {
		t.Fatalf("push: %d", code)
	}
	var days int
	_ = admin.QueryRow(ctx, `select count(*) from notify.days where identity_id = $1`, d.ID.IdentityID).Scan(&days)
	if days != 1 {
		t.Errorf("practice days: %d, want 1", days)
	}

	// The export carries the reminders, the figures included.
	var export struct {
		Reminders struct {
			Settings      struct{ Weekly bool }
			PracticeDays  []string
			WeeklyFigures []struct {
				Monday  string
				Figures struct{ Questions int }
			}
		}
	}
	if code := d.send("GET", "/v1/me/export", nil, &export); code != http.StatusOK || !export.Reminders.Settings.Weekly || len(export.Reminders.PracticeDays) != 1 ||
		len(export.Reminders.WeeklyFigures) != 1 || export.Reminders.WeeklyFigures[0].Monday != monday || export.Reminders.WeeklyFigures[0].Figures.Questions != 20 {
		t.Errorf("export: %d %+v", code, export.Reminders)
	}

	// Switching the weekly review off deletes the figures.
	prefs["weekly"] = false
	if code := d.send("PUT", "/v1/notify/prefs", prefs, nil); code != http.StatusOK || stored() != 0 {
		t.Errorf("weekly off: %d, %d rows left", code, stored())
	}
	// So does the weekly email's one-click unsubscribe.
	prefs["weekly"] = true
	d.send("PUT", "/v1/notify/prefs", prefs, nil)
	d.send("PUT", "/v1/notify/week", week, nil)
	tok := notify.Tokens{Key: notifyKey}.Make(d.ID.IdentityID, notify.ScopeWeekly)
	if code := newDevice(t, srv).send("POST", "/v1/unsubscribe?t="+tok, nil, nil); code != http.StatusOK {
		t.Fatalf("unsubscribe: %d", code)
	}
	var weeklyOn bool
	_ = admin.QueryRow(ctx, `select weekly from notify.prefs where identity_id = $1`, d.ID.IdentityID).Scan(&weeklyOn)
	if weeklyOn || stored() != 0 {
		t.Errorf("after unsubscribe: weekly %v, %d rows", weeklyOn, stored())
	}

	// Deleting the identity takes the days with it.
	d.send("PUT", "/v1/notify/prefs", map[string]any{"on": true, "at": 1170, "days": []int{1}, "timeZone": "Asia/Kolkata", "quietFrom": 0, "quietTo": 0, "email": "off", "weekly": true, "pausedUntil": nil}, nil)
	d.send("PUT", "/v1/notify/week", week, nil)
	if code := d.del("/v1/me"); code != http.StatusNoContent && code != http.StatusOK {
		t.Fatalf("delete: %d", code)
	}
	var left int
	_ = admin.QueryRow(ctx, `select (select count(*) from notify.days where identity_id = $1) + (select count(*) from notify.weeks where identity_id = $1)`, d.ID.IdentityID).Scan(&left)
	if left != 0 {
		t.Errorf("%d weekly rows left after delete", left)
	}
}
