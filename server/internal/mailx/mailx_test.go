package mailx

import (
	"bufio"
	"errors"
	"io"
	"net"
	"strings"
	"testing"
)

// fakeServer is just enough of a mail server on localhost: no TLS (allowed only there), AUTH PLAIN, any number of
// messages on one connection, and it refuses the address bad@example.com.
func fakeServer(t *testing.T) (addr string, got chan string) {
	t.Helper()
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { l.Close() })
	got = make(chan string, 8)
	go func() {
		c, err := l.Accept()
		if err != nil {
			return
		}
		defer c.Close()
		r := bufio.NewReader(c)
		say := func(s string) { _, _ = io.WriteString(c, s+"\r\n") }
		say("220 fake")
		for {
			line, err := r.ReadString('\n')
			if err != nil {
				return
			}
			cmd := strings.ToUpper(strings.TrimSpace(line))
			switch {
			case strings.HasPrefix(cmd, "EHLO"):
				say("250-fake")
				say("250 AUTH PLAIN")
			case strings.HasPrefix(cmd, "AUTH"):
				say("235 ok")
			case strings.HasPrefix(cmd, "RCPT") && strings.Contains(cmd, "BAD@"):
				say("550 5.1.1 no such user")
			case cmd == "DATA":
				say("354 go")
				var data strings.Builder
				for {
					l, err := r.ReadString('\n')
					if err != nil || l == ".\r\n" {
						break
					}
					data.WriteString(l)
				}
				got <- data.String()
				say("250 queued")
			case cmd == "QUIT":
				say("221 bye")
				return
			default:
				say("250 ok")
			}
		}
	}()
	return l.Addr().String(), got
}

func TestOneConnectionManyMessages(t *testing.T) {
	addr, got := fakeServer(t)
	host, port, _ := net.SplitHostPort(addr)
	if host != "127.0.0.1" {
		t.Fatal(host)
	}
	c, err := Server{Addr: "localhost:" + port, User: "team@example.com", Password: "app-pass"}.Dial()
	if err != nil {
		t.Fatal(err)
	}
	for _, to := range []string{"a@example.com", "b@example.com"} {
		if err := c.Send(to, []byte("Subject: hi\r\n\r\nhello "+to+"\r\n")); err != nil {
			t.Fatal(err)
		}
		if body := <-got; !strings.Contains(body, "hello "+to) {
			t.Errorf("got %q", body)
		}
	}
	var re RecipientError
	if err := c.Send("bad@example.com", []byte("x\r\n")); !errors.As(err, &re) {
		t.Errorf("a refused address: %v", err)
	}
	if err := c.Send("c@example.com", []byte("Subject: after\r\n\r\nstill fine\r\n")); err != nil {
		t.Errorf("the connection should survive a refused address: %v", err)
	}
	<-got
	if err := c.Close(); err != nil {
		t.Error(err)
	}
}

func TestNoPasswordWithoutTLS(t *testing.T) {
	addr, _ := fakeServer(t)
	if _, err := (Server{Addr: addr, User: "a@b.c", Password: "p"}).Dial(); err == nil || !strings.Contains(err.Error(), "TLS") {
		t.Errorf("sent the password in the clear to 127.0.0.1: %v", err)
	}
}
