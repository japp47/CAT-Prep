package notify

import (
	"bytes"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/ecdh"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/hkdf"
	"crypto/rand"
	"crypto/sha256"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// VAPID is the server's push identity (RFC 8292): a P-256 key pair, both halves base64url. The public half is
// what browsers subscribe with (GET /v1/notify/push-key); the private half signs every push and lives only in
// secrets.
type VAPID struct {
	Public  string
	Private string
	Subject string // a contact for push services: mailto:99ile.team@gmail.com
}

// NewVAPID makes a key pair (cmd/notify -vapid prints one).
func NewVAPID() (VAPID, error) {
	k, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return VAPID{}, err
	}
	d, err := k.Bytes()
	if err != nil {
		return VAPID{}, err
	}
	pub, err := k.PublicKey.Bytes()
	if err != nil {
		return VAPID{}, err
	}
	return VAPID{Public: b64.EncodeToString(pub), Private: b64.EncodeToString(d)}, nil
}

// Subscription is one browser's push address and keys, as PushSubscription.toJSON() gives them.
type Subscription struct {
	Endpoint string
	P256dh   string
	Auth     string
}

// PushPayload is what the service worker shows (pwa/sw.js).
type PushPayload struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	URL   string `json:"url"`
	Tag   string `json:"tag"`
}

// ErrGone means the push service no longer knows the subscription: remove it.
var ErrGone = errors.New("push subscription gone")

// WebPush sends encrypted pushes (RFC 8030, 8291, 8292).
type WebPush struct {
	Keys VAPID
	HTTP *http.Client
	TTL  time.Duration // how long a push service keeps an undelivered reminder
	now  func() time.Time
}

// Send delivers one payload to one subscription. ErrGone for 404 and 410; Permanent for other refusals;
// anything else may be retried.
func (w WebPush) Send(ctx context.Context, sub Subscription, p PushPayload) error {
	body, err := json.Marshal(p)
	if err != nil {
		return err
	}
	ua, err1 := b64.DecodeString(sub.P256dh)
	secret, err2 := b64.DecodeString(sub.Auth)
	if err1 != nil || err2 != nil {
		return Permanent(errors.New("bad subscription keys"))
	}
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return err
	}
	as, err := ecdh.P256().GenerateKey(rand.Reader)
	if err != nil {
		return err
	}
	msg, err := encrypt(body, ua, secret, as, salt)
	if err != nil {
		return Permanent(err)
	}
	u, err := url.Parse(sub.Endpoint)
	if err != nil || u.Scheme != "https" {
		return Permanent(errors.New("bad endpoint"))
	}
	auth, err := w.vapidHeader(u.Scheme + "://" + u.Host)
	if err != nil {
		return Permanent(err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, sub.Endpoint, bytes.NewReader(msg))
	if err != nil {
		return Permanent(err)
	}
	ttl := w.TTL
	if ttl == 0 {
		ttl = 6 * time.Hour
	}
	req.Header.Set("Authorization", auth)
	req.Header.Set("Content-Encoding", "aes128gcm")
	req.Header.Set("Content-Type", "application/octet-stream")
	req.Header.Set("TTL", fmt.Sprint(int(ttl.Seconds())))
	req.Header.Set("Urgency", "normal")
	req.Header.Set("Topic", "reminder") // a newer reminder replaces one still waiting on the push service
	client := w.HTTP
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}
	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	reply, _ := io.ReadAll(io.LimitReader(res.Body, 512))
	switch {
	case res.StatusCode >= 200 && res.StatusCode < 300:
		return nil
	case res.StatusCode == http.StatusNotFound || res.StatusCode == http.StatusGone:
		return ErrGone
	case res.StatusCode == http.StatusTooManyRequests || res.StatusCode >= 500:
		return fmt.Errorf("push service %d: %s", res.StatusCode, reply)
	default:
		return Permanent(fmt.Errorf("push service %d: %s", res.StatusCode, reply))
	}
}

// vapidHeader is "vapid t=<JWT>, k=<public key>" for one push service origin, valid for 12 hours.
func (w WebPush) vapidHeader(aud string) (string, error) {
	d, err := b64.DecodeString(w.Keys.Private)
	if err != nil {
		return "", errors.New("NOTIFY_VAPID_PRIVATE is not base64url")
	}
	key, err := ecdsa.ParseRawPrivateKey(elliptic.P256(), d)
	if err != nil {
		return "", fmt.Errorf("NOTIFY_VAPID_PRIVATE: %w", err)
	}
	now := time.Now
	if w.now != nil {
		now = w.now
	}
	head := b64.EncodeToString([]byte(`{"typ":"JWT","alg":"ES256"}`))
	claims, _ := json.Marshal(map[string]any{"aud": aud, "exp": now().Add(12 * time.Hour).Unix(), "sub": w.Keys.Subject})
	signing := head + "." + b64.EncodeToString(claims)
	sum := sha256.Sum256([]byte(signing))
	r, s, err := ecdsa.Sign(rand.Reader, key, sum[:])
	if err != nil {
		return "", err
	}
	sig := make([]byte, 64)
	r.FillBytes(sig[:32])
	s.FillBytes(sig[32:])
	return "vapid t=" + signing + "." + b64.EncodeToString(sig) + ", k=" + w.Keys.Public, nil
}

// encrypt is RFC 8291's aes128gcm message for one record: salt, record size, the server's public key, then the
// ciphertext of the payload and its 0x02 end mark.
func encrypt(plain, uaPublic, authSecret []byte, as *ecdh.PrivateKey, salt []byte) ([]byte, error) {
	ua, err := ecdh.P256().NewPublicKey(uaPublic)
	if err != nil {
		return nil, fmt.Errorf("browser key: %w", err)
	}
	shared, err := as.ECDH(ua)
	if err != nil {
		return nil, err
	}
	asPublic := as.PublicKey().Bytes()
	prkKey, err := hkdf.Extract(sha256.New, shared, authSecret)
	if err != nil {
		return nil, err
	}
	ikm, err := hkdf.Expand(sha256.New, prkKey, "WebPush: info\x00"+string(uaPublic)+string(asPublic), 32)
	if err != nil {
		return nil, err
	}
	prk, err := hkdf.Extract(sha256.New, ikm, salt)
	if err != nil {
		return nil, err
	}
	cek, err := hkdf.Expand(sha256.New, prk, "Content-Encoding: aes128gcm\x00", 16)
	if err != nil {
		return nil, err
	}
	nonce, err := hkdf.Expand(sha256.New, prk, "Content-Encoding: nonce\x00", 12)
	if err != nil {
		return nil, err
	}
	block, err := aes.NewCipher(cek)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	const recordSize = 4096
	if len(plain)+1+16 > recordSize {
		return nil, errors.New("push payload too large")
	}
	var out bytes.Buffer
	out.Write(salt)
	_ = binary.Write(&out, binary.BigEndian, uint32(recordSize))
	out.WriteByte(byte(len(asPublic)))
	out.Write(asPublic)
	out.Write(gcm.Seal(nil, nonce, append(append([]byte{}, plain...), 0x02), nil))
	return out.Bytes(), nil
}
