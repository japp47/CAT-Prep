package notify

import (
	"bytes"
	"encoding/json"
	"fmt"
	htmpl "html/template"
	"net/url"
	"slices"
	"strconv"
	ttmpl "text/template"
)

// Task is the practice a message points at: the RC of the day, or Today's plan when the day's set is not known.
type Task struct {
	Label  string `json:"label"`
	Title  string `json:"title"`
	Detail string `json:"detail"`
	Path   string `json:"path"` // on the site, such as /practice/rc/rc-ethics-nudging
	Mins   int    `json:"mins"`
}

// Week is the Sunday review's figures (R2).
type Week struct {
	Days      int      `json:"days"`
	Questions int      `json:"questions"`
	Tiles     []Tile   `json:"tiles"`
	Lines     []string `json:"lines"`
}

// Tile is one figure of the week.
type Tile struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

// Vars is everything a message's wording may use; it is stored with the message (notify.messages.vars).
type Vars struct {
	Name   string `json:"name,omitempty"`
	Streak int    `json:"streak,omitempty"`
	Missed int    `json:"missed,omitempty"`
	Task   *Task  `json:"task,omitempty"`
	Week   *Week  `json:"week,omitempty"`
}

// TodayTask is the task when the day's set is unknown: the plan on Today.
var TodayTask = Task{Label: "plan for today", Title: "Today's plan", Detail: "Your next step is waiting on Today", Path: "/today", Mins: 10}

// Rendered is a message ready for a channel.
type Rendered struct {
	Subject, HTML, Text string // email
	PushTitle, PushBody string // push
	URL                 string // where the button and a tapped push go
	UnsubscribeURL      string // the one-click address for the List-Unsubscribe header
}

// Links are the per-message parts of every address in a message.
type Links struct {
	Site      string // https://99ile.pages.dev
	MessageID int64
	Token     string // signed unsubscribe token for this student and kind
}

type variant struct {
	ID      string   `json:"id"`
	Subject string   `json:"subject"`
	Preview string   `json:"preview"`
	Heading string   `json:"heading"`
	Body    []string `json:"body"`
	Button  string   `json:"button"`
	To      string   `json:"to"` // task (default), today or review
	Card    *bool    `json:"card"`
	Also    *struct {
		Text string `json:"text"`
		Link string `json:"link"`
	} `json:"also"`
	Push struct {
		Title string `json:"title"`
		Body  string `json:"body"`
	} `json:"push"`
}

type wording struct {
	Why   map[string]string    `json:"why"`
	Kinds map[string][]variant `json:"kinds"`
	Week  weekWording          `json:"week"`
}

// Renderer holds the parsed layout and wording.
type Renderer struct {
	w    wording
	html *htmpl.Template
	text *ttmpl.Template
}

// NewRenderer parses templates/layout.html, layout.txt and messages.json. A wording that does not parse stops it.
func NewRenderer() (*Renderer, error) {
	r := &Renderer{}
	raw, err := files.ReadFile("templates/messages.json")
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(raw, &r.w); err != nil {
		return nil, fmt.Errorf("messages.json: %w", err)
	}
	if r.html, err = htmpl.ParseFS(files, "templates/layout.html"); err != nil {
		return nil, err
	}
	if r.text, err = ttmpl.ParseFS(files, "templates/layout.txt"); err != nil {
		return nil, err
	}
	for kind, vs := range r.w.Kinds {
		if len(vs) == 0 {
			return nil, fmt.Errorf("messages.json: %s has no variants", kind)
		}
		for _, v := range vs {
			for _, s := range append([]string{v.Subject, v.Preview, v.Heading, v.Button, v.Push.Title, v.Push.Body}, v.Body...) {
				if _, err := ttmpl.New("").Parse(s); err != nil {
					return nil, fmt.Errorf("messages.json: %s: %w", v.ID, err)
				}
			}
		}
	}
	for _, part := range []map[string]string{r.w.Week.Tiles, r.w.Week.Lines} {
		for key, src := range part {
			if _, err := ttmpl.New("").Parse(src); err != nil {
				return nil, fmt.Errorf("messages.json: week %s: %w", key, err)
			}
		}
	}
	return r, nil
}

