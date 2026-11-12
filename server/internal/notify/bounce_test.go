package notify

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"
)

// fakeGmailInbox is Google's token endpoint and the three Gmail calls the bounce check makes. headers maps a message
// id to its X-Failed-Recipients value ("" for a bounce without the header); status, when not 200, answers every
// Gmail call (403 is a token without the metadata scope). It records which messages were opened.
func fakeGmailInbox(t *testing.T, label string, headers map[string]string, status int) (*BounceReader, *[]string) {
	t.Helper()
	var opened []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.URL.Path == "/token" {
			_, _ = w.Write([]byte(`{"access_token":"at-1","token_type":"Bearer","expires_in":3600}`))
			return
		}
		if r.Header.Get("Authorization") != "Bearer at-1" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		if status != http.StatusOK {
			w.WriteHeader(status)
			_, _ = w.Write([]byte(`{"error":{"code":403,"message":"Request had insufficient authentication scopes."}}`))
			return
		}
		switch {
		case r.URL.Path == "/me/labels":
			_, _ = w.Write([]byte(`{"labels":[{"id":"INBOX","name":"INBOX"},{"id":"Label_7","name":"` + label + `"}]}`))
		case r.URL.Path == "/me/messages":
			if r.URL.Query().Get("labelIds") != "Label_7" || r.URL.Query().Get("q") != "" {
				w.WriteHeader(http.StatusBadRequest) // the metadata scope cannot search: only a label
				return
			}
			var ids []string
			for id := range headers {
				ids = append(ids, `{"id":"`+id+`"}`)
			}
			slices.Sort(ids)
			_, _ = w.Write([]byte(`{"messages":[` + strings.Join(ids, ",") + `]}`))
		case strings.HasPrefix(r.URL.Path, "/me/messages/"):
			id := strings.TrimPrefix(r.URL.Path, "/me/messages/")
			if r.URL.Query().Get("format") != "metadata" {
				w.WriteHeader(http.StatusForbidden) // a body is never asked for
				return
			}
			opened = append(opened, id)
			h := `{"name":"Subject","value":"Delivery Status Notification (Failure)"}`
			if v := headers[id]; v != "" {
				h += `,{"name":"X-Failed-Recipients","value":"` + v + `"}`
			}
			_, _ = w.Write([]byte(`{"id":"` + id + `","payload":{"headers":[` + h + `]}}`))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	t.Cleanup(srv.Close)
	api := &GmailAPI{ClientID: "cid", ClientSecret: "secret", RefreshToken: "good-refresh", TokenURL: srv.URL + "/token"}
	return &BounceReader{API: api, Label: BounceLabel, Base: srv.URL + "/me"}, &opened
}

func TestBounceReaderReadsHeadersOfNewBouncesOnly(t *testing.T) {
	b, opened := fakeGmailInbox(t, BounceLabel, map[string]string{"m1": "Gone@Example.com", "m2": "", "m3": "old@example.com"}, http.StatusOK)
	seen := func(_ context.Context, ids []string) (map[string]bool, error) {
		return map[string]bool{"m3": true}, nil
	}
	got, err := b.Read(context.Background(), seen)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 || got[0].ID != "m1" || len(got[0].Addresses) != 1 || got[0].Addresses[0] != "gone@example.com" || got[1].ID != "m2" || len(got[1].Addresses) != 0 {
		t.Fatalf("got %+v", got)
	}
	if strings.Join(*opened, ",") != "m1,m2" {
		t.Errorf("opened %v: a handled bounce was read again", *opened)
	}
}

func TestBounceReaderSaysWhyItCannotRead(t *testing.T) {
	none := func(context.Context, []string) (map[string]bool, error) { return nil, nil }
	b, _ := fakeGmailInbox(t, BounceLabel, nil, http.StatusForbidden)
	if _, err := b.Read(context.Background(), none); !errors.Is(err, ErrBounceScope) {
		t.Errorf("a token without the metadata scope: %v", err)
	}
	b, _ = fakeGmailInbox(t, "some other label", nil, http.StatusOK)
	if _, err := b.Read(context.Background(), none); !errors.Is(err, ErrNoBounceLabel) {
		t.Errorf("no label: %v", err)
	}
}

func TestAddresses(t *testing.T) {
	for in, want := range map[string]string{
		"a@x.com":                   "a@x.com",
		"A@X.com, b@y.org":          "a@x.com b@y.org",
		"Aarav <Aarav@Example.com>": "aarav@example.com",
		"not an address":            "",
		"a@x.com,,  ":               "a@x.com",
	} {
		if got := strings.Join(addresses(in), " "); got != want {
			t.Errorf("addresses(%q) = %q, want %q", in, got, want)
		}
	}
}

// A test send goes to the staff member's own address only, marked as a test, with sample data filled in.
func TestTesterSendsToTheStaffMemberOnly(t *testing.T) {
	mail := &fakeChannel{name: Email}
	tr := Tester{Render: renderer(t), Channels: map[string]Channel{Email: mail}, Tokens: Tokens{Key: []byte("0123456789abcdef0123456789abcdef")}, Site: "https://99ile.pages.dev"}
	reached, err := tr.Send(context.Background(), "weekly", WeeklyGood, "staff-identity", "owner@example.com")
	if err != nil || len(reached) != 1 || reached[0] != Email {
		t.Fatalf("reached %v, %v", reached, err)
	}
	if len(mail.got) != 1 || mail.got[0].To != "owner@example.com" || !strings.HasPrefix(mail.got[0].Rendered.Subject, "Test: Your week: 5 days, 64 questions") ||
		!strings.Contains(mail.got[0].Rendered.Text, "Most improved: Para summary") {
		t.Fatalf("sent %+v", mail.got)
	}
	if _, err := tr.Send(context.Background(), "weekly", "no-such-wording", "staff-identity", "owner@example.com"); !errors.Is(err, ErrNoWording) {
		t.Errorf("an unknown wording: %v", err)
	}
	if len(mail.got) != 1 {
		t.Error("an unknown wording was sent")
	}
}
