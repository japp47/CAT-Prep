// Package feedback takes "Report a problem" from a question (docs/feature.md F39, B6). Reports need no sync and
// carry no personal data: the question, the page, one of four kinds and an optional note. With sync on, the
// sender's identity is kept so a deleted identity's reports lose the link (docs/database.md §5).
package feedback

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/japp47/CAT-Prep/server/internal/account"
	"github.com/japp47/CAT-Prep/server/internal/httpx"
	"github.com/japp47/CAT-Prep/server/internal/limit"
	"github.com/japp47/CAT-Prep/server/internal/reqinfo"
)

// NoteMax is the longest note, in characters.
const NoteMax = 1000

// Store saves one report.
type Store func(ctx context.Context, r Report) error

// Postgres saves reports in support.feedback. An empty identity is stored as null.
func Postgres(db *pgxpool.Pool) Store {
	return func(ctx context.Context, r Report) error {
		var ident any
		if r.IdentityID != "" {
			ident = r.IdentityID
		}
		_, err := db.Exec(ctx, `insert into support.feedback (identity_id, page, item_id, kind, note) values ($1, $2, $3, $4, $5)`,
			ident, r.Page, r.ItemID, r.Kind, r.Note)
		return err
	}
}

// Report is one problem report.
type Report struct {
	IdentityID string // empty without sync
	Page       string
	ItemID     string
	Kind       string
	Note       string
}

var (
	kinds  = map[string]bool{"answer_key": true, "unclear": true, "typo": true, "other": true}
	itemID = regexp.MustCompile(`^[A-Za-z0-9:_.-]{1,100}$`)
)

// Service holds the store and the per-address limit.
type Service struct {
	save Store
	log  *slog.Logger
	lim  *limit.Limiter
}

// New returns the service; perHour is the reports allowed per address each hour.
func New(save Store, log *slog.Logger, perHour int) *Service {
	return &Service{save: save, log: log, lim: limit.New(perHour, time.Hour)}
}

type body struct {
	Page   string `json:"page"`
	ItemID string `json:"itemId"`
	Kind   string `json:"kind"`
	Note   string `json:"note"`
}

// Handler answers POST /v1/feedback with 201, or 400 and 429 in the shared error shape.
func (s *Service) Handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var b body
		if !httpx.DecodeJSON(w, r, &b, false) {
			return
		}
		rep, msg := clean(b)
		if msg != "" {
			httpx.WriteError(w, http.StatusBadRequest, "invalid", msg)
			return
		}
		if ok, _ := s.lim.Allow(reqinfo.IP(r.Context())); !ok {
			httpx.WriteError(w, http.StatusTooManyRequests, "rate_limited", "That is a lot of reports from this network. Please try again in an hour.")
			return
		}
		if d, ok := account.FromContext(r.Context()); ok {
			rep.IdentityID = d.IdentityID
		}
		if err := s.save(r.Context(), rep); err != nil {
			s.log.Error("feedback", "error", err, "request_id", httpx.RequestIDFrom(r.Context()))
			httpx.WriteError(w, http.StatusInternalServerError, "internal", "The report could not be saved just now. Please try again later.")
			return
		}
		httpx.WriteJSON(w, http.StatusCreated, map[string]bool{"ok": true})
	})
}

// clean checks a report and trims it. msg is a sentence for the student when it is refused.
func clean(b body) (Report, string) {
	page := b.Page
	if i := strings.IndexAny(page, "?#"); i >= 0 {
		page = page[:i] // the query can hold attempt ids; the path is enough
	}
	note := strings.TrimSpace(b.Note)
	switch {
	case !kinds[b.Kind]:
		return Report{}, "Pick what is wrong with the question."
	case !itemID.MatchString(b.ItemID):
		return Report{}, "That question could not be recognised."
	case !strings.HasPrefix(page, "/") || len(page) > 200:
		return Report{}, "That page could not be recognised."
	case !utf8.ValidString(note) || utf8.RuneCountInString(note) > NoteMax:
		return Report{}, fmt.Sprintf("Please keep the note under %d characters.", NoteMax)
	}
	return Report{Page: page, ItemID: b.ItemID, Kind: b.Kind, Note: note}, ""
}
