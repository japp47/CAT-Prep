package notify

import (
	"fmt"
	"slices"
	"strings"
	"time"
)

// Email modes a student can choose (notify.prefs.email_mode).
const (
	EmailOff    = "off"
	EmailMissed = "missed"
	EmailDaily  = "daily"
)

// Channels.
const (
	Email = "email"
	Push  = "push"
)

// Student is what the rules know about one student at one moment. The planner and the worker fill it from the
// database; tests fill it by hand.
type Student struct {
	Identity           string
	Enabled            bool
	At                 int // reminder time, minutes after local midnight
	Days               int // bit n is weekday n, Sunday = 0
	Loc                *time.Location
	QuietFrom, QuietTo int
	EmailMode          string
	EmailOK            bool // a verified address that has not bounced
	PushDevices        int
	PausedUntil        time.Time
	EnabledAt          time.Time
	LastDay            string // local day of the last practice, "" if none
	Streak             int
	SentTodayKind      string    // the kind already sent on today's local date, "" if none
	LastSentBefore     time.Time // the last message sent on an earlier local day
	EmailsThisWeek     int       // emails sent in the last 7 days
	Weekly             bool      // the weekly review is switched on
	WeekDays           int       // days with practice in this local week (Monday to today), server-counted or the browser's, the larger
	Week               *WeekMail // the browser's summary of this week, nil when it sent none
}

// Intent is one message the rules want sent: a kind on a channel, with its dedupe key.
type Intent struct {
	Kind     string
	Channel  string
	Key      string
	Priority int
	Streak   int
	Missed   int
	Day      string // the student's local date the message belongs to
}

// Decide says what a student should get at now: nothing, or one message on one or two channels (the same message
// by push and email only when the student chose daily email). It is the whole rule book of F65 and has no side
// effects. When anything needed is missing it answers nothing (fail closed).
func (p Policy) Decide(s Student, now time.Time) []Intent {
	if !s.Enabled || s.Loc == nil || s.EnabledAt.IsZero() || now.Before(s.PausedUntil) {
		return nil
	}
	if w := p.weekly(s, now); w != nil {
		return w
	}
	return p.study(s, now)
}

// weekly is the Sunday review (R2, D97, docs/design/notifications.md §15.1): on the policy's day and time, once a
// week (keyed by the week's Monday), by email when the address is good and under the weekly cap, else by push.
// It goes whether or not the student practised today, and even after an earlier nudge that day (a reminder time
// before the weekly one must not cost a student their review); once it has gone, the "one study message a day"
// rule keeps any later nudge that day back. A week with no practice gets the quiet-week wording
// only within QuietWithinDays of the last practice; a student quiet for longer has had the missed-day series,
// which has stopped, and this stops with it.
func (p Policy) weekly(s Student, now time.Time) []Intent {
	if !s.Weekly {
		return nil
	}
	local := now.In(s.Loc)
	today := local.Format(time.DateOnly)
	minute := local.Hour()*60 + local.Minute()
	if strings.ToLower(local.Weekday().String()) != p.Weekly.Day || minute < p.Weekly.Time || quiet(minute, s.QuietFrom, s.QuietTo) || p.nearExam(today) {
		return nil
	}
	if daysBetween(s.EnabledAt.In(s.Loc).Format(time.DateOnly), today) < p.FirstReminderAfterDays {
		return nil
	}
	if s.WeekDays == 0 && daysBetween(s.LastDay, today) > p.Weekly.QuietWithinDays {
		return nil
	}
	monday := mondayOf(local)
	in := func(channel string) []Intent {
		return []Intent{{Kind: "weekly", Channel: channel, Key: fmt.Sprintf("%s:weekly:%s", s.Identity, monday),
			Priority: p.priority("weekly"), Streak: s.Streak, Day: today}}
	}
	switch {
	case s.EmailOK && s.EmailsThisWeek < p.MaxEmailsPerWeek:
		return in(Email)
	case s.PushDevices > 0:
		return in(Push)
	}
	return nil
}

// study is the daily nudge and the missed-day series.
func (p Policy) study(s Student, now time.Time) []Intent {
	local := now.In(s.Loc)
	today := local.Format(time.DateOnly)
	minute := local.Hour()*60 + local.Minute()

	if s.LastDay == today { // practised today, on any device
		return nil
	}
	if s.Days&(1<<int(local.Weekday())) == 0 || quiet(minute, s.QuietFrom, s.QuietTo) || minute < s.At {
		return nil
	}
	if p.nearExam(today) {
		return nil
	}
	enabledDay := s.EnabledAt.In(s.Loc).Format(time.DateOnly)
	if daysBetween(enabledDay, today) < p.FirstReminderAfterDays {
		return nil
	}
	if s.SentTodayKind == "" && !s.LastSentBefore.IsZero() && now.Sub(s.LastSentBefore) < time.Duration(p.MinHoursBetweenMessages)*time.Hour {
		return nil
	}

	// Days missed in a row, today included, counted from the last practice or from turning reminders on.
	from := max(s.LastDay, enabledDay)
	missed := daysBetween(from, today)
	if missed > p.MissedDays[len(p.MissedDays)-1] {
		return nil // the series has ended; reminders start again with the next practice
	}

	var out []Intent
	add := func(kind, channel, keyDay string) {
		if s.SentTodayKind != "" && s.SentTodayKind != kind {
			return // one study message a day: only the one already sent may still go out on its other channel
		}
		out = append(out, Intent{Kind: kind, Channel: channel, Key: fmt.Sprintf("%s:%s:%s:%s", s.Identity, kind, channel, keyDay),
			Priority: p.priority(kind), Streak: s.Streak, Missed: missed, Day: today})
	}
	emailOK := s.EmailOK && s.EmailMode != EmailOff
	underCap := s.EmailMode == EmailDaily || s.EmailsThisWeek < p.MaxEmailsPerWeek

	if missed >= 2 && slices.Contains(p.MissedDays, missed) {
		kind := fmt.Sprintf("missed-%d", missed)
		switch {
		case emailOK && underCap:
			add(kind, Email, from)
		case s.PushDevices > 0:
			add(kind, Push, from)
		}
		return out
	}

	kind := "daily"
	if s.Streak >= p.StreakWordingFrom && daysBetween(s.LastDay, today) == 1 {
		kind = "daily-streak"
	}
	if s.PushDevices > 0 {
		add(kind, Push, today)
	}
	if emailOK && s.EmailMode == EmailDaily {
		add(kind, Email, today)
	}
	return out
}

// quiet reports whether a minute of the day falls in quiet hours, which may run across midnight.
func quiet(m, from, to int) bool {
	if from == to {
		return false
	}
	if from < to {
		return m >= from && m < to
	}
	return m >= from || m < to
}

// nearExam: no study reminder on an exam day or the days just before it.
func (p Policy) nearExam(today string) bool {
	for _, e := range p.Exams {
		if d := daysBetween(today, e); d >= 0 && d <= p.NoRemindersAroundExam.DaysBefore {
			return true
		}
	}
	return false
}

// daysBetween counts calendar days from a to b (YYYY-MM-DD); a missing a counts as very long ago.
func daysBetween(a, b string) int {
	ta, err1 := time.Parse(time.DateOnly, a)
	tb, err2 := time.Parse(time.DateOnly, b)
	if err1 != nil || err2 != nil {
		return 1 << 20
	}
	return int(tb.Sub(ta).Hours() / 24)
}
