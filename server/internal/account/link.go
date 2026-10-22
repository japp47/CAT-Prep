package account

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/japp47/CAT-Prep/server/internal/audit"
	"github.com/japp47/CAT-Prep/server/internal/codes"
	"github.com/japp47/CAT-Prep/server/internal/httpx"
	"github.com/japp47/CAT-Prep/server/internal/ids"
	"github.com/japp47/CAT-Prep/server/internal/reqinfo"
)

// Linking devices and getting progress back (docs/architecture.md §5.1): a device that syncs shows a link code (as
// a QR) for another to join; a recovery code brings the progress to a browser that has lost every device.

// LinkTTL is how long a link code works.
const LinkTTL = 10 * time.Minute

// maxOpenLinks is how many unused, unexpired link codes one identity may hold at once.
const maxOpenLinks = 5

// RecoveryCodeHandler is POST /v1/identity/recovery-code: a new recovery code, shown once. The old one stops working.
func (s *Service) RecoveryCodeHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		d, _ := FromContext(r.Context())
		code := codes.New(codes.RecoveryLen)
		err := pgx.BeginFunc(r.Context(), s.db, func(tx pgx.Tx) error {
			if _, err := tx.Exec(r.Context(), `
				insert into account.recovery_codes (identity_id, code_hash) values ($1, $2)
				on conflict (identity_id) do update set code_hash = excluded.code_hash, created_at = now()`, d.IdentityID, codes.Hash(code)); err != nil {
				return err
			}
			return audit.Write(r.Context(), tx, s.event(r, d, "recovery.created", "identity", d.IdentityID, nil))
		})
		if err != nil {
			s.fail(w, r, fmt.Errorf("new recovery code: %w", err))
			return
		}
		httpx.WriteJSON(w, http.StatusCreated, map[string]string{"recoveryCode": codes.Format(code)})
	})
}

// LinkCodeHandler is POST /v1/identity/link-codes: a code another device can use within 10 minutes, once.
func (s *Service) LinkCodeHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		d, _ := FromContext(r.Context())
		code := codes.New(codes.LinkLen)
		var expires time.Time
		err := pgx.BeginFunc(r.Context(), s.db, func(tx pgx.Tx) error {
			var open int
			if err := tx.QueryRow(r.Context(), `select count(*) from account.link_codes
				where identity_id = $1 and used_at is null and expires_at > now()`, d.IdentityID).Scan(&open); err != nil {
				return err
			}
			if open >= maxOpenLinks {
				return errTooManyCodes
			}
			if err := tx.QueryRow(r.Context(), `
				insert into account.link_codes (code_hash, identity_id, created_by_device_id, expires_at)
				values ($1, $2, $3, now() + $4::interval) returning expires_at`,
				codes.Hash(code), d.IdentityID, d.DeviceID, fmt.Sprintf("%d seconds", int(LinkTTL.Seconds()))).Scan(&expires); err != nil {
				return err
			}
			return audit.Write(r.Context(), tx, s.event(r, d, "link.created", "identity", d.IdentityID, nil))
		})
		if errors.Is(err, errTooManyCodes) {
			httpx.WriteError(w, http.StatusTooManyRequests, "too_many_codes", "Several codes are already waiting. Use one of them, or wait 10 minutes.")
			return
		}
		if err != nil {
			s.fail(w, r, fmt.Errorf("new link code: %w", err))
			return
		}
		httpx.WriteJSON(w, http.StatusCreated, map[string]any{"code": codes.Format(code), "expiresAt": expires.UTC()})
	})
}

var (
	errTooManyCodes = errors.New("too many open link codes")
	errBadCode      = errors.New("code did not match")
)

// LinkHandler is POST /v1/identity/link {code}: this browser joins the identity that made the code.
func (s *Service) LinkHandler() http.Handler { return s.useCode("link", codes.LinkLen) }

// RecoverHandler is POST /v1/identity/recover {code}: this browser joins the identity of a recovery code.
func (s *Service) RecoverHandler() http.Handler { return s.useCode("recovery", codes.RecoveryLen) }

