package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/japp47/CAT-Prep/server/internal/config"
	"github.com/japp47/CAT-Prep/server/internal/ids"
	"github.com/japp47/CAT-Prep/server/internal/notify"
	"github.com/japp47/CAT-Prep/server/internal/store"
	"github.com/japp47/CAT-Prep/server/migrations"
)

var notifyKey = []byte("0123456789abcdef0123456789abcdef")

// notifyServer is apiServer with reminders configured and the practice hook on, as newV1 builds it.
func notifyServer(t *testing.T) (*httptest.Server, *pgxpool.Pool) {
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
	cfg := config.Config{Env: "dev", AllowedOrigin: "http://localhost:5173", NotifyTokenKey: notifyKey, NotifyVAPIDPublic: "BPub"}
	opt := testOpts
	opt.Practice = practiceHook()
	srv := httptest.NewTLSServer(newHandler(cfg, fakeDB(nil), quiet, v1Routes(cfg, appPool(t), quiet, opt)))
	t.Cleanup(srv.Close)
	return srv, admin
}

func (d *device) send(method, path string, body, out any) int {
	d.t.Helper()
	var r *bytes.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		r = bytes.NewReader(b)
	} else {
		r = bytes.NewReader(nil)
	}
	req, _ := http.NewRequest(method, d.srv.URL+path, r)
	req.Header.Set("Content-Type", "application/json")
	resp, err := d.c.Do(req)
	if err != nil {
		d.t.Fatal(err)
	}
	defer resp.Body.Close()
	if out != nil {
		_ = json.NewDecoder(resp.Body).Decode(out)
	}
	return resp.StatusCode
}

