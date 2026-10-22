package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math/rand/v2"
	"net/http"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/japp47/CAT-Prep/server/internal/syncapi"
)

// Negative and ACID tests: what happens when things go wrong, and whether anything is left stuck afterwards.

func rejectedCodes(r pushResp) map[string]string {
	out := map[string]string{}
	for _, x := range r.Rejected {
		out[x.ID] = x.Code
	}
	return out
}

// Postgres stores jsonb with a space after every ":" and ",", so a record just under the size limit as sent can be
// over it as stored. It must still be accepted, not fail the whole push with a 500.
func TestRecordJustUnderTheLimitIsStoredEvenThoughJsonbIsLonger(t *testing.T) {
	srv, _ := apiServer(t, testOpts)
	a := newDevice(t, srv).turnOn()
	var b strings.Builder
	b.WriteString("{")
	for i := 0; b.Len() < syncapi.MaxData-20; i++ {
		if i > 0 {
			b.WriteString(",")
		}
		fmt.Fprintf(&b, `"k%d":0`, i)
	}
	b.WriteString("}")
	res, code := a.push(change("wide", b.String(), 0))
	if code != http.StatusOK || len(res.Applied) != 1 {
		t.Fatalf("code %d, %+v", code, res)
	}
}

// One bad record must not block the good ones in the same push, or the device would retry the batch forever.
func TestABadRecordIsRejectedAloneAndTheRestApplies(t *testing.T) {
	srv, _ := apiServer(t, testOpts)
	a := newDevice(t, srv).turnOn()
	big := change("big", `{"x":"`+strings.Repeat("a", syncapi.MaxData)+`"}`, 0)
	odd := change("odd", `{}`, 0)
	odd.Kind = "notAKind"
	res, code := a.push(change("good", `{"n":1}`, 0), big, odd)
	if code != http.StatusOK || len(res.Applied) != 1 || res.Applied[0].ID != "good" {
		t.Fatalf("code %d, %+v", code, res)
	}
	if got := rejectedCodes(res); got["big"] != "record_too_big" || got["odd"] != "unknown_kind" {
		t.Fatalf("rejected %+v", res.Rejected)
	}
}

// A full identity still accepts updates and deletions, which do not add rows, so it can make room and is never stuck.
func TestAFullIdentityStillTakesUpdatesAndDeletions(t *testing.T) {
	srv, _ := apiServer(t, syncapi.Options{Kinds: []string{"rc"}, MaxRecords: 3, MaxBytes: 1 << 20, PerMinute: 10_000})
	a := newDevice(t, srv).turnOn()
	first, _ := a.push(change("1", `{"v":1}`, 0), change("2", `{"v":1}`, 0), change("3", `{"v":1}`, 0))
	rev := map[string]int64{}
	for _, x := range first.Applied {
		rev[x.ID] = x.Rev
	}
	res, code := a.push(change("4", `{"v":1}`, 0), change("1", `{"v":2}`, rev["1"]), change("2", "", rev["2"]))
	if code != http.StatusOK || len(res.Applied) != 2 || rejectedCodes(res)["4"] != "over_limit" {
		t.Fatalf("code %d, %+v", code, res)
	}
}

