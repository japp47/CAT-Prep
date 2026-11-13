package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// ErrBusy means no model could answer just now (limits, outages, or replies that failed the check): the student sees
// the written note and may try later.
var ErrBusy = errors.New("the model is busy")

// outcome is how one call to one model with one key went; the router acts on it (router.go).
type outcome int

const (
	callOK      outcome = iota
	callLimited         // 429: this model's quota for the account; wait retryAfter, try the next model
	callKey             // 401 or 403: this key is revoked or wrong; try the next key
	callGone            // 404: no such model here (retired or misspelt)
	callBusy            // 5xx, a timeout or a network error: try the next model, come back soon
	callBad             // another 4xx: the request itself was refused
)

type result struct {
	raw        string
	tokens     int
	outcome    outcome
	retryAfter time.Duration
	detail     string // for the log and the admin panel; never holds a key
}

// call makes one OpenAI-compatible /chat/completions request (Groq, Ollama and others speak the same API) for strict
// JSON output: body is the model's settings from models.json, to which this adds the model, messages and schema.
func call(ctx context.Context, hc *http.Client, baseURL, key, model string, params map[string]any, system, user, name string, schema map[string]any) result {
	body := map[string]any{"temperature": 0.2, "max_completion_tokens": 700}
	for k, v := range params {
		body[k] = v
	}
	body["model"] = model
	body["messages"] = []map[string]string{{"role": "system", "content": system}, {"role": "user", "content": user}}
	body["response_format"] = map[string]any{"type": "json_schema", "json_schema": map[string]any{"name": name, "strict": true, "schema": schema}}
	raw, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(baseURL, "/")+"/chat/completions", bytes.NewReader(raw))
	if err != nil {
		return result{outcome: callBad, detail: err.Error()}
	}
	req.Header.Set("Content-Type", "application/json")
	if key != "" {
		req.Header.Set("Authorization", "Bearer "+key)
	}
	res, err := hc.Do(req)
	if err != nil {
		msg := err.Error()
		if key != "" {
			msg = strings.ReplaceAll(msg, key, "…")
		}
		return result{outcome: callBusy, detail: "no answer: " + msg}
	}
	defer res.Body.Close()
	reply, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	switch code := res.StatusCode; {
	case code == http.StatusTooManyRequests:
		return result{outcome: callLimited, retryAfter: retryAfter(res.Header.Get("Retry-After")), detail: "429 over this model's limit"}
	case code == http.StatusUnauthorized || code == http.StatusForbidden:
		return result{outcome: callKey, detail: fmt.Sprintf("%d key refused", code)} // the body is not kept: it may echo the key
	case code == http.StatusNotFound:
		return result{outcome: callGone, detail: fmt.Sprintf("404 %.160s", reply)}
	case code >= 500:
		return result{outcome: callBusy, detail: fmt.Sprintf("%d from the provider", code)}
	case code != http.StatusOK:
		return result{outcome: callBad, detail: fmt.Sprintf("%d %.200s", code, reply)}
	}
	var out struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Usage struct {
			Total int `json:"total_tokens"`
		} `json:"usage"`
	}
	if err := json.Unmarshal(reply, &out); err != nil || len(out.Choices) == 0 {
		return result{outcome: callBusy, detail: fmt.Sprintf("unreadable reply: %.120s", reply)}
	}
	return result{raw: out.Choices[0].Message.Content, tokens: out.Usage.Total, outcome: callOK}
}

// retryAfter reads the provider's wait in seconds; "" or nonsense means a minute.
func retryAfter(v string) time.Duration {
	if n, err := strconv.ParseFloat(strings.TrimSpace(v), 64); err == nil && n > 0 {
		return time.Duration(n * float64(time.Second))
	}
	return time.Minute
}
