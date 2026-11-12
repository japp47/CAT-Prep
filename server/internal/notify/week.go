package notify

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	ttmpl "text/template"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/japp47/CAT-Prep/server/internal/account"
	"github.com/japp47/CAT-Prep/server/internal/httpx"
)

// The weekly review email (R2, D97, docs/design/notifications.md §15.1). The server keeps synced records without
// reading them; the week's figures come instead from the student's own browser, which computes them for /review
// (practice/week.ts, weekFacts) and sends this summary while the weekly review is switched on. It holds counts,
// percentages and names from the site's fixed lists only, and every field is checked here.

// WeekMail is one week's figures, as the browser sends them (src/lib/weekmail.ts).
type WeekMail struct {
	Monday    string `json:"monday"`
	Studied   int    `json:"studied"`   // days with study this week, so far
	DaysSoFar int    `json:"daysSoFar"` // days of the week that have passed, today included
	Questions int    `json:"questions"` // VARC questions answered, as /review counts them
	Correct   int    `json:"correct"`
	Acc       *int   `json:"acc"`     // percent right, only with enough questions (as /review shows it)
	Minutes   int    `json:"minutes"` // study minutes done
	Planned   int    `json:"planned"` // minutes the plan asked for
	Light     bool   `json:"light"`   // /review's "lighter week than usual"
	Improved  *Move  `json:"improved"`
	Slipped   *Move  `json:"slipped"`
	Trap      *Trap  `json:"trap"`
	Redo      Redo   `json:"redo"`
	Focus     *Focus `json:"focus"`
}

// Move is a question type whose accuracy moved between last week and this one.
type Move struct {
	Name   string `json:"name"`
	Before int    `json:"before"`
	After  int    `json:"after"`
}

// Trap is the wrong-option trap that cost most this week.
type Trap struct {
	Name string `json:"name"`
	N    int    `json:"n"`
}

// Redo is the redo queue's week.
type Redo struct {
	Cleared int `json:"cleared"`
	Due     int `json:"due"`
}

// Focus is last week's chosen focus and what happened to it this week.
type Focus struct {
	Name string `json:"name"`
	N    int    `json:"n"`
	Acc  *int   `json:"acc"`
}

// A name is a question type, a skill or a trap from the site's own lists: letters, digits, spaces and a little
// punctuation, never a link or anything a student typed.
var weekName = regexp.MustCompile(`^[\p{L}\p{N} ,'()&/.-]{1,40}$`)

// Check rejects a summary that is not a week's figures: a date that is not a Monday near today, numbers out of
// range, or a name that is not a name.
func (w WeekMail) Check(today time.Time) error {
	m, err := time.Parse(time.DateOnly, w.Monday)
	if err != nil || m.Weekday() != time.Monday {
		return errors.New("monday is not a Monday")
	}
	if d := today.Sub(m).Hours() / 24; d < -1 || d > 13 {
		return errors.New("that week is not this week or the last")
	}
	pct := func(p *int) bool { return p == nil || (*p >= 0 && *p <= 100) }
	switch {
	case w.DaysSoFar < 1 || w.DaysSoFar > 7 || w.Studied < 0 || w.Studied > w.DaysSoFar:
		return errors.New("days are out of range")
	case w.Questions < 0 || w.Questions > 5000 || w.Correct < 0 || w.Correct > w.Questions || !pct(w.Acc):
		return errors.New("questions are out of range")
	case w.Minutes < 0 || w.Minutes > 7*24*60 || w.Planned < 0 || w.Planned > 7*24*60:
		return errors.New("minutes are out of range")
	case w.Redo.Cleared < 0 || w.Redo.Cleared > 5000 || w.Redo.Due < 0 || w.Redo.Due > 5000:
		return errors.New("redo counts are out of range")
	}
	for _, mv := range []*Move{w.Improved, w.Slipped} {
		if mv != nil && (!weekName.MatchString(mv.Name) || !pct(&mv.Before) || !pct(&mv.After)) {
			return errors.New("a move is not a type and two percentages")
		}
	}
	if w.Trap != nil && (!weekName.MatchString(w.Trap.Name) || w.Trap.N < 1 || w.Trap.N > 5000) {
		return errors.New("the trap is not a name and a count")
	}
	if w.Focus != nil && (!weekName.MatchString(w.Focus.Name) || w.Focus.N < 0 || w.Focus.N > 5000 || !pct(w.Focus.Acc)) {
		return errors.New("the focus is not a name and a count")
	}
	return nil
}