func TestRemindersEndToEnd(t *testing.T) {
	srv, admin := notifyServer(t)
	ctx := context.Background()
	d := newDevice(t, srv).turnOn()

	var p notify.Prefs
	if code := d.send("GET", "/v1/notify/prefs", nil, &p); code != http.StatusOK || p.On || p.At != 1170 || len(p.Days) != 7 || p.Email != "off" {
		t.Fatalf("defaults: %d %+v", code, p)
	}
	on := map[string]any{"on": true, "at": 1170, "days": []int{1, 2, 3, 4, 5}, "timeZone": "Asia/Kolkata", "quietFrom": 1380, "quietTo": 420, "email": "off", "weekly": false, "pausedUntil": nil}
	if code := d.send("PUT", "/v1/notify/prefs", on, &p); code != http.StatusOK || !p.On || len(p.Days) != 5 {
		t.Fatalf("turn on: %d %+v", code, p)
	}
	for name, edit := range map[string]func(map[string]any){
		"off the quarter hour": func(m map[string]any) { m["at"] = 1171 },
		"unknown zone":         func(m map[string]any) { m["timeZone"] = "Mars/Olympus" },
		"day 7":                func(m map[string]any) { m["days"] = []int{7} },
		"email without google": func(m map[string]any) { m["email"] = "missed" },
		"unknown email mode":   func(m map[string]any) { m["email"] = "hourly" },
	} {
		m := map[string]any{}
		for k, v := range on {
			m[k] = v
		}
		edit(m)
		if code := d.send("PUT", "/v1/notify/prefs", m, nil); code != http.StatusBadRequest {
			t.Errorf("%s: %d", name, code)
		}
	}

	// Push: subscribe this device, then turn it off again.
	sub := map[string]any{"endpoint": "https://fcm.googleapis.com/fcm/send/abc", "expirationTime": nil,
		"keys": map[string]string{"p256dh": "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4", "auth": "BTBZMqHH6r4Tts7J_aSIgg"}}
	if code := d.send("POST", "/v1/notify/push", sub, nil); code != http.StatusNoContent {
		t.Fatalf("subscribe: %d", code)
	}
	if d.send("GET", "/v1/notify/prefs", nil, &p); p.PushDevices != 1 || !p.ThisDevice {
		t.Errorf("after subscribe: %+v", p)
	}
	sub["endpoint"] = "http://plain.example/x"
	if code := d.send("POST", "/v1/notify/push", sub, nil); code != http.StatusBadRequest {
		t.Errorf("a plain http endpoint: %d", code)
	}
	if code := d.send("DELETE", "/v1/notify/push", nil, nil); code != http.StatusNoContent {
		t.Errorf("unsubscribe: %d", code)
	}
	if d.send("GET", "/v1/notify/prefs", nil, &p); p.PushDevices != 0 || p.ThisDevice {
		t.Errorf("after unsubscribe: %+v", p)
	}

	// A synced attempt records practice, as cat_app inside the push.
	if _, code := d.push(change("rc:notify-1", `{"c":3}`, 0)); code != http.StatusOK {
		t.Fatalf("push: %d", code)
	}
	var streak int
	if err := admin.QueryRow(ctx, `select streak from notify.activity where identity_id = $1`, d.ID.IdentityID).Scan(&streak); err != nil || streak != 1 {
		t.Errorf("activity after an attempt: %d, %v", streak, err)
	}

	// One-click unsubscribe needs no cookie; a forged token does nothing; GET only redirects.
	if _, err := admin.Exec(ctx, `insert into account.users (id, identity_id, email, email_verified) values (gen_random_uuid(), $1, 'n@example.com', true)`, d.ID.IdentityID); err != nil {
		t.Fatal(err)
	}
	on["email"] = "missed"
	if code := d.send("PUT", "/v1/notify/prefs", on, &p); code != http.StatusOK || p.Email != "missed" || p.EmailAddress != "n@example.com" {
		t.Fatalf("email on: %d %+v", code, p)
	}
	stranger := newDevice(t, srv)
	tok := notify.Tokens{Key: notifyKey}.Make(d.ID.IdentityID, notify.ScopeReminders)
	forged := notify.Tokens{Key: []byte("another key, just as long as it.")}.Make(d.ID.IdentityID, notify.ScopeReminders)
	if code := stranger.send("POST", "/v1/unsubscribe?t="+forged, nil, nil); code != http.StatusBadRequest {
		t.Errorf("forged token: %d", code)
	}
	noRedirect := &http.Client{Transport: srv.Client().Transport, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	res, err := noRedirect.Get(srv.URL + "/v1/unsubscribe?t=" + tok)
	if err != nil || res.StatusCode != http.StatusSeeOther || !strings.HasPrefix(res.Header.Get("Location"), "http://localhost:5173/unsubscribe?t=") {
		t.Errorf("GET: %v %v", res.StatusCode, res.Header.Get("Location"))
	}
	if d.send("GET", "/v1/notify/prefs", nil, &p); p.Email != "missed" {
		t.Error("a GET changed the choice")
	}
	if code := stranger.send("POST", "/v1/unsubscribe?t="+tok, nil, nil); code != http.StatusOK {
		t.Errorf("one-click: %d", code)
	}
	if d.send("GET", "/v1/notify/prefs", nil, &p); p.Email != "off" || !p.On {
		t.Errorf("after one-click: email %s, on %v; want email off and push reminders kept", p.Email, p.On)
	}

	// Deleting the identity removes every reminder row.
	if code := d.del("/v1/me"); code != http.StatusNoContent && code != http.StatusOK {
		t.Fatalf("delete: %d", code)
	}
	var left int
	_ = admin.QueryRow(ctx, `select (select count(*) from notify.prefs where identity_id = $1) + (select count(*) from notify.activity where identity_id = $1)`, d.ID.IdentityID).Scan(&left)
	if left != 0 {
		t.Errorf("%d reminder rows left after delete", left)
	}
}

// In dev the API makes its own unsubscribe key, so Reminders work with no setup; push waits for the VAPID key.
func TestRemindersInDevWithoutKeys(t *testing.T) {
	srv, _ := apiServer(t, testOpts)
	d := newDevice(t, srv).turnOn()
	var p notify.Prefs
	if code := d.send("GET", "/v1/notify/prefs", nil, &p); code != http.StatusOK || p.PushReady {
		t.Errorf("dev, no keys: %d, pushReady %v; want 200 and no push", code, p.PushReady)
	}
	if code := d.send("GET", "/v1/notify/push-key", nil, nil); code != http.StatusServiceUnavailable {
		t.Errorf("push key without VAPID: %d, want 503", code)
	}
}

// The worker runs inside the API as cat_app (D91): planning, claiming, sending and forgetting must all be allowed.
func TestReminderWorkerRunsAsTheAPIRole(t *testing.T) {
	_, admin := notifyServer(t)
	ctx := context.Background()
	app := appPool(t)
	id := ids.New()
	for _, q := range []string{
		`insert into account.identities (id) values ($1)`,
		`insert into notify.prefs (identity_id, enabled, enabled_at, at_minute, quiet_from, quiet_to) values ($1, true, now() - interval '3 days', 0, 0, 0)`,
		`insert into notify.activity (identity_id, last_at, last_day, streak) values ($1, now() - interval '1 day', (now() at time zone 'Asia/Kolkata')::date - 1, 1)`,
	} {
		if _, err := admin.Exec(ctx, q, id); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := admin.Exec(ctx, `insert into notify.push_subs (identity_id, endpoint, p256dh, auth) values ($1, $2, repeat('B', 87), repeat('a', 22))`, id, "https://push.example/"+id); err != nil {
		t.Fatal(err)
	}
	svc, err := notify.NewService(app, notify.Settings{Site: "https://99ile.pages.dev", TokenKey: notifyKey}, quiet)
	if err != nil {
		t.Fatal(err)
	}
	svc.Policy.Exams = nil
	sent := &countingChannel{}
	svc.Channels = map[string]notify.Channel{notify.Push: sent}
	(&notify.Worker{Service: svc, Every: time.Minute, Log: quiet}).Tick(ctx)
	var status string
	_ = admin.QueryRow(ctx, `select status from notify.messages where identity_id = $1`, id).Scan(&status)
	if status != "sent" || sent.n == 0 {
		t.Fatalf("as cat_app: status %q, %d sent", status, sent.n)
	}
	if _, err := svc.Store.Forget(ctx, 30); err != nil {
		t.Errorf("forgetting old messages as cat_app: %v", err)
	}
	_, _ = admin.Exec(ctx, `delete from account.identities where id = $1`, id)
}

type countingChannel struct{ n int }

func (c *countingChannel) Name() string { return notify.Push }
func (c *countingChannel) Send(context.Context, notify.Out) (notify.Result, error) {
	c.n++
	return notify.Result{}, nil
}
