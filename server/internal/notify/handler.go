package notify

import (
	"errors"
	"log/slog"
	"net/http"
	"net/url"
	"slices"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/japp47/CAT-Prep/server/internal/account"
	"github.com/japp47/CAT-Prep/server/internal/httpx"
	"github.com/japp47/CAT-Prep/server/internal/limit"
	"github.com/japp47/CAT-Prep/server/internal/reqinfo"
)

// API serves /v1/notify/* behind the device cookie, and the one-click unsubscribe without it
// (docs/design/notifications.md §8). Without its keys it answers 503, and the site hides Reminders.
type API struct {
	DB          *pgxpool.Pool
	Tokens      Tokens
	VAPIDPublic string
	Site        string
	Policy      Policy
	Log         *slog.Logger
	unsubs      *limit.Limiter
}

// NewAPI returns the handlers.
func NewAPI(db *pgxpool.Pool, tokens Tokens, vapidPublic, site string, p Policy, log *slog.Logger) *API {
	return &API{DB: db, Tokens: tokens, VAPIDPublic: vapidPublic, Site: site, Policy: p, Log: log, unsubs: limit.New(30, time.Minute)}
}

// Prefs is a student's reminder choices as the site reads and writes them; the last group is read-only.
type Prefs struct {
	On          bool       `json:"on"`
	At          int        `json:"at"`
	Days        []int      `json:"days"`
	TimeZone    string     `json:"timeZone"`
	QuietFrom   int        `json:"quietFrom"`
	QuietTo     int        `json:"quietTo"`
	Email       string     `json:"email"`
	Weekly      bool       `json:"weekly"`
	PausedUntil *time.Time `json:"pausedUntil"`

	EmailAddress string    `json:"emailAddress"`
	EmailState   string    `json:"emailState"`
	PushDevices  int       `json:"pushDevices"`
	PushReady    bool      `json:"pushReady"` // the server can send push (it has its VAPID key)
	ThisDevice   bool      `json:"thisDevice"`
	LastSent     *LastSent `json:"lastSent"`
}

// LastSent is the newest reminder, so Settings can say when one last went and why.
type LastSent struct {
	At      time.Time `json:"at"`
	Kind    string    `json:"kind"`
	Channel string    `json:"channel"`
}

// ready: choices need the unsubscribe key (made per run in dev); push also needs the VAPID key (pushReady).
func (a *API) ready(w http.ResponseWriter) bool {
	if len(a.Tokens.Key) == 0 {
		httpx.WriteError(w, http.StatusServiceUnavailable, "reminders_unavailable", "Reminders are not available yet.")
		return false
	}
	return true
}

func (a *API) fail(w http.ResponseWriter, r *http.Request, err error) {
	a.Log.Error("notify", "error", err, "request_id", httpx.RequestIDFrom(r.Context()))
	httpx.WriteError(w, http.StatusInternalServerError, "server_error", "Something went wrong on our side. Please try again.")
}

// PrefsHandler: GET /v1/notify/prefs. A student who never opened Reminders gets the defaults, reminders off.
func (a *API) PrefsHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !a.ready(w) {
			return
		}
		d, _ := account.FromContext(r.Context())
		p, err := a.load(r, d)
		if err != nil {
			a.fail(w, r, err)
			return
		}
		httpx.WriteJSON(w, http.StatusOK, p)
	})
}

func (a *API) load(r *http.Request, d account.Device) (Prefs, error) {
	p := Prefs{At: a.Policy.DefaultTime, Days: []int{0, 1, 2, 3, 4, 5, 6}, TimeZone: "Asia/Kolkata",
		QuietFrom: a.Policy.QuietHours.From, QuietTo: a.Policy.QuietHours.To, Email: EmailOff, EmailState: "ok", PushReady: a.VAPIDPublic != ""}
	var days int
	err := a.DB.QueryRow(r.Context(), `select enabled, at_minute, days, tz, quiet_from, quiet_to, email_mode, weekly, paused_until, email_state
		from notify.prefs where identity_id = $1`, d.IdentityID).Scan(&p.On, &p.At, &days, &p.TimeZone, &p.QuietFrom, &p.QuietTo, &p.Email, &p.Weekly, &p.PausedUntil, &p.EmailState)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
	case err != nil:
		return p, err
	default:
		p.Days = p.Days[:0]
		for i := 0; i < 7; i++ {
			if days&(1<<i) != 0 {
				p.Days = append(p.Days, i)
			}
		}
	}
	var at *time.Time
	var kind, channel *string
	err = a.DB.QueryRow(r.Context(), `
		select coalesce((select email from account.users where identity_id = $1 and email_verified), ''),
			(select count(*) from notify.push_subs where identity_id = $1),
			exists (select 1 from notify.push_subs where identity_id = $1 and device_id = $2),
			m.sent_at, m.kind, m.channel
		from (select 1) one
		left join lateral (select sent_at, kind, channel from notify.messages where identity_id = $1 and status = 'sent' order by sent_at desc limit 1) m on true`,
		d.IdentityID, d.DeviceID).Scan(&p.EmailAddress, &p.PushDevices, &p.ThisDevice, &at, &kind, &channel)
	if err == nil && at != nil {
		p.LastSent = &LastSent{At: *at, Kind: *kind, Channel: *channel}
	}
	return p, err
}

