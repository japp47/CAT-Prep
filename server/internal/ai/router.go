package ai

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"slices"
	"sort"
	"strings"
	"sync"
	"time"
)

// Models and keys (D102, docs/design/explain-mistake.md, "Models and keys"). Which models exist, with what settings,
// and the order each task tries them in live in models.json, not in code. A provider's quota is per account and per
// model (Groq: "rate limits apply at the organization level"), so the router falls back across models, not keys:
// a model over its limit rests for as long as the provider asks and the next one answers. Extra keys are only for a
// key that is revoked or wrong; one that is refused rests for an hour and the next key is used.

//go:embed models.json
var builtinCatalog []byte

// Tasks the site asks for.
const (
	TaskExplain = "explain"
	TaskSummary = "summary"
)

var tasks = []string{TaskExplain, TaskSummary}

// Catalog is the shape of models.json.
type Catalog struct {
	Providers map[string]struct {
		BaseURL string `json:"baseURL"`
		// KeysEnv names the environment variable holding this provider's keys, comma separated; "" when none is needed.
		KeysEnv string `json:"keysEnv"`
	} `json:"providers"`
	Models map[string]struct {
		Provider string         `json:"provider"`
		ID       string         `json:"id"`
		Params   map[string]any `json:"params"`
	} `json:"models"`
	Tasks map[string][]string `json:"tasks"`
}

// Fields the router sets itself; a model's params may not replace them.
var reserved = []string{"model", "messages", "response_format", "stream", "tools", "n"}

// How long a model or key rests after each kind of failure. A limit rests as long as the provider asks, within bounds.
const (
	restBusy   = 30 * time.Second
	restBad    = 10 * time.Minute
	restGone   = time.Hour
	restKey    = time.Hour
	restMinCap = 5 * time.Second
	restMaxCap = time.Hour
)

type provider struct {
	name, baseURL, keysEnv string
	keys                   []*apiKey
}

type apiKey struct {
	secret    string
	restUntil time.Time
}

type model struct {
	name, id  string
	p         *provider
	params    map[string]any
	restUntil time.Time
	lastErr   string
	lastErrAt time.Time
	lastOK    time.Time
}

// Router sends a task to the first model in its order that can answer.
type Router struct {
	HTTP *http.Client
	Log  *slog.Logger
	// Record is told about every call (model name, outcome, tokens), for the day's figures in ai.model_usage.
	Record func(model string, o outcome, tokens int)
	now    func() time.Time

	mu        sync.Mutex
	order     map[string][]*model
	models    []*model
	providers []*provider
}

