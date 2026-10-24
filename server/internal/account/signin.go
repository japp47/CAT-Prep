package account

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/japp47/CAT-Prep/server/internal/audit"
	"github.com/japp47/CAT-Prep/server/internal/auth"
	"github.com/japp47/CAT-Prep/server/internal/codes"
	"github.com/japp47/CAT-Prep/server/internal/httpx"
	"github.com/japp47/CAT-Prep/server/internal/ids"
	"github.com/japp47/CAT-Prep/server/internal/limit"
	"github.com/japp47/CAT-Prep/server/internal/reqinfo"
)

// Google sign-in (docs/architecture.md §5.2, B7). The device cookie stays the only login (D27): signing in decides
// which identity this browser's device points at. When that needs no question it happens in the callback; when it
// does ("save this device's progress?"), the callback leaves a one-time ticket and the page asks.

// oauthCookie carries state, the PKCE verifier, the nonce and the page to return to, between start and callback.
// SameSite=Lax so the browser sends it on Google's redirect back, which is a top-level GET.
const oauthCookie = "__Host-oauth"

const (
	oauthAge  = 10 * time.Minute
	ticketAge = 10 * time.Minute
)

// SignIn is what the sign-in handlers need besides the Service.
type SignIn struct {
	Provider auth.Provider
	Starts   *limit.Limiter // sign-ins started per address and hour
}

// WithSignIn turns Google sign-in on; without it the auth routes answer 404.
func (s *Service) WithSignIn(si SignIn) *Service {
	s.signIn = &si
	return s
}

// Account is the signed-in account of an identity, shown as "Signed in as".
type Account struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

func random(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

// safeNext keeps the return page on our own site: a path starting with one slash, without its fragment.
func safeNext(next string) string {
	if i := strings.IndexByte(next, '#'); i >= 0 {
		next = next[:i]
	}
	if !strings.HasPrefix(next, "/") || strings.HasPrefix(next, "//") || strings.ContainsAny(next, "\\\r\n") {
		return "/settings"
	}
	return next
}

// back sends the browser to the page it came from with ?signin=<outcome>, opened at the Sync section.
func back(w http.ResponseWriter, r *http.Request, next, outcome string) {
	sep := "?"
	if strings.Contains(next, "?") {
		sep = "&"
	}
	http.Redirect(w, r, next+sep+"signin="+url.QueryEscape(outcome)+"#sync", http.StatusFound)
}

func (s *Service) disabled(w http.ResponseWriter) bool {
	if s.signIn == nil {
		httpx.WriteError(w, http.StatusNotFound, "not_found", "Sign-in is not available yet.")
		return true
	}
	return false
}

// StartHandler is GET /v1/auth/google/start?next=/settings: sends the browser to Google.
func (s *Service) StartHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next := safeNext(r.URL.Query().Get("next"))
		// The browser arrives here by navigation, so even "off" goes back to the page, not to a JSON error.
		if s.signIn == nil {
			back(w, r, next, "unavailable")
			return
		}
		if ok, _ := s.signIn.Starts.Allow(reqinfo.IP(r.Context())); !ok {
			back(w, r, next, "busy")
			return
		}
		state, nonce, verifier := random(16), random(16), random(32)
		to, err := s.signIn.Provider.AuthURL(state, nonce, verifier)
		if err != nil {
			s.log.Error("sign-in start", "error", err)
			back(w, r, next, "failed")
			return
		}
		value := strings.Join([]string{state, verifier, nonce, base64.RawURLEncoding.EncodeToString([]byte(next))}, ".")
		http.SetCookie(w, &http.Cookie{Name: oauthCookie, Value: value, Path: "/", MaxAge: int(oauthAge / time.Second), HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode})
		http.Redirect(w, r, to, http.StatusFound)
	})
}

type pending struct{ state, verifier, nonce, next string }

func readOAuth(r *http.Request) (pending, bool) {
	c, err := r.Cookie(oauthCookie)
	if err != nil {
		return pending{}, false
	}
	parts := strings.Split(c.Value, ".")
	if len(parts) != 4 {
		return pending{}, false
	}
	next, err := base64.RawURLEncoding.DecodeString(parts[3])
	if err != nil {
		return pending{}, false
	}
	return pending{parts[0], parts[1], parts[2], safeNext(string(next))}, true
}

// user is an account found by its Google subject.
type user struct{ id, identityID string }

