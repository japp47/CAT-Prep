// Package audit writes rows to audit.events (docs/database.md §5.5): security and account events only, never
// study content, secrets, codes or cookies. The server's database role can insert and read here, nothing else.
package audit

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgconn"
)

// Actor types.
const (
	Device = "device"
	Admin  = "admin"
	System = "system"
)

// Event is one row. Empty strings are stored as null.
type Event struct {
	Action          string // area.verb, such as identity.created
	ActorType       string
	ActorIdentity   string
	ActorDevice     string
	SubjectIdentity string
	TargetType      string
	TargetID        string
	RequestID       string
	IPHash          []byte
	IPKey           int16
	Meta            map[string]any
}

// Execer is a pool or a transaction.
type Execer interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

// Write inserts e.
func Write(ctx context.Context, db Execer, e Event) error {
	meta := []byte("{}")
	if len(e.Meta) > 0 {
		var err error
		if meta, err = json.Marshal(e.Meta); err != nil {
			return fmt.Errorf("audit meta: %w", err)
		}
	}
	var ipKey any
	if e.IPHash != nil {
		ipKey = e.IPKey
	}
	_, err := db.Exec(ctx, `insert into audit.events
		(action, actor_type, actor_identity_id, actor_device_id, subject_identity_id, target_type, target_id, request_id, ip_hash, ip_key, meta)
		values ($1, $2, $3::uuid, $4::uuid, $5::uuid, $6, $7, $8, $9, $10, $11::jsonb)`,
		e.Action, e.ActorType, null(e.ActorIdentity), null(e.ActorDevice), null(e.SubjectIdentity),
		null(e.TargetType), null(e.TargetID), null(e.RequestID), e.IPHash, ipKey, string(meta))
	if err != nil {
		return fmt.Errorf("write audit event %s: %w", e.Action, err)
	}
	return nil
}

func null(s string) any {
	if s == "" {
		return nil
	}
	return s
}
