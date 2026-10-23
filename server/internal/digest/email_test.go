package digest

import (
	"bufio"
	"errors"
	"io"
	"mime/quotedprintable"
	"net"
	"strings"
	"testing"
)

func withNotes() Pending {
	p := sample()
	p.Groups[0].Notes = []Note{{At: at("2026-10-23T09:30:00Z"), Page: "/practice/rc/econ-1", Text: "B fits paragraph 2.\nNot D."}}
	return p
}

func TestEmailCarriesTheNotesAndTheIssueDoesNot(t *testing.T) {
	subject, body := Email(withNotes(), ist, "https://github.com/o/r/issues/12")
	if subject != "99ile: 3 new problem reports" {
		t.Fatalf("subject %q", subject)
	}
	for _, want := range []string{"rc:econ-1:2 (Q3): wrong answer key, 2 reports", "23 Oct 15:00, /practice/rc/econ-1", "    B fits paragraph 2.\n    Not D.", "pj:bees: typo, 1 report\n  No notes.", "The same list, without notes: https://github.com/o/r/issues/12"} {
		if !strings.Contains(body, want) {
			t.Errorf("missing %q in\n%s", want, body)
		}
	}
	if strings.Contains(Markdown(withNotes(), ist), "B fits") {
		t.Fatal("a note reached the public comment")
	}
}

func TestDeliverMarksWhenEitherChannelWorks(t *testing.T) {
	ok := func() (string, error) { return "https://x/1", nil }
	bad := func() (string, error) { return "", errors.New("down") }
	var gotIssue string
	mailOK := func(issue string) error { gotIssue = issue; return nil }
	mailBad := func(string) error { return errors.New("login") }

	if sent, err := Deliver(ok, mailOK); !sent || err != nil || gotIssue != "https://x/1" {
		t.Fatalf("both: %v %v %q", sent, err, gotIssue)
	}
	if sent, err := Deliver(bad, mailOK); !sent || err == nil || !strings.Contains(err.Error(), "github") || gotIssue != "" {
		t.Fatalf("github down: %v %v %q", sent, err, gotIssue)
	}
	if sent, err := Deliver(ok, mailBad); !sent || err == nil || !strings.Contains(err.Error(), "email") {
		t.Fatalf("mail down: %v %v", sent, err)
	}
	if sent, err := Deliver(bad, mailBad); sent || err == nil {
		t.Fatalf("both down: %v %v", sent, err)
	}
	if sent, err := Deliver(nil, mailOK); !sent || err != nil {
		t.Fatalf("email only: %v %v", sent, err)
	}
}

// fakeSMTP is just enough of a mail server on localhost: no TLS (allowed only there), AUTH PLAIN, one message.
func fakeSMTP(t *testing.T, acceptLogin bool) (addr string, got chan string) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { l.Close() })
	got = make(chan string, 1)
	go func() {
		c, err := l.Accept()
		if err != nil {
			return
		}
		defer c.Close()
		r := bufio.NewReader(c)
		say := func(s string) { _, _ = io.WriteString(c, s+"\r\n") }
		say("220 fake")
		var data strings.Builder
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
				if acceptLogin {
					say("235 ok")
				} else {
					say("535 bad credentials")
				}
			case strings.HasPrefix(cmd, "MAIL"), strings.HasPrefix(cmd, "RCPT"):
				say("250 ok")
			case cmd == "DATA":
				say("354 go")
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

func TestSMTPSendsOneReadableMessage(t *testing.T) {
	addr, got := fakeSMTP(t, true)
	addr = strings.Replace(addr, "127.0.0.1", "localhost", 1)
	m := SMTP{Addr: addr, User: "team@example.com", Password: "app-pass", To: "team@example.com"}
	subject, body := Email(withNotes(), ist, "")
	if err := m.Send(subject, body+"\nरिपोर्ट"); err != nil {
		t.Fatal(err)
	}
	msg := <-got
	head, raw, _ := strings.Cut(msg, "\r\n\r\n")
	if !strings.Contains(head, "Subject: 99ile: 3 new problem reports") || !strings.Contains(head, "To: team@example.com") {
		t.Fatalf("headers:\n%s", head)
	}
	text, err := io.ReadAll(quotedprintable.NewReader(strings.NewReader(raw)))
	if err != nil || !strings.Contains(string(text), "B fits paragraph 2.") || !strings.Contains(string(text), "रिपोर्ट") {
		t.Fatalf("body %q %v", text, err)
	}
}

func TestSMTPReportsAFailedLogin(t *testing.T) {
	addr, _ := fakeSMTP(t, false)
	addr = strings.Replace(addr, "127.0.0.1", "localhost", 1)
	err := SMTP{Addr: addr, User: "a@b.c", Password: "wrong", To: "a@b.c"}.Send("s", "b")
	if err == nil || !strings.Contains(err.Error(), "login") {
		t.Fatalf("err %v", err)
	}
}

func TestSMTPRefusesToSendThePasswordWithoutTLS(t *testing.T) {
	addr, _ := fakeSMTP(t, true)
	// The same server reached as 127.0.0.1 rather than by the name localhost counts as remote.
	err := SMTP{Addr: addr, User: "a@b.c", Password: "p", To: "a@b.c"}.Send("s", "b")
	if err == nil || !strings.Contains(err.Error(), "TLS") {
		t.Fatalf("sent without TLS to a remote host: %v", err)
	}
}
