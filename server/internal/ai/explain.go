package ai

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"slices"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/japp47/CAT-Prep/server/internal/account"
	"github.com/japp47/CAT-Prep/server/internal/httpx"
	"github.com/japp47/CAT-Prep/server/internal/limit"
	"github.com/japp47/CAT-Prep/server/internal/reqinfo"
)

// PromptV is the explanation prompt's version. Raising it makes fresh explanations instead of serving old ones.
const PromptV = 1

const kindExplain = TaskExplain

// taskOf is the models.json task a kind of answer uses: the smallest fix shares the summary models.
func taskOf(kind string) string {
	if kind == kindFix {
		return TaskSummary
	}
	return kind
}

// Service serves the AI endpoints. Router nil means AI is off: every endpoint answers 503 and the site keeps its notes.
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

// Explanation is what the student sees, with Settles as a line reference the site shows in its own words.
type Explanation struct {
	Tempting string `json:"tempting"`
	Settles  [2]int `json:"settles"`
	Next     string `json:"next"`
	Key      string `json:"key"`
	Cached   bool   `json:"cached"`
}

// The model's reply: two short texts and one sentence number from the numbered passage.
var explainSchema = map[string]any{
	"type": "object",
	"properties": map[string]any{
		"tempting": map[string]any{"type": "string"},
		"settles":  map[string]any{"type": "integer"},
		"next":     map[string]any{"type": "string"},
	},
	"required":             []string{"tempting", "settles", "next"},
	"additionalProperties": false,
}

const explainSystem = `You help a student preparing for the CAT, India's MBA entrance exam, understand one wrong answer to a reading comprehension question, after the correct answer has been shown to them.
Write in plain, warm English for an Indian student. No markdown, no lists, no quotation of the passage, no links.
Return JSON with:
- "tempting": one or two sentences, at most 45 words, on why the option they chose looked right, naming its trap in plain words. If they marked a line as proof, say what in that line misled them.
- "settles": the number of the passage sentence that settles the question. It must be one of the numbers listed as allowed.
- "next": one sentence, at most 30 words, on what to check before choosing next time.
Do not say the chosen option is correct. Do not repeat the written notes word for word.`

// numbered is the passage as numbered sentences, with the number of each [paragraph, sentence].
func numbered(s *Set) (string, map[int][2]int, map[[2]int]int) {
	var b strings.Builder
	byNum, byRef := map[int][2]int{}, map[[2]int]int{}
	n := 0
	for p, sents := range s.Paras {
		fmt.Fprintf(&b, "Paragraph %d:\n", p+1)
		for i, x := range sents {
			n++
			byNum[n], byRef[[2]int{p, i}] = [2]int{p, i}, n
			fmt.Fprintf(&b, "[%d] %s\n", n, x)
		}
	}
	return b.String(), byNum, byRef
}

// allowed are the sentence numbers the model may cite: the deciding lines, or every sentence of the proof paragraphs
// for a question without one.
func allowed(s *Set, q *Question, byRef map[[2]int]int) []int {
	var out []int
	for _, l := range q.Lines {
		if n, ok := byRef[l]; ok {
			out = append(out, n)
		}
	}
	if len(out) == 0 {
		for _, p := range q.Proof {
			if p >= 0 && p < len(s.Paras) {
				for i := range s.Paras[p] {
					out = append(out, byRef[[2]int{p, i}])
				}
			}
		}
	}
	slices.Sort(out)
	return out
}

// explainPrompt is the user message: the numbered passage, the question, the options with their notes, the student's
// choice and marked line, and the allowed sentence numbers.
func explainPrompt(s *Set, q *Question, chosen int, line *[2]int) (string, []int, map[int][2]int) {
	text, byNum, byRef := numbered(s)
	ok := allowed(s, q, byRef)
	var b strings.Builder
	fmt.Fprintf(&b, "Passage, sentence by sentence:\n%s\nQuestion: %s\n\nOptions:\n", text, q.Stem)
	for i, o := range q.Options {
		fmt.Fprintf(&b, "%c. %s\n   Note: %s\n", 'A'+i, o.T, o.Why)
		if o.Trap != "" {
			fmt.Fprintf(&b, "   Trap: %s\n", o.Trap)
		}
	}
	fmt.Fprintf(&b, "\nCorrect option: %c.\nThe student chose: %c.\n", 'A'+q.Answer, 'A'+chosen)
	if line != nil {
		fmt.Fprintf(&b, "The student marked sentence [%d] as their proof.\n", byRef[*line])
	} else {
		b.WriteString("The student did not mark a line.\n")
	}
	nums := make([]string, len(ok))
	for i, n := range ok {
		nums[i] = fmt.Sprint(n)
	}
	fmt.Fprintf(&b, "Allowed numbers for \"settles\": %s.\n", strings.Join(nums, ", "))
	return b.String(), ok, byNum
}

