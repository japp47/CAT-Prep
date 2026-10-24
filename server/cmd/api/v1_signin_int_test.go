package main

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/japp47/CAT-Prep/server/internal/auth"
	"github.com/japp47/CAT-Prep/server/internal/config"
	"github.com/japp47/CAT-Prep/server/internal/ids"
)

// Google sign-in (B7), end to end with a fake provider: each row of docs/architecture.md §5.2, and the ways it fails.

// fakeGoogle hands out codes for people and checks that the verifier and nonce come back as they were given.
type fakeGoogle struct {
	mu     sync.Mutex
	people map[string]auth.Claims // code → who signs in
	nonces map[string]string      // state → nonce
}

func (f *fakeGoogle) AuthURL(state, nonce, verifier string) (string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if verifier == "" {
		return "", errors.New("no verifier")
	}
	f.nonces[state] = nonce
	return "https://accounts.example/auth?state=" + url.QueryEscape(state), nil
}

func (f *fakeGoogle) Exchange(_ context.Context, code, verifier, nonce string) (auth.Claims, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	c, ok := f.people[code]
	if !ok || verifier == "" {
		return auth.Claims{}, errors.New("bad code")
	}
	for _, n := range f.nonces {
		if n == nonce {
			return c, nil
		}
	}
	return auth.Claims{}, auth.ErrNonce
}

func signInServer(t *testing.T) (*httptest.Server, *pgxpool.Pool, *fakeGoogle) {
	t.Helper()
	f := &fakeGoogle{people: map[string]auth.Claims{}, nonces: map[string]string{}}
	old := signInProvider
	signInProvider = func(config.Config) auth.Provider { return f }
	t.Cleanup(func() { signInProvider = old })
	srv, admin := apiServer(t, testOpts)
	return srv, admin, f
}

// person registers a Google account and returns the code that signs it in.
func (f *fakeGoogle) person(email string, verified bool) string {
	f.mu.Lock()
	defer f.mu.Unlock()
	code := "code-" + ids.New()
	f.people[code] = auth.Claims{Subject: "sub-" + email, Email: email, EmailVerified: verified, Name: "Test " + email}
	return code
}

