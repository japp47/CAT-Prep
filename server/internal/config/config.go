// Package config reads the server's settings from environment variables once, at start.
// A missing or bad value stops the server with a message that says which one and why.
package config

import (
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"net/url"
	"os"
	"strconv"
	"strings"
)

// Config is everything the server needs from its environment.
type Config struct {
	// Env is "dev" on a laptop and "prod" on Render. Prod refuses unsafe defaults.
	Env string
	// Port the HTTP server listens on. Render sets PORT.
	Port int
	// DatabaseURL is a Postgres connection string.
	DatabaseURL string
	// AllowedOrigin is the site's origin, such as https://99ile.pages.dev. Requests that change data
	// from any other origin are refused (CSRF).
	AllowedOrigin string
	// LogLevel is debug, info, warn or error.
	LogLevel slog.Level
	// ProxySecret is shared with the Cloudflare Pages proxy (functions/api). When set, /v1 requests must carry it
	// in X-Proxy-Secret, and only then is the student's address taken from X-Client-Ip. Required in prod for /v1.
	ProxySecret string
	// IPHashKey keys the HMAC that turns an address into audit.events.ip_hash (D16); IPKeyID says which yearly
	// key it is. Required in prod for /v1; in dev a random key is made at start (IPKeyID 0).
	IPHashKey []byte
	IPKeyID   int16
	// TurnstileSecret checks the bot test before sync is turned on (Cloudflare Turnstile). Required in prod for
	// /v1; in dev, unset means no check.
	TurnstileSecret string
	// Commit is the Git commit this build came from. Render sets RENDER_GIT_COMMIT; "dev" elsewhere.
	// /healthz reports it, so the deploy workflow can tell when the new version is live.
	Commit string
}

// Prod reports whether this is the live server.
func (c Config) Prod() bool { return c.Env == "prod" }

// SyncReady reports whether the /v1 API may serve students. In prod it needs the proxy secret, the IP hash key
// and the Turnstile secret; until all three are set on Render, /v1 answers 503 and the rest of the server works.
func (c Config) SyncReady() bool {
	return !c.Prod() || (c.ProxySecret != "" && len(c.IPHashKey) > 0 && c.TurnstileSecret != "")
}

// Load reads the configuration from the process environment.
func Load() (Config, error) { return load(os.Getenv) }

func load(get func(string) string) (Config, error) {
	var errs []error
	c := Config{Env: or(get("ENV"), "dev")}
	if c.Env != "dev" && c.Env != "prod" {
		errs = append(errs, fmt.Errorf("ENV must be dev or prod, got %q", c.Env))
	}

	port, err := strconv.Atoi(or(get("PORT"), "8080"))
	if err != nil || port < 1 || port > 65535 {
		errs = append(errs, fmt.Errorf("PORT must be a number from 1 to 65535, got %q", get("PORT")))
	}
	c.Port = port

	c.DatabaseURL = get("DATABASE_URL")
	if c.DatabaseURL == "" {
		errs = append(errs, errors.New("DATABASE_URL is required (see server/.env.example)"))
	} else if u, err := url.Parse(c.DatabaseURL); err != nil || (u.Scheme != "postgres" && u.Scheme != "postgresql") {
		errs = append(errs, errors.New("DATABASE_URL must start with postgres://"))
	}

	c.AllowedOrigin = strings.TrimRight(get("ALLOWED_ORIGIN"), "/")
	if c.AllowedOrigin == "" && c.Env == "dev" {
		c.AllowedOrigin = "http://localhost:5173"
	}
	if u, err := url.Parse(c.AllowedOrigin); c.AllowedOrigin == "" || err != nil || u.Host == "" || u.Path != "" {
		errs = append(errs, fmt.Errorf("ALLOWED_ORIGIN must be an origin such as https://99ile.pages.dev, got %q", c.AllowedOrigin))
	} else if c.Prod() && u.Scheme != "https" {
		errs = append(errs, errors.New("ALLOWED_ORIGIN must use https in prod"))
	}

	if err := c.LogLevel.UnmarshalText([]byte(or(get("LOG_LEVEL"), "info"))); err != nil {
		errs = append(errs, fmt.Errorf("LOG_LEVEL must be debug, info, warn or error, got %q", get("LOG_LEVEL")))
	}
	c.ProxySecret = get("PROXY_SECRET")
	if c.ProxySecret != "" && len(c.ProxySecret) < 32 {
		errs = append(errs, errors.New("PROXY_SECRET must be at least 32 characters (openssl rand -hex 32)"))
	}
	if k := get("IP_HASH_KEY"); k != "" {
		b, err := hex.DecodeString(k)
		if err != nil || len(b) < 32 {
			errs = append(errs, errors.New("IP_HASH_KEY must be at least 32 bytes in hex (openssl rand -hex 32)"))
		}
		c.IPHashKey = b
		id, err := strconv.Atoi(or(get("IP_HASH_KEY_ID"), "1"))
		if err != nil || id < 1 || id > 32767 {
			errs = append(errs, fmt.Errorf("IP_HASH_KEY_ID must be a number from 1 to 32767, got %q", get("IP_HASH_KEY_ID")))
		}
		c.IPKeyID = int16(id)
	}

	c.TurnstileSecret = get("TURNSTILE_SECRET")

	c.Commit = or(get("RENDER_GIT_COMMIT"), "dev")
	return c, errors.Join(errs...)
}

func or(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}
