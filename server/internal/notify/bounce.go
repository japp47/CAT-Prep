package notify

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/mail"
	"net/url"
	"strings"

	"github.com/jackc/pgx/v5"
)

// Bounces (R2, D97, docs/design/notifications.md §15.2). Gmail's API accepts any address and a bad one comes back
// later as a mailer-daemon email in the team inbox. A Gmail filter (the owner's, once) labels those emails; the worker
// lists that label and reads one header of each, X-Failed-Recipients, with the gmail.metadata scope, which cannot
// open a message body. A student whose address is named stops getting email until they turn it on again.

// GmailMetadataScope reads labels and headers, never a body: all the bounce check needs.
const GmailMetadataScope = "https://www.googleapis.com/auth/gmail.metadata"

// BounceLabel is the Gmail label the owner's filter puts on bounces (server/README.md, Study reminders).
const BounceLabel = "99ile-bounces"

// ErrBounceScope: the refresh token was made before R2 and cannot read headers. Sending still works.
var ErrBounceScope = errors.New("the Gmail token cannot read bounce headers yet: run go run ./cmd/notify -gmail-token once more and update NOTIFY_GMAIL_REFRESH_TOKEN")

// ErrNoBounceLabel: the owner's filter has not made the label yet.
var ErrNoBounceLabel = errors.New("no Gmail label " + BounceLabel + ": make the filter in server/README.md (Study reminders)")

const gmailUser = "https://gmail.googleapis.com/gmail/v1/users/me"

// Bounce is one bounce email: its id and the addresses it says failed.
type Bounce struct {
	ID        string
	Addresses []string
}

// BounceReader lists the bounce label. Base is Gmail's user URL; tests point it at a stand-in.
type BounceReader struct {
	API   *GmailAPI
	Label string
	Base  string
}

// BounceReaderFor is the reader for these settings, or nil when email does not go through Gmail's API.
func BounceReaderFor(set Settings) *BounceReader {
	api := GmailAPIFor(set)
	if api == nil || set.EmailOff {
		return nil
	}
	return &BounceReader{API: api, Label: BounceLabel}
}

func (b *BounceReader) get(ctx context.Context, path string, q url.Values, out any) error {
	base := b.Base
	if base == "" {
		base = gmailUser
	}
	u := base + path
	if len(q) > 0 {
		u += "?" + q.Encode()
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return err
	}
	res, err := b.API.http(ctx).Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	switch {
	case res.StatusCode == http.StatusForbidden:
		return ErrBounceScope
	case res.StatusCode != http.StatusOK:
		return fmt.Errorf("gmail %d: %.200s", res.StatusCode, body)
	}
	return json.Unmarshal(body, out)
}

// Read lists up to 50 of the newest bounces under the label and reads the header of each one seen says is new.
func (b *BounceReader) Read(ctx context.Context, seen func(ctx context.Context, ids []string) (map[string]bool, error)) ([]Bounce, error) {
	var labels struct {
		Labels []struct{ ID, Name string } `json:"labels"`
	}
	if err := b.get(ctx, "/labels", nil, &labels); err != nil {
		return nil, err
	}
	label := ""
	for _, l := range labels.Labels {
		if l.Name == b.Label {
			label = l.ID
		}
	}
	if label == "" {
		return nil, ErrNoBounceLabel
	}
	var list struct {
		Messages []struct{ ID string } `json:"messages"`
	}
	if err := b.get(ctx, "/messages", url.Values{"labelIds": {label}, "maxResults": {"50"}}, &list); err != nil {
		return nil, err
	}
	var ids []string
	for _, m := range list.Messages {
		ids = append(ids, m.ID)
	}
	if len(ids) == 0 {
		return nil, nil
	}
	old, err := seen(ctx, ids)
	if err != nil {
		return nil, err
	}
	var out []Bounce
	for _, id := range ids {
		if old[id] {
			continue
		}
		var msg struct {
			Payload struct {
				Headers []struct{ Name, Value string } `json:"headers"`
			} `json:"payload"`
		}
		if err := b.get(ctx, "/messages/"+url.PathEscape(id), url.Values{"format": {"metadata"}, "metadataHeaders": {"X-Failed-Recipients"}}, &msg); err != nil {
			return out, err
		}
		bn := Bounce{ID: id}
		for _, h := range msg.Payload.Headers {
			if strings.EqualFold(h.Name, "X-Failed-Recipients") {
				bn.Addresses = append(bn.Addresses, addresses(h.Value)...)
			}
		}
		out = append(out, bn)
	}
	return out, nil
}

// addresses reads "a@x.com, B <b@y.com>" as lower-case bare addresses.
func addresses(v string) []string {
	var out []string
	if list, err := mail.ParseAddressList(v); err == nil {
		for _, a := range list {
			out = append(out, strings.ToLower(a.Address))
		}
		return out
	}
	for _, part := range strings.Split(v, ",") {
		if a := strings.ToLower(strings.TrimSpace(part)); strings.Contains(a, "@") {
			out = append(out, a)
		}
	}
	return out
}

// SeenBounces says which of these bounce ids have been handled.
func (s Store) SeenBounces(ctx context.Context, ids []string) (map[string]bool, error) {
	rows, err := s.DB.Query(ctx, `select gmail_id from notify.bounces where gmail_id = any($1)`, ids)
	if err != nil {
		return nil, err
	}
	got, err := pgx.CollectRows(rows, pgx.RowTo[string])
	out := map[string]bool{}
	for _, id := range got {
		out[id] = true
	}
	return out, err
}

// RecordBounce marks every student whose account address the bounce names as bounced, and remembers the bounce (never
// the address), in one transaction. It returns how many students it marked.
func (s Store) RecordBounce(ctx context.Context, b Bounce) (int, error) {
	marked := 0
	err := pgx.BeginFunc(ctx, s.DB, func(tx pgx.Tx) error {
		if len(b.Addresses) > 0 {
			tag, err := tx.Exec(ctx, `
				update notify.prefs p set email_state = 'bounced'
				from account.users u where u.identity_id = p.identity_id and lower(u.email) = any($1) and p.email_state <> 'bounced'`, b.Addresses)
			if err != nil {
				return err
			}
			marked = int(tag.RowsAffected())
		}
		_, err := tx.Exec(ctx, `insert into notify.bounces (gmail_id, addresses, matched) values ($1, $2, $3) on conflict do nothing`,
			b.ID, len(b.Addresses), marked > 0)
		return err
	})
	return marked, err
}

// MarkBounced is the owner's fallback (§15.2): mark an address bounced by hand, from the admin panel.
func (s Store) MarkBounced(ctx context.Context, address string) (int, error) {
	tag, err := s.DB.Exec(ctx, `
		update notify.prefs p set email_state = 'bounced'
		from account.users u where u.identity_id = p.identity_id and lower(u.email) = lower($1) and p.email_state <> 'bounced'`, strings.TrimSpace(address))
	return int(tag.RowsAffected()), err
}
