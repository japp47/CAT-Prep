// Package syncapi serves POST /v1/sync/pull and POST /v1/sync/push (docs/architecture.md §6.2, D8). The server
// orders writes with its own rev numbers and never overwrites blind: a write names the rev it was based on, and a
// row that moved on in the meantime comes back as stale with the server's copy, for the browser to merge.
//
// Every push first locks the identity's sync.heads row (docs/database.md §5.3). Revs come from one sequence, which
// hands out numbers before transactions commit; without the lock, two pushes of the same student could commit
// out of order and a third device's pull could step over a row for good.
package syncapi

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/japp47/CAT-Prep/server/internal/account"
	"github.com/japp47/CAT-Prep/server/internal/audit"
	"github.com/japp47/CAT-Prep/server/internal/httpx"
	"github.com/japp47/CAT-Prep/server/internal/limit"
	"github.com/japp47/CAT-Prep/server/internal/reqinfo"
)

// Limits. The body itself is capped at 64 KB by the server's middleware.
const (
	PageSize   = 500    // records per pull
	MaxChanges = 200    // records per push
	MaxData    = 16_384 // bytes of JSON per record as the browser sends it (stored jsonb may be up to twice that)
)

// Options are the per-identity limits and the kinds this build accepts.
type Options struct {
	Kinds      []string // record kinds the browser may push; others get 400 unknown_kind
	MaxRecords int      // rows per identity, deletions included
	MaxBytes   int64    // bytes of data per identity
	PerMinute  int      // pulls and pushes per device
	// Practice, when set, runs inside each push that wrote new records, with their kinds: reminders learn from it
	// that the student practised (internal/notify). An error rolls the push back.
	Practice func(ctx context.Context, tx pgx.Tx, identity string, kinds []string) error
}

// Service holds what the handlers share.
type Service struct {
	db    *pgxpool.Pool
	hash  reqinfo.Hasher
	log   *slog.Logger
	opt   Options
	kinds map[string]bool
	rate  *limit.Limiter
	// synced keeps "last synced" writes to one a minute per device.
	synced *recent
}

// New returns the service.
func New(db *pgxpool.Pool, hash reqinfo.Hasher, log *slog.Logger, opt Options) *Service {
	k := map[string]bool{}
	for _, kind := range opt.Kinds {
		k[kind] = true
	}
	return &Service{db: db, hash: hash, log: log, opt: opt, kinds: k, rate: limit.New(opt.PerMinute, time.Minute),
		synced: newRecent(time.Minute, 200_000)}
}

// Record is one record as the API sends it.
type Record struct {
	Kind    string          `json:"kind"`
	ID      string          `json:"id"`
	Data    json.RawMessage `json:"data"`
	Deleted bool            `json:"deleted"`
	Stamp   int64           `json:"stamp"`
	Rev     int64           `json:"rev"`
}

// Change is one record a device sends, with the rev it was based on (0 for a record it has never seen).
type Change struct {
	Kind    string          `json:"kind"`
	ID      string          `json:"id"`
	Data    json.RawMessage `json:"data"`
	Deleted bool            `json:"deleted"`
	Stamp   int64           `json:"stamp"`
	BaseRev int64           `json:"baseRev"`
}

// Applied is a change the server now holds, with its rev.
type Applied struct {
	Kind string `json:"kind"`
	ID   string `json:"id"`
	Rev  int64  `json:"rev"`
}

// Rejected is a change the server will not store, with why. The rest of the push still applies, so one bad record
// never holds the others back.
type Rejected struct {
	Kind string `json:"kind"`
	ID   string `json:"id"`
	Code string `json:"code"`
}

