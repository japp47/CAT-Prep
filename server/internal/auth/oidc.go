// Package auth talks to the sign-in provider (Google) with the OAuth code flow, PKCE and a verified ID token
// (docs/architecture.md §5.2, D30). It knows nothing about devices or accounts; internal/account decides what a
// verified sign-in means for this browser.
package auth

import (
	"context"
	"errors"
	"fmt"
	"sync"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
)

// GoogleIssuer is Google's OpenID Connect issuer.
const GoogleIssuer = "https://accounts.google.com"

// Claims is what a verified sign-in tells us about the person.
type Claims struct {
	Subject       string
	Email         string
	EmailVerified bool
	Name          string
}

// Provider is one sign-in provider. account.Service uses it through this interface, so tests can use a fake.
type Provider interface {
	// AuthURL is where to send the browser. The verifier stays with us; only its S256 hash goes to the provider.
	AuthURL(state, nonce, verifier string) (string, error)
	// Exchange trades the code for tokens and returns the ID token's claims after checking its signature,
	// issuer, audience, expiry and nonce.
	Exchange(ctx context.Context, code, verifier, nonce string) (Claims, error)
}

// OIDC is a Provider for any OpenID Connect issuer. The discovery document is fetched on first use, not at start,
// so the server starts even when the provider cannot be reached; a failed fetch is tried again next time.
type OIDC struct {
	Issuer, ClientID, ClientSecret, RedirectURL string

	mu       sync.Mutex
	provider *oidc.Provider
}

func (o *OIDC) setup(ctx context.Context) (*oidc.Provider, error) {
	o.mu.Lock()
	defer o.mu.Unlock()
	if o.provider != nil {
		return o.provider, nil
	}
	p, err := oidc.NewProvider(ctx, o.Issuer)
	if err != nil {
		return nil, fmt.Errorf("discover %s: %w", o.Issuer, err)
	}
	o.provider = p
	return p, nil
}

func (o *OIDC) config(p *oidc.Provider) *oauth2.Config {
	return &oauth2.Config{ClientID: o.ClientID, ClientSecret: o.ClientSecret, RedirectURL: o.RedirectURL, Endpoint: p.Endpoint(),
		Scopes: []string{oidc.ScopeOpenID, "email", "profile"}}
}

// AuthURL builds the provider's sign-in address. prompt=select_account lets a student pick which Google account.
func (o *OIDC) AuthURL(state, nonce, verifier string) (string, error) {
	p, err := o.setup(context.Background())
	if err != nil {
		return "", err
	}
	return o.config(p).AuthCodeURL(state, oidc.Nonce(nonce), oauth2.S256ChallengeOption(verifier), oauth2.SetAuthURLParam("prompt", "select_account")), nil
}

// ErrNonce means the ID token was not made for this sign-in.
var ErrNonce = errors.New("the sign-in did not match this browser")

// Exchange implements Provider.
func (o *OIDC) Exchange(ctx context.Context, code, verifier, nonce string) (Claims, error) {
	p, err := o.setup(ctx)
	if err != nil {
		return Claims{}, err
	}
	tok, err := o.config(p).Exchange(ctx, code, oauth2.VerifierOption(verifier))
	if err != nil {
		return Claims{}, fmt.Errorf("exchange code: %w", err)
	}
	raw, ok := tok.Extra("id_token").(string)
	if !ok || raw == "" {
		return Claims{}, errors.New("no ID token in the answer")
	}
	idt, err := p.Verifier(&oidc.Config{ClientID: o.ClientID}).Verify(ctx, raw)
	if err != nil {
		return Claims{}, fmt.Errorf("verify ID token: %w", err)
	}
	if idt.Nonce != nonce {
		return Claims{}, ErrNonce
	}
	var c struct {
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
		Name          string `json:"name"`
	}
	if err := idt.Claims(&c); err != nil {
		return Claims{}, fmt.Errorf("read claims: %w", err)
	}
	return Claims{Subject: idt.Subject, Email: c.Email, EmailVerified: c.EmailVerified, Name: c.Name}, nil
}
