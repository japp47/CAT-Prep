package notify

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// fakeGoogle is Google's token and send endpoints: it issues one access token for the right refresh token and
// answers sends with status.
func fakeGoogle(t *testing.T, status int) (*GmailAPI, *[]string, *int) {
	t.Helper()
	var sent []string
	tokens := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/token":
			_ = r.ParseForm()
			if r.Form.Get("grant_type") != "refresh_token" || r.Form.Get("refresh_token") != "good-refresh" || r.Form.Get("client_id") != "cid" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusBadRequest)
				_, _ = w.Write([]byte(`{"error":"invalid_grant"}`))
				return
			}
			tokens++
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"access_token":"at-1","token_type":"Bearer","expires_in":3600}`))
		case "/send":
			if r.Header.Get("Authorization") != "Bearer at-1" {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			var body struct{ Raw string }
			_ = json.NewDecoder(r.Body).Decode(&body)
			raw, err := base64.RawURLEncoding.DecodeString(body.Raw)
			if err != nil {
				w.WriteHeader(http.StatusBadRequest)
				return
			}
			sent = append(sent, string(raw))
			w.WriteHeader(status)
			_, _ = w.Write([]byte(`{"id":"m1"}`))
		}
	}))
	t.Cleanup(srv.Close)
	return &GmailAPI{ClientID: "cid", ClientSecret: "secret", RefreshToken: "good-refresh", SendURL: srv.URL + "/send", TokenURL: srv.URL + "/token"}, &sent, &tokens
}

func TestGmailChannelSendsTheWholeMessage(t *testing.T) {
	api, sent, tokens := fakeGoogle(t, http.StatusOK)
	ch := &GmailChannel{API: api, From: "99ile.team@gmail.com", Domain: "99ile.pages.dev"}
	r := Rendered{Subject: "Day 12 is waiting", Text: "Day 12", HTML: "<b>Day 12</b>", UnsubscribeURL: "https://99ile.pages.dev/api/v1/unsubscribe?t=tok"}
	for i := 0; i < 2; i++ {
		if _, err := ch.Send(context.Background(), Out{ID: int64(i), To: "s@example.com", Rendered: r}); err != nil {
			t.Fatal(err)
		}
	}
	if len(*sent) != 2 || *tokens != 1 {
		t.Fatalf("%d sent with %d tokens; want 2 sent on one token", len(*sent), *tokens)
	}
	for _, want := range []string{"From: \"99ile\" <99ile.team@gmail.com>", "To: <s@example.com>", "List-Unsubscribe-Post: List-Unsubscribe=One-Click", "multipart/alternative"} {
		if !strings.Contains((*sent)[0], want) {
			t.Errorf("the message lacks %q", want)
		}
	}
}

func TestGmailOutcomes(t *testing.T) {
	for status, check := range map[int]func(error) bool{
		http.StatusTooManyRequests:    func(err error) bool { return err != nil && !IsPermanent(err) },
		http.StatusServiceUnavailable: func(err error) bool { return err != nil && !IsPermanent(err) },
		http.StatusBadRequest:         IsPermanent,
		http.StatusForbidden:          IsPermanent,
	} {
		api, _, _ := fakeGoogle(t, status)
		if err := api.SendRaw(context.Background(), []byte("Subject: x\r\n\r\nx")); !check(err) {
			t.Errorf("%d: %v", status, err)
		}
	}
	api, _, _ := fakeGoogle(t, http.StatusOK)
	api.RefreshToken = "revoked"
	err := api.SendRaw(context.Background(), []byte("Subject: x\r\n\r\nx"))
	if !IsPermanent(err) || !strings.Contains(err.Error(), "-gmail-token") {
		t.Errorf("a refused refresh token: %v", err)
	}
}

func TestEmailChannelChoice(t *testing.T) {
	gmail := Settings{SMTPUser: "t@gmail.com", GmailClientID: "c", GmailClientSecret: "s", GmailRefreshToken: "r", SMTPPassword: "p"}
	if _, ok := EmailChannelFor(gmail).(*GmailChannel); !ok {
		t.Error("with Gmail's API set up, email goes over HTTPS")
	}
	if _, ok := EmailChannelFor(Settings{SMTPUser: "t@gmail.com", SMTPPassword: "p"}).(*EmailChannel); !ok {
		t.Error("with only an app password, email goes over SMTP")
	}
	if EmailChannelFor(Settings{SMTPUser: "t@gmail.com"}) != nil || EmailChannelFor(Settings{GmailClientID: "c", GmailClientSecret: "s", GmailRefreshToken: "r"}) != nil {
		t.Error("no sending account or no way to send: no email channel")
	}
	if TeamAlert(gmail) == nil || TeamAlert(Settings{SMTPUser: "t@gmail.com"}) != nil {
		t.Error("the team alert follows the email channel")
	}
}
