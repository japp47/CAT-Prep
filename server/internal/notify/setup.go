package notify

import (
	"context"
	"errors"
	"log/slog"
	"net/url"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/japp47/CAT-Prep/server/internal/mailx"
)

// Settings is what a running pipeline needs from the environment; the API (worker) and cmd/notify read the same
// NOTIFY_* variables into it.
type Settings struct {
	Site                      string // https://99ile.in
	TokenKey                  []byte // NOTIFY_TOKEN_SECRET
	VAPIDPublic, VAPIDPrivate string // push off without both
	SMTPUser, SMTPPassword    string // the sending account; the password only for SMTP
	// Gmail's API over HTTPS (D92): used instead of SMTP when all three are set, as on Render, which blocks mail ports.
	GmailClientID, GmailClientSecret, GmailRefreshToken string
	EmailOff, PushOff                                   bool // NOTIFY_EMAIL=off, NOTIFY_PUSH=off
	EmailCap                                            int  // emails in a rolling day; 300 when zero
}

// Gmail is where reminder email goes out (docs/design/notifications.md §6).
const Gmail = "smtp.gmail.com:587"

// NewService wires the pipeline: the rules, the wording, the Postgres queue and the channels the settings allow.
func NewService(db *pgxpool.Pool, set Settings, log *slog.Logger) (*Service, error) {
	if len(set.TokenKey) < 32 {
		return nil, errors.New("NOTIFY_TOKEN_SECRET must be at least 32 bytes in hex, the same value as the API's")
	}
	policy, err := LoadPolicy()
	if err != nil {
		return nil, err
	}
	r, err := NewRenderer()
	if err != nil {
		return nil, err
	}
	channels := ChannelsFor(set)
	if set.EmailCap <= 0 {
		set.EmailCap = 300
	}
	return &Service{Policy: policy, Render: r, Queue: PG{DB: db}, Store: Store{DB: db}, Channels: channels,
		Tokens: Tokens{Key: set.TokenKey}, Site: set.Site, EmailCap: set.EmailCap, Log: log}, nil
}

// ChannelsFor is every channel these settings switch on, by name.
func ChannelsFor(set Settings) map[string]Channel {
	channels := map[string]Channel{}
	if ch := EmailChannelFor(set); ch != nil && !set.EmailOff {
		channels[Email] = ch
	}
	if set.VAPIDPublic != "" && set.VAPIDPrivate != "" && !set.PushOff {
		channels[Push] = PushChannel{Push: WebPush{Keys: VAPID{Public: set.VAPIDPublic, Private: set.VAPIDPrivate, Subject: "mailto:99ile.team@gmail.com"}}}
	}
	return channels
}

// GmailAPIFor is Gmail's API for these settings, or nil without its three keys.
func GmailAPIFor(set Settings) *GmailAPI {
	if set.GmailClientID == "" || set.GmailClientSecret == "" || set.GmailRefreshToken == "" {
		return nil
	}
	return &GmailAPI{ClientID: set.GmailClientID, ClientSecret: set.GmailClientSecret, RefreshToken: set.GmailRefreshToken}
}

// EmailChannelFor picks how email goes out: Gmail's API when it is set up, else SMTP with an app password, else none.
func EmailChannelFor(set Settings) Channel {
	if set.SMTPUser == "" {
		return nil
	}
	if api := GmailAPIFor(set); api != nil {
		return &GmailChannel{API: api, From: set.SMTPUser, Pace: 3 * time.Second, Domain: mailDomain(set.Site)}
	}
	if set.SMTPPassword != "" {
		return &EmailChannel{Server: mailx.Server{Addr: Gmail, User: set.SMTPUser, Password: set.SMTPPassword}, Pace: 3 * time.Second, Domain: mailDomain(set.Site)}
	}
	return nil
}

// TeamAlert emails the team through the same account, the same way reminders go, for Worker.Alert.
func TeamAlert(set Settings) func(ctx context.Context, subject, body string) error {
	if set.SMTPUser == "" {
		return nil
	}
	if api := GmailAPIFor(set); api != nil {
		return func(ctx context.Context, subject, body string) error {
			return api.SendRaw(ctx, mailx.Plain(set.SMTPUser, "99ile reminders", set.SMTPUser, subject, body, time.Now()))
		}
	}
	if set.SMTPPassword == "" {
		return nil
	}
	server := mailx.Server{Addr: Gmail, User: set.SMTPUser, Password: set.SMTPPassword}
	return func(_ context.Context, subject, body string) error {
		return server.Send(set.SMTPUser, mailx.Plain(set.SMTPUser, "99ile reminders", set.SMTPUser, subject, body, time.Now()))
	}
}

// mailDomain is the right-hand side of each Message-ID: the site's own host, so a change of address (99ile.pages.dev to
// 99ile.in, 12 Nov 2026) is one environment variable and no code. An unusable site falls back to 99ile.in.
func mailDomain(site string) string {
	if u, err := url.Parse(site); err == nil && u.Hostname() != "" {
		return u.Hostname()
	}
	return "99ile.in"
}
