// Package mailx talks to a mail server that needs a login, such as Gmail (smtp.gmail.com:587 with an app password).
// The problem-report digest sends one message a day through it; the reminder job sends many over one connection.
// It insists on TLS before sending the password, except to the host named localhost (tests).
package mailx

import (
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"net/smtp"
	"net/textproto"
	"time"
)

// Server is where and as whom to send. User is also the sender's address.
type Server struct {
	Addr     string // host:port
	User     string
	Password string
	Timeout  time.Duration // for connecting and for each message; 30 seconds when zero
}

// Conn is one logged-in connection. It is not safe for use by several goroutines.
type Conn struct {
	c       *smtp.Client
	conn    net.Conn
	from    string
	timeout time.Duration
}

// RecipientError is a refusal of one address (a 5xx reply to RCPT): the address is bad, the connection is fine.
type RecipientError struct{ Err error }

func (e RecipientError) Error() string { return "recipient refused: " + e.Err.Error() }
func (e RecipientError) Unwrap() error { return e.Err }

// Dial connects, starts TLS and logs in.
func (s Server) Dial() (*Conn, error) {
	host, _, err := net.SplitHostPort(s.Addr)
	if err != nil {
		return nil, err
	}
	timeout := s.Timeout
	if timeout == 0 {
		timeout = 30 * time.Second
	}
	conn, err := net.DialTimeout("tcp", s.Addr, timeout)
	if err != nil {
		return nil, err
	}
	_ = conn.SetDeadline(time.Now().Add(timeout))
	c, err := smtp.NewClient(conn, host)
	if err != nil {
		conn.Close()
		return nil, err
	}
	fail := func(err error) (*Conn, error) {
		c.Close()
		return nil, err
	}
	if err := c.Hello("localhost"); err != nil {
		return fail(err)
	}
	if ok, _ := c.Extension("STARTTLS"); ok {
		if err := c.StartTLS(&tls.Config{ServerName: host, MinVersion: tls.VersionTLS12}); err != nil {
			return fail(err)
		}
	} else if host != "localhost" {
		return fail(errors.New("the mail server does not offer TLS; not sending the password"))
	}
	if err := c.Auth(smtp.PlainAuth("", s.User, s.Password, host)); err != nil {
		return fail(fmt.Errorf("login: %w", err))
	}
	return &Conn{c: c, conn: conn, from: s.User, timeout: timeout}, nil
}

// Send delivers one message, already built with its headers, to one address.
func (m *Conn) Send(to string, msg []byte) error {
	_ = m.conn.SetDeadline(time.Now().Add(m.timeout))
	if err := m.c.Mail(m.from); err != nil {
		return err
	}
	if err := m.c.Rcpt(to); err != nil {
		_ = m.c.Reset()
		if code := replyCode(err); code >= 500 && code < 600 {
			return RecipientError{err}
		}
		return err
	}
	w, err := m.c.Data()
	if err != nil {
		return err
	}
	if _, err := w.Write(msg); err != nil {
		return err
	}
	return w.Close()
}

// Close says goodbye and closes the connection.
func (m *Conn) Close() error {
	err := m.c.Quit()
	m.c.Close()
	return err
}

// Send is one message on its own connection.
func (s Server) Send(to string, msg []byte) error {
	c, err := s.Dial()
	if err != nil {
		return err
	}
	if err := c.Send(to, msg); err != nil {
		c.c.Close()
		return err
	}
	return c.Close()
}

// replyCode is the server's three-digit reply to a refused command, or 0.
func replyCode(err error) int {
	var te *textproto.Error
	if errors.As(err, &te) {
		return te.Code
	}
	return 0
}