func (s *Service) findUser(ctx context.Context, q interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}, subject string) (*user, error) {
	var u user
	err := q.QueryRow(ctx, `select u.id::text, u.identity_id::text from account.oauth_accounts o join account.users u on u.id = o.user_id
		where o.provider = 'google' and o.subject = $1`, subject).Scan(&u.id, &u.identityID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// owned says whether an identity already belongs to an account.
func (s *Service) owned(ctx context.Context, identityID string) (bool, error) {
	var n int
	err := s.db.QueryRow(ctx, `select count(*) from account.users where identity_id = $1`, identityID).Scan(&n)
	return n > 0, err
}

func (s *Service) touchUser(ctx context.Context, tx pgx.Tx, u *user, c auth.Claims) error {
	_, err := tx.Exec(ctx, `update account.users set last_sign_in_at = now(),
		updated_at = case when email <> $2 or display_name <> $3 then now() else updated_at end, email = $2, display_name = $3 where id = $1`,
		u.id, c.Email, clip(c.Name, 100))
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `update account.oauth_accounts set email = $2 where provider = 'google' and subject = $1`, c.Subject, c.Email)
	return err
}

func clip(s string, n int) string {
	r := []rune(strings.TrimSpace(s))
	if len(r) > n {
		r = r[:n]
	}
	return string(r)
}

// createUser makes an account for identityID and links the Google account to it.
func (s *Service) createUser(ctx context.Context, tx pgx.Tx, identityID string, c auth.Claims) (*user, error) {
	u := &user{id: ids.New(), identityID: identityID}
	if _, err := tx.Exec(ctx, `insert into account.users (id, identity_id, email, email_verified, display_name) values ($1, $2, $3, true, $4)`,
		u.id, identityID, c.Email, clip(c.Name, 100)); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `insert into account.oauth_accounts (provider, subject, user_id, email) values ('google', $1, $2, $3)`, c.Subject, u.id, c.Email); err != nil {
		return nil, err
	}
	return u, nil
}

// CallbackHandler is GET /v1/auth/google/callback: Google sends the browser back here with a code.
func (s *Service) CallbackHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if s.disabled(w) {
			return
		}
		p, ok := readOAuth(r)
		http.SetCookie(w, &http.Cookie{Name: oauthCookie, Value: "", Path: "/", MaxAge: -1, HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode})
		q := r.URL.Query()
		if !ok {
			back(w, r, "/settings", "expired")
			return
		}
		if q.Get("error") != "" {
			back(w, r, p.next, "cancelled")
			return
		}
		if subtle.ConstantTimeCompare([]byte(q.Get("state")), []byte(p.state)) != 1 || q.Get("code") == "" {
			back(w, r, p.next, "failed")
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
		defer cancel()
		c, err := s.signIn.Provider.Exchange(ctx, q.Get("code"), p.verifier, p.nonce)
		if err != nil {
			s.log.Warn("sign-in exchange", "error", err)
			back(w, r, p.next, "failed")
			return
		}
		if !c.EmailVerified || c.Email == "" || c.Subject == "" {
			back(w, r, p.next, "unverified")
			return
		}
		outcome, err := s.finishOrTicket(w, r, c)
		if err != nil {
			s.log.Error("sign-in", "error", err)
			back(w, r, p.next, "failed")
			return
		}
		back(w, r, p.next, outcome)
	})
}

