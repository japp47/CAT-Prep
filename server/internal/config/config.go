// Package config reads the server's settings from environment variables once, at start.
// A missing or bad value stops the server with a message that says which one and why.
package config

import (
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
	// Commit is the Git commit this build came from. Render sets RENDER_GIT_COMMIT; "dev" elsewhere.
	// /healthz reports it, so the deploy workflow can tell when the new version is live.
	Commit string
}

// Prod reports whether this is the live server.
func (c Config) Prod() bool { return c.Env == "prod" }

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
	c.Commit = or(get("RENDER_GIT_COMMIT"), "dev")
	return c, errors.Join(errs...)
}

func or(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}
