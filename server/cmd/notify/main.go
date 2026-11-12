// Command notify makes one pass of the study reminders (internal/notify, docs/design/notifications.md) as the owner
// (MIGRATE_DATABASE_URL): it queues what the rules say, then sends what is due for up to -for. The API's worker does
// the same every two minutes (NOTIFY_WORKER=1, D91); this is the manual way, from .github/workflows/notify.yml.
//
// Settings (environment):
//
//	NOTIFY_TOKEN_SECRET                       signs unsubscribe links; the same value as the API's
//	NOTIFY_VAPID_PUBLIC, NOTIFY_VAPID_PRIVATE push keys (make a pair with -vapid); push is off without them
//	NOTIFY_SMTP_USER                          the sending Gmail account, 99ile.team@gmail.com
//	NOTIFY_GMAIL_CLIENT_ID, _SECRET, _REFRESH_TOKEN  email through Gmail's API over HTTPS (D92; -gmail-token)
//	NOTIFY_SMTP_PASSWORD                      or email over SMTP with an app password, where the mail ports are open
//	NOTIFY_EMAIL=off, NOTIFY_PUSH=off         switch a channel off at once
//	NOTIFY_DRY=1                              plan and render, send nothing (the first week live)
//	NOTIFY_EMAIL_DAILY_CAP                    emails in a rolling day (300)
//	NOTIFY_SITE                               https://99ile.pages.dev
//
// Other uses: -vapid prints a new key pair; -gmail-token signs in to Gmail once and prints a refresh token; -preview DIR writes every wording as HTML and text;
// -send-test ADDRESS emails every wording to one address.
package main

import (
	"context"
	"encoding/hex"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"golang.org/x/oauth2"

	"github.com/japp47/CAT-Prep/server/internal/notify"
	"github.com/japp47/CAT-Prep/server/internal/store"
)

// dbTries is how often a scheduled job retries the database before giving up, about twenty seconds in all. The free
// database's pooler sometimes takes longer than a single ping allows, and a daily job can afford to wait.
const dbTries = 8

