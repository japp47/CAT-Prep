package notify

import (
	"context"
	"errors"
)

// Out is one message as a channel receives it: rendered, with where to deliver it.
type Out struct {
	ID       int64
	Identity string
	Kind     string
	Rendered Rendered
	To       string         // email: the address
	Subs     []Subscription // push: every device of the student
}

// Result is what a channel learned while sending, apart from success.
type Result struct {
	Gone    []string // push endpoints the service no longer knows; their rows are removed
	Bounced bool     // email: the address was refused; email stops for this student
}

// Channel delivers rendered messages one way. Adding a way to reach students is adding a Channel; the rules and
// the queue do not change (docs/design/notifications.md §4).
type Channel interface {
	Name() string
	Send(ctx context.Context, m Out) (Result, error)
}

// Permanent marks an error that retrying cannot fix (a bad address, a refused key). Anything else is retried.
func Permanent(err error) error {
	if err == nil {
		return nil
	}
	return permanent{err}
}

type permanent struct{ err error }

func (p permanent) Error() string { return p.err.Error() }
func (p permanent) Unwrap() error { return p.err }

// IsPermanent reports whether err was marked Permanent.
func IsPermanent(err error) bool {
	var p permanent
	return errors.As(err, &p)
}