// PullHandler answers with this identity's records written after the cursor, oldest first, a page at a time.
func (s *Service) PullHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		d, _ := account.FromContext(r.Context())
		if !s.allow(w, r, d) {
			return
		}
		var req struct {
			Cursor int64 `json:"cursor"`
		}
		if !httpx.DecodeJSON(w, r, &req, false) {
			return
		}
		if req.Cursor < 0 {
			httpx.WriteError(w, http.StatusBadRequest, "bad_request", "That cursor is not valid.")
			return
		}
		rows, err := s.db.Query(r.Context(), `
			select kind, rec_id, data, deleted, stamp, rev from sync.records
			where identity_id = $1 and rev > $2 order by rev limit $3`, d.IdentityID, req.Cursor, PageSize+1)
		if err != nil {
			s.fail(w, r, fmt.Errorf("pull: %w", err))
			return
		}
		recs, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (Record, error) {
			var rec Record
			err := row.Scan(&rec.Kind, &rec.ID, &rec.Data, &rec.Deleted, &rec.Stamp, &rec.Rev)
			return rec, err
		})
		if err != nil {
			s.fail(w, r, fmt.Errorf("pull: %w", err))
			return
		}
		more := len(recs) > PageSize
		if more {
			recs = recs[:PageSize]
		}
		cursor := req.Cursor
		if len(recs) > 0 {
			cursor = recs[len(recs)-1].Rev
		}
		s.touch(r, d)
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"cursor": cursor, "records": recs, "more": more})
	})
}

// PushHandler stores changes that are based on the server's current rev, returns the server copy of those that
// are not, and treats a change equal to what is stored as applied (so a retried push changes nothing).
func (s *Service) PushHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		d, _ := account.FromContext(r.Context())
		if !s.allow(w, r, d) {
			return
		}
		var req struct {
			Changes []Change `json:"changes"`
		}
		if !httpx.DecodeJSON(w, r, &req, false) {
			return
		}
		if code, msg := s.check(req.Changes); code != "" {
			s.reject(r, d, code)
			httpx.WriteError(w, http.StatusBadRequest, code, msg)
			return
		}
		applied, stale, rejected := []Applied{}, []Record{}, []Rejected{}
		err := pgx.BeginFunc(r.Context(), s.db, func(tx pgx.Tx) error {
			applied, stale, rejected = applied[:0], stale[:0], rejected[:0] // a retried transaction starts clean
			var head struct {
				rev, count, bytes int64
			}
			if err := tx.QueryRow(r.Context(), `select rev, record_count, data_bytes from sync.heads where identity_id = $1 for update`,
				d.IdentityID).Scan(&head.rev, &head.count, &head.bytes); err != nil {
				return fmt.Errorf("lock head: %w", err)
			}
			// The rows these changes touch, read and locked in one query (docs/design/scale-10k.md, phase 1).
			cur, err := readRows(r.Context(), tx, d.IdentityID, req.Changes, s.rejectReason)
			if err != nil {
				return err
			}
			// Decide each change in order, by the same rules as one at a time: a new row must fit the limits (updates and
			// deletions always may go through, so a full identity can still make room); a change equal to what is stored
			// is applied as it stands; a change based on the current rev is written; anything else is stale.
			type step struct {
				c    Change
				kind int // 0 applied as it stands, 1 insert, 2 update
				rev  int64
			}
			var steps []step
			var ins, upd []Change
			for _, c := range req.Changes {
				if why := s.rejectReason(c); why != "" {
					rejected = append(rejected, Rejected{c.Kind, c.ID, why})
					continue
				}
				e, found := cur[rowKey{c.Kind, c.ID}]
				switch {
				case !found:
					if head.count+1 > int64(s.opt.MaxRecords) || head.bytes+int64(len(c.Data)) > s.opt.MaxBytes {
						rejected = append(rejected, Rejected{c.Kind, c.ID, "over_limit"})
						continue
					}
					head.count++
					head.bytes += int64(len(c.Data)) // corrected to the stored size once written
					ins = append(ins, c)
					steps = append(steps, step{c: c, kind: 1})
				case e.same:
					steps = append(steps, step{c: c, kind: 0, rev: e.rec.Rev})
				case e.rec.Rev == c.BaseRev:
					grow := int64(len(c.Data)) - e.size
					if grow > 0 && head.bytes+grow > s.opt.MaxBytes {
						rejected = append(rejected, Rejected{c.Kind, c.ID, "over_limit"})
						continue
					}
					head.bytes += int64(len(c.Data)) - e.size // corrected to the stored size once written
					upd = append(upd, c)
					steps = append(steps, step{c: c, kind: 2})
				default:
					e.rec.Kind, e.rec.ID = c.Kind, c.ID
					stale = append(stale, e.rec)
				}
			}
			// Write every insert in one statement and every update in another; each returns its rows' revs.
			revs := map[rowKey]int64{}
			for _, w := range []struct {
				list []Change
				sql  string
			}{
				{ins, `insert into sync.records (identity_id, kind, rec_id, data, deleted, stamp, device_id)
					select $1, x.kind, x.rec_id, x.d::jsonb, x.del, x.st, $7::uuid
					from unnest($2::text[], $3::text[], $4::text[], $5::bool[], $6::bigint[]) with ordinality as x(kind, rec_id, d, del, st, n)
					order by x.n
					returning kind, rec_id, rev, data_bytes`},
				{upd, `update sync.records r set data = x.d::jsonb, deleted = x.del, stamp = x.st, device_id = $7::uuid, rev = nextval('sync.rev')
					from unnest($2::text[], $3::text[], $4::text[], $5::bool[], $6::bigint[]) as x(kind, rec_id, d, del, st)
					where r.identity_id = $1 and r.kind = x.kind and r.rec_id = x.rec_id
					returning r.kind, r.rec_id, r.rev, r.data_bytes`},
			} {
				if len(w.list) == 0 {
					continue
				}
				kinds, idList, datas, dels, stamps := columns(w.list)
				rows, err := tx.Query(r.Context(), w.sql, d.IdentityID, kinds, idList, datas, dels, stamps, d.DeviceID)
				if err != nil {
					return fmt.Errorf("write: %w", err)
				}
				for rows.Next() {
					var k rowKey
					var rev, n int64
					if err := rows.Scan(&k.kind, &k.id, &rev, &n); err != nil {
						rows.Close()
						return fmt.Errorf("write: %w", err)
					}
					revs[k] = rev
					head.rev = max(head.rev, rev)
					head.bytes += n // the stored size replaces the estimate made above
				}
				rows.Close()
				if err := rows.Err(); err != nil {
					return fmt.Errorf("write: %w", err)
				}
			}
			for _, c := range ins {
				head.bytes -= int64(len(c.Data))
			}
			for _, c := range upd {
				head.bytes -= int64(len(c.Data))
			}
			for _, st := range steps {
				rev := st.rev
				if st.kind != 0 {
					rev = revs[rowKey{st.c.Kind, st.c.ID}]
				}
				applied = append(applied, Applied{st.c.Kind, st.c.ID, rev})
			}
			if len(ins)+len(upd) > 0 {
				if _, err := tx.Exec(r.Context(), `update sync.heads set rev = $2, record_count = $3, data_bytes = $4 where identity_id = $1`,
					d.IdentityID, head.rev, head.count, head.bytes); err != nil {
					return fmt.Errorf("update head: %w", err)
				}
			}
			if s.opt.Practice != nil && len(ins) > 0 {
				kinds := make([]string, 0, len(ins))
				for _, c := range ins {
					if !c.Deleted {
						kinds = append(kinds, c.Kind)
					}
				}
				if err := s.opt.Practice(r.Context(), tx, d.IdentityID, kinds); err != nil {
					return fmt.Errorf("record practice: %w", err)
				}
			}
			return nil
		})
		if err != nil {
			s.fail(w, r, fmt.Errorf("push: %w", err))
			return
		}
		if len(rejected) > 0 {
			codes := map[string]int{}
			for _, x := range rejected {
				codes[x.Code]++
			}
			s.reject(r, d, codes)
		}
		s.touch(r, d)
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"applied": applied, "stale": stale, "rejected": rejected})
	})
}

