// Package account turns sync on for a browser and recognises it afterwards (docs/architecture.md §5.1).
// An identity is an anonymous owner of progress; a device is one browser, known by a random secret in an httpOnly
// cookie. Only the secret's SHA-256 is stored, so a database leak gives nobody a usable cookie.
package account

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/japp47/CAT-Prep/server/internal/audit"
	"github.com/japp47/CAT-Prep/server/internal/httpx"
	"github.com/japp47/CAT-Prep/server/internal/ids"
	"github.com/japp47/CAT-Prep/server/internal/limit"
	"github.com/japp47/CAT-Prep/server/internal/reqinfo"
)

// CookieName is the device cookie. __Host- makes the browser insist on Secure, Path=/ and no Domain.
const CookieName = "__Host-dev"

const cookieAge = 365 * 24 * time.Hour

// Device is the browser a request came from, found by Require.
type Device struct {
	IdentityID string `json:"identityId"`
	DeviceID   string `json:"deviceId"`
}

type deviceKey struct{}

// FromContext returns the device found by Require.
func FromContext(ctx context.Context) (Device, bool) {
	d, ok := ctx.Value(deviceKey{}).(Device)
	return d, ok
}

// Service holds what the handlers share.
type Service struct {
	db       *pgxpool.Pool
	hash     reqinfo.Hasher
	log      *slog.Logger
	newIdent *limit.Limiter
}

// New returns the service. newPerHour limits how many identities one address may create in an hour.
func New(db *pgxpool.Pool, hash reqinfo.Hasher, log *slog.Logger, newPerHour int) *Service {
	return &Service{db: db, hash: hash, log: log, newIdent: limit.New(newPerHour, time.Hour)}
}

var platforms = map[string]bool{"ios": true, "android": true, "mac": true, "windows": true, "linux": true, "other": true}

// about is what a browser says about itself when it joins: shown in the device list (B4).
type about struct {
	Label    string `json:"label"`
	Platform string `json:"platform"`
}

func (a *about) clean() {
	if r := []rune(a.Label); len(r) > 60 {
		a.Label = string(r[:60])
	}
	if !platforms[a.Platform] {
		a.Platform = "other"
	}
}

// CreateHandler is POST /v1/identity: turns sync on for this browser. A browser that already has a working
// device cookie gets its identity back instead of a second one.
func (s *Service) CreateHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if d, ok, err := s.lookup(r); err != nil {
			s.fail(w, r, err)
			return
		} else if ok {
			httpx.WriteJSON(w, http.StatusOK, d)
			return
		}
		var a about
		if !httpx.DecodeJSON(w, r, &a, true) {
			return
		}
		a.clean()
		ip := reqinfo.IP(r.Context())
		if ok, first := s.newIdent.Allow(ip); !ok {
			if first {
				s.reject(r, "rate_limited")
			}
			httpx.WriteError(w, http.StatusTooManyRequests, "rate_limited", "Too many tries from this network. Please try again in an hour.")
			return
		}
		d := Device{IdentityID: ids.New(), DeviceID: ids.New()}
		secret, hash := newSecret()
		err := pgx.BeginFunc(r.Context(), s.db, func(tx pgx.Tx) error {
			if _, err := tx.Exec(r.Context(), `insert into account.identities (id) values ($1)`, d.IdentityID); err != nil {
				return err
			}
			if _, err := tx.Exec(r.Context(), `insert into sync.heads (identity_id) values ($1)`, d.IdentityID); err != nil {
				return err
			}
			if err := s.addDevice(r, tx, d, hash, a); err != nil {
				return err
			}
			return audit.Write(r.Context(), tx, s.event(r, d, "identity.created", "identity", d.IdentityID, nil))
		})
		if err != nil {
			s.fail(w, r, fmt.Errorf("create identity: %w", err))
			return
		}
		setCookie(w, secret)
		httpx.WriteJSON(w, http.StatusCreated, d)
	})
}

// JoinHandler is POST /v1/dev/join {identityId}: adds this browser to an existing identity by hand. Development
// only (never mounted when ENV=prod); linking with a code replaces it in B4.
func (s *Service) JoinHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			about
			IdentityID string `json:"identityId"`
		}
		if !httpx.DecodeJSON(w, r, &body, false) {
			return
		}
		if !ids.Valid(body.IdentityID) {
			httpx.WriteError(w, http.StatusBadRequest, "bad_request", "That is not an identity id.")
			return
		}
		body.clean()
		d := Device{IdentityID: body.IdentityID, DeviceID: ids.New()}
		secret, hash := newSecret()
		err := pgx.BeginFunc(r.Context(), s.db, func(tx pgx.Tx) error {
			var status string
			if err := tx.QueryRow(r.Context(), `select status from account.identities where id = $1`, d.IdentityID).Scan(&status); err != nil {
				return err
			}
			if status != "active" {
				return errSuspended
			}
			return s.addDevice(r, tx, d, hash, body.about)
		})
		switch {
		case errors.Is(err, pgx.ErrNoRows):
			httpx.WriteError(w, http.StatusNotFound, "not_found", "No identity has that id.")
		case errors.Is(err, errSuspended):
			httpx.WriteError(w, http.StatusForbidden, "suspended", "Sync is paused for this progress.")
		case err != nil:
			s.fail(w, r, fmt.Errorf("join identity: %w", err))
		default:
			setCookie(w, secret)
			httpx.WriteJSON(w, http.StatusCreated, d)
		}
	})
}

