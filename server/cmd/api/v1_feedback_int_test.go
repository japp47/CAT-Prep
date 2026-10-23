package main

import (
	"context"
	"net/http"
	"testing"

	"github.com/japp47/CAT-Prep/server/internal/ids"
)

// Problem reports (B6), end to end as cat_app.

func TestFeedbackIsSavedWithAndWithoutSync(t *testing.T) {
	srv, admin := apiServer(t, testOpts)
	ctx := context.Background()
	guestItem, syncedItem := "rc:t-"+ids.New()[24:]+":0", "rc:t-"+ids.New()[24:]+":1" // the random tail: a v7 id starts with the clock
	report := func(item string) map[string]string {
		return map[string]string{"page": "/practice/rc/x?review=secret", "itemId": item, "kind": "typo", "note": "Option C has a typo."}
	}
	if got := newDevice(t, srv).call("/v1/feedback", report(guestItem), nil); got != http.StatusCreated {
		t.Fatalf("without sync: %d", got)
	}
	a := newDevice(t, srv).turnOn()
	if got := a.call("/v1/feedback", report(syncedItem), nil); got != http.StatusCreated {
		t.Fatalf("with sync: %d", got)
	}
	var page string
	var guestIdent *string
	if err := admin.QueryRow(ctx, `select page, identity_id::text from support.feedback where item_id = $1`, guestItem).Scan(&page, &guestIdent); err != nil {
		t.Fatal(err)
	}
	if page != "/practice/rc/x" || guestIdent != nil {
		t.Fatalf("guest report: page %q identity %v", page, guestIdent)
	}
	var ident string
	if err := admin.QueryRow(ctx, `select identity_id::text from support.feedback where item_id = $1`, syncedItem).Scan(&ident); err != nil || ident != a.ID.IdentityID {
		t.Fatalf("synced report identity %q, %v", ident, err)
	}

	// Deleting the identity keeps the report and drops the link.
	if got := a.del("/v1/me"); got != http.StatusNoContent {
		t.Fatalf("delete: %d", got)
	}
	var left int
	_ = admin.QueryRow(ctx, `select count(*) from support.feedback where item_id = $1 and identity_id is null`, syncedItem).Scan(&left)
	if left != 1 {
		t.Fatalf("report after delete: %d", left)
	}
	// A stale cookie does not block a report.
	if got := a.call("/v1/feedback", report(syncedItem), nil); got != http.StatusCreated {
		t.Fatalf("after delete: %d", got)
	}
}
