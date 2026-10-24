package main

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/japp47/CAT-Prep/server/internal/admin"
	"github.com/japp47/CAT-Prep/server/internal/ids"
)

// The admin API (B8, docs/feature.md F79), end to end as cat_app: who gets in, what a change writes, and that the
// overview holds counts only.

func (d *device) get(path string, out any) int {
	d.t.Helper()
	res, err := d.c.Get(d.srv.URL + path)
	if err != nil {
		d.t.Fatal(err)
	}
	defer res.Body.Close()
	if out != nil {
		_ = json.NewDecoder(res.Body).Decode(out)
	}
	return res.StatusCode
}

// adminCodes is what each admin route answers this browser.
func (d *device) adminCodes() []int {
	return []int{
		d.get("/v1/admin/me", nil),
		d.get("/v1/admin/reports", nil),
		d.get("/v1/admin/overview", nil),
		d.call("/v1/admin/reports/status", map[string]any{"ids": []int64{1}, "status": "seen"}, nil),
	}
}

func all(codes []int, want int) bool {
	for _, c := range codes {
		if c != want {
			return false
		}
	}
	return true
}

func TestAdminRoutesAre404ForEveryoneButStaff(t *testing.T) {
	srv, owner, g := signInServer(t)
	ctx := context.Background()
	if got := newDevice(t, srv).adminCodes(); !all(got, http.StatusNotFound) {
		t.Fatalf("no sync: %v", got)
	}
	if got := newDevice(t, srv).turnOn().adminCodes(); !all(got, http.StatusNotFound) {
		t.Fatalf("sync without an account: %v", got)
	}
	email := ids.New()[24:] + "@example.com"
	d := newDevice(t, srv).turnOn()
	if out, _ := d.google(g.person(email, true), nil); out != "done" {
		t.Fatalf("sign in: %q", out)
	}
	if got := d.adminCodes(); !all(got, http.StatusNotFound) {
		t.Fatalf("an account without a role: %v", got)
	}
	if _, err := admin.Grant(ctx, owner, email, "admin", "test", false); err != nil {
		t.Fatal(err)
	}
	if got := d.adminCodes(); !all(got, http.StatusOK) {
		t.Fatalf("staff: %v", got)
	}
	if _, err := admin.Grant(ctx, owner, email, "admin", "", true); err != nil {
		t.Fatal(err)
	}
	if got := d.adminCodes(); !all(got, http.StatusNotFound) {
		t.Fatalf("a revoked role: %v", got)
	}
}

func TestClosingAQuestionsReports(t *testing.T) {
	srv, owner, g := signInServer(t)
	ctx := context.Background()
	item := "rc:t-" + ids.New()[24:] + ":2"
	student := newDevice(t, srv).turnOn()
	for _, note := range []string{"Key says B.", "B is right, not C."} {
		if got := student.call("/v1/feedback", map[string]string{"page": "/practice/rc/x", "itemId": item, "kind": "answer_key", "note": note}, nil); got != http.StatusCreated {
			t.Fatalf("report: %d", got)
		}
	}
	email := ids.New()[24:] + "@example.com"
	staff := newDevice(t, srv).turnOn()
	if out, _ := staff.google(g.person(email, true), nil); out != "done" {
		t.Fatalf("staff sign in: %q", out)
	}
	if _, err := admin.Grant(ctx, owner, email, "moderator", "", false); err != nil {
		t.Fatal(err)
	}

	var list struct{ Reports []admin.Report }
	if got := staff.get("/v1/admin/reports?state=open", &list); got != http.StatusOK {
		t.Fatalf("list: %d", got)
	}
	var mine []int64
	for _, r := range list.Reports {
		if r.ItemID == item {
			mine = append(mine, r.ID)
			if r.Note == "" || r.Status != "new" {
				t.Fatalf("report %+v", r)
			}
		}
	}
	if len(mine) != 2 {
		t.Fatalf("want both reports in the open list, got %d", len(mine))
	}

	var out struct{ Changed int }
	if got := staff.call("/v1/admin/reports/status", map[string]any{"ids": mine, "status": "fixed"}, &out); got != http.StatusOK || out.Changed != 2 {
		t.Fatalf("fix: %d %+v", got, out)
	}
	var byEmail string
	var closed, audits int
	_ = owner.QueryRow(ctx, `select count(*) filter (where handled_at is not null and status = 'fixed'), min(u.email)
		from support.feedback f join account.users u on u.id = f.handled_by where f.id = any($1)`, mine).Scan(&closed, &byEmail)
	_ = owner.QueryRow(ctx, `select count(*) from audit.events where action = 'feedback.resolved' and actor_type = 'admin'
		and subject_identity_id = $1 and meta->>'status' = 'fixed'`, student.ID.IdentityID).Scan(&audits)
	if closed != 2 || byEmail != email || audits != 2 {
		t.Fatalf("closed %d by %q, %d audit events", closed, byEmail, audits)
	}
	if staff.call("/v1/admin/reports/status", map[string]any{"ids": mine, "status": "fixed"}, &out); out.Changed != 0 {
		t.Fatalf("fixing again changed %d", out.Changed)
	}
	staff.get("/v1/admin/reports?state=closed", &list)
	found := 0
	for _, r := range list.Reports {
		if r.ItemID == item && r.HandledBy == email && r.HandledAt != nil {
			found++
		}
	}
	if found != 2 {
		t.Fatalf("closed list has %d of them", found)
	}

	// Reopen: back to seen, handled_at cleared, as the table's check requires.
	staff.call("/v1/admin/reports/status", map[string]any{"ids": mine, "status": "seen"}, &out)
	var open int
	_ = owner.QueryRow(ctx, `select count(*) from support.feedback where id = any($1) and status = 'seen' and handled_at is null`, mine).Scan(&open)
	if out.Changed != 2 || open != 2 {
		t.Fatalf("reopen: changed %d, open %d", out.Changed, open)
	}

	for _, bad := range []map[string]any{{"ids": mine, "status": "new"}, {"ids": []int64{}, "status": "seen"}, {"ids": make([]int64, 101), "status": "seen"}} {
		if got := staff.call("/v1/admin/reports/status", bad, nil); got != http.StatusBadRequest {
			t.Fatalf("%v: %d", bad, got)
		}
	}
}

