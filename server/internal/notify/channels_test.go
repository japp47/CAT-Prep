package notify

import (
	"context"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"net/mail"
	"strings"
	"testing"
	"time"
)

func TestBuildEmail(t *testing.T) {
	r := Rendered{Subject: "Day 12 is waiting", Text: "Day 12 is waiting\nStart: https://99ile.pages.dev/x", HTML: "<h1>Day 12 is waiting</h1>",
		UnsubscribeURL: "https://99ile.pages.dev/api/v1/unsubscribe?t=tok"}
	raw := buildEmail("99ile.team@gmail.com", "student@example.com", "99ile.pages.dev", 42, r, time.Date(2026, 11, 10, 14, 15, 0, 0, time.UTC))
	msg, err := mail.ReadMessage(strings.NewReader(string(raw)))
	if err != nil {
		t.Fatal(err)
	}
	h := msg.Header
	for k, want := range map[string]string{
		"From":                  `"99ile" <99ile.team@gmail.com>`,
		"To":                    "<student@example.com>",
		"Subject":               "Day 12 is waiting",
		"List-Unsubscribe":      "<https://99ile.pages.dev/api/v1/unsubscribe?t=tok>, <mailto:99ile.team@gmail.com?subject=unsubscribe>",
		"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
		"Auto-Submitted":        "auto-generated",
	} {
		if got := h.Get(k); got != want {
			t.Errorf("%s = %q, want %q", k, got, want)
		}
	}
	if !strings.HasPrefix(h.Get("Message-ID"), "<reminder-42-") || !strings.HasSuffix(h.Get("Message-ID"), "@99ile.pages.dev>") {
		t.Errorf("Message-ID %q", h.Get("Message-ID"))
	}
	kind, params, err := mime.ParseMediaType(h.Get("Content-Type"))
	if err != nil || kind != "multipart/alternative" {
		t.Fatalf("content type %q", h.Get("Content-Type"))
	}
	mr := multipart.NewReader(msg.Body, params["boundary"])
	var types []string
	for {
		p, err := mr.NextPart()
		if err != nil {
			break
		}
		body, _ := io.ReadAll(p) // quoted-printable is decoded by the reader
		types = append(types, p.Header.Get("Content-Type"))
		if !strings.Contains(string(body), "Day 12 is waiting") {
			t.Errorf("%s part: %q", p.Header.Get("Content-Type"), body)
		}
	}
	if strings.Join(types, ",") != "text/plain; charset=utf-8,text/html; charset=utf-8" {
		t.Errorf("parts %v: plain text first, then HTML", types)
	}
}

func TestPushChannelReachesAnyDevice(t *testing.T) {
	keys, _ := NewVAPID()
	ok, _ := pushService(t, keys, http.StatusCreated)
	gone, _ := pushService(t, keys, http.StatusGone) // httptest servers share one test certificate, so one client trusts both
	ch := PushChannel{Push: WebPush{Keys: keys, HTTP: ok.Client()}}
	out := Out{Rendered: Rendered{PushTitle: "t", URL: "https://99ile.pages.dev/today"}}

	out.Subs = []Subscription{browserSub(t, gone.URL), browserSub(t, ok.URL)}
	res, err := ch.Send(context.Background(), out)
	if err != nil || len(res.Gone) != 1 || res.Gone[0] != gone.URL {
		t.Errorf("one gone, one delivered: %+v, %v", res, err)
	}

	out.Subs = []Subscription{browserSub(t, gone.URL)}
	if _, err := ch.Send(context.Background(), out); !IsPermanent(err) {
		t.Errorf("every device gone: %v", err)
	}
	out.Subs = nil
	if _, err := ch.Send(context.Background(), out); !IsPermanent(err) {
		t.Errorf("no devices: %v", err)
	}
}
