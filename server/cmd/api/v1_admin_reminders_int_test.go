package main

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"github.com/japp47/CAT-Prep/server/internal/admin"
	"github.com/japp47/CAT-Prep/server/internal/ids"
)

// The Reminders panel (R2, D97): counts for anyone with stats.read, actions only with reminders.manage (admins),
// 404 for everyone else; marking an address bounced by hand is audited with the count, never the address.
func TestRemindersPanel(t *testing.T) {
	srv, owner, g := signInServer(t)
	ctx := context.Background()
	staff := func(role string) *device {
		email := ids.New()[24:] + "@example.com"
		d := newDevice(t, srv).turnOn()
		if out, _ := d.google(g.person(email, true), nil); out != "done" {
			t.Fatalf("sign in: %q", out)
		}
		if role != "" {
			if _, err := admin.Grant(ctx, owner, email, role, "test", false); err != nil {
				t.Fatal(err)
			}
		}
		return d
	}
	codes := func(d *device) []int {
		return []int{d.get("/v1/admin/reminders", nil),
			d.call("/v1/admin/reminders/test", map[string]any{"kind": "weekly", "id": "weekly-good"}, nil),
			d.call("/v1/admin/reminders/bounced", map[string]any{"email": "x@example.com"}, nil)}
	}
	if got := codes(staff("")); !all(got, http.StatusNotFound) {
		t.Errorf("an account without a role: %v", got)
	}
	if got := codes(staff("moderator")); got[0] != http.StatusOK || got[1] != http.StatusNotFound || got[2] != http.StatusNotFound {
		t.Errorf("a moderator: %v, want counts only", got)
	}

	// A student with reminders and email on, to be marked by hand.
	studentEmail := "Bounce-" + ids.New()[24:] + "@example.com"
	stu := staff("")
	if _, err := owner.Exec(ctx, `update account.users set email = $1 where identity_id = $2`, studentEmail, stu.ID.IdentityID); err != nil {
		t.Fatal(err)
	}
	if _, err := owner.Exec(ctx, `insert into notify.prefs (identity_id, enabled, enabled_at, email_mode) values ($1, true, now(), 'missed')`, stu.ID.IdentityID); err != nil {
		t.Fatal(err)
	}

	a := staff("admin")
	var raw json.RawMessage
	if code := a.get("/v1/admin/reminders", &raw); code != http.StatusOK {
		t.Fatalf("panel: %d", code)
	}
	var stats struct {
		Setup    map[string]any
		Students map[string]float64
		Days     []struct{ Day string }
	}
	_ = json.Unmarshal(raw, &stats)
	if stats.Students["remindersOn"] < 1 || stats.Students["emailOn"] < 1 || len(stats.Days) != 14 || stats.Setup == nil {
		t.Errorf("panel: %s", raw)
	}
	if strings.Contains(strings.ToLower(string(raw)), "@example.com") {
		t.Error("the panel names a student's address; it must be counts only")
	}
	// No channel on this test server: a test cannot be sent, and says why.
	if code := a.call("/v1/admin/reminders/test", map[string]any{"kind": "weekly", "id": "weekly-good"}, nil); code != http.StatusServiceUnavailable {
		t.Errorf("test with no channel: %d", code)
	}
	if code := a.call("/v1/admin/reminders/bounced", map[string]any{"email": "not an address"}, nil); code != http.StatusBadRequest {
		t.Errorf("a bad address: %d", code)
	}
	var out struct{ Marked int }
	if code := a.call("/v1/admin/reminders/bounced", map[string]any{"email": strings.ToLower(studentEmail)}, &out); code != http.StatusOK || out.Marked != 1 {
		t.Fatalf("mark: %d %+v", code, out)
	}
	var state, meta string
	_ = owner.QueryRow(ctx, `select email_state from notify.prefs where identity_id = $1`, stu.ID.IdentityID).Scan(&state)
	_ = owner.QueryRow(ctx, `select meta::text from audit.events where action = 'reminders.bounce_marked' and actor_identity_id = $1 order by id desc limit 1`, a.ID.IdentityID).Scan(&meta)
	if state != "bounced" || !strings.Contains(meta, `"marked": 1`) || strings.Contains(strings.ToLower(meta), "example.com") {
		t.Errorf("after marking: state %q, audit meta %q", state, meta)
	}
}
