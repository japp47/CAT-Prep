// Command digest sends new problem reports to the team, then marks them seen (internal/digest): an email with the
// students' notes (DIGEST_SMTP_USER, DIGEST_SMTP_PASSWORD, optional DIGEST_TO, through Gmail) and a comment
// without notes on the public GitHub issue (GITHUB_TOKEN, GITHUB_REPOSITORY). Either channel may be missing; at
// least one is needed. Run daily by .github/workflows/digest.yml as the owner (MIGRATE_DATABASE_URL).
// -dry prints both texts without sending or marking: make digest-prod.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/japp47/CAT-Prep/server/internal/digest"
	"github.com/japp47/CAT-Prep/server/internal/store"
)

func main() {
	dry := flag.Bool("dry", false, "print the digest; do not post it or mark reports seen")
	flag.Parse()
	log := slog.New(slog.NewTextHandler(os.Stdout, nil))
	if err := run(log, *dry); err != nil {
		log.Error("digest failed", "error", err)
		os.Exit(1)
	}
}

func run(log *slog.Logger, dry bool) error {
	dsn := os.Getenv("MIGRATE_DATABASE_URL")
	if dsn == "" {
		return errors.New("MIGRATE_DATABASE_URL is required: the owner's connection")
	}
	gh := digest.GitHub{API: "https://api.github.com", Repo: os.Getenv("GITHUB_REPOSITORY"), Token: os.Getenv("GITHUB_TOKEN"), HTTP: &http.Client{Timeout: 30 * time.Second}}
	mail := digest.SMTP{Addr: "smtp.gmail.com:587", User: os.Getenv("DIGEST_SMTP_USER"), Password: os.Getenv("DIGEST_SMTP_PASSWORD"), To: os.Getenv("DIGEST_TO")}
	if mail.To == "" {
		mail.To = mail.User
	}
	useGitHub, useMail := gh.Repo != "" && gh.Token != "", mail.User != "" && mail.Password != ""
	if !dry && !useGitHub && !useMail {
		return errors.New("nowhere to send: set GITHUB_TOKEN and GITHUB_REPOSITORY, or DIGEST_SMTP_USER and DIGEST_SMTP_PASSWORD (or use -dry)")
	}
	if !dry && !useMail {
		log.Warn("no email: DIGEST_SMTP_USER or DIGEST_SMTP_PASSWORD is not set; posting to GitHub only")
	}
	ist, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		ist = time.FixedZone("IST", 5*3600+1800)
	}
	ctx := context.Background()
	db, err := store.Open(ctx, dsn)
	if err != nil {
		return err
	}
	defer db.Close()
	p, err := digest.Load(ctx, db)
	if err != nil {
		return err
	}
	if len(p.Groups) == 0 {
		log.Info("no new reports", "still_open", p.StillOpen)
		return nil
	}
	body := digest.Markdown(p, ist)
	if dry {
		subject, text := digest.Email(p, ist, "")
		fmt.Printf("GitHub comment:\n\n%s\nEmail: %s\n\n%s", body, subject, text)
		return nil
	}
	var post func() (string, error)
	var send func(string) error
	if useGitHub {
		post = func() (string, error) { return gh.Post(ctx, body) }
	}
	if useMail {
		send = func(issue string) error { return mail.Send(digest.Email(p, ist, issue)) }
	}
	// Send first, then mark: if marking fails, tomorrow repeats these reports instead of losing them. If one channel
	// failed and the other worked, the reports are still marked, and the job fails so the owner sees it.
	sent, sendErr := digest.Deliver(post, send)
	if !sent {
		return sendErr
	}
	n, err := digest.MarkSeen(ctx, db, p.IDs())
	if err != nil {
		return errors.Join(sendErr, fmt.Errorf("sent but could not mark reports seen: %w", err))
	}
	log.Info("digest sent", "reports", n, "github", useGitHub, "email", useMail)
	return sendErr
}
