package admin

import (
	"net/http"
	"strconv"

	"github.com/japp47/CAT-Prep/server/internal/httpx"
)

// Overview is counts only: nothing about any one student (D14).
type Overview struct {
	Identities        int64 `json:"identities"`        // progress kept on the server
	ActiveThisWeek    int64 `json:"activeThisWeek"`    // seen in the last 7 days
	NewThisWeek       int64 `json:"newThisWeek"`       // sync turned on in the last 7 days
	Accounts          int64 `json:"accounts"`          // signed in with Google
	Devices           int64 `json:"devices"`           // not removed
	Records           int64 `json:"records"`           // synced rows, deleted ones included
	RefusedThisWeek   int64 `json:"refusedThisWeek"`   // pushes refused (sync.rejected) in the last 7 days
	ReportsOpen       int64 `json:"reportsOpen"`       // new and seen
	ReportsNew        int64 `json:"reportsNew"`        // not in a digest yet
	ClosedThisWeek    int64 `json:"closedThisWeek"`    // fixed or won't fix in the last 7 days
	DatabaseBytes     int64 `json:"databaseBytes"`     // the whole database
	DatabaseFreeBytes int64 `json:"databaseFreeBytes"` // Supabase free plan: 500 MB
}

// FreePlanBytes is Supabase's free database size.
const FreePlanBytes = 500 << 20

// OverviewHandler is GET /v1/admin/overview.
func (s *Service) OverviewHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		o := Overview{DatabaseFreeBytes: FreePlanBytes}
		err := s.db.QueryRow(r.Context(), `select
			(select count(*) from account.identities),
			(select count(*) from account.identities where last_seen_at > now() - interval '7 days'),
			(select count(*) from account.identities where created_at > now() - interval '7 days'),
			(select count(*) from account.users),
			(select count(*) from account.devices where revoked_at is null),
			(select count(*) from sync.records),
			(select count(*) from audit.events where action = 'sync.rejected' and created_at > now() - interval '7 days'),
			(select count(*) from support.feedback where status in ('new', 'seen')),
			(select count(*) from support.feedback where status = 'new'),
			(select count(*) from support.feedback where status in ('fixed', 'wont_fix') and handled_at > now() - interval '7 days'),
			pg_database_size(current_database())`).Scan(&o.Identities, &o.ActiveThisWeek, &o.NewThisWeek, &o.Accounts, &o.Devices,
			&o.Records, &o.RefusedThisWeek, &o.ReportsOpen, &o.ReportsNew, &o.ClosedThisWeek, &o.DatabaseBytes)
		if err != nil {
			s.fail(w, r, err)
			return
		}
		httpx.WriteJSON(w, http.StatusOK, o)
	})
}

func itoa(n int64) string { return strconv.FormatInt(n, 10) }