// LoadRouter reads a catalog (path "" is the built-in models.json), applies any task orders given (AI_EXPLAIN,
// AI_SUMMARY), and reads each provider's keys with env. It fails when a task has no model it can use, so a bad
// setting stops the server at start rather than at a student's first question.
func LoadRouter(path string, orders map[string][]string, env func(string) string, log *slog.Logger) (*Router, error) {
	raw := builtinCatalog
	if path != "" {
		b, err := os.ReadFile(path)
		if err != nil {
			return nil, fmt.Errorf("AI_CATALOG: %w", err)
		}
		raw = b
	}
	var c Catalog
	if err := json.Unmarshal(raw, &c); err != nil {
		return nil, fmt.Errorf("the AI catalog is not valid JSON: %w", err)
	}
	r := &Router{HTTP: &http.Client{Timeout: 20 * time.Second}, Log: log, now: time.Now, order: map[string][]*model{}}
	byProvider := map[string]*provider{}
	for _, name := range sortedKeys(c.Providers) {
		p := c.Providers[name]
		if p.BaseURL == "" {
			return nil, fmt.Errorf("AI provider %q has no baseURL", name)
		}
		pv := &provider{name: name, baseURL: p.BaseURL, keysEnv: p.KeysEnv}
		if p.KeysEnv != "" {
			for _, k := range strings.Split(env(p.KeysEnv), ",") {
				if k = strings.TrimSpace(k); k != "" {
					pv.keys = append(pv.keys, &apiKey{secret: k})
				}
			}
		}
		byProvider[name], r.providers = pv, append(r.providers, pv)
	}
	byName := map[string]*model{}
	for _, name := range sortedKeys(c.Models) {
		m := c.Models[name]
		p := byProvider[m.Provider]
		if p == nil || m.ID == "" {
			return nil, fmt.Errorf("AI model %q needs an id and a provider from the list (got %q)", name, m.Provider)
		}
		for _, k := range reserved {
			if _, ok := m.Params[k]; ok {
				return nil, fmt.Errorf("AI model %q: params may not set %q", name, k)
			}
		}
		md := &model{name: name, id: m.ID, p: p, params: m.Params}
		byName[name], r.models = md, append(r.models, md)
	}
	for _, task := range tasks {
		names := c.Tasks[task]
		if o := orders[task]; len(o) > 0 {
			names = o
		}
		seen := map[string]bool{}
		usable := 0
		for _, n := range names {
			m := byName[n]
			if m == nil {
				return nil, fmt.Errorf("AI task %s names %q, which is not in the catalog (have %s)", task, n, strings.Join(sortedKeys(c.Models), ", "))
			}
			if seen[n] {
				return nil, fmt.Errorf("AI task %s names %q twice", task, n)
			}
			seen[n] = true
			if m.p.keysEnv != "" && len(m.p.keys) == 0 {
				log.Warn("ai: model has no key and is left out", "task", task, "model", n, "set", m.p.keysEnv)
				continue
			}
			r.order[task] = append(r.order[task], m)
			usable++
		}
		if usable == 0 {
			return nil, fmt.Errorf("AI task %s has no model it can use: name one in models.json or AI_%s, and set its provider's keys", task, strings.ToUpper(task))
		}
	}
	return r, nil
}

func sortedKeys[V any](m map[string]V) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

// Reply is a model's answer and which model gave it.
type Reply struct {
	Raw    string
	Tokens int
	Model  string // the catalog name, e.g. gpt-oss-20b
}

// JSON asks the task's models in order for one strict-JSON reply. avoid moves a model to the back (the one whose last
// reply failed the check), so a second try goes to another model when one is free.
func (r *Router) JSON(ctx context.Context, task, avoid, system, user, name string, schema map[string]any) (Reply, error) {
	r.mu.Lock()
	order := slices.Clone(r.order[task])
	r.mu.Unlock()
	if i := slices.IndexFunc(order, func(m *model) bool { return m.name == avoid }); i >= 0 {
		order = append(append(order[:i:i], order[i+1:]...), order[i])
	}
	var tried []string
	for _, m := range order {
		if !r.ready(m) {
			continue
		}
		keys := r.liveKeys(m.p)
		if m.p.keysEnv != "" && len(keys) == 0 {
			continue
		}
		if m.p.keysEnv == "" {
			keys = []*apiKey{{}}
		}
		for _, k := range keys {
			if err := ctx.Err(); err != nil {
				return Reply{}, fmt.Errorf("%w: %v", ErrBusy, err)
			}
			res := call(ctx, r.HTTP, m.p.baseURL, k.secret, m.id, m.params, system, user, name, schema)
			if r.Record != nil {
				r.Record(m.name, res.outcome, res.tokens)
			}
			if res.outcome == callOK {
				r.mu.Lock()
				m.lastOK = r.now()
				r.mu.Unlock()
				return Reply{Raw: res.raw, Tokens: res.tokens, Model: m.name}, nil
			}
			tried = append(tried, m.name+": "+res.detail)
			if res.outcome == callKey {
				r.restKey(m.p, k, res.detail)
				continue // the next key for the same model
			}
			r.rest(m, res)
			break // the next model
		}
	}
	if len(tried) == 0 {
		return Reply{}, fmt.Errorf("%w: every model for %s is resting", ErrBusy, task)
	}
	return Reply{}, fmt.Errorf("%w: %s", ErrBusy, strings.Join(tried, "; "))
}

