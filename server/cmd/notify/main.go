// Command notify makes one pass of the study reminders (internal/notify, docs/design/notifications.md) as the owner
// (MIGRATE_DATABASE_URL): it queues what the rules say, then sends what is due for up to -for. The API's worker does
// the same every two minutes (NOTIFY_WORKER=1, D91); this is the manual way, from .github/workflows/notify.yml.
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
	return mailx.Server{Addr: notify.Gmail, User: os.Getenv("NOTIFY_SMTP_USER"), Password: os.Getenv("NOTIFY_SMTP_PASSWORD")}
}

func run(log *slog.Logger, dry bool, runFor time.Duration) error {
	dsn := os.Getenv("MIGRATE_DATABASE_URL")
	if dsn == "" {
		return errors.New("MIGRATE_DATABASE_URL is required: the owner's connection")
	}
	key, _ := hex.DecodeString(os.Getenv("NOTIFY_TOKEN_SECRET"))
	emailCap, _ := strconv.Atoi(os.Getenv("NOTIFY_EMAIL_DAILY_CAP"))
	set := notify.Settings{Site: site(), TokenKey: key, VAPIDPublic: os.Getenv("NOTIFY_VAPID_PUBLIC"), VAPIDPrivate: os.Getenv("NOTIFY_VAPID_PRIVATE"),
		SMTPUser: os.Getenv("NOTIFY_SMTP_USER"), SMTPPassword: os.Getenv("NOTIFY_SMTP_PASSWORD"),
		EmailOff: os.Getenv("NOTIFY_EMAIL") == "off", PushOff: os.Getenv("NOTIFY_PUSH") == "off", EmailCap: emailCap}
	ctx, cancel := context.WithTimeout(context.Background(), runFor+2*time.Minute)
	defer cancel()
	db, err := store.Open(ctx, dsn)
	if err != nil {
		return err
	}
	defer db.Close()
	s, err := notify.NewService(db, set, log)
	if err != nil {
		return err
	}
	// The same pass the API's worker makes every two minutes (D91); this command is the manual way to run one.
	w := &notify.Worker{Service: s, Every: runFor, Dry: dry, DailyFrom: notify.SiteDaily(site()), Log: log}
	log.Info("one pass", "dry", dry, "email", s.Channels[notify.Email] != nil, "push", s.Channels[notify.Push] != nil)
	w.Tick(ctx)
	return nil
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
