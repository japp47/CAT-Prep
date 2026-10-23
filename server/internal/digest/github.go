package digest

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

// Label marks the one issue that collects digests.
const Label = "problem-reports"

// IssueTitle is the title of that issue when it has to be opened.
const IssueTitle = "Problem reports from students"

// GitHub posts digests to one issue in a repository through the REST API.
type GitHub struct {
	API   string // https://api.github.com, or a test server
	Repo  string // owner/name
	Token string
	HTTP  *http.Client
}

// Post adds body to the open digest issue, opening one first if there is none. It returns the issue's address.
func (g GitHub) Post(ctx context.Context, body string) (string, error) {
	if err := g.call(ctx, http.MethodPost, "/labels", map[string]string{"name": Label, "color": "d93f0b", "description": "Daily digest of problem reports"}, nil, http.StatusCreated, http.StatusUnprocessableEntity); err != nil {
		return "", fmt.Errorf("label: %w", err)
	}
	var open []struct {
		Number  int    `json:"number"`
		HTMLURL string `json:"html_url"`
	}
	if err := g.call(ctx, http.MethodGet, "/issues?state=open&per_page=1&labels="+url.QueryEscape(Label), nil, &open, http.StatusOK); err != nil {
		return "", fmt.Errorf("find issue: %w", err)
	}
	if len(open) == 0 {
		var made struct {
			HTMLURL string `json:"html_url"`
		}
		intro := "Problem reports from the \"Report a problem\" link, posted once a day (docs/feature.md F39). Close a report in the database, then close this issue when the list is clear; the next report opens a new one.\n\n" + body
		err := g.call(ctx, http.MethodPost, "/issues", map[string]any{"title": IssueTitle, "body": intro, "labels": []string{Label}}, &made, http.StatusCreated)
		if err != nil {
			return "", fmt.Errorf("open issue: %w", err)
		}
		return made.HTMLURL, nil
	}
	if err := g.call(ctx, http.MethodPost, fmt.Sprintf("/issues/%d/comments", open[0].Number), map[string]string{"body": body}, nil, http.StatusCreated); err != nil {
		return "", fmt.Errorf("comment: %w", err)
	}
	return open[0].HTMLURL, nil
}

// call sends one request to /repos/{Repo}{path}; any status outside ok is an error.
func (g GitHub) call(ctx context.Context, method, path string, in, out any, ok ...int) error {
	var body io.Reader
	if in != nil {
		b, err := json.Marshal(in)
		if err != nil {
			return err
		}
		body = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, g.API+"/repos/"+g.Repo+path, body)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("Authorization", "Bearer "+g.Token)
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	if in != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	res, err := g.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	for _, s := range ok {
		if res.StatusCode == s {
			if out != nil && s < 300 {
				return json.NewDecoder(res.Body).Decode(out)
			}
			return nil
		}
	}
	msg, _ := io.ReadAll(io.LimitReader(res.Body, 300))
	return fmt.Errorf("%s %s: %d %s", method, path, res.StatusCode, bytes.TrimSpace(msg))
}