// Kinds lists the kinds with wording.
func (r *Renderer) Kinds() []string {
	out := make([]string, 0, len(r.w.Kinds))
	for k := range r.w.Kinds {
		out = append(out, k)
	}
	slices.Sort(out)
	return out
}

// Variants lists a kind's wording ids in file order.
func (r *Renderer) Variants(kind string) []string {
	var out []string
	for _, v := range r.w.Kinds[kind] {
		out = append(out, v.ID)
	}
	return out
}

// NextVariant is the wording after last for this kind, so a student never gets the same one twice in a row.
func (r *Renderer) NextVariant(kind, last string) string {
	ids := r.Variants(kind)
	if len(ids) == 0 {
		return ""
	}
	for i, id := range ids {
		if id == last {
			return ids[(i+1)%len(ids)]
		}
	}
	return ids[0]
}

// Render builds one message. Every placeholder must be filled: a missing one is an error, never "<no value>".
func (r *Renderer) Render(kind, variantID string, vars Vars, l Links) (Rendered, error) {
	var v *variant
	for i := range r.w.Kinds[kind] {
		if r.w.Kinds[kind][i].ID == variantID {
			v = &r.w.Kinds[kind][i]
		}
	}
	if v == nil {
		return Rendered{}, fmt.Errorf("no wording %q for %s", variantID, kind)
	}
	var err error
	fill := func(s string) string {
		if err != nil {
			return ""
		}
		t := ttmpl.Must(ttmpl.New("").Option("missingkey=error").Parse(s))
		var b bytes.Buffer
		if e := t.Execute(&b, vars); e != nil {
			err = fmt.Errorf("%s: %w", v.ID, e)
		}
		return b.String()
	}

	from := "reminder-" + kind
	link := func(path, fragment string) string {
		u := l.Site + path + "?from=" + url.QueryEscape(from) + "&m=" + strconv.FormatInt(l.MessageID, 10)
		if fragment != "" {
			u += "#" + fragment
		}
		return u
	}
	button := link("/today", "")
	switch {
	case v.To == "review":
		button = link("/review", "")
	case v.To == "today":
		button = link("/today", "")
	case v.To == "" || v.To == "task":
		if vars.Task != nil && vars.Task.Path != "" {
			button = link(vars.Task.Path, "")
		}
	}
	why := r.w.Why["email"]
	if kind == "weekly" {
		why = r.w.Why["weekly"]
	}
	page := struct {
		Subject, Preview, Heading, Button, ButtonURL, Why, ManageURL, UnsubscribeURL, SiteURL, From string
		Body                                                                                        []string
		Task                                                                                        *Task
		Week                                                                                        *Week
		Also                                                                                        *struct{ Text, Link, URL string }
	}{
		Subject: fill(v.Subject), Preview: fill(v.Preview), Heading: fill(v.Heading), Button: fill(v.Button), ButtonURL: button,
		Why: why, ManageURL: link("/settings", "reminders"), UnsubscribeURL: l.Site + "/unsubscribe?t=" + url.QueryEscape(l.Token),
		SiteURL: l.Site, From: from, Week: vars.Week,
	}
	for _, b := range v.Body {
		page.Body = append(page.Body, fill(b))
	}
	if vars.Task != nil && (v.Card == nil || *v.Card) {
		page.Task = vars.Task
	}
	if v.Also != nil {
		page.Also = &struct{ Text, Link, URL string }{v.Also.Text, v.Also.Link, link("/today", "")}
	}
	out := Rendered{Subject: page.Subject, PushTitle: fill(v.Push.Title), PushBody: fill(v.Push.Body), URL: button,
		UnsubscribeURL: l.Site + "/api/v1/unsubscribe?t=" + url.QueryEscape(l.Token)}
	if err != nil {
		return Rendered{}, err
	}
	var hb, tb bytes.Buffer
	if err := r.html.Execute(&hb, page); err != nil {
		return Rendered{}, err
	}
	if err := r.text.Execute(&tb, page); err != nil {
		return Rendered{}, err
	}
	out.HTML, out.Text = hb.String(), tb.String()
	return out, nil
}
