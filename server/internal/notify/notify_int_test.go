package notify

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/japp47/CAT-Prep/server/internal/ids"
	"github.com/japp47/CAT-Prep/server/internal/store"
	"github.com/japp47/CAT-Prep/server/migrations"
)

var silent = slog.New(slog.NewTextHandler(io.Discard, nil))

// testDB is the cat_test database, migrated, with the reminder queue emptied. Never point it at real data.
func testDB(t *testing.T) *pgxpool.Pool {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	ctx := context.Background()
	db, err := store.Open(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(db.Close)
	if err := store.Migrate(ctx, db, migrations.FS, silent); err != nil {
		t.Fatal(err)
	}
	// Each test sees only the students it makes: earlier ones (turned on "three days ago", from this run or a past one)
	// are switched off. Students turned on just now belong to the API tests running beside these, and are left alone;
	// the rules send them nothing on their first day anyway.
	if _, err := db.Exec(ctx, `delete from notify.messages where identity_id in (select identity_id from notify.prefs where enabled_at < now() - interval '1 hour');
		update notify.prefs set enabled = false, enabled_at = null where enabled_at < now() - interval '1 hour'`); err != nil {
		t.Fatal(err)
	}
	return db
}

// fakeChannel records what it was given and answers with err.
type fakeChannel struct {
	name string
	mu   sync.Mutex
	got  []Out
	err  error
}

func (f *fakeChannel) Name() string { return f.name }
func (f *fakeChannel) Send(_ context.Context, m Out) (Result, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.got = append(f.got, m)
	return Result{}, f.err
}

// student makes an identity with reminders on since three days ago, at midnight (so any time of day is past it),
// no quiet hours, practised yesterday; with a verified Google address when email is not off.
func student(t *testing.T, db *pgxpool.Pool, emailMode string, pushDevices int) string {
	t.Helper()
	ctx := context.Background()
	id := ids.New()
	exec := func(sql string, args ...any) {
		t.Helper()
		if _, err := db.Exec(ctx, sql, args...); err != nil {
			t.Fatal(err)
		}
	}
	exec(`insert into account.identities (id) values ($1)`, id)
	if emailMode != EmailOff {
		exec(`insert into account.users (id, identity_id, email, email_verified, display_name) values ($1, $2, $3, true, 'Aarav Sharma')`, ids.New(), id, "s-"+id[24:]+"@example.com")
	}
	exec(`insert into notify.prefs (identity_id, enabled, enabled_at, at_minute, quiet_from, quiet_to, email_mode)
		values ($1, true, now() - interval '3 days', 0, 0, 0, $2)`, id, emailMode)
	exec(`insert into notify.activity (identity_id, last_at, last_day, streak)
		values ($1, now() - interval '1 day', (now() at time zone 'Asia/Kolkata')::date - 1, 1)`, id)
	for i := 0; i < pushDevices; i++ {
		exec(`insert into notify.push_subs (identity_id, endpoint, p256dh, auth) values ($1, $2, $3, $4)`,
			id, "https://push.example/"+ids.New(), strings.Repeat("B", 87), strings.Repeat("a", 22))
	}
	return id
}

func service(t *testing.T, db *pgxpool.Pool, channels ...*fakeChannel) *Service {
	t.Helper()
	p := policy(t)
	p.Exams = nil // the test must pass on exam day too
	r := renderer(t)
	s := &Service{Policy: p, Render: r, Queue: PG{DB: db}, Store: Store{DB: db}, Channels: map[string]Channel{},
		Tokens: Tokens{Key: []byte("0123456789abcdef0123456789abcdef")}, Site: "https://99ile.pages.dev", EmailCap: 300, Log: silent}
	for _, c := range channels {
		s.Channels[c.name] = c
	}
	return s
}

func statuses(t *testing.T, db *pgxpool.Pool, identity string) string {
	t.Helper()
	rows, err := db.Query(context.Background(), `select kind || '/' || channel || '=' || status || case when reason <> '' then ' (' || reason || ')' else '' end
		from notify.messages where identity_id = $1 order by channel desc`, identity)
	if err != nil {
		t.Fatal(err)
	}
	got, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		t.Fatal(err)
	}
	return strings.Join(got, ", ")
}

