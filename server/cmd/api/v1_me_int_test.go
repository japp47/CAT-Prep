package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/japp47/CAT-Prep/server/internal/config"
)

// Export, delete everywhere and the bot check (B5), end to end.

func TestExportHasEverythingTheServerKeeps(t *testing.T) {
	srv, _ := apiServer(t, testOpts)
	a := newDevice(t, srv).turnOn()
	newDevice(t, srv).linkTo(a)
	r1, _ := a.push(change("s1", `{"n":1}`, 0), change("s2", `{"n":2}`, 0))
	a.push(change("s2", "", r1.Applied[1].Rev)) // a deletion is not exported
	resp, err := a.c.Get(srv.URL + "/v1/me/export")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	var out struct {
		Identity struct{ ID string }
		Devices  []struct{ Label string }
		Records  []struct {
			Kind, ID string
			Data     json.RawMessage
		}
	}
	decodeJSON(t, resp, &out)
	if resp.StatusCode != 200 || resp.Header.Get("Content-Disposition") == "" || out.Identity.ID != a.ID.IdentityID || len(out.Devices) != 2 || len(out.Records) != 1 || out.Records[0].ID != "s1" {
		t.Fatalf("%d %+v", resp.StatusCode, out)
	}
}

func TestDeleteEverywhere(t *testing.T) {
	srv, admin := apiServer(t, testOpts)
	a := newDevice(t, srv).turnOn()
	b := newDevice(t, srv).linkTo(a)
	a.push(change("s1", `{"n":1}`, 0))
	if got := a.del("/v1/me"); got != http.StatusNoContent {
		t.Fatalf("delete: %d", got)
	}
	ctx := context.Background()
	var left int
	_ = admin.QueryRow(ctx, `select (select count(*) from account.identities where id = $1) + (select count(*) from account.devices where identity_id = $1)
		+ (select count(*) from sync.records where identity_id = $1) + (select count(*) from sync.heads where identity_id = $1)
		+ (select count(*) from account.recovery_codes where identity_id = $1) + (select count(*) from account.link_codes where identity_id = $1)`, a.ID.IdentityID).Scan(&left)
	if left != 0 {
		t.Fatalf("%d rows left", left)
	}
	var logged int
	_ = admin.QueryRow(ctx, `select count(*) from audit.events where action = 'identity.deleted' and target_id = $1`, a.ID.IdentityID).Scan(&logged)
	if logged != 1 {
		t.Fatalf("deletion not in the audit log: %d", logged)
	}
	for _, d := range []*device{a, b} {
		if _, got := d.push(change("x", `{}`, 0)); got != http.StatusUnauthorized {
			t.Fatalf("after delete: %d", got)
		}
	}
	if got := newDevice(t, srv).use("/v1/identity/recover", a.Recovery); got != http.StatusNotFound {
		t.Fatalf("the recovery code still works: %d", got)
	}
}

func TestTurningOnNeedsTheBotCheckWhenConfigured(t *testing.T) {
	cf := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		_, _ = w.Write([]byte(map[bool]string{true: `{"success":true}`, false: `{"success":false}`}[r.Form.Get("response") == "good-token"]))
	}))
	defer cf.Close()
	old := turnstileEndpoint
	turnstileEndpoint = cf.URL
	defer func() { turnstileEndpoint = old }()

	apiServer(t, testOpts) // migrates the test database and sets cat_app's password
	cfg := config.Config{Env: "dev", AllowedOrigin: "http://localhost:5173", TurnstileSecret: "1x0000000000000000000000000000000AA"}
	guarded := httptest.NewTLSServer(newHandler(cfg, fakeDB(nil), quiet, v1Routes(cfg, appPool(t), quiet, testOpts)))
	defer guarded.Close()
	for token, want := range map[string]int{"": http.StatusForbidden, "bad-token": http.StatusForbidden, "good-token": http.StatusCreated} {
		d := newDevice(t, guarded)
		if got := d.call("/v1/identity", map[string]string{"turnstileToken": token}, nil); got != want {
			t.Errorf("token %q: %d, want %d", token, got, want)
		}
	}
}