// WeekHandler: PUT /v1/notify/week, the browser's summary of this week. It is kept only while the weekly review is
// on; with it off the call is answered and nothing is stored (the browser only sends while it is on, so this is a
// guard, not a path).
func (a *API) WeekHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !a.ready(w) {
			return
		}
		d, _ := account.FromContext(r.Context())
		r.Body = http.MaxBytesReader(w, r.Body, 2048)
		var in WeekMail
		if !httpx.DecodeJSON(w, r, &in, false) {
			return
		}
		var tz string
		var weekly bool
		err := a.DB.QueryRow(r.Context(), `select tz, weekly from notify.prefs where identity_id = $1`, d.IdentityID).Scan(&tz, &weekly)
		if errors.Is(err, pgx.ErrNoRows) || (err == nil && !weekly) {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if err != nil {
			a.fail(w, r, err)
			return
		}
		loc, err := time.LoadLocation(tz)
		if err != nil {
			loc = time.UTC
		}
		now := time.Now().In(loc)
		today, _ := time.Parse(time.DateOnly, now.Format(time.DateOnly))
		if err := in.Check(today); err != nil {
			httpx.WriteError(w, http.StatusBadRequest, "bad_request", "That week's figures could not be read: "+err.Error()+".")
			return
		}
		data, _ := json.Marshal(in)
		if _, err := a.DB.Exec(r.Context(), `
			insert into notify.weeks (identity_id, monday, data) values ($1, $2, $3::jsonb)
			on conflict (identity_id, monday) do update set data = excluded.data, updated_at = now()`,
			d.IdentityID, in.Monday, string(data)); err != nil {
			a.fail(w, r, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
}

// mondayOf is the Monday of the week a local date falls in (weeks run Monday to Sunday, as on /review).
func mondayOf(local time.Time) string {
	back := (int(local.Weekday()) + 6) % 7
	return local.AddDate(0, 0, -back).Format(time.DateOnly)
}

// ForgetOld removes practice days and weekly summaries older than eight weeks, and handled bounces older than 60
// days; the daily cleanup runs it.
func (s Store) ForgetOld(ctx context.Context) (int64, error) {
	var n int64
	for _, q := range []string{
		`delete from notify.days where day < current_date - 56`,
		`delete from notify.weeks where monday < current_date - 56`,
		`delete from notify.bounces where seen_at < now() - interval '60 days'`,
	} {
		tag, err := s.DB.Exec(ctx, q)
		if err != nil {
			return n, err
		}
		n += tag.RowsAffected()
	}
	return n, nil
}

// weekWording is messages.json's "week": the tile labels and line templates of the weekly email.
type weekWording struct {
	About string            `json:"_about"`
	Tiles map[string]string `json:"tiles"`
	Lines map[string]string `json:"lines"`
}

// The weekly email's wordings, picked by what the week was (not rotated: each week's numbers differ anyway).
const (
	WeeklyGood  = "weekly-good"
	WeeklyLight = "weekly-light"
	WeeklyQuiet = "weekly-quiet"
	WeeklyDays  = "weekly-days" // no summary from the browser this week: the days the server counted
)

// WeeklyVariant picks the wording for a week: quiet with no study, days-only without the browser's summary, light
// when /review called it light or fewer than three days were studied, otherwise good.
func WeeklyVariant(m *WeekMail, days int) string {
	switch {
	case days == 0:
		return WeeklyQuiet
	case m == nil:
		return WeeklyDays
	case m.Light || m.Studied < 3:
		return WeeklyLight
	}
	return WeeklyGood
}

// Week builds the email's figures: tiles and lines from messages.json, filled with the week's numbers. days is
// the studied count the rules used (the larger of the server's and the browser's).
func (r *Renderer) Week(m *WeekMail, days int) (*Week, error) {
	w := &Week{Days: days}
	var err error
	fill := func(kind, key string, data any) string {
		src, ok := r.w.Week.Lines[key]
		if kind == "tile" {
			src, ok = r.w.Week.Tiles[key]
		}
		if !ok {
			err = errors.Join(err, fmt.Errorf("messages.json: week %s %q is missing", kind, key))
			return ""
		}
		t, e := ttmpl.New("").Option("missingkey=error").Parse(src)
		if e != nil {
			err = errors.Join(err, e)
			return ""
		}
		var b bytes.Buffer
		if e := t.Execute(&b, data); e != nil {
			err = errors.Join(err, e)
		}
		return b.String()
	}
	if m == nil {
		if days > 0 {
			w.Tiles = []Tile{{Value: strconv.Itoa(days), Label: fill("tile", "daysOnly", nil)}}
		}
		return w, err
	}
	w.Questions = m.Questions
	w.Tiles = []Tile{
		{Value: fmt.Sprintf("%d of %d", days, max(days, m.DaysSoFar)), Label: fill("tile", "days", nil)}, // the server may have counted a later day
		{Value: strconv.Itoa(m.Questions), Label: fill("tile", "questions", m)},
		{Value: duration(m.Minutes)},
	}
	if m.Planned > 0 {
		w.Tiles[2].Label = fill("tile", "minutes", struct{ Planned string }{duration(m.Planned)})
	} else {
		w.Tiles[2].Label = fill("tile", "minutesOnly", nil)
	}
	add := func(key string, data any) { w.Lines = append(w.Lines, fill("line", key, data)) }
	if m.Improved != nil {
		add("improved", m.Improved)
	}
	if m.Slipped != nil {
		add("slipped", m.Slipped)
	}
	if m.Trap != nil {
		add("trap", m.Trap)
	}
	if m.Redo.Cleared > 0 || m.Redo.Due > 0 {
		add("redo", m.Redo)
	}
	if m.Focus != nil {
		if m.Focus.N > 0 {
			add("focus", m.Focus)
		} else {
			add("focusNone", m.Focus)
		}
	}
	return w, err
}

// duration says minutes the way the site does: "45 min", "3 h", "3 h 20 min".
func duration(min int) string {
	h, m := min/60, min%60
	switch {
	case h == 0:
		return fmt.Sprintf("%d min", m)
	case m == 0:
		return fmt.Sprintf("%d h", h)
	}
	return fmt.Sprintf("%d h %d min", h, m)
}
