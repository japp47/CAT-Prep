package notify

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"golang.org/x/oauth2"
)

// GoogleOAuth is Google's sign-in endpoint, written out so the server needs no Google client library.
var GoogleOAuth = oauth2.Endpoint{AuthURL: "https://accounts.google.com/o/oauth2/auth", TokenURL: "https://oauth2.googleapis.com/token", AuthStyle: oauth2.AuthStyleInParams}

// GmailScope lets the token send mail as the account and nothing else: no reading, no deleting.
const GmailScope = "https://www.googleapis.com/auth/gmail.send"

// GmailAPI sends through Gmail's web API over HTTPS (D92, docs/design/notifications.md §13). Render's free plan
// blocks the mail ports (25, 465, 587), so the API cannot use SMTP; port 443 is open. It is the same 99ile.team
// account and Google's own servers, so mail is signed and delivered exactly as before. The refresh token comes once
// from `go run ./cmd/notify -gmail-token`; the access token it buys is renewed on its own.
type GmailAPI struct {
	ClientID, ClientSecret, RefreshToken string
	// SendURL and TokenURL are Google's; tests point them at a stand-in.
	SendURL, TokenURL string
	Timeout           time.Duration

	client *http.Client
}

const gmailSend = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"

func (g *GmailAPI) http(ctx context.Context) *http.Client {
	if g.client == nil {
		ep := GoogleOAuth
		if g.TokenURL != "" {
			ep.TokenURL = g.TokenURL
		}
		conf := &oauth2.Config{ClientID: g.ClientID, ClientSecret: g.ClientSecret, Endpoint: ep, Scopes: []string{GmailScope}}
		timeout := g.Timeout
		if timeout == 0 {
			timeout = 30 * time.Second
		}
		base := &http.Client{Timeout: timeout}
		ts := conf.TokenSource(context.WithValue(context.Background(), oauth2.HTTPClient, base), &oauth2.Token{RefreshToken: g.RefreshToken})
		g.client = &http.Client{Timeout: timeout, Transport: &oauth2.Transport{Source: oauth2.ReuseTokenSource(nil, ts), Base: base.Transport}}
	}
	return g.client
}

// SendRaw sends one complete message (headers and body, as buildEmail makes it). An error Google calls permanent (a
// refused token, a bad message) is marked Permanent; a rate limit or a server error may be retried.
func (g *GmailAPI) SendRaw(ctx context.Context, raw []byte) error {
	body, _ := json.Marshal(map[string]string{"raw": base64.RawURLEncoding.EncodeToString(raw)})
	url := g.SendURL
	if url == "" {
		url = gmailSend
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return Permanent(err)
	}
	req.Header.Set("Content-Type", "application/json")
	res, err := g.http(ctx).Do(req)
	if err != nil {
		var re *oauth2.RetrieveError
		if errors.As(err, &re) { // the refresh token was refused: revoked, or the password changed
			return Permanent(fmt.Errorf("gmail sign-in refused (make a new token with cmd/notify -gmail-token): %s", re.ErrorCode))
		}
		return err
	}
	defer res.Body.Close()
	reply, _ := io.ReadAll(io.LimitReader(res.Body, 1024))
	switch {
	case res.StatusCode >= 200 && res.StatusCode < 300:
		return nil
	case res.StatusCode == http.StatusTooManyRequests || res.StatusCode >= 500:
		return fmt.Errorf("gmail %d: %s", res.StatusCode, reply)
	default:
		return Permanent(fmt.Errorf("gmail %d: %s", res.StatusCode, reply))
	}
}

// GmailChannel is the email channel over Gmail's API, paced like the SMTP one.
type GmailChannel struct {
	API    *GmailAPI
	From   string // the account itself: Gmail sends as the signed-in address
	Pace   time.Duration
	Domain string
	last   time.Time
}

func (c *GmailChannel) Name() string { return Email }

func (c *GmailChannel) Send(ctx context.Context, m Out) (Result, error) {
	if m.To == "" {
		return Result{}, Permanent(errors.New("no email address"))
	}
	if wait := c.Pace - time.Since(c.last); wait > 0 {
		select {
		case <-ctx.Done():
			return Result{}, ctx.Err()
		case <-time.After(wait):
		}
	}
	c.last = time.Now()
	// Gmail accepts any address here; a bad one bounces later, to the team inbox (docs/design/notifications.md §6).
	return Result{}, c.API.SendRaw(ctx, buildEmail(c.From, m.To, c.Domain, m.ID, m.Rendered, time.Now()))
}