// SavePrefsHandler: PUT /v1/notify/prefs. Turning reminders on starts the clock for the first one (tomorrow).
func (a *API) SavePrefsHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !a.ready(w) {
			return
		}
		d, _ := account.FromContext(r.Context())
		var in struct {
			On          bool       `json:"on"`
			At          int        `json:"at"`
			Days        []int      `json:"days"`
			TimeZone    string     `json:"timeZone"`
			QuietFrom   int        `json:"quietFrom"`
			QuietTo     int        `json:"quietTo"`
			Email       string     `json:"email"`
			Weekly      bool       `json:"weekly"`
			PausedUntil *time.Time `json:"pausedUntil"`
		}
		if !httpx.DecodeJSON(w, r, &in, false) {
			return
		}
		bad := func(msg string) { httpx.WriteError(w, http.StatusBadRequest, "bad_request", msg) }
		days := 0
		for _, x := range in.Days {
			if x < 0 || x > 6 {
				bad("Days of the week are 0 (Sunday) to 6.")
				return
			}
			days |= 1 << x
		}
		switch {
		case in.On && days == 0: // on with no days would look healthy and never send anything
			bad("Pick at least one day, or turn reminders off.")
			return
		case in.At < 0 || in.At > 1439 || in.At%a.Policy.TimeStep != 0:
			bad("Pick a reminder time on a quarter hour.")
			return
		case in.QuietFrom < 0 || in.QuietFrom > 1439 || in.QuietTo < 0 || in.QuietTo > 1439:
			bad("Quiet hours must be times of day.")
			return
		case !slices.Contains([]string{EmailOff, EmailMissed, EmailDaily}, in.Email):
			bad("Email must be off, missed or daily.")
			return
		case in.PausedUntil != nil && in.PausedUntil.After(time.Now().Add(31*24*time.Hour)):
			bad("A pause can last at most a month.")
			return
		}
		if _, err := time.LoadLocation(in.TimeZone); err != nil || in.TimeZone == "" || len(in.TimeZone) > 64 {
			bad("That time zone is not known.")
			return
		}
		if in.Email != EmailOff || in.Weekly {
			var verified bool
			if err := a.DB.QueryRow(r.Context(), `select exists (select 1 from account.users where identity_id = $1 and email_verified)`, d.IdentityID).Scan(&verified); err != nil {
				a.fail(w, r, err)
				return
			}
			if !verified {
				httpx.WriteError(w, http.StatusBadRequest, "needs_google", "Email reminders need Google sign-in, so we have an address to send to.")
				return
			}
		}
		if _, err := a.DB.Exec(r.Context(), `
			insert into notify.prefs (identity_id, enabled, at_minute, days, tz, quiet_from, quiet_to, email_mode, weekly, paused_until, enabled_at)
			values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, case when $2 then now() end)
			on conflict (identity_id) do update set enabled = excluded.enabled, at_minute = excluded.at_minute, days = excluded.days,
				tz = excluded.tz, quiet_from = excluded.quiet_from, quiet_to = excluded.quiet_to, email_mode = excluded.email_mode,
				weekly = excluded.weekly, paused_until = excluded.paused_until,
				enabled_at = case when not excluded.enabled then null when notify.prefs.enabled then notify.prefs.enabled_at else now() end,
				email_state = case when excluded.email_mode <> 'off' and notify.prefs.email_mode = 'off' then 'ok' else notify.prefs.email_state end`,
			d.IdentityID, in.On, in.At, days, in.TimeZone, in.QuietFrom, in.QuietTo, in.Email, in.Weekly, in.PausedUntil); err != nil {
			a.fail(w, r, err)
			return
		}
		// The weekly figures exist only for the weekly review: switching it off deletes them (D97).
		if !in.Weekly {
			if _, err := a.DB.Exec(r.Context(), `delete from notify.weeks where identity_id = $1`, d.IdentityID); err != nil {
				a.fail(w, r, err)
				return
			}
		}
		p, err := a.load(r, d)
		if err != nil {
			a.fail(w, r, err)
			return
		}
		httpx.WriteJSON(w, http.StatusOK, p)
	})
}

// PushKeyHandler: GET /v1/notify/push-key, the public key browsers subscribe with.
func (a *API) PushKeyHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if a.VAPIDPublic == "" {
			httpx.WriteError(w, http.StatusServiceUnavailable, "push_unavailable", "Notifications are not set up on this server yet. Email reminders still work.")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]string{"key": a.VAPIDPublic})
	})
}

