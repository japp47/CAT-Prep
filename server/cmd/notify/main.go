// Command notify plans and sends study reminders (internal/notify, docs/design/notifications.md). Run every 15
// minutes by .github/workflows/notify.yml as the owner (MIGRATE_DATABASE_URL): it queues what the rules say, then
// sends what is due for up to -for, and removes messages older than 30 days.
//
// Settings (environment):
//
//	NOTIFY_TOKEN_SECRET                       signs unsubscribe links; the same value as the API's
//	NOTIFY_VAPID_PUBLIC, NOTIFY_VAPID_PRIVATE push keys (make a pair with -vapid); push is off without them
//	NOTIFY_SMTP_USER, NOTIFY_SMTP_PASSWORD    the Gmail account and its app password; email is off without them
//	NOTIFY_EMAIL=off, NOTIFY_PUSH=off         switch a channel off at once
//	NOTIFY_DRY=1                              plan and render, send nothing (the first week live)
//	NOTIFY_EMAIL_DAILY_CAP                    emails in a rolling day (300)
//	NOTIFY_SITE                               https://99ile.pages.dev
//
// Other uses: -vapid prints a new key pair; -preview DIR writes every wording as HTML and text;
// -send-test ADDRESS emails every wording to one address.
package main

import (
	"context"
	"encoding/hex"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/japp47/CAT-Prep/server/internal/mailx"
	"github.com/japp47/CAT-Prep/server/internal/notify"
	"github.com/japp47/CAT-Prep/server/internal/store"
)

func main() {
	vapid := flag.Bool("vapid", false, "print a new push key pair and stop")
	preview := flag.String("preview", "", "write every wording, rendered with sample data, to this folder and stop")
	sendTest := flag.String("send-test", "", "email every wording to this address and stop")
	dry := flag.Bool("dry", os.Getenv("NOTIFY_DRY") == "1", "plan and render; queue and send nothing")
	runFor := flag.Duration("for", 5*time.Minute, "how long to keep sending")
	flag.Parse()
	log := slog.New(slog.NewTextHandler(os.Stdout, nil))
	var err error
	switch {
	case *vapid:
		err = printVAPID()
	case *preview != "":
		err = writePreview(*preview)
	case *sendTest != "":
		err = sendTests(*sendTest)
	default:
		err = run(log, *dry, *runFor)
	}
	if err != nil {
		log.Error("notify failed", "error", err)
		os.Exit(1)
	}
}

func site() string {
	if s := os.Getenv("NOTIFY_SITE"); s != "" {
		return s
	}
	return "https://99ile.pages.dev"
}

func gmail() mailx.Server {
	return mailx.Server{Addr: "smtp.gmail.com:587", User: os.Getenv("NOTIFY_SMTP_USER"), Password: os.Getenv("NOTIFY_SMTP_PASSWORD")}
}

func run(log *slog.Logger, dry bool, runFor time.Duration) error {
	dsn := os.Getenv("MIGRATE_DATABASE_URL")
	if dsn == "" {
		return errors.New("MIGRATE_DATABASE_URL is required: the owner's connection")
	}
	key, err := hex.DecodeString(os.Getenv("NOTIFY_TOKEN_SECRET"))
	if err != nil || len(key) < 32 {
		return errors.New("NOTIFY_TOKEN_SECRET must be at least 32 bytes in hex, the same value as the API's")
	}
	policy, err := notify.LoadPolicy()
	if err != nil {
		return err
	}
	r, err := notify.NewRenderer()
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), runFor+2*time.Minute)
	defer cancel()
	db, err := store.Open(ctx, dsn)
	if err != nil {
		return err
	}
	defer db.Close()

	channels := map[string]notify.Channel{}
	var email *notify.EmailChannel
	if mail := gmail(); mail.User != "" && mail.Password != "" && os.Getenv("NOTIFY_EMAIL") != "off" {
		email = &notify.EmailChannel{Server: mail, Pace: 3 * time.Second, Domain: "99ile.pages.dev"}
		defer email.Close()
		channels[notify.Email] = email
	}
	if pub, priv := os.Getenv("NOTIFY_VAPID_PUBLIC"), os.Getenv("NOTIFY_VAPID_PRIVATE"); pub != "" && priv != "" && os.Getenv("NOTIFY_PUSH") != "off" {
		channels[notify.Push] = notify.PushChannel{Push: notify.WebPush{Keys: notify.VAPID{Public: pub, Private: priv, Subject: "mailto:99ile.team@gmail.com"}}}
	}
	emailCap := 300
	if v, err := strconv.Atoi(os.Getenv("NOTIFY_EMAIL_DAILY_CAP")); err == nil && v >= 0 {
		emailCap = v
	}
	daily, err := notify.FetchDaily(ctx, nil, site())
	if err != nil {
		log.Warn("no daily.json; messages point at Today", "error", err)
	}
	s := &notify.Service{Policy: policy, Render: r, Queue: notify.PG{DB: db}, Store: notify.Store{DB: db}, Channels: channels,
		Tokens: notify.Tokens{Key: key}, Site: site(), Daily: daily, EmailCap: emailCap, Log: log}

	planned, queued, err := s.Plan(ctx, dry)
	if err != nil {
		return fmt.Errorf("plan: %w", err)
	}
	log.Info("planned", "planned", planned, "queued", queued, "dry", dry, "email", channels[notify.Email] != nil, "push", channels[notify.Push] != nil)
	if dry {
		return nil
	}
	c, drainErr := s.Drain(ctx, time.Now().Add(runFor))
	log.Info("sent", "sent", c.Sent, "skipped", c.Skipped, "skips", c.Skips, "failed", c.Failed, "retried", c.Retried, "dead", c.Dead, "released", c.Released)
	if n, err := s.Store.Forget(ctx, policy.KeepMessagesDays); err != nil {
		log.Warn("forget old messages", "error", err)
	} else if n > 0 {
		log.Info("forgot old messages", "rows", n)
	}
	return drainErr // a paused channel fails the run, so GitHub tells the owner
}