func (r *Router) ready(m *model) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	return !r.now().Before(m.restUntil)
}

func (r *Router) liveKeys(p *provider) []*apiKey {
	r.mu.Lock()
	defer r.mu.Unlock()
	var out []*apiKey
	for _, k := range p.keys {
		if !r.now().Before(k.restUntil) {
			out = append(out, k)
		}
	}
	return out
}

func (r *Router) restKey(p *provider, k *apiKey, detail string) {
	r.mu.Lock()
	k.restUntil = r.now().Add(restKey)
	n := slices.Index(p.keys, k) + 1
	r.mu.Unlock()
	// Keys are named by position, never by their text.
	r.Log.Error("ai: a key was refused; using the next one", "provider", p.name, "key", fmt.Sprintf("%d of %d", n, len(p.keys)), "env", p.keysEnv, "detail", detail)
}

func (r *Router) rest(m *model, res result) {
	d := restBusy
	switch res.outcome {
	case callLimited:
		d = min(max(res.retryAfter, restMinCap), restMaxCap)
	case callGone:
		d = restGone
	case callBad:
		d = restBad
	}
	r.mu.Lock()
	m.restUntil, m.lastErr, m.lastErrAt = r.now().Add(d), res.detail, r.now()
	r.mu.Unlock()
	lvl := slog.LevelWarn
	if res.outcome == callGone || res.outcome == callBad {
		lvl = slog.LevelError // a setting to fix, not a busy minute
	}
	r.Log.Log(context.Background(), lvl, "ai: model resting; the next one answers", "model", m.name, "for", d.Round(time.Second).String(), "detail", res.detail)
}

// Status is the router as the admin panel shows it: no key text, only how many work.
type Status struct {
	Tasks     map[string][]string `json:"tasks"`
	Models    []ModelStatus       `json:"models"`
	Providers []ProviderStatus    `json:"providers"`
}

type ModelStatus struct {
	Name      string     `json:"name"`
	ID        string     `json:"id"`
	Provider  string     `json:"provider"`
	State     string     `json:"state"` // ready, resting, no key
	Until     *time.Time `json:"until,omitempty"`
	LastError string     `json:"lastError,omitempty"`
	LastErrAt *time.Time `json:"lastErrorAt,omitempty"`
	LastOK    *time.Time `json:"lastOk,omitempty"`
}

type ProviderStatus struct {
	Name    string `json:"name"`
	KeysEnv string `json:"keysEnv,omitempty"`
	Keys    int    `json:"keys"`
	Working int    `json:"working"` // keys not resting after a refusal
}

func (r *Router) Status() Status {
	r.mu.Lock()
	defer r.mu.Unlock()
	now := r.now()
	st := Status{Tasks: map[string][]string{}}
	for task, ms := range r.order {
		for _, m := range ms {
			st.Tasks[task] = append(st.Tasks[task], m.name)
		}
	}
	at := func(t time.Time) *time.Time {
		if t.IsZero() {
			return nil
		}
		return &t
	}
	for _, m := range r.models {
		s := ModelStatus{Name: m.name, ID: m.id, Provider: m.p.name, State: "ready", LastError: m.lastErr, LastErrAt: at(m.lastErrAt), LastOK: at(m.lastOK)}
		if m.p.keysEnv != "" && len(m.p.keys) == 0 {
			s.State = "no key"
		} else if now.Before(m.restUntil) {
			s.State, s.Until = "resting", at(m.restUntil)
		}
		st.Models = append(st.Models, s)
	}
	for _, p := range r.providers {
		ps := ProviderStatus{Name: p.name, KeysEnv: p.keysEnv, Keys: len(p.keys)}
		for _, k := range p.keys {
			if !now.Before(k.restUntil) {
				ps.Working++
			}
		}
		st.Providers = append(st.Providers, ps)
	}
	return st
}