func main() {
	vapid := flag.Bool("vapid", false, "print a new push key pair and stop")
	gmailToken := flag.Bool("gmail-token", false, "sign in to Gmail once and print the refresh token for NOTIFY_GMAIL_REFRESH_TOKEN")
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
	case *gmailToken:
		err = gmailSignIn()
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

func run(log *slog.Logger, dry bool, runFor time.Duration) error {
	dsn := os.Getenv("MIGRATE_DATABASE_URL")
	if dsn == "" {
		return errors.New("MIGRATE_DATABASE_URL is required: the owner's connection")
	}
	key, _ := hex.DecodeString(os.Getenv("NOTIFY_TOKEN_SECRET"))
	emailCap, _ := strconv.Atoi(os.Getenv("NOTIFY_EMAIL_DAILY_CAP"))
	set := notify.Settings{Site: site(), TokenKey: key, VAPIDPublic: os.Getenv("NOTIFY_VAPID_PUBLIC"), VAPIDPrivate: os.Getenv("NOTIFY_VAPID_PRIVATE"),
		SMTPUser: os.Getenv("NOTIFY_SMTP_USER"), SMTPPassword: os.Getenv("NOTIFY_SMTP_PASSWORD"),
		EmailOff: os.Getenv("NOTIFY_EMAIL") == "off", PushOff: os.Getenv("NOTIFY_PUSH") == "off", EmailCap: emailCap,
		GmailClientID: os.Getenv("NOTIFY_GMAIL_CLIENT_ID"), GmailClientSecret: os.Getenv("NOTIFY_GMAIL_CLIENT_SECRET"), GmailRefreshToken: os.Getenv("NOTIFY_GMAIL_REFRESH_TOKEN")}
	ctx, cancel := context.WithTimeout(context.Background(), runFor+2*time.Minute)
	defer cancel()
	db, err := store.OpenWithRetry(ctx, dsn, dbTries, log)
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

// samples renders every kind and wording with the sample data the admin panel's test send uses.
func samples(each func(kind, id string, m notify.Rendered) error) error {
	r, err := notify.NewRenderer()
	if err != nil {
		return err
	}
	for _, kind := range r.Kinds() {
		for _, id := range r.Variants(kind) {
			v, err := r.SampleVars(id)
			if err != nil {
				return err
			}
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
	set := notify.Settings{SMTPUser: os.Getenv("NOTIFY_SMTP_USER"), SMTPPassword: os.Getenv("NOTIFY_SMTP_PASSWORD"),
		GmailClientID: os.Getenv("NOTIFY_GMAIL_CLIENT_ID"), GmailClientSecret: os.Getenv("NOTIFY_GMAIL_CLIENT_SECRET"), GmailRefreshToken: os.Getenv("NOTIFY_GMAIL_REFRESH_TOKEN")}
	ch := notify.EmailChannelFor(set)
	if ch == nil {
		return errors.New("set NOTIFY_SMTP_USER, and NOTIFY_SMTP_PASSWORD or the three NOTIFY_GMAIL_* settings")
	}
	if c, ok := ch.(interface{ Close() }); ok {
		defer c.Close()
	}
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

// gmailSignIn is the one-time sign-in that lets 99ile send as the team account through Gmail's API (D92). It needs an
// OAuth client of type "Desktop app" (NOTIFY_GMAIL_CLIENT_ID and _SECRET); Google sends the browser back to a port on
// this machine, which reads the code once and closes. Only the send permission is asked for.
func gmailSignIn() error {
	conf := &oauth2.Config{ClientID: os.Getenv("NOTIFY_GMAIL_CLIENT_ID"), ClientSecret: os.Getenv("NOTIFY_GMAIL_CLIENT_SECRET"),
		Endpoint: notify.GoogleOAuth, Scopes: []string{notify.GmailScope, notify.GmailMetadataScope}}
	if conf.ClientID == "" || conf.ClientSecret == "" {
		return errors.New("set NOTIFY_GMAIL_CLIENT_ID and NOTIFY_GMAIL_CLIENT_SECRET (a Desktop app OAuth client; server/README.md, Study reminders)")
	}
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return err
	}
	defer l.Close()
	conf.RedirectURL = "http://" + l.Addr().String() + "/"
	state, verifier := oauth2.GenerateVerifier(), oauth2.GenerateVerifier()
	url := conf.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.ApprovalForce, oauth2.S256ChallengeOption(verifier))
	fmt.Printf("Open this in a browser signed in as 99ile.team@gmail.com and allow \"Send email on your behalf\" and \"View your email message metadata\" (headers only, for bounces):\n\n%s\n\nWaiting for Google...\n", url)
	got := make(chan string, 1)
	srv := &http.Server{ReadHeaderTimeout: 10 * time.Second, Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("state") != state {
			http.Error(w, "This is not the sign-in that was started. Run the command again.", http.StatusBadRequest)
			return
		}
		fmt.Fprintln(w, "Done. You can close this tab and go back to the terminal.")
		got <- r.URL.Query().Get("code")
	})}
	go func() { _ = srv.Serve(l) }()
	defer srv.Close()
	var code string
	select {
	case code = <-got:
	case <-time.After(10 * time.Minute):
		return errors.New("no answer from Google within ten minutes")
	}
	if code == "" {
		return errors.New("Google sent no code: the permission was not given")
	}
	tok, err := conf.Exchange(context.Background(), code, oauth2.VerifierOption(verifier))
	if err != nil {
		return err
	}
	if tok.RefreshToken == "" {
		return errors.New("Google gave no refresh token; remove 99ile at myaccount.google.com/permissions and run this again")
	}
	fmt.Printf("\nNOTIFY_GMAIL_REFRESH_TOKEN=%s\n\nPut it on Render with NOTIFY_GMAIL_CLIENT_ID and NOTIFY_GMAIL_CLIENT_SECRET. It is a password: keep it nowhere else.\n", tok.RefreshToken)
	return nil
}
