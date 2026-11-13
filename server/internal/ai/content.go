// Package ai is 99ile's AI service (F35, D100, docs/design/explain-mistake.md): one OpenAI-compatible model client,
// prompts built from published content and ids only, every output checked by code, explanations cached per mistake,
// and budgets per student and per day. Students never send text to it, so it is not an open model for anyone.
package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

// Set is one RC set as the site publishes it for this service (src/practice/aipack.ts, dist/ai/rc.json).
type Set struct {
	ID        string     `json:"id"`
	V         string     `json:"v"`
	Title     string     `json:"title"`
	Paras     [][]string `json:"paras"` // sentences per paragraph
	Summary   *Summary   `json:"summary,omitempty"`
	Questions []Question `json:"questions"`
}

// Question is one RC question with its notes and deciding lines.
type Question struct {
	Stem    string   `json:"stem"`
	Answer  int      `json:"answer"`
	Proof   []int    `json:"proof"`
	Lines   [][2]int `json:"lines"` // deciding lines as [paragraph, sentence]
	Options []Option `json:"options"`
}

// Option is one answer choice with its written note and, on a wrong option, its trap.
type Option struct {
	T    string `json:"t"`
	Why  string `json:"why"`
	Trap string `json:"trap,omitempty"`
}

// Pack is the whole published file.
type Pack struct {
	V    int   `json:"v"`
	Sets []Set `json:"sets"`
}

// Content serves sets from the live site's /ai/rc.json, fetched again after TTL. A failed fetch keeps the last good
// copy, so a deploy of the site never takes explanations down. Fixed is used instead of fetching (tests).
type Content struct {
	URL   string
	TTL   time.Duration
	Fixed *Pack

	mu      sync.Mutex
	byID    map[string]*Set
	fetched time.Time
}

// Set returns one set by id, or nil when the published content has no such set.
func (c *Content) Set(ctx context.Context, id string) (*Set, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.byID == nil || (c.Fixed == nil && time.Since(c.fetched) > c.TTL) {
		p := c.Fixed
		if p == nil {
			var err error
			if p, err = c.fetch(ctx); err != nil {
				if c.byID == nil {
					return nil, err
				}
				c.fetched = time.Now().Add(-c.TTL + time.Minute) // try again in a minute, keep serving the old copy
				p = nil
			}
		}
		if p != nil {
			c.byID = map[string]*Set{}
			for i := range p.Sets {
				c.byID[p.Sets[i].ID] = &p.Sets[i]
			}
			c.fetched = time.Now()
		}
	}
	return c.byID[id], nil
}

func (c *Content) fetch(ctx context.Context) (*Pack, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.URL, nil)
	if err != nil {
		return nil, err
	}
	res, err := (&http.Client{Timeout: 15 * time.Second}).Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ai content: %s", res.Status)
	}
	var p Pack
	if err := json.NewDecoder(io.LimitReader(res.Body, 8<<20)).Decode(&p); err != nil {
		return nil, fmt.Errorf("ai content: %w", err)
	}
	if p.V != 1 || len(p.Sets) == 0 {
		return nil, fmt.Errorf("ai content: version %d with %d sets", p.V, len(p.Sets))
	}
	return &p, nil
}