func TestOverviewIsCountsOnly(t *testing.T) {
	srv, owner, g := signInServer(t)
	email := ids.New()[24:] + "@example.com"
	d := newDevice(t, srv).turnOn()
	d.google(g.person(email, true), nil)
	if _, err := admin.Grant(context.Background(), owner, email, "admin", "", false); err != nil {
		t.Fatal(err)
	}
	var o map[string]any
	if got := d.get("/v1/admin/overview", &o); got != http.StatusOK {
		t.Fatalf("overview: %d", got)
	}
	if len(o) != 12 {
		t.Fatalf("want 12 counts, got %d: %v", len(o), o)
	}
	for k, v := range o {
		if _, ok := v.(float64); !ok {
			t.Fatalf("%s is %T, not a count", k, v)
		}
	}
	if o["identities"].(float64) < 1 || o["databaseBytes"].(float64) <= 0 {
		t.Fatalf("overview %v", o)
	}
}

func TestGrantNeedsOneAccountAndIsIdempotent(t *testing.T) {
	srv, owner, g := signInServer(t)
	ctx := context.Background()
	if _, err := admin.Grant(ctx, owner, "nobody-"+ids.New()+"@example.com", "admin", "", false); err != admin.ErrNoUser {
		t.Fatalf("unknown email: %v", err)
	}
	email := ids.New()[24:] + "@example.com"
	newDevice(t, srv).turnOn().google(g.person(email, true), nil)
	for i, want := range []bool{true, false} {
		if changed, err := admin.Grant(ctx, owner, email, "admin", "", false); err != nil || changed != want {
			t.Fatalf("grant %d: %v %v", i, changed, err)
		}
	}
	var events int
	_ = owner.QueryRow(ctx, `select count(*) from audit.events e join access.grants g on e.target_id = g.id::text
		join account.users u on u.id = g.user_id where e.action = 'role.granted' and e.actor_type = 'system' and u.email = $1`, email).Scan(&events)
	if events != 1 {
		t.Fatalf("want one role.granted event, got %d", events)
	}
}

// A role checks its own permissions, not "is staff": one that may only read reports cannot close them or see counts.
func TestEachRouteNeedsItsOwnPermission(t *testing.T) {
	srv, owner, g := signInServer(t)
	ctx := context.Background()
	_, err := owner.Exec(ctx, `insert into access.roles (key, name, description) values ('reader_test', 'Reader', 'test only') on conflict do nothing;
		insert into access.role_permissions values ('reader_test', 'feedback.read') on conflict do nothing`)
	if err != nil {
		t.Fatal(err)
	}
	email := ids.New()[24:] + "@example.com"
	d := newDevice(t, srv).turnOn()
	d.google(g.person(email, true), nil)
	if _, err := admin.Grant(ctx, owner, email, "reader_test", "", false); err != nil {
		t.Fatal(err)
	}
	got := d.adminCodes()
	if want := []int{http.StatusOK, http.StatusOK, http.StatusNotFound, http.StatusNotFound}; got[0] != want[0] || got[1] != want[1] || got[2] != want[2] || got[3] != want[3] {
		t.Fatalf("me, reports, overview, status: %v, want %v", got, want)
	}
	var me struct{ Permissions []string }
	d.get("/v1/admin/me", &me)
	if len(me.Permissions) != 1 || me.Permissions[0] != "feedback.read" {
		t.Fatalf("me: %v", me.Permissions)
	}
}