// finishOrTicket signs in at once when no question is needed, and returns "done"; otherwise it stores a ticket
// and returns it, for the page to ask what to do with this device's progress.
func (s *Service) finishOrTicket(w http.ResponseWriter, r *http.Request, c auth.Claims) (string, error) {
	ctx := r.Context()
	d, onDevice, err := s.lookup(r)
	if err != nil {
		return "", err
	}
	u, err := s.findUser(ctx, s.db, c.Subject)
	if err != nil {
		return "", err
	}
	// Already signed in on this device: refresh the account and stop.
	if u != nil && onDevice && d.IdentityID == u.identityID {
		return "done", pgx.BeginFunc(ctx, s.db, func(tx pgx.Tx) error {
			if err := s.touchUser(ctx, tx, u, c); err != nil {
				return err
			}
			return audit.Write(ctx, tx, s.event(r, d, "account.signed_in", "device", d.DeviceID, nil))
		})
	}
	// A new account on a device with anonymous sync: the account adopts that progress. Nothing moves.
	if u == nil && onDevice {
		taken, err := s.owned(ctx, d.IdentityID)
		if err != nil {
			return "", err
		}
		if !taken {
			secret, hash := newSecret()
			err := pgx.BeginFunc(ctx, s.db, func(tx pgx.Tx) error {
				if _, err := s.createUser(ctx, tx, d.IdentityID, c); err != nil {
					return err
				}
				// A fresh cookie whenever what a cookie can reach changes.
				if _, err := tx.Exec(ctx, `update account.devices set secret_hash = $2 where id = $1`, d.DeviceID, hash); err != nil {
					return err
				}
				return audit.Write(ctx, tx, s.event(r, d, "account.adopted", "identity", d.IdentityID, nil))
			})
			if err != nil {
				return "", err
			}
			setCookie(w, secret)
			return "done", nil
		}
	}
	// Anything else needs the student's answer: a one-time ticket, kept as a hash like link codes.
	ticket := codes.New(codes.RecoveryLen)
	_, err = s.db.Exec(ctx, `insert into account.signin_tickets (token_hash, provider, subject, email, name, expires_at) values ($1, 'google', $2, $3, $4, now() + $5::interval)`,
		codes.Hash(ticket), c.Subject, c.Email, clip(c.Name, 100), fmt.Sprintf("%d seconds", int(ticketAge/time.Second)))
	return ticket, err
}

// TicketInfo is what the page needs to ask the question for a ticket.
type TicketInfo struct {
	Email string `json:"email"`
	Name  string `json:"name"`
	// Account is "new" or "existing".
	Account string `json:"account"`
	// AccountHasProgress: the existing account already has synced progress from another device.
	AccountHasProgress bool `json:"accountHasProgress"`
	// Device is "guest" (no sync here), "anonymous" (sync without an account) or "other_account" (signed in to a
	// different account); for "other_account" keeping this device's progress is not offered.
	Device string `json:"device"`
}

var errBadTicket = errors.New("bad ticket")

func (s *Service) readTicket(ctx context.Context, q interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}, ticket string, consume bool) (auth.Claims, error) {
	t := codes.Normalize(ticket, codes.RecoveryLen)
	if t == "" {
		return auth.Claims{}, errBadTicket
	}
	sql := `select subject, email, name from account.signin_tickets where token_hash = $1 and used_at is null and expires_at > now()`
	if consume {
		sql = `update account.signin_tickets set used_at = now() where token_hash = $1 and used_at is null and expires_at > now() returning subject, email, name`
	}
	var c auth.Claims
	if err := q.QueryRow(ctx, sql, codes.Hash(t)).Scan(&c.Subject, &c.Email, &c.Name); errors.Is(err, pgx.ErrNoRows) {
		return c, errBadTicket
	} else if err != nil {
		return c, err
	}
	c.EmailVerified = true
	return c, nil
}

func (s *Service) deviceState(r *http.Request, u *user) (string, Device, bool, error) {
	d, on, err := s.lookup(r)
	if err != nil || !on {
		return "guest", d, on, err
	}
	if u != nil && d.IdentityID == u.identityID {
		return "same", d, on, nil
	}
	taken, err := s.owned(r.Context(), d.IdentityID)
	if taken {
		return "other_account", d, on, err
	}
	return "anonymous", d, on, err
}

func badTicket(w http.ResponseWriter) {
	httpx.WriteError(w, http.StatusNotFound, "bad_ticket", "That sign-in has expired. Please sign in with Google again.")
}

// TicketHandler is POST /v1/auth/ticket {ticket}: what to ask, without using the ticket up.
func (s *Service) TicketHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if s.disabled(w) {
			return
		}
		var body struct {
			Ticket string `json:"ticket"`
		}
		if !httpx.DecodeJSON(w, r, &body, false) {
			return
		}
		c, err := s.readTicket(r.Context(), s.db, body.Ticket, false)
		if errors.Is(err, errBadTicket) {
			badTicket(w)
			return
		}
		if err != nil {
			s.fail(w, r, err)
			return
		}
		u, err := s.findUser(r.Context(), s.db, c.Subject)
		if err != nil {
			s.fail(w, r, err)
			return
		}
		state, _, _, err := s.deviceState(r, u)
		if err != nil {
			s.fail(w, r, err)
			return
		}
		info := TicketInfo{Email: c.Email, Name: c.Name, Account: "new", Device: state}
		if u != nil {
			info.Account = "existing"
			if err := s.db.QueryRow(r.Context(), `select exists (select 1 from sync.records where identity_id = $1 and not deleted)`, u.identityID).Scan(&info.AccountHasProgress); err != nil {
				s.fail(w, r, err)
				return
			}
		}
		if state == "same" {
			info.Device = "anonymous" // cannot normally happen: the callback would have finished
		}
		httpx.WriteJSON(w, http.StatusOK, info)
	})
}