// check validates a push before it touches the database. It returns an error code and message, or "".
func (s *Service) check(changes []Change) (string, string) {
	if len(changes) == 0 || len(changes) > MaxChanges {
		return "bad_request", fmt.Sprintf("Send between 1 and %d changes at a time.", MaxChanges)
	}
	seen := map[string]bool{}
	for i := range changes {
		c := &changes[i]
		if k := c.Kind + ":" + c.ID; seen[k] {
			return "bad_request", "The same record was sent twice."
		} else {
			seen[k] = true
		}
		if bytes.Equal(bytes.TrimSpace(c.Data), []byte("null")) {
			c.Data = nil
		}
		if c.Deleted != (c.Data == nil) {
			return "bad_request", "A record must have data unless it is deleted."
		}
		if c.Stamp <= 0 || c.BaseRev < 0 {
			return "bad_request", "A record has a bad stamp or base rev."
		}
	}
	return "", ""
}

// rejectReason says why one change cannot be stored, or "". These are refused one by one, never the whole push.
func (s *Service) rejectReason(c Change) string {
	switch {
	case !s.kinds[c.Kind] || len(c.Kind) > 24:
		return "unknown_kind"
	case len(c.ID) == 0 || len(c.ID) > 200:
		return "bad_id"
	case len(c.Data) > MaxData:
		return "record_too_big"
	}
	return ""
}

