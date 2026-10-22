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
	"encoding/json"
	"errors"
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
}

// Service holds what the handlers share.
type Service struct {
	db    *pgxpool.Pool
	hash  reqinfo.Hasher
	log   *slog.Logger
	opt   Options
	kinds map[string]bool
	rate  *limit.Limiter
}

// New returns the service.
func New(db *pgxpool.Pool, hash reqinfo.Hasher, log *slog.Logger, opt Options) *Service {
	k := map[string]bool{}
	for _, kind := range opt.Kinds {
		k[kind] = true
	}
	return &Service{db: db, hash: hash, log: log, opt: opt, kinds: k, rate: limit.New(opt.PerMinute, time.Minute)}
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
			var head struct {
				rev, count, bytes int64
			}
			if err := tx.QueryRow(r.Context(), `select rev, record_count, data_bytes from sync.heads where identity_id = $1 for update`,
				d.IdentityID).Scan(&head.rev, &head.count, &head.bytes); err != nil {
				return fmt.Errorf("lock head: %w", err)
			}
			wrote := false
			for _, c := range req.Changes {
				if why := s.rejectReason(c); why != "" {
					rejected = append(rejected, Rejected{c.Kind, c.ID, why})
					continue
				}
				var (
					cur  Record
					size int64
					same bool
				)
				err := tx.QueryRow(r.Context(), `
					select data, deleted, stamp, rev, data_bytes, data is not distinct from $4::jsonb and deleted = $5
					from sync.records where identity_id = $1 and kind = $2 and rec_id = $3 for update`,
					d.IdentityID, c.Kind, c.ID, jsonArg(c.Data), c.Deleted).Scan(&cur.Data, &cur.Deleted, &cur.Stamp, &cur.Rev, &size, &same)
				switch {
				case errors.Is(err, pgx.ErrNoRows):
					// A new row must fit the identity's limits; updates and deletions always may go through,
					// so a full identity can still make room.
					if head.count+1 > int64(s.opt.MaxRecords) || head.bytes+int64(len(c.Data)) > s.opt.MaxBytes {
						rejected = append(rejected, Rejected{c.Kind, c.ID, "over_limit"})
						continue
					}
					var rev, n int64
					if err := tx.QueryRow(r.Context(), `
						insert into sync.records (identity_id, kind, rec_id, data, deleted, stamp, device_id)
						values ($1, $2, $3, $4::jsonb, $5, $6, $7) returning rev, data_bytes`,
						d.IdentityID, c.Kind, c.ID, jsonArg(c.Data), c.Deleted, c.Stamp, d.DeviceID).Scan(&rev, &n); err != nil {
						return fmt.Errorf("insert %s:%s: %w", c.Kind, c.ID, err)
					}
					head.count++
					head.bytes += n
					head.rev = max(head.rev, rev)
					wrote = true
					applied = append(applied, Applied{c.Kind, c.ID, rev})
				case err != nil:
					return fmt.Errorf("read %s:%s: %w", c.Kind, c.ID, err)
				case same:
					applied = append(applied, Applied{c.Kind, c.ID, cur.Rev})
				case cur.Rev == c.BaseRev:
					if grow := int64(len(c.Data)) - size; grow > 0 && head.bytes+grow > s.opt.MaxBytes {
						rejected = append(rejected, Rejected{c.Kind, c.ID, "over_limit"})
						continue
					}
					var rev, n int64
					if err := tx.QueryRow(r.Context(), `
						update sync.records set data = $4::jsonb, deleted = $5, stamp = $6, device_id = $7, rev = nextval('sync.rev')
						where identity_id = $1 and kind = $2 and rec_id = $3 returning rev, data_bytes`,
						d.IdentityID, c.Kind, c.ID, jsonArg(c.Data), c.Deleted, c.Stamp, d.DeviceID).Scan(&rev, &n); err != nil {
						return fmt.Errorf("update %s:%s: %w", c.Kind, c.ID, err)
					}
					head.bytes += n - size
					head.rev = max(head.rev, rev)
					wrote = true
					applied = append(applied, Applied{c.Kind, c.ID, rev})
				default:
					cur.Kind, cur.ID = c.Kind, c.ID
					stale = append(stale, cur)
				}
			}
			if wrote {
				if _, err := tx.Exec(r.Context(), `update sync.heads set rev = $2, record_count = $3, data_bytes = $4 where identity_id = $1`,
					d.IdentityID, head.rev, head.count, head.bytes); err != nil {
					return fmt.Errorf("update head: %w", err)
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

// jsonArg passes JSON to Postgres as text (cast to jsonb in SQL), or null for a deletion.
func jsonArg(b json.RawMessage) any {
	if b == nil {
		return nil
	}
	return string(b)
}

// ExportHandler is GET /v1/me/export: everything the server holds for this progress (the DPDP right to access),
// as a download. The browser turns the records into a backup file the existing restore can read.
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
		})
	})
}
