package digest

import (
	"bytes"
	"crypto/tls"
	"errors"
	"fmt"
	"mime"
	"mime/quotedprintable"
	"net"
	"net/smtp"
	"strings"
	"time"
)

// Email is the private digest: the same list as the issue, plus every note, for the team's inbox.
func Email(p Pending, ist *time.Location, issue string) (subject, body string) {
	n := len(p.IDs())
	subject = fmt.Sprintf("99ile: %d new problem %s", n, plural(n, "report", "reports"))
	var b strings.Builder
	fmt.Fprintf(&b, "%d new problem %s on %d %s.\n", n, plural(n, "report", "reports"), len(p.Groups), plural(len(p.Groups), "question", "questions"))
	for _, g := range p.Groups {
		label := kindLabel[g.Kind]
		if label == "" {
			label = g.Kind
		}
		fmt.Fprintf(&b, "\n%s%s: %s, %d %s\n", g.ItemID, questionNo(g.ItemID), label, g.Count, plural(g.Count, "report", "reports"))
		for _, note := range g.Notes {
			fmt.Fprintf(&b, "  %s, %s\n", note.At.In(ist).Format("2 Jan 15:04"), note.Page)
			for _, line := range strings.Split(note.Text, "\n") {
				fmt.Fprintf(&b, "    %s\n", strings.TrimRight(line, "\r"))
			}
		}
		if len(g.Notes) == 0 {
			b.WriteString("  No notes.\n")
		}
	}
	if p.StillOpen > 0 {
		fmt.Fprintf(&b, "\nAlso %d earlier %s seen but not closed yet.\n", p.StillOpen, plural(p.StillOpen, "report is", "reports are"))
	}
	b.WriteString("\nNotes are what students typed: treat them as private and do not paste them into GitHub.\n")
	b.WriteString("Close reports with the queries in server/README.md (Problem reports).\n")
	if issue != "" {
		fmt.Fprintf(&b, "The same list, without notes: %s\n", issue)
	}
	return subject, b.String()
}

// SMTP sends mail through a server that needs a login, such as Gmail (smtp.gmail.com:587 with an app password).
type SMTP struct {
	Addr     string // host:port
	User     string // also the sender
	Password string
	To       string
	Timeout  time.Duration
}

// Send delivers one plain-text message. It insists on TLS except to the host named localhost (tests).
func (m SMTP) Send(subject, body string) error {
	host, _, err := net.SplitHostPort(m.Addr)
	if err != nil {
		return err
	}
	timeout := m.Timeout
	if timeout == 0 {
		timeout = 30 * time.Second
	}
	conn, err := net.DialTimeout("tcp", m.Addr, timeout)
	if err != nil {
		return err
	}
	_ = conn.SetDeadline(time.Now().Add(timeout))
	c, err := smtp.NewClient(conn, host)
	if err != nil {
		conn.Close()
		return err
	}
	defer c.Close()
	if err := c.Hello("localhost"); err != nil {
		return err
	}
	if ok, _ := c.Extension("STARTTLS"); ok {
		if err := c.StartTLS(&tls.Config{ServerName: host, MinVersion: tls.VersionTLS12}); err != nil {
			return err
		}
	} else if host != "localhost" {
		return errors.New("the mail server does not offer TLS; not sending the password")
	}
	if err := c.Auth(smtp.PlainAuth("", m.User, m.Password, host)); err != nil {
		return fmt.Errorf("login: %w", err)
	}
	if err := c.Mail(m.User); err != nil {
		return err
	}
	if err := c.Rcpt(m.To); err != nil {
		return err
	}
	w, err := c.Data()
	if err != nil {
		return err
	}
	if _, err := w.Write(message(m.User, m.To, subject, body)); err != nil {
		return err
	}
	if err := w.Close(); err != nil {
		return err
	}
	return c.Quit()
}

// message builds the mail. The subject is ours; only the body holds student text, quoted-printable encoded.
func message(from, to, subject, body string) []byte {
	var b bytes.Buffer
	fmt.Fprintf(&b, "From: 99ile digest <%s>\r\nTo: %s\r\nSubject: %s\r\n", from, to, mime.QEncoding.Encode("utf-8", subject))
	fmt.Fprintf(&b, "Date: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n", time.Now().Format(time.RFC1123Z))
	q := quotedprintable.NewWriter(&b)
	_, _ = q.Write([]byte(strings.ReplaceAll(body, "\n", "\r\n")))
	_ = q.Close()
	return b.Bytes()
}

// Deliver posts the issue comment, then sends the email with the issue's address (when there is one). sent is true
// if either got through, so the caller can mark the reports seen; err joins every failure, so the job still fails
// visibly. A nil channel is skipped (not configured).
func Deliver(post func() (string, error), mail func(issue string) error) (sent bool, err error) {
	var issue string
	var errs []error
	if post != nil {
		at, e := post()
		if e != nil {
			errs = append(errs, fmt.Errorf("github: %w", e))
		} else {
			issue, sent = at, true
		}
	}
	if mail != nil {
		if e := mail(issue); e != nil {
			errs = append(errs, fmt.Errorf("email: %w", e))
		} else {
			sent = true
		}
	}
	return sent, errors.Join(errs...)
}