// allow applies the per-device rate limit.
func (s *Service) allow(w http.ResponseWriter, r *http.Request, d account.Device) bool {
	ok, first := s.rate.Allow(d.DeviceID)
	if !ok {
		if first {
			s.reject(r, d, "rate_limited")
		}
		w.Header().Set("Retry-After", "60")
		httpx.WriteError(w, http.StatusTooManyRequests, "rate_limited", "Syncing too often. It will try again in a minute.")
	}
	return ok
}

// touch notes when this device last synced, at most once a minute.
func (s *Service) touch(r *http.Request, d account.Device) {
	if !s.synced.due(d.DeviceID) {
		return
	}
	if _, err := s.db.Exec(r.Context(), `update account.devices set last_synced_at = now()
		where id = $1 and (last_synced_at is null or last_synced_at < now() - interval '1 minute')`, d.DeviceID); err != nil {
		s.log.Warn("touch last_synced_at", "error", err)
	}
}

// reject writes one sync.rejected event: a reason, or counts of rejected rows by code.
func (s *Service) reject(r *http.Request, d account.Device, reason any) {
	h, k := s.hash.Hash(reqinfo.IP(r.Context()))
	e := audit.Event{
		Action: "sync.rejected", ActorType: audit.Device, ActorIdentity: d.IdentityID, ActorDevice: d.DeviceID, SubjectIdentity: d.IdentityID,
		RequestID: httpx.RequestIDFrom(r.Context()), IPHash: h, IPKey: k, Meta: map[string]any{"reason": reason},
	}
	if err := audit.Write(r.Context(), s.db, e); err != nil {
		s.log.Warn("audit", "error", err)
	}
}

func (s *Service) fail(w http.ResponseWriter, r *http.Request, err error) {
	s.log.Error("sync", "error", err, "request_id", httpx.RequestIDFrom(r.Context()))
	httpx.WriteError(w, http.StatusInternalServerError, "internal", "Something went wrong on our side. Your progress is safe on this device.")
}

type rowKey struct{ kind, id string }

// stored is a row a push touches, as the server holds it: the record, its stored size, and whether the change
// equals it.
type stored struct {
	rec  Record
	size int64
	same bool
}

