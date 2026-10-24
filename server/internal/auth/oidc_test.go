package auth

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	jose "github.com/go-jose/go-jose/v4"
)

// issuer is a small OpenID Connect provider: discovery, keys, and a token endpoint that signs an ID token for the
// last authorization request, checking the PKCE verifier against its challenge.
type issuer struct {
	srv       *httptest.Server
	key       *rsa.PrivateKey
	challenge string
	aud       string // audience to put in the token; the client id unless a test changes it
	nonce     string // nonce to put in the token; the one from the request unless a test changes it
	verified  bool
}

func newIssuer(t *testing.T) *issuer {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	is := &issuer{key: key, verified: true}
	mux := http.NewServeMux()
	is.srv = httptest.NewServer(mux)
	t.Cleanup(is.srv.Close)
	mux.HandleFunc("/.well-known/openid-configuration", func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"issuer": is.srv.URL, "authorization_endpoint": is.srv.URL + "/auth",
			"token_endpoint": is.srv.URL + "/token", "jwks_uri": is.srv.URL + "/keys", "id_token_signing_alg_values_supported": []string{"RS256"}})
	})
	mux.HandleFunc("/keys", func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(jose.JSONWebKeySet{Keys: []jose.JSONWebKey{{Key: &key.PublicKey, KeyID: "k1", Algorithm: "RS256", Use: "sig"}}})
	})
	mux.HandleFunc("/token", func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		sum := sha256.Sum256([]byte(r.Form.Get("code_verifier")))
		if base64.RawURLEncoding.EncodeToString(sum[:]) != is.challenge {
			w.WriteHeader(http.StatusBadRequest)
			_, _ = w.Write([]byte(`{"error":"invalid_grant"}`))
			return
		}
		claims, _ := json.Marshal(map[string]any{"iss": is.srv.URL, "sub": "1234", "aud": is.aud, "exp": time.Now().Add(time.Hour).Unix(),
			"iat": time.Now().Unix(), "nonce": is.nonce, "email": "a@example.com", "email_verified": is.verified, "name": "A Student"})
		signer, _ := jose.NewSigner(jose.SigningKey{Algorithm: jose.RS256, Key: jose.JSONWebKey{Key: is.key, KeyID: "k1"}}, nil)
		jws, _ := signer.Sign(claims)
		idt, _ := jws.CompactSerialize()
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"access_token": "at", "token_type": "Bearer", "expires_in": 3600, "id_token": idt})
	})
	return is
}

// signIn asks for the auth URL, reads the challenge and nonce from it as the provider would, then exchanges.
func (is *issuer) signIn(t *testing.T, o *OIDC, change func()) (Claims, error) {
	t.Helper()
	to, err := o.AuthURL("state1", "nonce1", "a-verifier-that-is-long-enough-for-pkce-0123456789")
	if err != nil {
		t.Fatal(err)
	}
	u, _ := url.Parse(to)
	q := u.Query()
	if q.Get("code_challenge_method") != "S256" || q.Get("prompt") != "select_account" || q.Get("scope") != "openid email profile" {
		t.Fatalf("auth URL %s", to)
	}
	is.challenge, is.nonce, is.aud = q.Get("code_challenge"), q.Get("nonce"), o.ClientID
	if change != nil {
		change()
	}
	return o.Exchange(context.Background(), "code1", "a-verifier-that-is-long-enough-for-pkce-0123456789", "nonce1")
}

func client(is *issuer) *OIDC {
	return &OIDC{Issuer: is.srv.URL, ClientID: "client-1", ClientSecret: "secret", RedirectURL: "https://site.example/api/v1/auth/google/callback"}
}

func TestExchangeReturnsVerifiedClaims(t *testing.T) {
	is := newIssuer(t)
	c, err := is.signIn(t, client(is), nil)
	if err != nil {
		t.Fatal(err)
	}
	if c != (Claims{Subject: "1234", Email: "a@example.com", EmailVerified: true, Name: "A Student"}) {
		t.Fatalf("claims %+v", c)
	}
}

func TestExchangeRefusesATokenForAnotherSignIn(t *testing.T) {
	is := newIssuer(t)
	if _, err := is.signIn(t, client(is), func() { is.nonce = "someone-else" }); !errors.Is(err, ErrNonce) {
		t.Fatalf("wrong nonce: %v", err)
	}
	if _, err := is.signIn(t, client(is), func() { is.aud = "another-app" }); err == nil {
		t.Fatal("a token for another app was accepted")
	}
	if _, err := is.signIn(t, client(is), func() { is.challenge = "not-the-hash" }); err == nil {
		t.Fatal("the code was exchanged without the right verifier")
	}
}

func TestExchangeReportsAnUnverifiedEmail(t *testing.T) {
	is := newIssuer(t)
	c, err := is.signIn(t, client(is), func() { is.verified = false })
	if err != nil || c.EmailVerified {
		t.Fatalf("%+v %v", c, err)
	}
}

func TestDiscoveryIsRetriedAfterAFailure(t *testing.T) {
	o := &OIDC{Issuer: "http://127.0.0.1:1", ClientID: "c"}
	if _, err := o.AuthURL("s", "n", "v"); err == nil {
		t.Fatal("no error from an issuer that is down")
	}
	is := newIssuer(t)
	o.Issuer = is.srv.URL
	if _, err := o.AuthURL("s", "n", "v"); err != nil {
		t.Fatalf("not retried: %v", err)
	}
}