// SubscribeHandler: POST /v1/notify/push with PushSubscription.toJSON(). The device's earlier subscription is
// replaced; a student keeps at most ten devices, the oldest going first.
func (a *API) SubscribeHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !a.ready(w) {
			return
		}
		if a.VAPIDPublic == "" {
			httpx.WriteError(w, http.StatusServiceUnavailable, "push_unavailable", "Notifications are not set up on this server yet.")
			return
		}
		d, _ := account.FromContext(r.Context())
		var in struct {
			Endpoint       string `json:"endpoint"`
			ExpirationTime *int64 `json:"expirationTime"`
			Keys           struct {
				P256dh string `json:"p256dh"`
				Auth   string `json:"auth"`
			} `json:"keys"`
		}
		if !httpx.DecodeJSON(w, r, &in, false) {
			return
		}
		u, err := url.Parse(in.Endpoint)
		ua, err1 := b64.DecodeString(in.Keys.P256dh)
		secret, err2 := b64.DecodeString(in.Keys.Auth)
		if err != nil || u.Scheme != "https" || u.Host == "" || len(in.Endpoint) > 1000 || err1 != nil || len(ua) != 65 || err2 != nil || len(secret) != 16 {
			httpx.WriteError(w, http.StatusBadRequest, "bad_request", "That push subscription could not be read.")
			return
		}
		err = pgx.BeginFunc(r.Context(), a.DB, func(tx pgx.Tx) error {
			if _, err := tx.Exec(r.Context(), `delete from notify.push_subs where device_id = $1 and endpoint <> $2`, d.DeviceID, in.Endpoint); err != nil {
				return err
			}
			if _, err := tx.Exec(r.Context(), `
				insert into notify.push_subs (identity_id, device_id, endpoint, p256dh, auth) values ($1, $2, $3, $4, $5)
				on conflict (endpoint) do update set identity_id = excluded.identity_id, device_id = excluded.device_id,
					p256dh = excluded.p256dh, auth = excluded.auth, failures = 0`,
				d.IdentityID, d.DeviceID, in.Endpoint, in.Keys.P256dh, in.Keys.Auth); err != nil {
				return err
			}
			_, err := tx.Exec(r.Context(), `delete from notify.push_subs where id in (select id from notify.push_subs where identity_id = $1
				order by created_at desc offset 10)`, d.IdentityID)
			return err
		})
		if err != nil {
			a.fail(w, r, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
}

// UnsubscribePushHandler: DELETE /v1/notify/push turns push off on this device.
func (a *API) UnsubscribePushHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		d, _ := account.FromContext(r.Context())
		if _, err := a.DB.Exec(r.Context(), `delete from notify.push_subs where device_id = $1`, d.DeviceID); err != nil {
			a.fail(w, r, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
}

// OpenedHandler: POST /v1/notify/opened {m}: the site was opened from that message's link.
func (a *API) OpenedHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		d, _ := account.FromContext(r.Context())
		var in struct {
			M int64 `json:"m"`
		}
		if !httpx.DecodeJSON(w, r, &in, false) {
			return
		}
		if _, err := a.DB.Exec(r.Context(), `update notify.messages set opened_at = now() where id = $1 and identity_id = $2 and opened_at is null`, in.M, d.IdentityID); err != nil {
			a.fail(w, r, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
}

// UnsubscribeHandler: POST /v1/unsubscribe?t= is the one-click unsubscribe (RFC 8058) from a mail app, or the
// site's /unsubscribe page; no sign-in, the signed token says who and what. GET never changes anything (link
// scanners open every link): it sends the browser to the site's page, which asks first.
func (a *API) UnsubscribeHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tok := r.URL.Query().Get("t")
		if r.Method == http.MethodGet {
			http.Redirect(w, r, a.Site+"/unsubscribe?t="+url.QueryEscape(tok), http.StatusSeeOther)
			return
		}
		if ok, _ := a.unsubs.Allow(reqinfo.IP(r.Context())); !ok {
			httpx.WriteError(w, http.StatusTooManyRequests, "rate_limited", "Too many tries. Please wait a minute.")
			return
		}
		identity, scope, err := a.Tokens.Check(tok)
		if err != nil {
			httpx.WriteError(w, http.StatusBadRequest, "bad_link", "This unsubscribe link is not valid. Change reminders in Settings instead.")
			return
		}
		q := `update notify.prefs set email_mode = 'off' where identity_id = $1`
		if scope == ScopeWeekly {
			// Off, and its figures with it (D97), in one statement.
			q = `with off as (update notify.prefs set weekly = false where identity_id = $1)
				delete from notify.weeks where identity_id = $1`
		}
		if _, err := a.DB.Exec(r.Context(), q, identity); err != nil {
			a.fail(w, r, err)
			return
		}
		// Counted for the owner's panel, with no identity (R2, §15.3). A failed count does not undo the unsubscribe.
		if _, err := a.DB.Exec(r.Context(), `insert into notify.unsubscribes (day, scope, n) values (current_date, $1, 1)
			on conflict (day, scope) do update set n = notify.unsubscribes.n + 1`, scope); err != nil {
			a.Log.Warn("count unsubscribe", "error", err)
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"done": true, "scope": scope})
	})
}
