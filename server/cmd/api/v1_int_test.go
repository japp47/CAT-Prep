package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"net/url"
	"os"
	"sync"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/japp47/CAT-Prep/server/internal/config"
	"github.com/japp47/CAT-Prep/server/internal/store"
	"github.com/japp47/CAT-Prep/server/internal/syncapi"
	"github.com/japp47/CAT-Prep/server/migrations"
)

// The student API end to end, against a real Postgres (TEST_DATABASE_URL, the owner). The server side connects as
// cat_app, as it does live, so the tests also prove that its grants are enough and no more is needed.

var testOpts = syncapi.Options{Kinds: []string{"rc"}, MaxRecords: 50, MaxBytes: 1 << 20, PerMinute: 10_000}

func apiServer(t *testing.T, opt syncapi.Options) (*httptest.Server, *pgxpool.Pool) {
	t.Helper()
	owner := os.Getenv("TEST_DATABASE_URL")
	if owner == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	ctx := context.Background()
	admin, err := store.Open(ctx, owner)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(admin.Close)
	if err := store.Migrate(ctx, admin, migrations.FS, quiet); err != nil {
		t.Fatal(err)
	}
	if _, err := admin.Exec(ctx, "alter role cat_app password 'cat_app'"); err != nil {
		t.Fatal(err)
	}
	u, _ := url.Parse(owner)
	u.User = url.UserPassword("cat_app", "cat_app")
	pool, err := store.Open(ctx, u.String())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	cfg := config.Config{Env: "dev", AllowedOrigin: "http://localhost:5173"}
	srv := httptest.NewTLSServer(newHandler(cfg, fakeDB(nil), quiet, v1Routes(cfg, pool, quiet, opt)))
	t.Cleanup(srv.Close)
	return srv, admin
}

// device is one browser: its own cookie jar.
type device struct {
	t   *testing.T
	srv *httptest.Server
	c   *http.Client
	ID  struct{ IdentityID, DeviceID string }
}

func newDevice(t *testing.T, srv *httptest.Server) *device {
	jar, _ := cookiejar.New(nil)
	return &device{t: t, srv: srv, c: &http.Client{Transport: srv.Client().Transport, Jar: jar}}
}

func (d *device) call(path string, body, out any) int {
	d.t.Helper()
	b, _ := json.Marshal(body)
	resp, err := d.c.Post(d.srv.URL+path, "application/json", bytes.NewReader(b))
	if err != nil {
		d.t.Fatal(err)
	}
	defer resp.Body.Close()
	if out != nil {
		_ = json.NewDecoder(resp.Body).Decode(out)
	}
	return resp.StatusCode
}

func (d *device) turnOn() *device {
	if code := d.call("/v1/identity", map[string]string{"label": "Test", "platform": "mac"}, &d.ID); code != http.StatusCreated {
		d.t.Fatalf("turn on: %d", code)
	}
	return d
}

func (d *device) join(identity string) *device {
	if code := d.call("/v1/dev/join", map[string]string{"identityId": identity}, &d.ID); code != http.StatusCreated {
		d.t.Fatalf("join: %d", code)
	}
	return d
}

type pushResp struct {
	Applied []syncapi.Applied `json:"applied"`
	Stale   []syncapi.Record  `json:"stale"`
}

type pullResp struct {
	Cursor  int64            `json:"cursor"`
	Records []syncapi.Record `json:"records"`
	More    bool             `json:"more"`
}

func change(id, data string, baseRev int64) syncapi.Change {
	c := syncapi.Change{Kind: "rc", ID: id, Stamp: 1_700_000_000_000, BaseRev: baseRev}
	if data == "" {
		c.Deleted = true
	} else {
		c.Data = json.RawMessage(data)
	}
	return c
}

func (d *device) push(cs ...syncapi.Change) (pushResp, int) {
	var out pushResp
	code := d.call("/v1/sync/push", map[string]any{"changes": cs}, &out)
	return out, code
}

func (d *device) pull(cursor int64) pullResp {
	var out pullResp
	if code := d.call("/v1/sync/pull", map[string]int64{"cursor": cursor}, &out); code != http.StatusOK {
		d.t.Fatalf("pull: %d", code)
	}
	return out
}

