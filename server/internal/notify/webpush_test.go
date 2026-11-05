package notify

import (
	"context"
	"crypto/ecdh"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"io"
	"math/big"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func unb64(t *testing.T, s string) []byte {
	t.Helper()
	b, err := b64.DecodeString(s)
	if err != nil {
		t.Fatal(err)
	}
	return b
}

// RFC 8291 Appendix A: the worked example, byte for byte.
func TestEncryptMatchesRFC8291(t *testing.T) {
	as, err := ecdh.P256().NewPrivateKey(unb64(t, "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw"))
	if err != nil {
		t.Fatal(err)
	}
	got, err := encrypt([]byte("When I grow up, I want to be a watermelon"),
		unb64(t, "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4"),
		unb64(t, "BTBZMqHH6r4Tts7J_aSIgg"), as, unb64(t, "DGv6ra1nlYgDCS1FRnbzlw"))
	if err != nil {
		t.Fatal(err)
	}
	want := "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN"
	if b64.EncodeToString(got) != want {
		t.Errorf("got  %s\nwant %s", b64.EncodeToString(got), want)
	}
}

// pushService stands in for a browser's push service: it checks the VAPID signature and records what came.
func pushService(t *testing.T, keys VAPID, status int) (*httptest.Server, chan *http.Request) {
	t.Helper()
	seen := make(chan *http.Request, 4)
	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.ReadAll(r.Body)
		seen <- r
		w.WriteHeader(status)
	}))
	t.Cleanup(srv.Close)
	return srv, seen
}

func checkVAPID(t *testing.T, header string, keys VAPID, aud string) {
	t.Helper()
	tok, k, ok := strings.Cut(strings.TrimPrefix(header, "vapid t="), ", k=")
	if !ok || k != keys.Public {
		t.Fatalf("header %q", header)
	}
	parts := strings.Split(tok, ".")
	var claims struct {
		Aud string `json:"aud"`
		Exp int64  `json:"exp"`
		Sub string `json:"sub"`
	}
	if len(parts) != 3 || json.Unmarshal(unb64(t, parts[1]), &claims) != nil {
		t.Fatalf("token %q", tok)
	}
	if claims.Aud != aud || claims.Sub != keys.Subject || time.Until(time.Unix(claims.Exp, 0)) > 24*time.Hour {
		t.Errorf("claims %+v", claims)
	}
	pubBytes := unb64(t, keys.Public)
	x, y := elliptic.Unmarshal(elliptic.P256(), pubBytes) //nolint:staticcheck // only to verify in a test
	pub := &ecdsa.PublicKey{Curve: elliptic.P256(), X: x, Y: y}
	sig := unb64(t, parts[2])
	sum := sha256.Sum256([]byte(parts[0] + "." + parts[1]))
	if len(sig) != 64 || !ecdsa.Verify(pub, sum[:], new(big.Int).SetBytes(sig[:32]), new(big.Int).SetBytes(sig[32:])) {
		t.Error("the VAPID signature does not verify")
	}
}

func browserSub(t *testing.T, endpoint string) Subscription {
	t.Helper()
	ua, err := ecdh.P256().GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	return Subscription{Endpoint: endpoint, P256dh: b64.EncodeToString(ua.PublicKey().Bytes()), Auth: "BTBZMqHH6r4Tts7J_aSIgg"}
}

func TestWebPushSends(t *testing.T) {
	keys, err := NewVAPID()
	if err != nil {
		t.Fatal(err)
	}
	keys.Subject = "mailto:99ile.team@gmail.com"
	srv, seen := pushService(t, keys, http.StatusCreated)
	wp := WebPush{Keys: keys, HTTP: srv.Client()}
	if err := wp.Send(context.Background(), browserSub(t, srv.URL+"/push/abc"), PushPayload{Title: "Day 12 is waiting", URL: "https://99ile.pages.dev/today"}); err != nil {
		t.Fatal(err)
	}
	r := <-seen
	if r.Header.Get("Content-Encoding") != "aes128gcm" || r.Header.Get("TTL") != "21600" || r.Header.Get("Topic") != "reminder" {
		t.Errorf("headers %v", r.Header)
	}
	checkVAPID(t, r.Header.Get("Authorization"), keys, srv.URL)
}

func TestWebPushOutcomes(t *testing.T) {
	keys, _ := NewVAPID()
	for status, check := range map[int]func(error) bool{
		http.StatusGone:            func(err error) bool { return errors.Is(err, ErrGone) },
		http.StatusNotFound:        func(err error) bool { return errors.Is(err, ErrGone) },
		http.StatusForbidden:       IsPermanent,
		http.StatusTooManyRequests: func(err error) bool { return err != nil && !IsPermanent(err) },
		http.StatusBadGateway:      func(err error) bool { return err != nil && !IsPermanent(err) },
	} {
		srv, _ := pushService(t, keys, status)
		err := WebPush{Keys: keys, HTTP: srv.Client()}.Send(context.Background(), browserSub(t, srv.URL), PushPayload{Title: "x"})
		if !check(err) {
			t.Errorf("%d: %v", status, err)
		}
	}
	if err := (WebPush{Keys: keys}).Send(context.Background(), Subscription{Endpoint: "https://x", P256dh: "!!", Auth: "x"}, PushPayload{}); !IsPermanent(err) {
		t.Errorf("bad keys: %v", err)
	}
	if err := (WebPush{Keys: keys}).Send(context.Background(), browserSub(t, "http://plain.example"), PushPayload{}); !IsPermanent(err) {
		t.Errorf("plain http endpoint: %v", err)
	}
}