func printVAPID() error {
	k, err := notify.NewVAPID()
	if err != nil {
		return err
	}
	fmt.Printf("NOTIFY_VAPID_PUBLIC=%s\nNOTIFY_VAPID_PRIVATE=%s\n\nThe public key goes to Render (the API) and GitHub (this job); the private key to GitHub only.\n", k.Public, k.Private)
	return nil
}

// samples renders every kind and wording with made-up data, as the content test does.
func samples(each func(kind, id string, m notify.Rendered) error) error {
	r, err := notify.NewRenderer()
	if err != nil {
		return err
	}
	v := notify.Vars{Name: "Aarav", Streak: 12, Missed: 5,
		Task: &notify.Task{Label: "RC of the day", Title: "The ethics of nudging", Detail: "4 questions, about 7 minutes", Path: "/practice/rc/rc-ethics-nudging", Mins: 7},
		Week: &notify.Week{Days: 5, Questions: 62, Tiles: []notify.Tile{{Value: "5 of 7", Label: "days you practised"}, {Value: "62", Label: "questions answered"}, {Value: "71%", Label: "right first time"}},
			Lines: []string{"Strongest: para summary, 9 of 10 right.", "Work on next: para jumbles, 4 of 10 right."}}}
	for _, kind := range r.Kinds() {
		for _, id := range r.Variants(kind) {
			m, err := r.Render(kind, id, v, notify.Links{Site: site(), MessageID: 1, Token: "preview"})
			if err != nil {
				return err
			}
			if err := each(kind, id, m); err != nil {
				return err
			}
		}
	}
	return nil
}

func writePreview(dir string) error {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	return samples(func(kind, id string, m notify.Rendered) error {
		fmt.Printf("%-12s %-11s %q  push: %q / %q\n", kind, id, m.Subject, m.PushTitle, m.PushBody)
		if err := os.WriteFile(filepath.Join(dir, id+".html"), []byte(m.HTML), 0o644); err != nil {
			return err
		}
		return os.WriteFile(filepath.Join(dir, id+".txt"), []byte(m.Text), 0o644)
	})
}

func sendTests(to string) error {
	mail := gmail()
	if mail.User == "" || mail.Password == "" {
		return errors.New("set NOTIFY_SMTP_USER and NOTIFY_SMTP_PASSWORD")
	}
	ch := &notify.EmailChannel{Server: mail, Pace: 3 * time.Second, Domain: "99ile.pages.dev"}
	defer ch.Close()
	n := 0
	err := samples(func(kind, id string, m notify.Rendered) error {
		m.Subject = "[Test " + id + "] " + m.Subject
		n++
		_, err := ch.Send(context.Background(), notify.Out{ID: int64(n), Kind: kind, To: to, Rendered: m})
		return err
	})
	if err == nil {
		fmt.Printf("Sent %d test emails to %s\n", n, to)
	}
	return err
}
