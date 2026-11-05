package notify

import (
	"fmt"
	"slices"
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