// readRows reads and locks, in one query, every stored row the push's valid changes name.
func readRows(ctx context.Context, tx pgx.Tx, identity string, changes []Change, reject func(Change) string) (map[rowKey]stored, error) {
	var valid []Change
	for _, c := range changes {
		if reject(c) == "" {
			valid = append(valid, c)
		}
	}
	out := map[rowKey]stored{}
	if len(valid) == 0 {
		return out, nil
	}
	kinds, idList, datas, dels, _ := columns(valid)
	rows, err := tx.Query(ctx, `
		select x.kind, x.rec_id, r.data, r.deleted, r.stamp, r.rev, r.data_bytes,
		       r.data is not distinct from x.d::jsonb and r.deleted = x.del
		from unnest($2::text[], $3::text[], $4::text[], $5::bool[]) as x(kind, rec_id, d, del)
		join sync.records r on r.identity_id = $1 and r.kind = x.kind and r.rec_id = x.rec_id
		for update of r`, identity, kinds, idList, datas, dels)
	if err != nil {
		return nil, fmt.Errorf("read rows: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var k rowKey
		var e stored
		if err := rows.Scan(&k.kind, &k.id, &e.rec.Data, &e.rec.Deleted, &e.rec.Stamp, &e.rec.Rev, &e.size, &e.same); err != nil {
			return nil, fmt.Errorf("read rows: %w", err)
		}
		out[k] = e
	}
	return out, rows.Err()
}

// columns turns changes into the parallel arrays the set-based queries unnest; a deletion's data is a null.
func columns(cs []Change) (kinds, idList []string, datas []*string, dels []bool, stamps []int64) {
	for _, c := range cs {
		kinds = append(kinds, c.Kind)
		idList = append(idList, c.ID)
		if c.Data == nil {
			datas = append(datas, nil)
		} else {
			v := string(c.Data)
			datas = append(datas, &v)
		}
		dels = append(dels, c.Deleted)
		stamps = append(stamps, c.Stamp)
	}
	return
}

// jsonArg passes JSON to Postgres as text (cast to jsonb in SQL), or null for a deletion.
func jsonArg(b json.RawMessage) any {
	if b == nil {
		return nil
	}
	return string(b)
}

// ExportHandler is GET /v1/me/export: everything the server holds for this progress, reminders included (the DPDP
// right to access), as a download. The browser turns the records into a backup file the existing restore can read.
func (s *Service) ExportHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		d, _ := account.FromContext(r.Context())
		var created time.Time
		if err := s.db.QueryRow(r.Context(), `select created_at from account.identities where id = $1`, d.IdentityID).Scan(&created); err != nil {
			s.fail(w, r, fmt.Errorf("export: %w", err))
			return
		}
		devRows, err := s.db.Query(r.Context(), `select label, platform, created_at, last_synced_at from account.devices
			where identity_id = $1 and revoked_at is null order by created_at`, d.IdentityID)
		if err != nil {
			s.fail(w, r, fmt.Errorf("export: %w", err))
			return
		}
		type device struct {
			Label        string     `json:"label"`
			Platform     string     `json:"platform"`
			CreatedAt    time.Time  `json:"createdAt"`
			LastSyncedAt *time.Time `json:"lastSyncedAt"`
		}
		devices, err := pgx.CollectRows(devRows, pgx.RowToStructByPos[device])
		if err != nil {
			s.fail(w, r, fmt.Errorf("export: %w", err))
			return
		}
		recRows, err := s.db.Query(r.Context(), `select kind, rec_id, data, deleted, stamp, rev from sync.records
			where identity_id = $1 and not deleted order by rev`, d.IdentityID)
		if err != nil {
			s.fail(w, r, fmt.Errorf("export: %w", err))
			return
		}
		recs, err := pgx.CollectRows(recRows, func(row pgx.CollectableRow) (Record, error) {
			var rec Record
			err := row.Scan(&rec.Kind, &rec.ID, &rec.Data, &rec.Deleted, &rec.Stamp, &rec.Rev)
			return rec, err
		})
		if err != nil {
			s.fail(w, r, fmt.Errorf("export: %w", err))
			return
		}
		// Study reminders: the choices, last practice, practice days and the weekly review's figures (F65, D97).
		var reminders json.RawMessage
		if err := s.db.QueryRow(r.Context(), `select json_build_object(
			'settings', (select json_build_object('on', enabled, 'at', at_minute, 'days', days, 'timeZone', tz, 'quietFrom', quiet_from,
				'quietTo', quiet_to, 'email', email_mode, 'weekly', weekly, 'pausedUntil', paused_until, 'emailState', email_state)
				from notify.prefs where identity_id = $1),
			'pushDevices', (select count(*) from notify.push_subs where identity_id = $1),
			'lastPractice', (select json_build_object('at', last_at, 'day', last_day, 'streak', streak) from notify.activity where identity_id = $1),
			'practiceDays', (select coalesce(json_agg(to_char(day, 'YYYY-MM-DD') order by day), '[]'::json) from notify.days where identity_id = $1),
			'weeklyFigures', (select coalesce(json_agg(json_build_object('monday', to_char(monday, 'YYYY-MM-DD'), 'figures', data) order by monday), '[]'::json)
				from notify.weeks where identity_id = $1))`, d.IdentityID).Scan(&reminders); err != nil {
			s.fail(w, r, fmt.Errorf("export: %w", err))
			return
		}
		h, k := s.hash.Hash(reqinfo.IP(r.Context()))
		if err := audit.Write(r.Context(), s.db, audit.Event{Action: "data.exported", ActorType: audit.Device, ActorIdentity: d.IdentityID,
			ActorDevice: d.DeviceID, SubjectIdentity: d.IdentityID, RequestID: httpx.RequestIDFrom(r.Context()), IPHash: h, IPKey: k,
			Meta: map[string]any{"records": len(recs)}}); err != nil {
			s.log.Warn("audit", "error", err)
		}
		w.Header().Set("Content-Disposition", `attachment; filename="99ile-server-export.json"`)
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"exportedAt": time.Now().UTC(),
			"identity":   map[string]any{"id": d.IdentityID, "createdAt": created},
			"devices":    devices,
			"records":    recs,
			"reminders":  reminders,
		})
	})
}
