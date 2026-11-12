package notify

import (
	"context"
	"errors"
	"fmt"
	"slices"
)

// Sample figures for previews and the owner's test send (cmd/notify -preview, the admin panel): every wording with
// made-up data, the weekly ones with the week they are chosen for, built as the planner builds it.

func samplePct(n int) *int { return &n }

// SampleWeek is a good week, for the weekly wordings' samples.
func SampleWeek() WeekMail {
	return WeekMail{Monday: "2026-11-09", Studied: 5, DaysSoFar: 7, Questions: 64, Correct: 50, Acc: samplePct(78), Minutes: 200, Planned: 300,
		Improved: &Move{Name: "Para summary", Before: 55, After: 72}, Slipped: &Move{Name: "RC", Before: 70, After: 58},
		Trap: &Trap{Name: "Out of scope", N: 4}, Redo: Redo{Cleared: 6, Due: 3}, Focus: &Focus{Name: "Para jumbles", N: 12, Acc: samplePct(67)}}
}

// SampleVars is the made-up data a wording is shown with.
func (r *Renderer) SampleVars(id string) (Vars, error) {
	v := Vars{Name: "Aarav", Streak: 12, Missed: 5,
		Task: &Task{Label: "RC of the day", Title: "The ethics of nudging", Detail: "4 questions, about 7 minutes", Path: "/practice/rc/rc-ethics-nudging", Mins: 7}}
	good := SampleWeek()
	light := good
	light.Studied, light.Questions, light.Correct, light.Acc, light.Minutes, light.Light, light.Improved = 2, 18, 12, nil, 70, true, nil
	weeks := map[string]struct {
		m    *WeekMail
		days int
	}{WeeklyGood: {&good, 5}, WeeklyLight: {&light, 2}, WeeklyDays: {nil, 3}, WeeklyQuiet: {nil, 0}}
	if w, ok := weeks[id]; ok {
		week, err := r.Week(w.m, w.days)
		if err != nil {
			return v, err
		}
		v.Week = week
	}
	return v, nil
}

// Tester sends one wording, with sample data, to a staff member's own address and devices (R2, §15.3), so a new
// wording is seen in a real inbox before a student gets it. Nothing is queued and no student is involved.
type Tester struct {
	Render   *Renderer
	Channels map[string]Channel
	Tokens   Tokens
	Store    Store
	Site     string
}

// ErrNoWording is a kind and wording that do not exist.
var ErrNoWording = errors.New("no such wording")

// Send renders kind's wording id with sample data, marks its subject as a test, and sends it by email to address
// (when there is one and email is on) and by push to identity's devices. It returns the channels it reached.
func (t Tester) Send(ctx context.Context, kind, id, identity, address string) ([]string, error) {
	if !slices.Contains(t.Render.Variants(kind), id) {
		return nil, ErrNoWording
	}
	v, err := t.Render.SampleVars(id)
	if err != nil {
		return nil, err
	}
	m, err := t.Render.Render(kind, id, v, Links{Site: t.Site, Token: t.Tokens.Make(identity, ScopeOf(kind))})
	if err != nil {
		return nil, err
	}
	m.Subject, m.PushTitle = "Test: "+m.Subject, "Test: "+m.PushTitle
	var reached []string
	var errs []error
	if ch := t.Channels[Email]; ch != nil && address != "" {
		if _, err := ch.Send(ctx, Out{Identity: identity, Kind: kind, To: address, Rendered: m}); err != nil {
			errs = append(errs, fmt.Errorf("email: %w", err))
		} else {
			reached = append(reached, Email)
		}
	}
	if ch := t.Channels[Push]; ch != nil {
		subs, err := t.Store.Subs(ctx, identity)
		if err != nil {
			return reached, err
		}
		if len(subs) > 0 {
			if _, err := ch.Send(ctx, Out{Identity: identity, Kind: kind, Rendered: m, Subs: subs}); err != nil {
				errs = append(errs, fmt.Errorf("push: %w", err))
			} else {
				reached = append(reached, Push)
			}
		}
	}
	return reached, errors.Join(errs...)
}