// signedIn is the answer to completing a sign-in: this device, now on the account's identity.
type signedIn struct {
	Device
	Account Account `json:"account"`
}

// CompleteHandler is POST /v1/auth/complete {ticket, keep, label, platform}: points this browser at the account's
// identity (made now for a new account) with a fresh device cookie. keep only tells the browser what to do next;
// the server's part is the same. For a device signed in to another account, keep is refused: two people's
// progress is never merged.
func (s *Service) CompleteHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if s.disabled(w) {
			return
		}
		var body struct {
			about
			Ticket string `json:"ticket"`
			Keep   bool   `json:"keep"`
		}
		if !httpx.DecodeJSON(w, r, &body, false) {
			return
		}
		body.clean()
		ctx := r.Context()
		var out signedIn
		secret, hash := newSecret()
		same := false
		err := pgx.BeginFunc(ctx, s.db, func(tx pgx.Tx) error {
			c, err := s.readTicket(ctx, tx, body.Ticket, true)
			if err != nil {
				return err
			}
			out.Account = Account{Email: c.Email, Name: c.Name}
			u, err := s.findUser(ctx, tx, c.Subject)
			if err != nil {
				return err
			}
			state, current, onDevice, err := s.deviceState(r, u)
			if err != nil {
				return err
			}
			if state == "other_account" && body.Keep {
				return errKeepOther
			}
			if u == nil {
				identity := ids.New()
				if _, err := tx.Exec(ctx, `insert into account.identities (id) values ($1)`, identity); err != nil {
					return err
				}
				if _, err := tx.Exec(ctx, `insert into sync.heads (identity_id) values ($1)`, identity); err != nil {
					return err
				}
				if u, err = s.createUser(ctx, tx, identity, c); err != nil {
					return err
				}
				if err := audit.Write(ctx, tx, s.event(r, Device{IdentityID: identity}, "account.created", "identity", identity, nil)); err != nil {
					return err
				}
			} else {
				var status string
				if err := tx.QueryRow(ctx, `select status from account.identities where id = $1`, u.identityID).Scan(&status); err != nil {
					return err
				}
				if status != "active" {
					return errSuspended
				}
				if err := s.touchUser(ctx, tx, u, c); err != nil {
					return err
				}
			}
			if state == "same" {
				same, out.Device = true, current
				return audit.Write(ctx, tx, s.event(r, current, "account.signed_in", "device", current.DeviceID, nil))
			}
			if onDevice {
				if _, err := tx.Exec(ctx, `update account.devices set revoked_at = now(), revoked_reason = 'signed_out' where id = $1`, current.DeviceID); err != nil {
					return err
				}
				if err := audit.Write(ctx, tx, s.event(r, current, "device.revoked", "device", current.DeviceID, map[string]any{"reason": "signed_in"})); err != nil {
					return err
				}
			}
			out.Device = Device{IdentityID: u.identityID, DeviceID: ids.New()}
			if err := s.addDevice(r, tx, out.Device, hash, body.about); err != nil {
				return err
			}
			return audit.Write(ctx, tx, s.event(r, out.Device, "account.signed_in", "device", out.Device.DeviceID, map[string]any{"keep": body.Keep}))
		})
		switch {
		case errors.Is(err, errBadTicket):
			badTicket(w)
		case errors.Is(err, errKeepOther):
			httpx.WriteError(w, http.StatusConflict, "other_account", "This device is signed in to another account, so its progress cannot be added. Start fresh instead.")
		case errors.Is(err, errSuspended):
			httpx.WriteError(w, http.StatusForbidden, "suspended", "Sync is paused for this account.")
		case err != nil:
			s.fail(w, r, fmt.Errorf("complete sign-in: %w", err))
		default:
			if !same {
				setCookie(w, secret)
			}
			httpx.WriteJSON(w, http.StatusOK, out)
		}
	})
}

var errKeepOther = errors.New("keep on another account's device")

// accountOf returns the account that owns an identity, or nil.
func (s *Service) accountOf(ctx context.Context, identityID string) (*Account, error) {
	var a Account
	err := s.db.QueryRow(ctx, `select email, display_name from account.users where identity_id = $1`, identityID).Scan(&a.Email, &a.Name)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &a, nil
}
