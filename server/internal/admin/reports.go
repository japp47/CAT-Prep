package admin

import (
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/japp47/CAT-Prep/server/internal/audit"
	"github.com/japp47/CAT-Prep/server/internal/httpx"
)

// Report is one problem report as the admin page shows it.
type Report struct {
	ID        int64      `json:"id"`
	CreatedAt time.Time  `json:"createdAt"`
	Page      string     `json:"page"`
	ItemID    string     `json:"itemId"`
	Kind      string     `json:"kind"`
	Note      string     `json:"note"`
	Status    string     `json:"status"`
	HandledAt *time.Time `json:"handledAt"`
	HandledBy string     `json:"handledBy"` // the staff member's email, or "" for the digest or the owner
}

// How many reports one page of the list holds. Open reports are few; closed ones are the last 90 days.
const listMax = 500

// ReportsHandler is GET /v1/admin/reports?state=open|closed: open is new and seen, newest first; closed is fixed
// and won't fix from the last 90 days, most recently closed first.
func (s *Service) ReportsHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		q := `select f.id, f.created_at, f.page, f.item_id, f.kind, f.note, f.status, f.handled_at, coalesce(u.email, '')
			from support.feedback f left join account.users u on u.id = f.handled_by `
		switch r.URL.Query().Get("state") {
		case "", "open":
			q += `where f.status in ('new', 'seen') order by f.id desc limit $1`
		case "closed":
			q += `where f.status in ('fixed', 'wont_fix') and f.handled_at > now() - interval '90 days' order by f.handled_at desc, f.id desc limit $1`
		default:
			httpx.WriteError(w, http.StatusBadRequest, "bad_request", "state is open or closed.")
			return
		}
		rows, err := s.db.Query(r.Context(), q, listMax)
		if err != nil {
			s.fail(w, r, err)
			return
		}
		out, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (Report, error) {
			var x Report
			err := row.Scan(&x.ID, &x.CreatedAt, &x.Page, &x.ItemID, &x.Kind, &x.Note, &x.Status, &x.HandledAt, &x.HandledBy)
			return x, err
		})
		if err != nil {
			s.fail(w, r, err)
			return
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"reports": out})
	})
}

var statuses = map[string]bool{"seen": true, "fixed": true, "wont_fix": true}

// The most reports one change may touch: a question's group, never "everything" by mistake.
const changeMax = 100

// StatusHandler is POST /v1/admin/reports/status with {ids, status}: marks reports seen, fixed or won't fix (D32).
// Seen also reopens a closed report. Each report that changes gets handled_by, handled_at (set only when closed)
// and its own audit event, in one transaction. Reports already in that status are left alone.
func (s *Service) StatusHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var b struct {
			IDs    []int64 `json:"ids"`
			Status string  `json:"status"`
		}
		if !httpx.DecodeJSON(w, r, &b, false) {
			return
		}
		if !statuses[b.Status] || len(b.IDs) == 0 || len(b.IDs) > changeMax {
			httpx.WriteError(w, http.StatusBadRequest, "bad_request", "Pick one to 100 reports and seen, fixed or won't fix.")
			return
		}
		st := from(r.Context())
		changed := 0
		err := pgx.BeginFunc(r.Context(), s.db, func(tx pgx.Tx) error {
			rows, err := tx.Query(r.Context(), `
				update support.feedback set status = $1, handled_by = $2,
				  handled_at = case when $1 in ('fixed', 'wont_fix') then now() end, updated_at = now()
				where id = any($3) and status <> $1
				returning id, identity_id::text`, b.Status, st.UserID, b.IDs)
			if err != nil {
				return err
			}
			type hit struct {
				id      int64
				subject *string
			}
			hits, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (hit, error) {
				var h hit
				return h, row.Scan(&h.id, &h.subject)
			})
			if err != nil {
				return err
			}
			for _, h := range hits {
				e := s.event(r, st, "feedback.resolved", "feedback", itoa(h.id), map[string]any{"status": b.Status})
				if h.subject != nil {
					e.SubjectIdentity = *h.subject
				}
				if err := audit.Write(r.Context(), tx, e); err != nil {
					return err
				}
			}
			changed = len(hits)
			return nil
		})
		if err != nil {
			s.fail(w, r, err)
			return
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]int{"changed": changed})
	})
}