// Isolation and liveness: while one student's push waits on its lock, another student's push goes straight through,
// and the waiting push finishes once the lock is released.
func TestOneStudentsLockNeverBlocksAnother(t *testing.T) {
	srv, admin := apiServer(t, testOpts)
	a := newDevice(t, srv).turnOn()
	b := newDevice(t, srv).turnOn()
	ctx := context.Background()
	tx, err := admin.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(ctx, "select 1 from sync.heads where identity_id = $1 for update", a.ID.IdentityID); err != nil {
		t.Fatal(err)
	}
	done := make(chan int, 1)
	go func() { _, code := a.push(change("waits", `{}`, 0)); done <- code }()

	start := time.Now()
	if _, code := b.push(change("free", `{}`, 0)); code != http.StatusOK || time.Since(start) > 2*time.Second {
		t.Fatalf("other student: %d after %v", code, time.Since(start))
	}
	select {
	case <-done:
		t.Fatal("the locked student's push did not wait")
	case <-time.After(300 * time.Millisecond):
	}
	_ = tx.Commit(ctx)
	select {
	case code := <-done:
		if code != http.StatusOK {
			t.Fatalf("after release: %d", code)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("the push stayed stuck after the lock was released")
	}
}

// Atomicity and no leftovers: a browser that gives up mid-push leaves no half-written rows, no open transaction
// and no lock; the next push goes through at once.
func TestAnAbandonedPushLeavesNothingBehind(t *testing.T) {
	srv, admin := apiServer(t, testOpts)
	a := newDevice(t, srv).turnOn()
	ctx := context.Background()
	tx, _ := admin.Begin(ctx)
	if _, err := tx.Exec(ctx, "select 1 from sync.heads where identity_id = $1 for update", a.ID.IdentityID); err != nil {
		t.Fatal(err)
	}
	impatient := &http.Client{Transport: a.c.Transport, Jar: a.c.Jar, Timeout: 400 * time.Millisecond}
	body, _ := json.Marshal(map[string]any{"changes": []syncapi.Change{change("x1", `{}`, 0), change("x2", `{}`, 0)}})
	if _, err := impatient.Post(srv.URL+"/v1/sync/push", "application/json", bytes.NewReader(body)); err == nil {
		t.Fatal("want a client timeout")
	}
	_ = tx.Commit(ctx)
	time.Sleep(300 * time.Millisecond) // the server notices the closed connection and rolls back

	var rows, idle int
	_ = admin.QueryRow(ctx, "select count(*) from sync.records where identity_id = $1", a.ID.IdentityID).Scan(&rows)
	_ = admin.QueryRow(ctx, "select count(*) from pg_stat_activity where usename = 'cat_app' and state like 'idle in transaction%'").Scan(&idle)
	if rows != 0 || idle != 0 {
		t.Fatalf("left behind: %d rows, %d open transactions", rows, idle)
	}
	start := time.Now()
	if _, code := a.push(change("after", `{}`, 0)); code != http.StatusOK || time.Since(start) > 2*time.Second {
		t.Fatalf("next push: %d after %v", code, time.Since(start))
	}
}

// Isolation: two devices write the same record from the same base at the same moment. Exactly one wins; the other
// gets the winner's copy back as stale. Never both, never neither.
func TestTwoWritersOnOneRecordExactlyOneWins(t *testing.T) {
	srv, _ := apiServer(t, testOpts)
	a := newDevice(t, srv).turnOn()
	b := newDevice(t, srv).join(a.ID.IdentityID)
	base, _ := a.push(change("shared", `{"v":0}`, 0))
	rev := base.Applied[0].Rev
	for i := 0; i < 20; i++ {
		var wg sync.WaitGroup
		res := make([]pushResp, 2)
		for j, d := range []*device{a, b} {
			wg.Add(1)
			go func(j int, d *device) {
				defer wg.Done()
				res[j], _ = d.push(change("shared", fmt.Sprintf(`{"v":%d,"by":%d}`, i+1, j), rev))
			}(j, d)
		}
		wg.Wait()
		won := len(res[0].Applied) + len(res[1].Applied)
		lost := len(res[0].Stale) + len(res[1].Stale)
		if won != 1 || lost != 1 {
			t.Fatalf("round %d: %d applied, %d stale", i, won, lost)
		}
		for _, r := range res {
			if len(r.Applied) == 1 {
				rev = r.Applied[0].Rev
			}
		}
	}
}

// Consistency: after random concurrent inserts, updates, deletions, retries and stale writes from three devices,
// every head still equals what its rows add up to, and a fresh pull sees exactly the stored rows.
func TestHeadsStayEqualToTheRowsUnderRandomConcurrency(t *testing.T) {
	srv, admin := apiServer(t, syncapi.Options{Kinds: []string{"rc"}, MaxRecords: 10_000, MaxBytes: 8 << 20, PerMinute: 100_000})
	a := newDevice(t, srv).turnOn()
	devs := []*device{a, newDevice(t, srv).join(a.ID.IdentityID), newDevice(t, srv).join(a.ID.IdentityID)}
	var mu sync.Mutex
	known := map[string]int64{} // the last rev each test device saw per record
	var wg sync.WaitGroup
	for n, d := range devs {
		wg.Add(1)
		go func(n int, d *device) {
			defer wg.Done()
			r := rand.New(rand.NewPCG(uint64(n), 7))
			for i := 0; i < 60; i++ {
				id := fmt.Sprintf("r%d", r.IntN(25))
				mu.Lock()
				base := known[id]
				mu.Unlock()
				data := fmt.Sprintf(`{"v":%d,"pad":"%s"}`, r.IntN(1000), strings.Repeat("x", r.IntN(200)))
				if r.IntN(5) == 0 {
					data = "" // a deletion
				}
				res, code := d.push(change(id, data, base))
				if code != http.StatusOK {
					t.Errorf("push: %d", code)
					return
				}
				mu.Lock()
				for _, x := range res.Applied {
					known[x.ID] = max(known[x.ID], x.Rev)
				}
				for _, x := range res.Stale {
					known[x.ID] = max(known[x.ID], x.Rev)
				}
				mu.Unlock()
			}
		}(n, d)
	}
	wg.Wait()

	var headRev, headCount, headBytes, maxRev, count, bytesSum int64
	ctx := context.Background()
	_ = admin.QueryRow(ctx, "select rev, record_count, data_bytes from sync.heads where identity_id = $1", a.ID.IdentityID).Scan(&headRev, &headCount, &headBytes)
	_ = admin.QueryRow(ctx, "select coalesce(max(rev),0), count(*), coalesce(sum(data_bytes),0) from sync.records where identity_id = $1", a.ID.IdentityID).Scan(&maxRev, &count, &bytesSum)
	if headRev != maxRev || headCount != count || headBytes != bytesSum {
		t.Fatalf("head (%d, %d, %d) != rows (%d, %d, %d)", headRev, headCount, headBytes, maxRev, count, bytesSum)
	}
	seen := 0
	for cursor, more := int64(0), true; more; {
		p := devs[0].pull(cursor)
		seen += len(p.Records)
		cursor, more = p.Cursor, p.More
	}
	if int64(seen) != count {
		t.Fatalf("a fresh pull saw %d of %d rows", seen, count)
	}
}

// Atomicity as a reader sees it: a push of ten rows becomes visible all at once, never half.
func TestAPullNeverSeesHalfAPush(t *testing.T) {
	srv, _ := apiServer(t, syncapi.Options{Kinds: []string{"rc"}, MaxRecords: 10_000, MaxBytes: 8 << 20, PerMinute: 100_000})
	a := newDevice(t, srv).turnOn()
	b := newDevice(t, srv).join(a.ID.IdentityID)
	done := make(chan struct{})
	go func() {
		defer close(done)
		for n := 0; n < 30; n++ {
			cs := make([]syncapi.Change, 10)
			for i := range cs {
				cs[i] = change(fmt.Sprintf("b%02d-%d", n, i), `{}`, 0)
			}
			a.push(cs...)
		}
	}()
	perBatch := map[string]int{}
	var cursor int64
	for finished := false; !finished; {
		select {
		case <-done:
			finished = true
		default:
		}
		p := b.pull(cursor)
		for _, r := range p.Records {
			perBatch[r.ID[:3]]++
		}
		cursor = p.Cursor
		for batch, n := range perBatch {
			if n != 10 && !p.More {
				t.Fatalf("saw %d of 10 rows of batch %s", n, batch)
			}
		}
	}
}

// Requests that must be refused cleanly, each with the shared error shape, and none of them leaving a trace.
func TestMalformedAndHostileRequests(t *testing.T) {
	srv, admin := apiServer(t, testOpts)
	a := newDevice(t, srv).turnOn()
	post := func(c *http.Client, path, body string, hdr map[string]string) int {
		req, _ := http.NewRequest(http.MethodPost, srv.URL+path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		for k, v := range hdr {
			req.Header.Set(k, v)
		}
		resp, err := c.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		var e struct {
			Error struct{ Code string } `json:"error"`
		}
		if resp.StatusCode >= 400 && (json.NewDecoder(resp.Body).Decode(&e) != nil || e.Error.Code == "") {
			t.Errorf("%s %q: %d without the error shape", path, body, resp.StatusCode)
		}
		return resp.StatusCode
	}
	cases := []struct {
		name, path, body string
		hdr              map[string]string
		want             int
	}{
		{"not json", "/v1/sync/push", "{", nil, 400},
		{"unknown field", "/v1/sync/pull", `{"cursor":0,"admin":true}`, nil, 400},
		{"negative cursor", "/v1/sync/pull", `{"cursor":-1}`, nil, 400},
		{"empty push", "/v1/sync/push", `{"changes":[]}`, nil, 400},
		{"too many changes", "/v1/sync/push", `{"changes":[` + strings.TrimSuffix(strings.Repeat(`{"kind":"rc","id":"x","data":{},"stamp":1,"baseRev":0},`, 201), ",") + `]}`, nil, 400},
		{"data but deleted", "/v1/sync/push", `{"changes":[{"kind":"rc","id":"x","data":{},"deleted":true,"stamp":1,"baseRev":0}]}`, nil, 400},
		{"body over 64 KB", "/v1/sync/push", `{"changes":[{"kind":"rc","id":"x","data":"` + strings.Repeat("a", 70_000) + `","stamp":1,"baseRev":0}]}`, nil, 413},
		{"another site", "/v1/sync/push", `{"changes":[]}`, map[string]string{"Origin": "https://evil.example"}, 403},
	}
	for _, c := range cases {
		if got := post(a.c, c.path, c.body, c.hdr); got != c.want {
			t.Errorf("%s: %d, want %d", c.name, got, c.want)
		}
	}
	if p := a.pull(1 << 62); len(p.Records) != 0 || p.Cursor != 1<<62 {
		t.Errorf("cursor past the end: %+v", p)
	}

	for _, cookie := range []string{"", "short", strings.Repeat("A", 43), "!!!!"} {
		req, _ := http.NewRequest(http.MethodPost, srv.URL+"/v1/sync/pull", strings.NewReader(`{"cursor":0}`))
		req.Header.Set("Cookie", "__Host-dev="+cookie)
		resp, err := srv.Client().Do(req)
		if err != nil {
			t.Fatal(err)
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusUnauthorized {
			t.Errorf("forged cookie %q: %d", cookie, resp.StatusCode)
		}
	}

	ctx := context.Background()
	if _, err := admin.Exec(ctx, "update account.identities set status = 'suspended', suspended_at = now() where id = $1", a.ID.IdentityID); err != nil {
		t.Fatal(err)
	}
	if _, code := a.push(change("x", `{}`, 0)); code != http.StatusForbidden {
		t.Errorf("suspended: %d", code)
	}
	if _, err := admin.Exec(ctx, "delete from account.identities where id = $1", a.ID.IdentityID); err != nil {
		t.Fatal(err)
	}
	if _, code := a.push(change("x", `{}`, 0)); code != http.StatusUnauthorized {
		t.Errorf("deleted identity: %d", code)
	}
	var left int
	_ = admin.QueryRow(ctx, "select (select count(*) from sync.records where identity_id = $1) + (select count(*) from account.devices where identity_id = $1)", a.ID.IdentityID).Scan(&left)
	if left != 0 {
		t.Errorf("deleting an identity left %d rows", left)
	}
}
