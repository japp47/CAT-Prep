// Command digest posts new problem reports to the GitHub issue the owner watches, then marks them seen
// (internal/digest). Run daily by .github/workflows/digest.yml as the owner (MIGRATE_DATABASE_URL), with
// GITHUB_TOKEN and GITHUB_REPOSITORY. -dry prints the digest without posting or marking: make digest-prod.
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
	if !dry && (gh.Repo == "" || gh.Token == "") {
		return errors.New("GITHUB_REPOSITORY and GITHUB_TOKEN are required (or use -dry)")
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
		fmt.Println(body)
		return nil
	}
	// Post first, then mark: if marking fails, tomorrow repeats these reports instead of losing them.
	at, err := gh.Post(ctx, body)
	if err != nil {
		return err
	}
	n, err := digest.MarkSeen(ctx, db, p.IDs())
	if err != nil {
		return fmt.Errorf("posted to %s but could not mark reports seen: %w", at, err)
	}
	log.Info("digest posted", "issue", at, "reports", n)
	return nil
}
