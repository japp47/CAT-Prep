package main

import (
	"context"
	"io"
	"net/http"
	"strings"
	"sync"
	"testing"

	"github.com/japp47/CAT-Prep/server/internal/account"
)

// Linking devices and recovery codes (B4), end to end.

func (d *device) del(path string) int {
	d.t.Helper()
	req, _ := http.NewRequest(http.MethodDelete, d.srv.URL+path, nil)
	resp, err := d.c.Do(req)
	if err != nil {
		d.t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 && testing.Verbose() {
		var b strings.Builder
		_, _ = io.Copy(&b, resp.Body)
		d.t.Logf("DELETE %s → %d %s", path, resp.StatusCode, b.String())
	}
	return resp.StatusCode
}

func (d *device) use(path, code string) int {
	d.t.Helper()
	return d.call(path, map[string]string{"code": code}, &d.ID)
}

func (d *device) devices() []account.DeviceInfo {
	d.t.Helper()
	var out struct{ Devices []account.DeviceInfo }
	resp, err := d.c.Get(d.srv.URL + "/v1/devices")
	if err != nil {
		d.t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		d.t.Fatalf("devices: %d", resp.StatusCode)
	}
	decodeJSON(d.t, resp, &out)
	return out.Devices
}

func TestALinkCodeWorksOnceAndBringsTheProgress(t *testing.T) {
	srv, _ := apiServer(t, testOpts)
	a := newDevice(t, srv).turnOn()
	a.push(change("set1", `{"n":1}`, 0))
	code := a.linkCode()
	if len(code) != 9 || code[4] != '-' {
		t.Fatalf("code shape %q", code)
	}
	b := newDevice(t, srv)
	if got := b.use("/v1/identity/link", strings.ToLower(strings.ReplaceAll(code, "-", " "))); got != http.StatusCreated || b.ID.IdentityID != a.ID.IdentityID {
		t.Fatalf("link typed loosely: %d %+v", got, b.ID)
	}
	if p := b.pull(0); len(p.Records) != 1 {
		t.Fatalf("b sees %d records", len(p.Records))
	}
	if got := newDevice(t, srv).use("/v1/identity/link", code); got != http.StatusNotFound {
		t.Fatalf("second use: %d", got)
	}
	if n := len(a.devices()); n != 2 {
		t.Fatalf("devices: %d", n)
	}
}

func TestAnExpiredLinkCodeFails(t *testing.T) {
	srv, admin := apiServer(t, testOpts)
	a := newDevice(t, srv).turnOn()
	code := a.linkCode()
	if _, err := admin.Exec(context.Background(), "update account.link_codes set created_at = now() - interval '1 hour', expires_at = now() - interval '1 second' where identity_id = $1", a.ID.IdentityID); err != nil {
		t.Fatal(err)
	}
	if got := newDevice(t, srv).use("/v1/identity/link", code); got != http.StatusNotFound {
		t.Fatalf("expired: %d", got)
	}
}

func TestTwoBrowsersRacingForOneLinkCode(t *testing.T) {
	srv, _ := apiServer(t, testOpts)
	a := newDevice(t, srv).turnOn()
	for round := 0; round < 10; round++ {
		code := a.linkCode()
		var wg sync.WaitGroup
		got := make([]int, 2)
		for i := range got {
			wg.Add(1)
			go func(i int) { defer wg.Done(); got[i] = newDevice(t, srv).use("/v1/identity/link", code) }(i)
		}
		wg.Wait()
		wins := 0
		for _, g := range got {
			if g == http.StatusCreated {
				wins++
			}
		}
		if wins != 1 {
			t.Fatalf("round %d: %v", round, got)
		}
	}
}

func TestRecoveryCodeBringsEverythingBackAndANewOneReplacesIt(t *testing.T) {
	srv, _ := apiServer(t, testOpts)
	a := newDevice(t, srv).turnOn()
	if len(a.Recovery) != 19 {
		t.Fatalf("recovery code %q", a.Recovery)
	}
	a.push(change("set1", `{"n":1}`, 0))
	fresh := newDevice(t, srv)
	if got := fresh.use("/v1/identity/recover", a.Recovery); got != http.StatusCreated || fresh.ID.IdentityID != a.ID.IdentityID {
		t.Fatalf("recover: %d", got)
	}
	if p := fresh.pull(0); len(p.Records) != 1 {
		t.Fatalf("recovered %d records", len(p.Records))
	}
	var next struct{ RecoveryCode string }
	if got := a.call("/v1/identity/recovery-code", nil, &next); got != http.StatusCreated || next.RecoveryCode == a.Recovery {
		t.Fatalf("new code: %d", got)
	}
	if got := newDevice(t, srv).use("/v1/identity/recover", a.Recovery); got != http.StatusNotFound {
		t.Fatalf("old code still works: %d", got)
	}
	if got := newDevice(t, srv).use("/v1/identity/recover", next.RecoveryCode); got != http.StatusCreated {
		t.Fatalf("new code: %d", got)
	}
}

// Five wrong codes in a row and the address waits, even for a right code; a right code before that resets the count.
func TestGuessingCodesIsCutOff(t *testing.T) {
	srv, _ := apiServer(t, testOpts)
	a := newDevice(t, srv).turnOn()
	guesser := newDevice(t, srv)
	for i := 0; i < 4; i++ {
		guesser.use("/v1/identity/recover", "AAAA-AAAA-AAAA-AAAA")
	}
	if got := guesser.use("/v1/identity/recover", a.Recovery); got != http.StatusCreated {
		t.Fatalf("right code after 4 wrong: %d", got)
	}
	other := newDevice(t, srv)
	for i := 0; i < 5; i++ {
		if got := other.use("/v1/identity/link", "ZZZZ-ZZZZ"); got != http.StatusNotFound {
			t.Fatalf("wrong %d: %d", i, got)
		}
	}
	if got := other.use("/v1/identity/recover", a.Recovery); got != http.StatusTooManyRequests {
		t.Fatalf("after 5 wrong in a row: %d", got)
	}
}

func TestRemovingADevice(t *testing.T) {
	srv, _ := apiServer(t, testOpts)
	a := newDevice(t, srv).turnOn()
	b := newDevice(t, srv).linkTo(a)
	if got := a.del("/v1/devices/" + b.ID.DeviceID); got != http.StatusNoContent {
		t.Fatalf("remove b: %d", got)
	}
	if _, got := b.push(change("x", `{}`, 0)); got != http.StatusUnauthorized {
		t.Fatalf("removed device: %d", got)
	}
	if got := a.del("/v1/devices/" + b.ID.DeviceID); got != http.StatusNotFound {
		t.Fatalf("remove twice: %d", got)
	}
	stranger := newDevice(t, srv).turnOn()
	if got := stranger.del("/v1/devices/" + a.ID.DeviceID); got != http.StatusNotFound {
		t.Fatalf("another identity's device: %d", got)
	}
	if got := a.del("/v1/devices/me"); got != http.StatusNoContent {
		t.Fatalf("leave: %d", got)
	}
	if _, got := a.push(change("x", `{}`, 0)); got != http.StatusUnauthorized {
		t.Fatalf("after leaving: %d", got)
	}
}

// A browser syncing as one identity that links to another leaves the first: its old device is revoked.
func TestLinkingToAnotherIdentitySwitches(t *testing.T) {
	srv, admin := apiServer(t, testOpts)
	a := newDevice(t, srv).turnOn()
	b := newDevice(t, srv).turnOn()
	oldDevice := b.ID.DeviceID
	if got := b.use("/v1/identity/link", a.linkCode()); got != http.StatusCreated || b.ID.IdentityID != a.ID.IdentityID {
		t.Fatalf("switch: %d", got)
	}
	var revoked bool
	_ = admin.QueryRow(context.Background(), "select revoked_at is not null from account.devices where id = $1", oldDevice).Scan(&revoked)
	if !revoked {
		t.Fatal("the old device still works")
	}
	if got := a.use("/v1/identity/link", a.linkCode()); got != http.StatusOK {
		t.Fatalf("a device using its own identity's code: %d", got)
	}
	if n := len(a.devices()); n != 2 {
		t.Fatalf("devices after switching: %d", n)
	}
}

func TestOpenLinkCodesAreCapped(t *testing.T) {
	srv, _ := apiServer(t, testOpts)
	a := newDevice(t, srv).turnOn()
	for i := 0; i < 5; i++ {
		a.linkCode()
	}
	if got := a.call("/v1/identity/link-codes", nil, nil); got != http.StatusTooManyRequests {
		t.Fatalf("sixth open code: %d", got)
	}
}