// check accepts a reply only if it is the schema, cites an allowed sentence, and keeps to the lengths.
func check(raw string, ok []int, byNum map[int][2]int) (Explanation, error) {
	var r struct {
		Tempting string `json:"tempting"`
		Settles  int    `json:"settles"`
		Next     string `json:"next"`
	}
	if err := json.Unmarshal([]byte(raw), &r); err != nil {
		return Explanation{}, fmt.Errorf("not the schema: %w", err)
	}
	r.Tempting, r.Next = strings.TrimSpace(r.Tempting), strings.TrimSpace(r.Next)
	words := func(s string) int { return len(strings.Fields(s)) }
	switch {
	case !slices.Contains(ok, r.Settles):
		return Explanation{}, fmt.Errorf("cited sentence %d, not one of %v", r.Settles, ok)
	case words(r.Tempting) < 5 || words(r.Tempting) > 60:
		return Explanation{}, fmt.Errorf("tempting is %d words", words(r.Tempting))
	case words(r.Next) < 3 || words(r.Next) > 40:
		return Explanation{}, fmt.Errorf("next is %d words", words(r.Next))
	case strings.Contains(r.Tempting+r.Next, "http"), strings.Contains(r.Tempting+r.Next, "```"), strings.Contains(r.Tempting+r.Next, "**"):
		return Explanation{}, errors.New("links or markdown")
	}
	return Explanation{Tempting: r.Tempting, Settles: byNum[r.Settles], Next: r.Next}, nil
}

// keyOf is the cache key: the mistake by content ids, never who made it.
func keyOf(set, v string, q, chosen int, line *[2]int) []byte {
	l := "-"
	if line != nil {
		l = fmt.Sprintf("%d.%d", line[0], line[1])
	}
	h := sha256.Sum256([]byte(fmt.Sprintf("%s|%d|%s|%s|%d|%d|%s", kindExplain, PromptV, set, v, q, chosen, l)))
	return h[:]
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

// Explain returns the explanation of one mistake: from the cache when anyone made it before, else made through the
// gate and checked.
func (s *Service) Explain(ctx context.Context, identity, ip string, set *Set, q, chosen int, line *[2]int) (Explanation, error) {
	key := keyOf(set.ID, set.V, q, chosen, line)
	cached, err := s.cachedOutput(ctx, key)
	if err != nil {
		return Explanation{}, err
	}
	fresh := cached == nil
	if fresh {
		user, ok, byNum := explainPrompt(set, &set.Questions[q], chosen, line)
		cached, err = s.generate(ctx, identity, ip, kindExplain, key, explainSystem, user, "explanation", explainSchema, func(raw string) ([]byte, error) {
			e, err := check(raw, ok, byNum)
			if err != nil {
				return nil, err
			}
			return json.Marshal(Explanation{Tempting: e.Tempting, Settles: e.Settles, Next: e.Next})
		})
		if err != nil {
			return Explanation{}, err
		}
	}
	var e Explanation
	if err := json.Unmarshal(cached, &e); err != nil {
		return Explanation{}, err
	}
	e.Key, e.Cached = hex.EncodeToString(key), !fresh
	return e, nil
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
		httpx.WriteError(w, http.StatusServiceUnavailable, "ai_off", "Explanations are not switched on. The written note is below each option.")
		return false
	}
	return true
}

// StatusHandler is GET /v1/ai: whether explanations are on, so the site shows the button only when they are.
func (s *Service) StatusHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		d, ok := account.FromContext(r.Context())
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"on": s.Router != nil && s.Content != nil, "signedIn": ok && s.signedIn(r.Context(), d.IdentityID)})
	})
}

// ExplainHandler is POST /v1/ai/explain with {set, v, q, chosen, line}: ids only.
func (s *Service) ExplainHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !s.on(w) {
			return
		}
		d, _ := account.FromContext(r.Context())
		r.Body = http.MaxBytesReader(w, r.Body, 1024)
		var in struct {
			Set    string  `json:"set"`
			V      string  `json:"v"`
			Q      int     `json:"q"`
			Chosen int     `json:"chosen"`
			Line   *[2]int `json:"line"`
		}
		if !httpx.DecodeJSON(w, r, &in, false) {
			return
		}
		bad := func(msg string) { httpx.WriteError(w, http.StatusBadRequest, "bad_request", msg) }
		set, err := s.Content.Set(r.Context(), in.Set)
		if err != nil {
			s.Log.Warn("ai: content", "error", err)
			httpx.WriteError(w, http.StatusServiceUnavailable, "ai_busy", "Explanations are not available just now. The written note is below each option.")
			return
		}
		switch {
		case set == nil:
			httpx.WriteError(w, http.StatusNotFound, "not_found", "That set is not in the library.")
			return
		case in.V != set.V:
			httpx.WriteError(w, http.StatusConflict, "stale", "This set was rewritten after you took it, so an explanation would not match your answers.")
			return
		case in.Q < 0 || in.Q >= len(set.Questions):
			bad("There is no such question.")
			return
		}
		q := set.Questions[in.Q]
		switch {
		case in.Chosen < 0 || in.Chosen >= len(q.Options):
			bad("There is no such option.")
			return
		case in.Chosen == q.Answer:
			bad("That answer is right; there is no mistake to explain.")
			return
		case in.Line != nil && (in.Line[0] < 0 || in.Line[0] >= len(set.Paras) || in.Line[1] < 0 || in.Line[1] >= len(set.Paras[in.Line[0]])):
			bad("That line is not in the passage.")
			return
		}
		e, err := s.Explain(r.Context(), d.IdentityID, reqinfo.IP(r.Context()), set, in.Q, in.Chosen, in.Line)
		if err != nil {
			s.refuse(w, err, "The written note is below each option.")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, e)
	})
}

// FlagsToDrop is how many students must call an explanation wrong before it is dropped and made afresh.
const FlagsToDrop = 3

// FlagHandler is POST /v1/ai/flag with {key}: one flag per student; at FlagsToDrop the explanation is dropped.
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
			httpx.WriteError(w, http.StatusBadRequest, "bad_request", "That explanation could not be found.")
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