// google runs start and callback in this browser, as Google's pages would, and returns the signin outcome
// (done, a ticket, or an error word) and the page it lands on.
func (d *device) google(code string, mutate func(q url.Values)) (string, string) {
	d.t.Helper()
	noFollow := *d.c
	noFollow.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	res, err := noFollow.Get(d.srv.URL + "/v1/auth/google/start?next=/settings")
	if err != nil {
		d.t.Fatal(err)
	}
	res.Body.Close()
	to, _ := url.Parse(res.Header.Get("Location"))
	q := url.Values{"code": {code}, "state": {to.Query().Get("state")}}
	if mutate != nil {
		mutate(q)
	}
	res, err = noFollow.Get(d.srv.URL + "/v1/auth/google/callback?" + q.Encode())
	if err != nil {
		d.t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != http.StatusFound {
		d.t.Fatalf("callback: %d", res.StatusCode)
	}
	back, _ := url.Parse(res.Header.Get("Location"))
	return back.Query().Get("signin"), back.Path + "#" + back.Fragment
}

type ticketInfo struct {
	Email, Account, Device string
	AccountHasProgress     bool
}

func (d *device) ticket(t string) (ticketInfo, int) {
	var out ticketInfo
	return out, d.call("/v1/auth/ticket", map[string]string{"ticket": t}, &out)
}

func (d *device) complete(t string, keep bool) int {
	d.t.Helper()
	var out struct {
		IdentityID, DeviceID string
		Account              struct{ Email string }
	}
	code := d.call("/v1/auth/complete", map[string]any{"ticket": t, "keep": keep, "label": "Test", "platform": "mac"}, &out)
	if code == http.StatusOK {
		d.ID.IdentityID, d.ID.DeviceID = out.IdentityID, out.DeviceID
	}
	return code
}

func (d *device) whoAmI() (string, string) {
	d.t.Helper()
	res, err := d.c.Get(d.srv.URL + "/v1/identity")
	if err != nil {
		d.t.Fatal(err)
	}
	defer res.Body.Close()
	var out struct {
		IdentityID string
		Account    *struct{ Email string }
	}
	decodeJSON(d.t, res, &out)
	email := ""
	if out.Account != nil {
		email = out.Account.Email
	}
	return out.IdentityID, email
}

func TestSignInOnAGuestDeviceMakesTheAccount(t *testing.T) {
	srv, _, g := signInServer(t)
	email := ids.New()[24:] + "@example.com"
	d := newDevice(t, srv)
	ticket, landed := d.google(g.person(email, true), nil)
	if len(ticket) < 10 || landed != "/settings#sync" {
		t.Fatalf("want a ticket back on Settings, got %q at %q", ticket, landed)
	}
	info, code := d.ticket(ticket)
	if code != 200 || info.Account != "new" || info.Device != "guest" || info.Email != email {
		t.Fatalf("ticket: %d %+v", code, info)
	}
	if got := d.complete(ticket, true); got != 200 {
		t.Fatalf("complete: %d", got)
	}
	if id, who := d.whoAmI(); id != d.ID.IdentityID || who != email {
		t.Fatalf("identity %s, account %q", id, who)
	}
	if _, got := d.push(change("s1", `{"n":1}`, 0)); got != 200 {
		t.Fatalf("push after sign-in: %d", got)
	}
	if got := d.complete(ticket, true); got != http.StatusNotFound {
		t.Fatalf("a ticket works twice: %d", got)
	}
}

func TestSignInOnAnonymousSyncAdoptsItsProgress(t *testing.T) {
	srv, admin, g := signInServer(t)
	d := newDevice(t, srv).turnOn()
	before := d.ID.IdentityID
	d.push(change("s1", `{"n":1}`, 0))
	email := ids.New()[24:] + "@example.com"
	if out, _ := d.google(g.person(email, true), nil); out != "done" {
		t.Fatalf("want done, got %q", out)
	}
	if id, who := d.whoAmI(); id != before || who != email {
		t.Fatalf("identity %s (was %s), account %q", id, before, who)
	}
	var n int
	_ = admin.QueryRow(context.Background(), `select count(*) from audit.events where action = 'account.adopted' and target_id = $1`, before).Scan(&n)
	if n != 1 {
		t.Fatalf("adoption not audited: %d", n)
	}
	// Signing in again on the same device needs no question.
	if out, _ := d.google(g.person(email, true), nil); out != "done" {
		t.Fatalf("second sign-in: %q", out)
	}
}

func TestSecondDeviceJoinsTheAccountAndCanKeepItsProgress(t *testing.T) {
	srv, admin, g := signInServer(t)
	email := ids.New()[24:] + "@example.com"
	a := newDevice(t, srv).turnOn()
	a.google(g.person(email, true), nil) // adopts a's progress
	a.push(change("from-a", `{"n":1}`, 0))

	// A guest device: asked, keeps its progress, lands on the account's identity.
	b := newDevice(t, srv)
	ticket, _ := b.google(g.person(email, true), nil)
	info, _ := b.ticket(ticket)
	if info.Account != "existing" || !info.AccountHasProgress || info.Device != "guest" {
		t.Fatalf("ticket: %+v", info)
	}
	if b.complete(ticket, true) != 200 || b.ID.IdentityID != a.ID.IdentityID {
		t.Fatalf("b is on %s, want %s", b.ID.IdentityID, a.ID.IdentityID)
	}
	if got := b.pull(0); len(got.Records) != 1 || got.Records[0].ID != "from-a" {
		t.Fatalf("b pulled %+v", got.Records)
	}

	// A device with its own anonymous sync: moved to the account; its old identity stays for its other devices.
	c := newDevice(t, srv).turnOn()
	old := c.ID.IdentityID
	ticket, _ = c.google(g.person(email, true), nil)
	if info, _ := c.ticket(ticket); info.Device != "anonymous" {
		t.Fatalf("ticket: %+v", info)
	}
	if c.complete(ticket, true) != 200 || c.ID.IdentityID != a.ID.IdentityID {
		t.Fatalf("c is on %s", c.ID.IdentityID)
	}
	var left int
	_ = admin.QueryRow(context.Background(), `select count(*) from account.identities where id = $1`, old).Scan(&left)
	if left != 1 {
		t.Fatal("the old anonymous identity was deleted at sign-in")
	}
}

func TestAnotherAccountsProgressIsNeverMerged(t *testing.T) {
	srv, _, g := signInServer(t)
	first, second := ids.New()[24:]+"@example.com", ids.New()[24:]+"@example.org"
	d := newDevice(t, srv)
	ticket, _ := d.google(g.person(first, true), nil)
	d.complete(ticket, true)
	firstIdentity := d.ID.IdentityID

	ticket, _ = d.google(g.person(second, true), nil)
	if info, _ := d.ticket(ticket); info.Device != "other_account" || info.Account != "new" {
		t.Fatalf("ticket: %+v", info)
	}
	if got := d.complete(ticket, true); got != http.StatusConflict {
		t.Fatalf("keep on another account's device: %d", got)
	}
	ticket, _ = d.google(g.person(second, true), nil)
	if got := d.complete(ticket, false); got != 200 || d.ID.IdentityID == firstIdentity {
		t.Fatalf("start fresh: %d on %s", got, d.ID.IdentityID)
	}
	if _, who := d.whoAmI(); who != second {
		t.Fatalf("signed in as %q", who)
	}
}

func TestSignInFailuresComeBackAsWords(t *testing.T) {
	srv, _, g := signInServer(t)
	d := newDevice(t, srv)
	if out, _ := d.google(g.person("x@example.com", true), func(q url.Values) { q.Set("state", "forged") }); out != "failed" {
		t.Fatalf("forged state: %q", out)
	}
	if out, _ := d.google(g.person("x@example.com", true), func(q url.Values) { q.Del("code"); q.Set("error", "access_denied") }); out != "cancelled" {
		t.Fatalf("cancelled: %q", out)
	}
	if out, _ := d.google("not-a-code", nil); out != "failed" {
		t.Fatalf("bad code: %q", out)
	}
	if out, _ := d.google(g.person("y@example.com", false), nil); out != "unverified" {
		t.Fatalf("unverified email: %q", out)
	}
	// Without the start cookie (another browser, or after 10 minutes) the callback does nothing.
	noFollow := *newDevice(t, srv).c
	noFollow.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	res, _ := noFollow.Get(srv.URL + "/v1/auth/google/callback?code=x&state=y")
	res.Body.Close()
	if !strings.Contains(res.Header.Get("Location"), "signin=expired") {
		t.Fatalf("no cookie: %s", res.Header.Get("Location"))
	}
	if _, code := d.ticket("AAAA-BBBB-CCCC-DDDD"); code != http.StatusNotFound {
		t.Fatalf("made-up ticket: %d", code)
	}
}

func TestStartKeepsTheReturnPageOnOurSite(t *testing.T) {
	srv, _, _ := signInServer(t)
	for _, next := range []string{"//evil.example/x", "https://evil.example", "/\\evil.example"} {
		c := newDevice(t, srv).c
		c.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
		res, err := c.Get(srv.URL + "/v1/auth/google/start?next=" + url.QueryEscape(next))
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
		var cookie string
		for _, ck := range res.Cookies() {
			if ck.Name == "__Host-oauth" {
				cookie = ck.Value
			}
		}
		if parts := strings.Split(cookie, "."); len(parts) != 4 || parts[3] != "L3NldHRpbmdz" { // base64url of /settings
			t.Fatalf("next %q kept as %q", next, cookie)
		}
	}
}

func TestDeletingEverythingDeletesTheAccount(t *testing.T) {
	srv, admin, g := signInServer(t)
	email := ids.New()[24:] + "@example.com"
	d := newDevice(t, srv)
	ticket, _ := d.google(g.person(email, true), nil)
	d.complete(ticket, true)
	if got := d.del("/v1/me"); got != http.StatusNoContent {
		t.Fatalf("delete: %d", got)
	}
	var n int
	_ = admin.QueryRow(context.Background(), `select (select count(*) from account.users where email = $1) + (select count(*) from account.oauth_accounts where email = $1)`, email).Scan(&n)
	if n != 0 {
		t.Fatalf("%d account rows left", n)
	}
}

func TestSignInIsOffWithoutGoogleSettings(t *testing.T) {
	srv, _ := apiServer(t, testOpts)
	c := srv.Client()
	c.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	res, err := c.Get(srv.URL + "/v1/auth/google/start?next=/settings")
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != http.StatusFound || res.Header.Get("Location") != "/settings?signin=unavailable#sync" {
		t.Fatalf("start without Google: %d %s", res.StatusCode, res.Header.Get("Location"))
	}
	if got := newDevice(t, srv).call("/v1/auth/complete", map[string]any{"ticket": "x"}, nil); got != http.StatusNotFound {
		t.Fatalf("complete without Google: %d", got)
	}
}