func TestTurnOnTwiceKeepsOneIdentity(t *testing.T) {
	srv, _ := apiServer(t, testOpts)
	a := newDevice(t, srv).turnOn()
	var again struct{ IdentityID, DeviceID string }
	if code := a.call("/v1/identity", nil, &again); code != http.StatusOK || again != a.ID {
		t.Fatalf("second turn on: %d %+v, want %+v", code, again, a.ID)
	}
	resp, err := a.c.Get(srv.URL + "/v1/identity")
	if err != nil || resp.StatusCode != http.StatusOK {
		t.Fatalf("show: %v %v", resp.StatusCode, err)
	}
	if code := newDevice(t, srv).call("/v1/sync/pull", map[string]int64{"cursor": 0}, nil); code != http.StatusUnauthorized {
		t.Fatalf("no cookie: %d", code)
	}
}

func TestPushTwiceIsOneRowAndOneRev(t *testing.T) {
	srv, admin := apiServer(t, testOpts)
	a := newDevice(t, srv).turnOn()
	first, _ := a.push(change("set1", `{"score":3}`, 0))
	second, _ := a.push(change("set1", `{ "score" : 3 }`, 0)) // same data, other spacing: a retry
	if len(first.Applied) != 1 || len(second.Applied) != 1 || first.Applied[0].Rev != second.Applied[0].Rev {
		t.Fatalf("first %+v second %+v", first, second)
	}
	var rows, headRev int64
	_ = admin.QueryRow(context.Background(), "select count(*) from sync.records where identity_id = $1", a.ID.IdentityID).Scan(&rows)
	_ = admin.QueryRow(context.Background(), "select rev from sync.heads where identity_id = $1", a.ID.IdentityID).Scan(&headRev)
	if rows != 1 || headRev != first.Applied[0].Rev {
		t.Fatalf("rows %d head rev %d", rows, headRev)
	}
}

func TestStaleBaseRevReturnsTheServerCopy(t *testing.T) {
	srv, _ := apiServer(t, testOpts)
	a := newDevice(t, srv).turnOn()
	b := newDevice(t, srv).join(a.ID.IdentityID)
	r1, _ := a.push(change("set1", `{"v":1}`, 0))
	rev1 := r1.Applied[0].Rev
	r2, _ := a.push(change("set1", `{"v":2}`, rev1))
	if len(r2.Applied) != 1 || r2.Applied[0].Rev <= rev1 {
		t.Fatalf("update on the right base: %+v", r2)
	}
	// b still thinks the record is at rev1.
	r3, _ := b.push(change("set1", `{"v":3}`, rev1))
	if len(r3.Applied) != 0 || len(r3.Stale) != 1 || string(r3.Stale[0].Data) != `{"v":2}` || r3.Stale[0].Rev != r2.Applied[0].Rev {
		t.Fatalf("stale: %+v", r3)
	}
	// After merging, b writes on the current rev.
	r4, _ := b.push(change("set1", `{"v":3}`, r2.Applied[0].Rev))
	if len(r4.Applied) != 1 {
		t.Fatalf("after merge: %+v", r4)
	}
}

func TestPullReturnsOnlyNewerRowsOfThisIdentity(t *testing.T) {
	srv, _ := apiServer(t, testOpts)
	a := newDevice(t, srv).turnOn()
	b := newDevice(t, srv).join(a.ID.IdentityID)
	other := newDevice(t, srv).turnOn()
	other.push(change("theirs", `{"x":1}`, 0))

	a.push(change("s1", `{"n":1}`, 0), change("s2", `{"n":2}`, 0))
	p := b.pull(0)
	if len(p.Records) != 2 || p.More {
		t.Fatalf("first pull: %+v", p)
	}
	a.push(change("s3", `{"n":3}`, 0), change("s1", "", p.Records[0].Rev))
	q := b.pull(p.Cursor)
	if len(q.Records) != 2 {
		t.Fatalf("second pull: %+v", q)
	}
	for _, r := range q.Records {
		if r.ID == "s1" && (!r.Deleted || string(r.Data) != "null") {
			t.Errorf("deletion did not travel: %+v", r)
		}
		if r.ID == "theirs" {
			t.Error("another identity's record leaked")
		}
	}
	if empty := b.pull(q.Cursor); len(empty.Records) != 0 || empty.Cursor != q.Cursor {
		t.Fatalf("up to date: %+v", empty)
	}
}

