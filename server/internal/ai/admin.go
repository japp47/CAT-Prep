package ai

import (
	"context"
	"net/http"
	"time"

	"github.com/japp47/CAT-Prep/server/internal/httpx"
)

// The owner's view of AI (D102): which model each task tries, which are resting and why, how many keys work, and
// the last seven days per model. Counts only: no prompt, reply or student is shown.

var outcomeName = map[outcome]string{callOK: "answered", callLimited: "limited", callKey: "key", callGone: "failed", callBusy: "failed", callBad: "failed"}

// RecordCall is the router's hook: one row a day per model, with what happened to its calls.
func (s *Service) RecordCall(model string, o outcome, tokens int) {
	s.recordCall(model, outcomeName[o], tokens)
}

func (s *Service) recordCall(model, what string, tokens int) {
	col := map[string]string{"answered": "answered", "refused": "refused", "limited": "limited", "key": "failed", "failed": "failed"}[what]
	if col == "" || s.DB == nil {
		return
	}
	// Its own short deadline: the figure is worth keeping even when the student's request has gone.
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if _, err := s.DB.Exec(ctx, `insert into ai.model_usage (day, model, `+col+`, tokens) values (current_date, $1, 1, $2)
		on conflict (day, model) do update set `+col+` = ai.model_usage.`+col+` + 1, tokens = ai.model_usage.tokens + excluded.tokens`, model, tokens); err != nil {
		s.Log.Warn("ai: model usage", "error", err)
	}
}

// AdminView is GET /v1/admin/ai.
type AdminView struct {
	On         bool       `json:"on"`
	Budget     int        `json:"budget"`
	PerStudent int        `json:"perStudent"`
	UsedToday  int        `json:"usedToday"`
	Router     *Status    `json:"router,omitempty"`
	Days       []ModelDay `json:"days"`
}

type ModelDay struct {
	Day      string `json:"day"`
	Model    string `json:"model"`
	Answered int    `json:"answered"`
	Refused  int    `json:"refused"`
	Limited  int    `json:"limited"`
	Failed   int    `json:"failed"`
	Tokens   int    `json:"tokens"`
}

// AdminHandler serves the view; the caller wraps it in the staff check.
func (s *Service) AdminHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		v := AdminView{On: s.Router != nil && s.Content != nil, Budget: s.DailyBudget, PerStudent: s.PerStudent, Days: []ModelDay{}}
		if s.Router != nil {
			st := s.Router.Status()
			v.Router = &st
		}
		_ = s.DB.QueryRow(r.Context(), `select coalesce((select tokens from ai.usage where day = current_date and kind = $1), 0)`, budgetKind).Scan(&v.UsedToday)
		rows, err := s.DB.Query(r.Context(), `select day::text, model, answered, refused, limited, failed, tokens from ai.model_usage
			where day > current_date - 7 order by day desc, model`)
		if err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "internal", "Could not read AI figures.")
			return
		}
		defer rows.Close()
		for rows.Next() {
			var d ModelDay
			if err := rows.Scan(&d.Day, &d.Model, &d.Answered, &d.Refused, &d.Limited, &d.Failed, &d.Tokens); err != nil {
				httpx.WriteError(w, http.StatusInternalServerError, "internal", "Could not read AI figures.")
				return
			}
			v.Days = append(v.Days, d)
		}
		httpx.WriteJSON(w, http.StatusOK, v)
	})
}