// useCode joins this browser to an identity by a link or recovery code. Tries are limited per address, and five
// wrong codes in a row make the address wait an hour. A browser that synced as another identity leaves it (its
// old device is revoked); one already on this identity is told so and keeps its device.
func (s *Service) useCode(kind string, n int) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			about
			Code string `json:"code"`
		}
		if !httpx.DecodeJSON(w, r, &body, false) {
			return
		}
		body.clean()
		ip := reqinfo.IP(r.Context())
		if s.wrong.Over(ip) {
			httpx.WriteError(w, http.StatusTooManyRequests, "rate_limited", "Too many wrong codes from this network. Please try again in an hour.")
			return
		}
		if ok, _ := s.tries.Allow(ip); !ok {
			httpx.WriteError(w, http.StatusTooManyRequests, "rate_limited", "Too many tries from this network. Please try again in an hour.")
			return
		}
		code := codes.Normalize(body.Code, n)
		current, signedIn, err := s.lookup(r)
		if err != nil {
			s.fail(w, r, err)
			return
		}
		d := Device{DeviceID: ids.New()}
		secret, hash := newSecret()
		same := false
		err = pgx.BeginFunc(r.Context(), s.db, func(tx pgx.Tx) error {
			if code == "" {
				return errBadCode
			}
			var q string
			if kind == "link" {
				// One statement, so two browsers using the same code at once cannot both get in.
				q = `update account.link_codes set used_at = now() where code_hash = $1 and used_at is null and expires_at > now() returning identity_id::text`
			} else {
				q = `select identity_id::text from account.recovery_codes where code_hash = $1`
			}
			if err := tx.QueryRow(r.Context(), q, codes.Hash(code)).Scan(&d.IdentityID); errors.Is(err, pgx.ErrNoRows) {
				return errBadCode
			} else if err != nil {
				return err
			}
			var status string
			if err := tx.QueryRow(r.Context(), `select status from account.identities where id = $1`, d.IdentityID).Scan(&status); err != nil {
				return err
			}
			if status != "active" {
				return errSuspended
			}
			if signedIn && current.IdentityID == d.IdentityID {
				same, d = true, current
				return audit.Write(r.Context(), tx, s.event(r, d, kind+".used", "device", d.DeviceID, map[string]any{"already": true}))
			}
			if signedIn {
				if _, err := tx.Exec(r.Context(), `update account.devices set revoked_at = now(), revoked_reason = 'signed_out' where id = $1`, current.DeviceID); err != nil {
					return err
				}
				if err := audit.Write(r.Context(), tx, s.event(r, current, "device.revoked", "device", current.DeviceID, map[string]any{"reason": "switched"})); err != nil {
					return err
				}
			}
			if err := s.addDevice(r, tx, d, hash, body.about); err != nil {
				return err
			}
			if kind == "link" {
				if _, err := tx.Exec(r.Context(), `update account.link_codes set used_by_device_id = $2 where code_hash = $1`, codes.Hash(code), d.DeviceID); err != nil {
					return err
				}
			}
			return audit.Write(r.Context(), tx, s.event(r, d, kind+".used", "device", d.DeviceID, nil))
		})
		switch {
		case errors.Is(err, errBadCode):
			s.wrong.Allow(ip)
			e := s.event(r, Device{}, kind+".failed", "", "", nil)
			if err := audit.Write(r.Context(), s.db, e); err != nil {
				s.log.Warn("audit", "error", err)
			}
			msg := "That code did not work. Check it, or make a new one on your other device."
			if kind == "recovery" {
				msg = "That recovery code did not work. Check each character and try again."
			}
			httpx.WriteError(w, http.StatusNotFound, "bad_code", msg)
		case errors.Is(err, errSuspended):
			httpx.WriteError(w, http.StatusForbidden, "suspended", "Sync is paused for this progress.")
		case err != nil:
			s.fail(w, r, fmt.Errorf("use %s code: %w", kind, err))
		default:
			s.wrong.Reset(ip)
			if same {
				httpx.WriteJSON(w, http.StatusOK, d)
				return
			}
			setCookie(w, secret)
			httpx.WriteJSON(w, http.StatusCreated, d)
		}
	})
}

// DeviceInfo is one row of the device list.
type DeviceInfo struct {
	ID           string     `json:"id"`
	Label        string     `json:"label"`
	Platform     string     `json:"platform"`
	CreatedAt    time.Time  `json:"createdAt"`
	LastSyncedAt *time.Time `json:"lastSyncedAt"`
	Current      bool       `json:"current"`
}

// DevicesHandler is GET /v1/devices: the browsers that sync this progress, oldest first.
func (s *Service) DevicesHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		d, _ := FromContext(r.Context())
		rows, err := s.db.Query(r.Context(), `select id::text, label, platform, created_at, last_synced_at from account.devices
			where identity_id = $1 and revoked_at is null order by created_at`, d.IdentityID)
		if err != nil {
			s.fail(w, r, fmt.Errorf("devices: %w", err))
			return
		}
		list, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (DeviceInfo, error) {
			var x DeviceInfo
			err := row.Scan(&x.ID, &x.Label, &x.Platform, &x.CreatedAt, &x.LastSyncedAt)
			x.Current = x.ID == d.DeviceID
			return x, err
		})
		if err != nil {
			s.fail(w, r, fmt.Errorf("devices: %w", err))
			return
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"devices": list})
	})
}

// RemoveDeviceHandler is DELETE /v1/devices/{id}: stops one of this progress's devices from syncing ("me" is this
// browser). The removed browser keeps its own copy; its next sync gets 401.
func (s *Service) RemoveDeviceHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		d, _ := FromContext(r.Context())
		id, reason := r.PathValue("id"), "removed"
		if id == "me" {
			id, reason = d.DeviceID, "signed_out"
		}
		if !ids.Valid(id) {
			httpx.WriteError(w, http.StatusNotFound, "not_found", "That device is not linked to this progress.")
			return
		}
		var removed bool
		err := pgx.BeginFunc(r.Context(), s.db, func(tx pgx.Tx) error {
			tag, err := tx.Exec(r.Context(), `update account.devices set revoked_at = now(), revoked_reason = $3
				where id = $1 and identity_id = $2 and revoked_at is null`, id, d.IdentityID, reason)
			if err != nil || tag.RowsAffected() == 0 {
				return err
			}
			removed = true
			return audit.Write(r.Context(), tx, s.event(r, d, "device.revoked", "device", id, map[string]any{"reason": reason}))
		})
		if err != nil {
			s.fail(w, r, fmt.Errorf("remove device: %w", err))
			return
		}
		if !removed {
			httpx.WriteError(w, http.StatusNotFound, "not_found", "That device is not linked to this progress.")
			return
		}
		if id == d.DeviceID {
			http.SetCookie(w, &http.Cookie{Name: CookieName, Value: "", Path: "/", MaxAge: -1, HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode})
		}
		w.WriteHeader(http.StatusNoContent)
	})
}