// ShowHandler is GET /v1/identity: which identity and device this browser is.
func (s *Service) ShowHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		d, _ := FromContext(r.Context())
		httpx.WriteJSON(w, http.StatusOK, d)
	})
}

var errSuspended = errors.New("identity suspended")

func (s *Service) addDevice(r *http.Request, tx pgx.Tx, d Device, hash []byte, a about) error {
	if _, err := tx.Exec(r.Context(), `insert into account.devices (id, identity_id, secret_hash, label, platform) values ($1, $2, $3, $4, $5)`,
		d.DeviceID, d.IdentityID, hash, a.Label, a.Platform); err != nil {
		return err
	}
	return audit.Write(r.Context(), tx, s.event(r, d, "device.created", "device", d.DeviceID, map[string]any{"platform": a.Platform}))
}

// Require lets a request through only with a working device cookie, and puts the device in the context.
// Activity is written at most every 10 minutes for the device (and the cookie renewed then) and every hour for
// the identity, so ordinary syncing does not write here.
func (s *Service) Require(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := r.Cookie(CookieName)
		if err != nil {
			signedOut(w)
			return
		}
		hash, ok := hashOf(c.Value)
		if !ok {
			signedOut(w)
			return
		}
		var (
			d                   Device
			status              string
			oldDevice, oldIdent bool
		)
		err = s.db.QueryRow(r.Context(), `
			select d.id::text, d.identity_id::text, i.status,
			       d.last_used_at < now() - interval '10 minutes', i.last_seen_at < now() - interval '1 hour'
			from account.devices d join account.identities i on i.id = d.identity_id
			where d.secret_hash = $1 and d.revoked_at is null`, hash).Scan(&d.DeviceID, &d.IdentityID, &status, &oldDevice, &oldIdent)
		if errors.Is(err, pgx.ErrNoRows) {
			signedOut(w)
			return
		}
		if err != nil {
			s.fail(w, r, fmt.Errorf("find device: %w", err))
			return
		}
		if status != "active" {
			httpx.WriteError(w, http.StatusForbidden, "suspended", "Sync is paused for this progress. It is still on this device.")
			return
		}
		if oldDevice {
			if _, err := s.db.Exec(r.Context(), `update account.devices set last_used_at = now() where id = $1`, d.DeviceID); err != nil {
				s.log.Warn("touch device", "error", err)
			}
			setCookie(w, c.Value)
		}
		if oldIdent {
			if _, err := s.db.Exec(r.Context(), `update account.identities set last_seen_at = now() where id = $1`, d.IdentityID); err != nil {
				s.log.Warn("touch identity", "error", err)
			}
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), deviceKey{}, d)))
	})
}

// lookup finds the device of a request that may or may not carry a cookie.
func (s *Service) lookup(r *http.Request) (Device, bool, error) {
	c, err := r.Cookie(CookieName)
	if err != nil {
		return Device{}, false, nil
	}
	hash, ok := hashOf(c.Value)
	if !ok {
		return Device{}, false, nil
	}
	var d Device
	err = s.db.QueryRow(r.Context(), `
		select d.id::text, d.identity_id::text from account.devices d join account.identities i on i.id = d.identity_id
		where d.secret_hash = $1 and d.revoked_at is null and i.status = 'active'`, hash).Scan(&d.DeviceID, &d.IdentityID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Device{}, false, nil
	}
	return d, err == nil, err
}

func (s *Service) event(r *http.Request, d Device, action, targetType, targetID string, meta map[string]any) audit.Event {
	h, k := s.hash.Hash(reqinfo.IP(r.Context()))
	return audit.Event{
		Action: action, ActorType: audit.Device, ActorIdentity: d.IdentityID, ActorDevice: d.DeviceID, SubjectIdentity: d.IdentityID,
		TargetType: targetType, TargetID: targetID, RequestID: httpx.RequestIDFrom(r.Context()), IPHash: h, IPKey: k, Meta: meta,
	}
}

func (s *Service) reject(r *http.Request, reason string) {
	e := s.event(r, Device{}, "identity.rejected", "", "", map[string]any{"reason": reason})
	if err := audit.Write(r.Context(), s.db, e); err != nil {
		s.log.Warn("audit", "error", err)
	}
}

func (s *Service) fail(w http.ResponseWriter, r *http.Request, err error) {
	s.log.Error("account", "error", err, "request_id", httpx.RequestIDFrom(r.Context()))
	httpx.WriteError(w, http.StatusInternalServerError, "internal", "Something went wrong on our side. Your progress is safe on this device.")
}

func signedOut(w http.ResponseWriter) {
	httpx.WriteError(w, http.StatusUnauthorized, "signed_out", "This device is not linked for sync. Your progress is still here.")
}

// newSecret returns a cookie value (32 random bytes, base64url) and its SHA-256.
func newSecret() (string, []byte) {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	h := sha256.Sum256(b)
	return base64.RawURLEncoding.EncodeToString(b), h[:]
}

func hashOf(cookie string) ([]byte, bool) {
	b, err := base64.RawURLEncoding.DecodeString(cookie)
	if err != nil || len(b) != 32 {
		return nil, false
	}
	h := sha256.Sum256(b)
	return h[:], true
}

func setCookie(w http.ResponseWriter, value string) {
	http.SetCookie(w, &http.Cookie{
		Name: CookieName, Value: value, Path: "/", MaxAge: int(cookieAge / time.Second),
		HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode,
	})
}