func TestRevokedDeviceGets401(t *testing.T) {
	srv, admin := apiServer(t, testOpts)
	a := newDevice(t, srv).turnOn()
	if _, err := admin.Exec(context.Background(), "update account.devices set revoked_at = now(), revoked_reason = 'removed' where id = $1", a.ID.DeviceID); err != nil {
		t.Fatal(err)
	}
	if _, code := a.push(change("x", `{}`, 0)); code != http.StatusUnauthorized {
		t.Fatalf("revoked push: %d", code)
	}
}

func TestBadPushesAreRefusedAndAudited(t *testing.T) {
	srv, admin := apiServer(t, testOpts)
	a := newDevice(t, srv).turnOn()
	bad := change("x", `{}`, 0)
	bad.Kind = "day"
	if _, code := a.push(bad); code != http.StatusBadRequest {
		t.Fatalf("unknown kind: %d", code)
	}
	if _, code := a.push(change("x", `{}`, 0), change("x", `{}`, 0)); code != http.StatusBadRequest {
		t.Fatalf("duplicate: %d", code)
	}
	if _, code := a.push(change("x", `{"big":"`+string(bytes.Repeat([]byte("a"), syncapi.MaxData))+`"}`, 0)); code != http.StatusBadRequest {
		t.Fatalf("too big: %d", code)
	}
	var n int
	_ = admin.QueryRow(context.Background(), "select count(*) from audit.events where subject_identity_id = $1 and action = 'sync.rejected'", a.ID.IdentityID).Scan(&n)
	if n != 3 {
		t.Fatalf("audit rows: %d", n)
	}
	var created int
	_ = admin.QueryRow(context.Background(), "select count(*) from audit.events where subject_identity_id = $1 and action in ('identity.created', 'device.created')", a.ID.IdentityID).Scan(&created)
	if created != 2 {
		t.Fatalf("creation audit rows: %d", created)
	}
}

func TestLimitPerIdentity(t *testing.T) {
	srv, _ := apiServer(t, syncapi.Options{Kinds: []string{"rc"}, MaxRecords: 3, MaxBytes: 1 << 20, PerMinute: 10_000})
	a := newDevice(t, srv).turnOn()
	if _, code := a.push(change("1", `{}`, 0), change("2", `{}`, 0), change("3", `{}`, 0)); code != http.StatusOK {
		t.Fatalf("at the limit: %d", code)
	}
	if _, code := a.push(change("4", `{}`, 0)); code != http.StatusRequestEntityTooLarge {
		t.Fatalf("over the limit: %d", code)
	}
	if p := a.pull(0); len(p.Records) != 3 {
		t.Fatalf("the refused push must leave nothing behind: %d rows", len(p.Records))
	}
}

// Two devices push at the same time while a third pulls with its cursor. With the head lock, the puller ends up
// with every record; without it, a row committed late with a lower rev could be skipped for good.
func TestConcurrentPushesNeverHideARowFromAPuller(t *testing.T) {
	srv, _ := apiServer(t, syncapi.Options{Kinds: []string{"rc"}, MaxRecords: 1000, MaxBytes: 1 << 20, PerMinute: 100_000})
	a := newDevice(t, srv).turnOn()
	b := newDevice(t, srv).join(a.ID.IdentityID)
	c := newDevice(t, srv).join(a.ID.IdentityID)

	const each = 40
	var wg sync.WaitGroup
	for i, d := range []*device{a, b} {
		wg.Add(1)
		go func(i int, d *device) {
			defer wg.Done()
			for n := 0; n < each; n++ {
				if _, code := d.push(change(fmt.Sprintf("d%d-%d", i, n), `{"n":1}`, 0)); code != http.StatusOK {
					t.Errorf("push: %d", code)
					return
				}
			}
		}(i, d)
	}
	seen := map[string]bool{}
	var cursor int64
	done := make(chan struct{})
	go func() { wg.Wait(); close(done) }()
	for finished := false; !finished; {
		select {
		case <-done:
			finished = true
		default:
		}
		for {
			p := c.pull(cursor)
			for _, r := range p.Records {
				seen[r.ID] = true
			}
			cursor = p.Cursor
			if !p.More {
				break
			}
		}
	}
	if len(seen) != 2*each {
		t.Fatalf("the puller saw %d of %d records", len(seen), 2*each)
	}
}
