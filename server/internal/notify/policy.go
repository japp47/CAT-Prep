// Package notify sends study reminders by push and email (docs/feature.md F65, docs/design/notifications.md).
//
// One rule book (Decide, pure) says what each student gets; a planner turns its answers into rows of the
// notify.messages queue; a worker claims them, asks the rule book again, renders the wording and hands each to a
// Channel. The wording, the email layout and the rules' numbers are files in templates/, not code.
package notify

import (
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

//go:embed templates/*.json templates/*.html templates/*.txt
var files embed.FS

// Policy is templates/policy.json: the numbers behind the rules. Times are minutes after midnight, local.
type Policy struct {
	DefaultTime int `json:"defaultTime"`
	TimeStep    int `json:"timeStep"`
	QuietHours  struct {
		From int `json:"from"`
		To   int `json:"to"`
	} `json:"quietHours"`
	MaxStudyMessagesPerDay  int   `json:"maxStudyMessagesPerDay"`
	MinHoursBetweenMessages int   `json:"minHoursBetweenMessages"`
	MaxEmailsPerWeek        int   `json:"maxEmailsPerWeek"`
	StreakWordingFrom       int   `json:"streakWordingFrom"`
	MissedDays              []int `json:"missedDays"`
	Weekly                  struct {
		Day             string `json:"day"`             // lower-case English weekday
		Time            int    `json:"time"`            // minutes after local midnight
		QuietWithinDays int    `json:"quietWithinDays"` // a week with no practice is still reviewed if the last practice is this recent
	} `json:"weekly"` // the Sunday review (R2, D97)
	Exams                 []string `json:"exams"`
	NoRemindersAroundExam struct {
		DaysBefore int `json:"daysBefore"`
	} `json:"noRemindersAroundExam"`
	FirstReminderAfterDays int      `json:"firstReminderAfterDays"`
	PractisedWithinHours   int      `json:"practisedWithinHours"`
	EmailPriority          []string `json:"emailPriority"`
	StaleAfterHours        int      `json:"staleAfterHours"`
	KeepMessagesDays       int      `json:"keepMessagesDays"`
}

// LoadPolicy reads and checks templates/policy.json.
func LoadPolicy() (Policy, error) {
	var p Policy
	raw, err := files.ReadFile("templates/policy.json")
	if err != nil {
		return p, err
	}
	if err := json.Unmarshal(raw, &p); err != nil {
		return p, fmt.Errorf("policy.json: %w", err)
	}
	return p, p.check()
}

// MustPolicy is LoadPolicy for program start: the file is built in and tested, so failing here is a broken build.
func MustPolicy() Policy {
	p, err := LoadPolicy()
	if err != nil {
		panic(err)
	}
	return p
}

var weekdays = map[string]bool{"sunday": true, "monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true, "saturday": true}

func (p Policy) check() error {
	var errs []error
	minute := func(name string, v int) {
		if v < 0 || v > 1439 {
			errs = append(errs, fmt.Errorf("%s must be 0 to 1439 minutes, got %d", name, v))
		}
	}
	minute("defaultTime", p.DefaultTime)
	minute("quietHours.from", p.QuietHours.From)
	minute("quietHours.to", p.QuietHours.To)
	if p.TimeStep <= 0 || 1440%p.TimeStep != 0 || p.DefaultTime%p.TimeStep != 0 {
		errs = append(errs, errors.New("timeStep must divide a day, and defaultTime must be on a step"))
	}
	minute("weekly.time", p.Weekly.Time)
	if _, ok := weekdays[p.Weekly.Day]; !ok {
		errs = append(errs, fmt.Errorf("weekly.day: %q is not a lower-case weekday", p.Weekly.Day))
	}
	if p.Weekly.QuietWithinDays < 1 {
		errs = append(errs, errors.New("weekly.quietWithinDays must be positive"))
	}
	if p.MaxStudyMessagesPerDay != 1 {
		errs = append(errs, errors.New("maxStudyMessagesPerDay: only 1 is built (D89)"))
	}
	if p.MaxEmailsPerWeek < 1 || p.StreakWordingFrom < 2 || p.FirstReminderAfterDays < 0 || p.PractisedWithinHours < 1 || p.StaleAfterHours < 1 || p.KeepMessagesDays < 1 {
		errs = append(errs, errors.New("maxEmailsPerWeek, streakWordingFrom, practisedWithinHours, staleAfterHours and keepMessagesDays must be positive"))
	}
	for i, d := range p.MissedDays {
		if d < 2 || (i > 0 && d <= p.MissedDays[i-1]) {
			errs = append(errs, errors.New("missedDays must rise from 2 or more"))
			break
		}
	}
	if len(p.MissedDays) == 0 {
		errs = append(errs, errors.New("missedDays needs at least one day"))
	}
	for _, e := range p.Exams {
		if _, err := time.Parse(time.DateOnly, e); err != nil {
			errs = append(errs, fmt.Errorf("exams: %q is not a date", e))
		}
	}
	for _, k := range p.EmailPriority {
		if k != "missed" && k != "weekly" && k != "daily" {
			errs = append(errs, fmt.Errorf("emailPriority: unknown %q", k))
		}
	}
	return errors.Join(errs...)
}

// priority is a message's place in the queue: lower first (emailPriority, then anything else).
func (p Policy) priority(kind string) int {
	group := "daily"
	switch {
	case kind == "weekly":
		group = "weekly"
	case len(kind) > 6 && kind[:6] == "missed":
		group = "missed"
	}
	for i, k := range p.EmailPriority {
		if k == group {
			return i + 1
		}
	}
	return len(p.EmailPriority) + 1
}
