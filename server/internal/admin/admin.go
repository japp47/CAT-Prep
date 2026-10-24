// Package admin is the staff API behind /admin (docs/feature.md F79, B8). Staff are signed-in accounts with an
// active grant in schema access (docs/database.md §4). Handlers check a permission, never a role name, and anyone
// without it gets 404, so the routes do not reveal that they exist. No handler returns a student's answers (D14).
package admin

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/japp47/CAT-Prep/server/internal/account"
	"github.com/japp47/CAT-Prep/server/internal/audit"
	"github.com/japp47/CAT-Prep/server/internal/httpx"
	"github.com/japp47/CAT-Prep/server/internal/reqinfo"
)

// Permission keys. They match the seed in migrations/00011_access.sql (a test checks).
const (
	FeedbackRead    = "feedback.read"
	FeedbackResolve = "feedback.resolve"
	StatsRead       = "stats.read"
)

// Used lists every key this package checks.
var Used = []string{FeedbackRead, FeedbackResolve, StatsRead}

// Staff is the signed-in staff member making a request.
type Staff struct {
	UserID      string
	Email       string
	Device      account.Device
	Permissions map[string]bool
}

type staffKey struct{}

// Service holds what the handlers share.
type Service struct {
	db   *pgxpool.Pool
	hash reqinfo.Hasher
	log  *slog.Logger
}

// New returns the service.
func New(db *pgxpool.Pool, hash reqinfo.Hasher, log *slog.Logger) *Service {
	return &Service{db: db, hash: hash, log: log}
}

// notFound is every refusal: no device, no account, no grant, or not this permission.
func notFound(w http.ResponseWriter) {
	httpx.WriteError(w, http.StatusNotFound, "not_found", "That page does not exist.")
}

// Require lets a request through only for a staff member holding perm. It runs after account.Optional, so a
// request without a working device cookie arrives with no device and gets 404 like everyone else.
func (s *Service) Require(perm string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		d, ok := account.FromContext(r.Context())
		if !ok {
			notFound(w)
			return
		}
		st, err := s.staff(r.Context(), d)
		if err != nil {
			s.fail(w, r, err)
			return
		}
		if st == nil || !st.Permissions[perm] {
			notFound(w)
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), staffKey{}, *st)))
	})
}

// staff finds the account that owns d's identity and the permissions of its active grants; nil when there are none.
func (s *Service) staff(ctx context.Context, d account.Device) (*Staff, error) {
	rows, err := s.db.Query(ctx, `
		select u.id::text, u.email, rp.permission_key
		from account.users u
		join access.grants g on g.user_id = u.id and g.revoked_at is null
		join access.role_permissions rp on rp.role_key = g.role_key
		where u.identity_id = $1`, d.IdentityID)
	if err != nil {
		return nil, fmt.Errorf("find staff: %w", err)
	}
	defer rows.Close()
	st := Staff{Device: d, Permissions: map[string]bool{}}
	for rows.Next() {
		var perm string
		if err := rows.Scan(&st.UserID, &st.Email, &perm); err != nil {
			return nil, err
		}
		st.Permissions[perm] = true
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(st.Permissions) == 0 {
		return nil, nil
	}
	return &st, nil
}

func from(ctx context.Context) Staff {
	st, _ := ctx.Value(staffKey{}).(Staff)
	return st
}

// MeHandler is GET /v1/admin/me, behind account.Optional: a staff member's email and the permissions this
// package checks, so the browser knows to show Admin and which tabs. Anyone else gets 404.
func (s *Service) MeHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		d, ok := account.FromContext(r.Context())
		if !ok {
			notFound(w)
			return
		}
		st, err := s.staff(r.Context(), d)
		if err != nil {
			s.fail(w, r, err)
			return
		}
		if st == nil {
			notFound(w)
			return
		}
		perms := []string{}
		for _, p := range Used {
			if st.Permissions[p] {
				perms = append(perms, p)
			}
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"email": st.Email, "permissions": perms})
	})
}

func (s *Service) event(r *http.Request, st Staff, action, targetType, targetID string, meta map[string]any) audit.Event {
	h, k := s.hash.Hash(reqinfo.IP(r.Context()))
	return audit.Event{
		Action: action, ActorType: audit.Admin, ActorIdentity: st.Device.IdentityID, ActorDevice: st.Device.DeviceID,
		TargetType: targetType, TargetID: targetID, RequestID: httpx.RequestIDFrom(r.Context()), IPHash: h, IPKey: k, Meta: meta,
	}
}

func (s *Service) fail(w http.ResponseWriter, r *http.Request, err error) {
	s.log.Error("admin", "error", err, "request_id", httpx.RequestIDFrom(r.Context()))
	httpx.WriteError(w, http.StatusInternalServerError, "internal", "Something went wrong on our side.")
}
