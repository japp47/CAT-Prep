package notify

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestWorkerPassSendsDryDoesNot(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	push := &fakeChannel{name: Push}
	s := service(t, db, push)
	a := student(t, db, EmailOff, 1)

	dry := &Worker{Service: s, Every: time.Minute, Dry: true, Log: silent}
	dry.Tick(ctx)
	if got := statuses(t, db, a); got != "" {
		t.Fatalf("a dry pass queued %q", got)
	}
	w := &Worker{Service: s, Every: time.Minute, Log: silent, DailyFrom: func(context.Context) (Daily, error) { return Daily{}, nil }}
	w.Tick(ctx)
	if got := statuses(t, db, a); got != "daily/push=sent" {
		t.Fatalf("a pass: %q", got)
	}
	w.Tick(ctx) // the next pass, two minutes on, finds nothing new for today
	if len(push.got) != 1 {
		t.Errorf("sent %d times, want once", len(push.got))
	}
}

func TestWorkerAlertsOnceWhenAChannelBreaks(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	push := &fakeChannel{name: Push, err: errors.New("push service 503")}
	s := service(t, db, push)
	for i := 0; i < 6; i++ {
		student(t, db, EmailOff, 1)
	}
	var mu sync.Mutex
	var alerts []string
	w := &Worker{Service: s, Every: time.Minute, Log: silent, AlertGap: time.Hour,
		Alert: func(_ context.Context, subject, body string) error {
			mu.Lock()
			alerts = append(alerts, body)
			mu.Unlock()
			return nil
		}}
	w.Tick(ctx)
	if len(alerts) != 1 || !strings.Contains(alerts[0], "push") || !strings.Contains(alerts[0], "503") {
		t.Fatalf("alerts %q", alerts)
	}
	_, _ = db.Exec(ctx, `update notify.messages set run_at = now() where status = 'queued'`)
	w.Tick(ctx)
	if len(alerts) != 1 {
		t.Errorf("alerted %d times within the gap, want once", len(alerts))
	}
}

func TestWorkerStopsWithItsContext(t *testing.T) {
	db := testDB(t)
	ctx, cancel := context.WithCancel(context.Background())
	w := &Worker{Service: service(t, db), Every: time.Hour, Log: silent}
	var done sync.WaitGroup
	done.Add(1)
	go w.Run(ctx, &done)
	cancel()
	stopped := make(chan struct{})
	go func() { done.Wait(); close(stopped) }()
	select {
	case <-stopped:
	case <-time.After(5 * time.Second):
		t.Fatal("the worker did not stop")
	}
}
