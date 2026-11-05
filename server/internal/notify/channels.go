package notify

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"mime"
	"mime/quotedprintable"
	"net/mail"
	"strings"
	"time"

	"github.com/japp47/CAT-Prep/server/internal/mailx"
)

// EmailChannel sends through one logged-in SMTP connection, opened at the first message and reused, paced so a
// run never bursts at Gmail (docs/design/notifications.md §6).
type EmailChannel struct {
	Server mailx.Server
	Pace   time.Duration // gap between messages; 3 seconds is 20 a minute
	Domain string        // for Message-IDs: 99ile.pages.dev
	conn   *mailx.Conn
	last   time.Time
}

func (e *EmailChannel) Name() string { return Email }

func (e *EmailChannel) Send(ctx context.Context, m Out) (Result, error) {
	if m.To == "" {
		return Result{}, Permanent(errors.New("no email address"))
	}
	if wait := e.Pace - time.Since(e.last); wait > 0 {
		select {
		case <-ctx.Done():
			return Result{}, ctx.Err()
		case <-time.After(wait):
		}
	}
	if e.conn == nil {
		c, err := e.Server.Dial()
		if err != nil {
			return Result{}, err
		}
		e.conn = c
	}
	e.last = time.Now()
	err := e.conn.Send(m.To, buildEmail(e.Server.User, m.To, e.Domain, m.ID, m.Rendered, time.Now()))
	var re mailx.RecipientError
	switch {
	case err == nil:
		return Result{}, nil
	case errors.As(err, &re):
		return Result{Bounced: true}, Permanent(err)
	default:
		e.Close() // a broken connection is not reused; the next message dials again
		return Result{}, err
	}
}

// Close ends the connection, if one is open.
func (e *EmailChannel) Close() {
	if e.conn != nil {
		_ = e.conn.Close()
		e.conn = nil
	}
}

// buildEmail is one message: plain text and HTML alternatives, with the one-click unsubscribe headers Gmail and
// Yahoo require (RFC 8058) and Auto-Submitted, so auto-replies stay away.
func buildEmail(from, to, domain string, id int64, r Rendered, now time.Time) []byte {
	var b bytes.Buffer
	boundary := "99ile-" + randomHex(12)
	h := func(k, v string) { fmt.Fprintf(&b, "%s: %s\r\n", k, v) }
	h("From", (&mail.Address{Name: "99ile", Address: from}).String())
	h("To", (&mail.Address{Address: to}).String())
	h("Subject", mime.QEncoding.Encode("utf-8", r.Subject))
	h("Date", now.Format(time.RFC1123Z))
	h("Message-ID", fmt.Sprintf("<reminder-%d-%s@%s>", id, randomHex(6), domain))
	h("MIME-Version", "1.0")
	h("List-Unsubscribe", fmt.Sprintf("<%s>, <mailto:%s?subject=unsubscribe>", r.UnsubscribeURL, from))
	h("List-Unsubscribe-Post", "List-Unsubscribe=One-Click")
	h("Auto-Submitted", "auto-generated")
	h("Content-Type", `multipart/alternative; boundary="`+boundary+`"`)
	b.WriteString("\r\n")
	for _, part := range []struct{ kind, body string }{{"text/plain", r.Text}, {"text/html", r.HTML}} {
		fmt.Fprintf(&b, "--%s\r\nContent-Type: %s; charset=utf-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n", boundary, part.kind)
		q := quotedprintable.NewWriter(&b)
		_, _ = q.Write([]byte(strings.ReplaceAll(strings.ReplaceAll(part.body, "\r\n", "\n"), "\n", "\r\n")))
		_ = q.Close()
		b.WriteString("\r\n")
	}
	fmt.Fprintf(&b, "--%s--\r\n", boundary)
	return b.Bytes()
}

func randomHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// PushChannel sends one message to every device of the student. It succeeds when any device took it; devices the
// push service no longer knows are reported as gone.
type PushChannel struct{ Push WebPush }

func (p PushChannel) Name() string { return Push }

func (p PushChannel) Send(ctx context.Context, m Out) (Result, error) {
	if len(m.Subs) == 0 {
		return Result{}, Permanent(errors.New("no push devices"))
	}
	payload := PushPayload{Title: m.Rendered.PushTitle, Body: m.Rendered.PushBody, URL: m.Rendered.URL, Tag: "reminder"}
	var res Result
	var errs []error
	sent, permanentOnly := 0, true
	for _, s := range m.Subs {
		err := p.Push.Send(ctx, s, payload)
		switch {
		case err == nil:
			sent++
		case errors.Is(err, ErrGone):
			res.Gone = append(res.Gone, s.Endpoint)
		default:
			errs = append(errs, err)
			permanentOnly = permanentOnly && IsPermanent(err)
		}
	}
	if sent > 0 {
		return res, nil
	}
	if len(errs) == 0 {
		return res, Permanent(errors.New("every device has unsubscribed"))
	}
	if permanentOnly {
		return res, Permanent(errors.Join(errs...))
	}
	return res, errors.Join(errs...)
}
