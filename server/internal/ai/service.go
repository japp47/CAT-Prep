package ai

import (
	"context"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/japp47/CAT-Prep/server/internal/account"
	"github.com/japp47/CAT-Prep/server/internal/httpx"
	"github.com/japp47/CAT-Prep/server/internal/limit"
)

// The AI service's shared machinery (D100 to D103): the service, the cache, one generation through the gate
// (guard.go) and the router (router.go), plain refusals, the on switch and flags. The features are in summary.go
// (the second opinion) and fix.go (the smallest fix). "Explain my mistake" was removed on 13 Nov 2026 (D105): its
// answer is the same for every student who picks an option, so it belongs in the content, not in a live model.

// PromptV is the prompts' version. Raising it makes fresh answers instead of serving cached ones.
const PromptV = 1

// taskOf is the models.json task a kind of answer uses: the smallest fix shares the summary models.
func taskOf(kind string) string {
	if kind == kindFix {
		return TaskSummary
	}
	return kind
}

// Service serves the AI endpoints. Router nil means AI is off: every endpoint answers 503 and the site keeps its
// own checks.
type Service struct {
	DB *pgxpool.Pool
	// Router picks the model for each task (router.go, models.json).
	Router                  *Router
	Content                 *Content
	DailyBudget, PerStudent int
	// IPs limits new generations per network address and hour (guard.go); nil turns the limit off (tests).
	IPs *limit.Limiter
	Log *slog.Logger
}

// Errors the handler turns into plain answers.
var (
	errStudentCap = errors.New("student cap")
	errBudget     = errors.New("daily budget")
)

// cachedOutput is a stored reply for key, or nil.
func (s *Service) cachedOutput(ctx context.Context, key []byte) ([]byte, error) {
	var out []byte
	err := s.DB.QueryRow(ctx, `select output from ai.cache where key = $1`, key).Scan(&out)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return out, err
}

// generate makes one reply through the gate: admitted, asked (one retry when the check refuses the reply), stored
// under key, and settled. check turns the raw reply into what is stored, or refuses it.
func (s *Service) generate(ctx context.Context, identity, ip, kind string, key []byte, system, user, name string,
	schema map[string]any, check func(raw string) ([]byte, error)) ([]byte, error) {
	t, err := s.admit(ctx, identity, ip, kind)
	if err != nil {
		return nil, err
	}
	tokens, avoid := 0, ""
	for try := 0; try < 2; try++ {
		rep, err := s.Router.JSON(ctx, taskOf(kind), avoid, system, user, name, schema)
		tokens += rep.Tokens
		if err != nil {
			s.settle(ctx, t, tokens, false)
			return nil, err
		}
		out, err := check(rep.Raw)
		if err == nil {
			if _, err := s.DB.Exec(ctx, `insert into ai.cache (key, kind, model, prompt_v, output, tokens) values ($1, $2, $3, $4, $5::jsonb, $6)
				on conflict (key) do nothing`, key, kind, rep.Model, PromptV, string(out), tokens); err != nil {
				s.settle(ctx, t, tokens, false)
				return nil, err
			}
			s.settle(ctx, t, tokens, true)
			return out, nil
		}
		s.recordCall(rep.Model, "refused", 0)
		// The second try goes to another model when one is free: the same model often repeats the same slip.
		avoid = rep.Model
		s.Log.Warn("ai: reply refused by the check", "kind", kind, "model", rep.Model, "try", try+1, "why", err.Error())
	}
	s.settle(ctx, t, tokens, false)
	return nil, fmt.Errorf("%w: the reply failed the check twice", ErrBusy)
}

// refuse turns a gate or model error into a plain answer; fallback says what the student still has.
func (s *Service) refuse(w http.ResponseWriter, err error, fallback string) {
	switch {
	case errors.Is(err, errNoAccount):
		httpx.WriteError(w, http.StatusForbidden, "ai_signin", "Sign in with Google to use this. "+fallback)
	case errors.Is(err, errStudentCap):
		httpx.WriteError(w, http.StatusTooManyRequests, "ai_cap", fmt.Sprintf("That is %d new AI answers today; more tomorrow. %s", s.PerStudent, fallback))
	case errors.Is(err, errIPLimit):
		httpx.WriteError(w, http.StatusTooManyRequests, "rate_limited", "Too many requests from this network. Try again in an hour. "+fallback)
	case errors.Is(err, errBudget), errors.Is(err, ErrBusy):
		if !errors.Is(err, errBudget) {
			s.Log.Warn("ai", "error", err)
		}
		httpx.WriteError(w, http.StatusServiceUnavailable, "ai_busy", "This is busy today. "+fallback)
	default:
		s.Log.Error("ai", "error", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal", "Something went wrong on our side.")
	}
}

// on says whether AI can answer at all.
func (s *Service) on(w http.ResponseWriter) bool {
	if s.Router == nil || s.Content == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "ai_off", "AI is not switched on. Your own checks still count.")
		return false
	}
	return true
}

// StatusHandler is GET /v1/ai: whether AI is on and this student may use it, so the site shows its buttons only then.
func (s *Service) StatusHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		d, ok := account.FromContext(r.Context())
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"on": s.Router != nil && s.Content != nil, "signedIn": ok && s.signedIn(r.Context(), d.IdentityID)})
	})
}

// FlagsToDrop is how many students must call an answer wrong before it is dropped and made afresh.
const FlagsToDrop = 3

// FlagHandler is POST /v1/ai/flag with {key}: one flag per student; at FlagsToDrop the answer is dropped.
func (s *Service) FlagHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !s.on(w) {
			return
		}
		d, _ := account.FromContext(r.Context())
		var in struct {
			Key string `json:"key"`
		}
		if !httpx.DecodeJSON(w, r, &in, false) {
			return
		}
		key, err := hex.DecodeString(in.Key)
		if err != nil || len(key) != 32 {
			httpx.WriteError(w, http.StatusBadRequest, "bad_request", "That answer could not be found.")
			return
		}
		err = pgx.BeginFunc(r.Context(), s.DB, func(tx pgx.Tx) error {
			tag, err := tx.Exec(r.Context(), `insert into ai.flags (key, identity_id) select $1, $2 where exists (select 1 from ai.cache where key = $1)
				on conflict do nothing`, key, d.IdentityID)
			if err != nil || tag.RowsAffected() == 0 {
				return err
			}
			var n int
			if err := tx.QueryRow(r.Context(), `update ai.cache set flags = flags + 1 where key = $1 returning flags`, key).Scan(&n); err != nil {
				return err
			}
			if n >= FlagsToDrop {
				_, err = tx.Exec(r.Context(), `delete from ai.cache where key = $1`, key)
			}
			return err
		})
		if err != nil {
			s.Log.Error("ai: flag", "error", err)
			httpx.WriteError(w, http.StatusInternalServerError, "internal", "Something went wrong on our side.")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
}
