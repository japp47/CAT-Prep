// Package digest tells the owner about new problem reports once a day (docs/feature.md F39, B6b): new reports are
// grouped by question, emailed to the team with the students' notes, posted without notes as a comment on one
// GitHub issue (the repository is public), then marked seen.
package digest

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Group is the new reports of one kind on one question.
type Group struct {
	ItemID string
	Kind   string
	Count  int
	First  time.Time
	Last   time.Time
	IDs    []int64
	Notes  []Note // only reports with a note; for the email, never the public issue
}

// Note is what one student wrote, with when and on which page.
type Note struct {
	At   time.Time
	Page string
	Text string
}

// Pending is what the next digest holds: new reports, grouped, and how many seen ones are still not closed.
type Pending struct {
	Groups    []Group
	StillOpen int
}

// IDs returns every report id in the digest.
func (p Pending) IDs() []int64 {
	var out []int64
	for _, g := range p.Groups {
		out = append(out, g.IDs...)
	}
	return out
}

// Load reads the reports waiting for a digest, as the owner. Notes are read for the email only.
func Load(ctx context.Context, db *pgxpool.Pool) (Pending, error) {
	var p Pending
	rows, err := db.Query(ctx, `
		select item_id, kind, count(*), min(created_at), max(created_at), array_agg(id order by id)
		from support.feedback where status = 'new'
		group by item_id, kind order by count(*) desc, max(created_at) desc`)
	if err != nil {
		return p, fmt.Errorf("load reports: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var g Group
		if err := rows.Scan(&g.ItemID, &g.Kind, &g.Count, &g.First, &g.Last, &g.IDs); err != nil {
			return p, fmt.Errorf("read report: %w", err)
		}
		p.Groups = append(p.Groups, g)
	}
	if err := rows.Err(); err != nil {
		return p, fmt.Errorf("load reports: %w", err)
	}
	if err := loadNotes(ctx, db, &p); err != nil {
		return p, err
	}
	err = db.QueryRow(ctx, `select count(*) from support.feedback where status = 'seen'`).Scan(&p.StillOpen)
	return p, err
}

func loadNotes(ctx context.Context, db *pgxpool.Pool, p *Pending) error {
	at := map[string]int{}
	for i, g := range p.Groups {
		at[g.ItemID+"|"+g.Kind] = i
	}
	// Only the reports read above: one that arrives in between waits for the next digest, note and all.
	rows, err := db.Query(ctx, `select item_id, kind, created_at, page, note from support.feedback where id = any($1) and note <> '' order by id`, p.IDs())
	if err != nil {
		return fmt.Errorf("load notes: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var item, kind string
		var n Note
		if err := rows.Scan(&item, &kind, &n.At, &n.Page, &n.Text); err != nil {
			return fmt.Errorf("read note: %w", err)
		}
		if i, ok := at[item+"|"+kind]; ok {
			p.Groups[i].Notes = append(p.Groups[i].Notes, n)
		}
	}
	return rows.Err()
}

// MarkSeen moves the digested reports from new to seen. Only new ones change, so a report closed meanwhile stays closed.
func MarkSeen(ctx context.Context, db *pgxpool.Pool, ids []int64) (int64, error) {
	tag, err := db.Exec(ctx, `update support.feedback set status = 'seen', updated_at = now() where id = any($1) and status = 'new'`, ids)
	return tag.RowsAffected(), err
}

var kindLabel = map[string]string{"answer_key": "wrong answer key", "unclear": "unclear question or option", "typo": "typo", "other": "something else"}

// Markdown is the comment for one digest. ist is the zone dates are shown in.
func Markdown(p Pending, ist *time.Location) string {
	var b strings.Builder
	n := len(p.IDs())
	fmt.Fprintf(&b, "**%d new problem %s** on %d %s.\n\n", n, plural(n, "report", "reports"), len(p.Groups), plural(len(p.Groups), "question", "questions"))
	b.WriteString("| Question | Problem | Reports | When |\n|---|---|---|---|\n")
	for _, g := range p.Groups {
		label := kindLabel[g.Kind]
		if label == "" {
			label = g.Kind
		}
		when := g.Last.In(ist).Format("2 Jan 15:04")
		if g.Count > 1 && !sameMinute(g.First, g.Last) {
			when = g.First.In(ist).Format("2 Jan 15:04") + " to " + when
		}
		fmt.Fprintf(&b, "| `%s`%s | %s | %d | %s |\n", g.ItemID, questionNo(g.ItemID), label, g.Count, when)
	}
	if p.StillOpen > 0 {
		fmt.Fprintf(&b, "\nAlso %d earlier %s seen but not closed yet.\n", p.StillOpen, plural(p.StillOpen, "report is", "reports are"))
	}
	b.WriteString("\nNotes are kept out of this public issue. Read them, and close reports, with the queries in `server/README.md` (Problem reports).\n")
	return b.String()
}

// questionNo names an RC question as people count it: rc:<set>:2 is Q3.
func questionNo(item string) string {
	parts := strings.Split(item, ":")
	if len(parts) != 3 || parts[0] != "rc" {
		return ""
	}
	n, err := strconv.Atoi(parts[2])
	if err != nil {
		return ""
	}
	return fmt.Sprintf(" (Q%d)", n+1)
}

func plural(n int, one, many string) string {
	if n == 1 {
		return one
	}
	return many
}

func sameMinute(a, b time.Time) bool { return a.Truncate(time.Minute).Equal(b.Truncate(time.Minute)) }
