package notify

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Planned is a message the planner wants queued.
type Planned struct {
	Identity, Kind, Channel, Key, Variant string
	Vars                                  Vars
	Priority                              int
	RunAt                                 time.Time
}

// Claimed is a message a worker holds until its lease runs out.
type Claimed struct {
	ID                               int64
	Identity, Kind, Channel, Variant string
	Vars                             Vars
	Attempts                         int
	CreatedAt                        time.Time
}

// Queue is all the worker knows of where messages wait. Postgres is the only one today; another (River, Redis,
// a cloud queue) is another implementation of these five methods (docs/design/notifications.md §7).
type Queue interface {
	// Enqueue adds messages; one whose key is already queued or sent is left out. It returns how many went in.
	Enqueue(ctx context.Context, ms []Planned) (int, error)
	// Claim takes up to n due messages for lease; a message whose lease ran out is due again.
	Claim(ctx context.Context, n int, lease time.Duration) ([]Claimed, error)
	// Finish records the end of a message: sent, skipped, failed or dead, with why.
	Finish(ctx context.Context, id int64, status, reason string) error
	// Retry puts a message back to run at a later time, with the error that stopped it.
	Retry(ctx context.Context, id int64, at time.Time, reason string) error
	// Release puts a message back untried (its channel is paused for this run).
	Release(ctx context.Context, id int64, at time.Time) error
}

// PG is the Postgres queue: notify.messages, claimed with FOR UPDATE SKIP LOCKED so any number of workers can
// run at once and never hold the same message.
type PG struct{ DB *pgxpool.Pool }

func (q PG) Enqueue(ctx context.Context, ms []Planned) (int, error) {
	if len(ms) == 0 {
		return 0, nil
	}
	b := &pgx.Batch{}
	for _, m := range ms {
		vars, err := json.Marshal(m.Vars)
		if err != nil {
			return 0, err
		}
		b.Queue(`insert into notify.messages (identity_id, kind, channel, dedupe_key, variant, vars, priority, run_at)
			values ($1, $2, $3, $4, $5, $6, $7, $8) on conflict (dedupe_key) do nothing`,
			m.Identity, m.Kind, m.Channel, m.Key, m.Variant, vars, m.Priority, m.RunAt)
	}
	res := q.DB.SendBatch(ctx, b)
	defer res.Close()
	n := 0
	for range ms {
		tag, err := res.Exec()
		if err != nil {
			return n, fmt.Errorf("enqueue: %w", err)
		}
		n += int(tag.RowsAffected())
	}
	return n, nil
}

func (q PG) Claim(ctx context.Context, n int, lease time.Duration) ([]Claimed, error) {
	rows, err := q.DB.Query(ctx, `
		update notify.messages m set status = 'working', locked_until = now() + $2::interval, attempts = attempts + 1
		where id in (
			select id from notify.messages
			where (status = 'queued' and run_at <= now()) or (status = 'working' and locked_until < now())
			order by priority, run_at
			limit $1
			for update skip locked)
		returning id, identity_id, kind, channel, variant, vars, attempts, created_at`, n, lease.String())
	if err != nil {
		return nil, fmt.Errorf("claim: %w", err)
	}
	return pgx.CollectRows(rows, func(r pgx.CollectableRow) (Claimed, error) {
		var c Claimed
		var vars []byte
		if err := r.Scan(&c.ID, &c.Identity, &c.Kind, &c.Channel, &c.Variant, &vars, &c.Attempts, &c.CreatedAt); err != nil {
			return c, err
		}
		return c, json.Unmarshal(vars, &c.Vars)
	})
}

func (q PG) Finish(ctx context.Context, id int64, status, reason string) error {
	_, err := q.DB.Exec(ctx, `update notify.messages set status = $2, reason = left($3, 500), locked_until = null,
		sent_at = case when $2 = 'sent' then now() end where id = $1`, id, status, reason)
	return err
}

func (q PG) Retry(ctx context.Context, id int64, at time.Time, reason string) error {
	_, err := q.DB.Exec(ctx, `update notify.messages set status = 'queued', run_at = $2, reason = left($3, 500), locked_until = null where id = $1`, id, at, reason)
	return err
}

func (q PG) Release(ctx context.Context, id int64, at time.Time) error {
	_, err := q.DB.Exec(ctx, `update notify.messages set status = 'queued', run_at = $2, attempts = greatest(attempts - 1, 0), locked_until = null where id = $1`, id, at)
	return err
}
