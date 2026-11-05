package notify

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Daily is the site's daily.json (written at build by scripts/daily.ts): the RC of the day for the coming weeks,
// the same for every student. Reading it from the live site keeps reminders in step with what Today shows.
type Daily struct {
	Days map[string]struct {
		RC *struct {
			ID        string `json:"id"`
			Title     string `json:"title"`
			Questions int    `json:"questions"`
			Mins      int    `json:"mins"`
		} `json:"rc"`
	} `json:"days"`
}

// FetchDaily reads site + /daily.json. A failure is not fatal: messages then point at Today's plan.
func FetchDaily(ctx context.Context, client *http.Client, site string) (Daily, error) {
	var d Daily
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, site+"/daily.json", nil)
	if err != nil {
		return d, err
	}
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}
	res, err := client.Do(req)
	if err != nil {
		return d, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return d, fmt.Errorf("daily.json: %s", res.Status)
	}
	err = json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&d)
	return d, err
}

// Task is the RC of the day for a date, or Today's plan when the date is not in the file.
func (d Daily) Task(day string) Task {
	if x, ok := d.Days[day]; ok && x.RC != nil && x.RC.ID != "" {
		return Task{Label: "RC of the day", Title: x.RC.Title, Detail: fmt.Sprintf("%d questions, about %d minutes", x.RC.Questions, x.RC.Mins),
			Path: "/practice/rc/" + x.RC.ID, Mins: x.RC.Mins}
	}
	return TodayTask
}