func TestPlanAndDrain(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	push, mail := &fakeChannel{name: Push}, &fakeChannel{name: Email}
	s := service(t, db, push, mail)
	a := student(t, db, EmailDaily, 1)

	if _, queued, err := s.Plan(ctx, false); err != nil || queued < 2 {
		t.Fatalf("plan: %d queued, %v", queued, err)
	}
	if got := statuses(t, db, a); got != "daily/push=queued, daily/email=queued" {
		t.Fatalf("queued: %s", got)
	}
	if _, queued, _ := s.Plan(ctx, false); queued != 0 {
		t.Errorf("a second plan queued %d: the dedupe key must refuse repeats", queued)
	}
	c, err := s.Drain(ctx, time.Now().Add(time.Minute))
	if err != nil || c.Sent < 2 {
		t.Fatalf("drain: %+v, %v", c, err)
	}
	if got := statuses(t, db, a); got != "daily/push=sent, daily/email=sent" {
		t.Errorf("after drain: %s", got)
	}
	var email Out
	for _, o := range mail.got {
		if o.Identity == a {
			email = o
		}
	}
	if !strings.HasPrefix(email.To, "s-") || !strings.Contains(email.Rendered.HTML, "Aarav") ||
		!strings.Contains(email.Rendered.URL, "/today?from=reminder-daily&m=") || !strings.Contains(email.Rendered.UnsubscribeURL, "unsubscribe?t=") {
		t.Errorf("email: to %q, url %q", email.To, email.Rendered.URL)
	}
	if id, scope, err := s.Tokens.Check(strings.TrimPrefix(email.Rendered.UnsubscribeURL, "https://99ile.pages.dev/api/v1/unsubscribe?t=")); err != nil || id != a || scope != ScopeReminders {
		t.Errorf("token: %s %s %v", id, scope, err)
	}
	if _, queued, _ := s.Plan(ctx, false); queued != 0 {
		t.Errorf("after sending, the same day queued %d more", queued)
	}

	// Practice right after the reminder counts as following it.
	practise(t, db, a)
	var practised bool
	_ = db.QueryRow(ctx, `select bool_or(practised_at is not null) from notify.messages where identity_id = $1`, a).Scan(&practised)
	if !practised {
		t.Error("practice within two hours of a reminder was not recorded")
	}
}

func practise(t *testing.T, db *pgxpool.Pool, identity string) {
	t.Helper()
	if err := pgx.BeginFunc(context.Background(), db, func(tx pgx.Tx) error { return RecordPractice(context.Background(), tx, identity, 2) }); err != nil {
		t.Fatal(err)
	}
}

func TestPractiseBeforeSendingCancels(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	push := &fakeChannel{name: Push}
	s := service(t, db, push)
	b := student(t, db, EmailOff, 1)
	if _, _, err := s.Plan(ctx, false); err != nil {
		t.Fatal(err)
	}
	practise(t, db, b) // on another device, while the message waited
	if _, err := s.Drain(ctx, time.Now().Add(time.Minute)); err != nil {
		t.Fatal(err)
	}
	if got := statuses(t, db, b); got != "daily/push=skipped (no longer due)" {
		t.Errorf("got %s", got)
	}
	var streak int
	_ = db.QueryRow(ctx, `select streak from notify.activity where identity_id = $1`, b).Scan(&streak)
	if streak != 2 {
		t.Errorf("practised yesterday and today: streak %d, want 2", streak)
	}
	if _, queued, _ := s.Plan(ctx, false); queued != 0 {
		t.Error("planned a reminder for a student who practised today")
	}
}

func TestFailuresRetryThenStop(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	push := &fakeChannel{name: Push, err: errors.New("push service 503")}
	s := service(t, db, push)
	c := student(t, db, EmailOff, 1)
	if _, _, err := s.Plan(ctx, false); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Drain(ctx, time.Now().Add(time.Minute)); err != nil {
		t.Fatal(err)
	}
	var status string
	var later bool
	_ = db.QueryRow(ctx, `select status, run_at > now() from notify.messages where identity_id = $1`, c).Scan(&status, &later)
	if status != "queued" || !later {
		t.Errorf("a temporary error: %s, later %v; want queued for a retry", status, later)
	}
	push.err = Permanent(errors.New("bad key"))
	_, _ = db.Exec(ctx, `update notify.messages set run_at = now() where identity_id = $1`, c)
	if _, err := s.Drain(ctx, time.Now().Add(time.Minute)); err != nil {
		t.Fatal(err)
	}
	if got := statuses(t, db, c); got != "daily/push=failed (bad key)" {
		t.Errorf("a permanent error: %s", got)
	}
}

func TestTwoWorkersNeverClaimTheSameMessage(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	q := PG{DB: db}
	id := student(t, db, EmailOff, 0)
	var ms []Planned
	for i := 0; i < 40; i++ {
		ms = append(ms, Planned{Identity: id, Kind: "daily", Channel: Push, Key: id + ":test:" + ids.New(), Variant: "daily-a", Priority: 5, RunAt: time.Now().Add(-time.Second)})
	}
	if n, err := q.Enqueue(ctx, ms); err != nil || n != 40 {
		t.Fatalf("enqueue: %d, %v", n, err)
	}
	var mu sync.Mutex
	seen := map[int64]int{}
	var wg sync.WaitGroup
	for w := 0; w < 4; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				got, err := q.Claim(ctx, 7, time.Minute)
				if err != nil {
					t.Error(err)
					return
				}
				if len(got) == 0 {
					return
				}
				mu.Lock()
				for _, m := range got {
					seen[m.ID]++
				}
				mu.Unlock()
			}
		}()
	}
	wg.Wait()
	if len(seen) != 40 {
		t.Errorf("claimed %d of 40", len(seen))
	}
	for id, n := range seen {
		if n != 1 {
			t.Errorf("message %d claimed %d times", id, n)
		}
	}
	// A lease that runs out makes the message due again.
	_, _ = db.Exec(ctx, `update notify.messages set locked_until = now() - interval '1 second' where identity_id = $1`, id)
	if again, _ := q.Claim(ctx, 100, time.Minute); len(again) != 40 {
		t.Errorf("after the leases ran out, %d were due again", len(again))
	}
}
