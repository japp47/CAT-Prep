// Package turnstile checks a Cloudflare Turnstile token before sync is turned on, so scripts cannot create
// identities by the thousand (docs/plan.md 2J). Tokens are valid 5 minutes and can be checked only once.
// https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
package turnstile

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// SiteVerify is Cloudflare's endpoint.
const SiteVerify = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

// ErrFailed means the token was missing, wrong, expired or used before: the person should try the check again.
var ErrFailed = errors.New("turnstile check failed")

// Verifier checks tokens with a secret key.
type Verifier struct {
	Secret   string
	Endpoint string // SiteVerify, or a test server
	Client   *http.Client
}

// New returns a verifier for secret.
func New(secret string) *Verifier {
	return &Verifier{Secret: secret, Endpoint: SiteVerify, Client: &http.Client{Timeout: 10 * time.Second}}
}

// Verify returns nil when Cloudflare accepts the token, ErrFailed when it does not, and another error when
// Cloudflare could not be asked (then the caller refuses too: it fails closed).
func (v *Verifier) Verify(ctx context.Context, token, ip string) error {
	if token == "" || len(token) > 2048 {
		return ErrFailed
	}
	form := url.Values{"secret": {v.Secret}, "response": {token}}
	if ip != "" {
		form.Set("remoteip", ip)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, v.Endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := v.Client.Do(req)
	if err != nil {
		return fmt.Errorf("turnstile: %w", err)
	}
	defer resp.Body.Close()
	var out struct {
		Success bool     `json:"success"`
		Codes   []string `json:"error-codes"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return fmt.Errorf("turnstile answer: %w", err)
	}
	if !out.Success {
		return fmt.Errorf("%w: %v", ErrFailed, out.Codes)
	}
	return nil
}
