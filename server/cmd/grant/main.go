// Command grant makes a signed-in account staff, or stops it being staff (docs/database.md §4 rule 8), as the owner
// (MIGRATE_DATABASE_URL). By hand: make grant-prod EMAIL=you@gmail.com [ROLE=moderator] [REVOKE=1].
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"

	"github.com/japp47/CAT-Prep/server/internal/admin"
	"github.com/japp47/CAT-Prep/server/internal/store"
)

func main() {
	email := flag.String("email", "", "the account's email, as Google gave it")
	role := flag.String("role", "admin", "admin or moderator")
	reason := flag.String("reason", "", "why, in a few words")
	revoke := flag.Bool("revoke", false, "take the role back instead")
	flag.Parse()
	if err := run(*email, *role, *reason, *revoke); err != nil {
		fmt.Fprintln(os.Stderr, "grant:", err)
		os.Exit(1)
	}
}

func run(email, role, reason string, revoke bool) error {
	dsn := os.Getenv("MIGRATE_DATABASE_URL")
	if dsn == "" {
		return errors.New("MIGRATE_DATABASE_URL is required: the owner's connection")
	}
	if email == "" {
		return errors.New("-email is required")
	}
	ctx := context.Background()
	db, err := store.Open(ctx, dsn)
	if err != nil {
		return err
	}
	defer db.Close()
	changed, err := admin.Grant(ctx, db, email, role, reason, revoke)
	if err != nil {
		return err
	}
	switch {
	case !changed && revoke:
		fmt.Printf("%s did not hold %s. Nothing changed.\n", email, role)
	case !changed:
		fmt.Printf("%s already holds %s. Nothing changed.\n", email, role)
	case revoke:
		fmt.Printf("%s no longer holds %s.\n", email, role)
	default:
		fmt.Printf("%s now holds %s. They see Admin in the account menu after a reload.\n", email, role)
	}
	return nil
}
