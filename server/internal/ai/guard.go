package ai

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

// The gate every model call passes (D100, docs/design/explain-mistake.md, "Security"). Tokens are the only thing a
// stranger could steal here, so each new generation needs, in order:
//  1. a verified Google account, since sync identities cost nothing to make and would each bring their own cap;
//  2. room under the network address's hourly limit (Service.IPs), against one machine with many accounts;
//  3. a seat under the student's daily cap, and
//  4. a share of the day's token budget,
//
// the last two taken atomically in the database before the model is called: a conditional upsert on one row, so fifty
// requests fired at once cannot all read "under the cap" and all go through. Cached answers skip the gate entirely.

// estimate is the tokens reserved before a call and settled against what the call used.
const estimate = 2500

// budgetKind is the ai.usage row that holds the day's total; the other rows are per-kind figures for the owner.
const budgetKind = "all"

var (
	errNoAccount = errors.New("no account")
	errIPLimit   = errors.New("ip limit")
)

type ticket struct {
	identity, kind string
}

func (s *Service) admit(ctx context.Context, identity, ip, kind string) (*ticket, error) {
	var signedIn bool
	if err := s.DB.QueryRow(ctx, `select exists (select 1 from account.users where identity_id = $1 and email_verified)`, identity).Scan(&signedIn); err != nil {
		return nil, err
	}
	if !signedIn {
		return nil, errNoAccount
	}
	if s.IPs != nil && ip != "" {
		if ok, _ := s.IPs.Allow(ip); !ok {
			return nil, errIPLimit
		}
	}
	var n int
	err := s.DB.QueryRow(ctx, `insert into ai.daily (identity_id, day, n) values ($1, current_date, 1)
		on conflict (identity_id, day) do update set n = ai.daily.n + 1 where ai.daily.n < $2 returning n`, identity, s.PerStudent).Scan(&n)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errStudentCap
	}
	if err != nil {
		return nil, err
	}
	t := &ticket{identity: identity, kind: kind}
	if n > s.PerStudent { // a cap of 0: the first insert still made a row
		s.giveBack(ctx, t)
		return nil, errStudentCap
	}
	var total int
	err = s.DB.QueryRow(ctx, `insert into ai.usage (day, kind, tokens) values (current_date, $3, $1)
		on conflict (day, kind) do update set tokens = ai.usage.tokens + $1 where ai.usage.tokens + $1 <= $2 returning tokens`,
		estimate, s.DailyBudget, budgetKind).Scan(&total)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && total > s.DailyBudget) {
		if err == nil {
			s.unreserve(ctx, estimate)
		}
		s.giveBack(ctx, t)
		return nil, errBudget
	}
	if err != nil {
		s.giveBack(ctx, t)
		return nil, err
	}
	return t, nil
}

// settle replaces the reservation with the tokens the call used, records the kind's figures, and gives the student's
// seat back when nothing was made (the model was busy, or its reply failed the check twice).
func (s *Service) settle(ctx context.Context, t *ticket, tokens int, made bool) {
	s.unreserve(ctx, estimate-tokens)
	gen := 0
	if made {
		gen = 1
	}
	if _, err := s.DB.Exec(ctx, `insert into ai.usage (day, kind, generations, tokens) values (current_date, $1, $2, $3)
		on conflict (day, kind) do update set generations = ai.usage.generations + excluded.generations, tokens = ai.usage.tokens + excluded.tokens`,
		t.kind, gen, tokens); err != nil {
		s.Log.Warn("ai: usage", "error", err)
	}
	if !made {
		s.giveBack(ctx, t)
	}
}

func (s *Service) unreserve(ctx context.Context, tokens int) {
	if _, err := s.DB.Exec(ctx, `update ai.usage set tokens = greatest(tokens - $1, 0) where day = current_date and kind = $2`, tokens, budgetKind); err != nil {
		s.Log.Warn("ai: budget", "error", err)
	}
}

func (s *Service) giveBack(ctx context.Context, t *ticket) {
	if _, err := s.DB.Exec(ctx, `update ai.daily set n = greatest(n - 1, 0) where identity_id = $1 and day = current_date`, t.identity); err != nil {
		s.Log.Warn("ai: student count", "error", err)
	}
}

// signedIn reports whether an identity has a verified Google account, for the status the site asks for.
func (s *Service) signedIn(ctx context.Context, identity string) bool {
	var ok bool
	_ = s.DB.QueryRow(ctx, `select exists (select 1 from account.users where identity_id = $1 and email_verified)`, identity).Scan(&ok)
	return ok
}
