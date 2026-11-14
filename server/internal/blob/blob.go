// Package blob keeps article text in object storage (D107, docs/design/article-to-rc.md, "Where the article text
// lives"): Cloudflare R2 in production through its S3 API, signed with AWS Signature Version 4, without an SDK. The
// bucket is private; only the API reads it, and only for students who made a set from that article.
package blob

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"
)

// ErrNotFound is an object that is not there (never stored, or removed by the bucket's lifecycle rule).
var ErrNotFound = errors.New("blob: not found")

// Store is the little the service needs.
type Store interface {
	Put(ctx context.Context, key string, data []byte) error
	Get(ctx context.Context, key string) ([]byte, error)
}

// MaxObject is the largest object Put accepts: an article's text compressed is about 4 KB.
const MaxObject = 64 << 10

// S3 is an S3-compatible bucket (R2: region "auto", path-style addresses).
type S3 struct {
	Endpoint, Region, Bucket, AccessKey, SecretKey string
	HTTP                                           *http.Client
	now                                            func() time.Time
}

// NewR2 is a client for one Cloudflare R2 bucket.
func NewR2(account, bucket, accessKey, secretKey string) *S3 {
	return &S3{Endpoint: "https://" + account + ".r2.cloudflarestorage.com", Region: "auto", Bucket: bucket,
		AccessKey: accessKey, SecretKey: secretKey, HTTP: &http.Client{Timeout: 15 * time.Second}, now: time.Now}
}

func (s *S3) Put(ctx context.Context, key string, data []byte) error {
	if len(data) > MaxObject {
		return fmt.Errorf("blob: %d bytes is over the %d limit", len(data), MaxObject)
	}
	res, err := s.do(ctx, http.MethodPut, key, data)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(io.LimitReader(res.Body, 300))
		return fmt.Errorf("blob: put %d %s", res.StatusCode, b)
	}
	return nil
}

func (s *S3) Get(ctx context.Context, key string) ([]byte, error) {
	res, err := s.do(ctx, http.MethodGet, key, nil)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode == http.StatusNotFound {
		return nil, ErrNotFound
	}
	if res.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(io.LimitReader(res.Body, 300))
		return nil, fmt.Errorf("blob: get %d %s", res.StatusCode, b)
	}
	return io.ReadAll(io.LimitReader(res.Body, MaxObject+1))
}

// Delete removes an object; one already gone is not an error.
func (s *S3) Delete(ctx context.Context, key string) error {
	res, err := s.do(ctx, http.MethodDelete, key, nil)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusNoContent && res.StatusCode != http.StatusOK && res.StatusCode != http.StatusNotFound {
		return fmt.Errorf("blob: delete %d", res.StatusCode)
	}
	return nil
}

func (s *S3) do(ctx context.Context, method, key string, body []byte) (*http.Response, error) {
	u, err := url.Parse(s.Endpoint + "/" + s.Bucket + "/" + escapePath(key))
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, method, u.String(), bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/octet-stream")
	}
	s.sign(req, body, s.now().UTC())
	return s.HTTP.Do(req)
}

// sign adds AWS Signature Version 4 headers (Authorization, x-amz-date, x-amz-content-sha256), signing every header
// set on the request and the host.
func (s *S3) sign(req *http.Request, body []byte, t time.Time) {
	payload := sha256.Sum256(body)
	ph := hex.EncodeToString(payload[:])
	amzDate, day := t.Format("20060102T150405Z"), t.Format("20060102")
	req.Header.Set("x-amz-date", amzDate)
	req.Header.Set("x-amz-content-sha256", ph)

	names := []string{"host"}
	values := map[string]string{"host": req.URL.Host}
	for k, v := range req.Header {
		lk := strings.ToLower(k)
		names = append(names, lk)
		values[lk] = strings.Join(v, ",")
	}
	sort.Strings(names)
	var canonHeaders strings.Builder
	for _, n := range names {
		canonHeaders.WriteString(n + ":" + strings.TrimSpace(values[n]) + "\n")
	}
	signed := strings.Join(names, ";")
	canonical := strings.Join([]string{req.Method, req.URL.EscapedPath(), req.URL.RawQuery, canonHeaders.String(), signed, ph}, "\n")
	scope := day + "/" + s.Region + "/s3/aws4_request"
	h := sha256.Sum256([]byte(canonical))
	toSign := "AWS4-HMAC-SHA256\n" + amzDate + "\n" + scope + "\n" + hex.EncodeToString(h[:])
	k := hmacSHA([]byte("AWS4"+s.SecretKey), day)
	k = hmacSHA(k, s.Region)
	k = hmacSHA(k, "s3")
	k = hmacSHA(k, "aws4_request")
	sig := hex.EncodeToString(hmacSHA(k, toSign))
	req.Header.Set("Authorization", "AWS4-HMAC-SHA256 Credential="+s.AccessKey+"/"+scope+", SignedHeaders="+signed+", Signature="+sig)
}

func hmacSHA(key []byte, msg string) []byte {
	m := hmac.New(sha256.New, key)
	m.Write([]byte(msg))
	return m.Sum(nil)
}

// escapePath escapes each segment of a key; keys here are hex hashes, so this is only a guard.
func escapePath(key string) string {
	parts := strings.Split(key, "/")
	for i, p := range parts {
		parts[i] = url.PathEscape(p)
	}
	return strings.Join(parts, "/")
}

// Memory is a Store in memory, for tests and for a laptop without a bucket.
type Memory struct {
	mu   sync.Mutex
	objs map[string][]byte
}

func (m *Memory) Put(_ context.Context, key string, data []byte) error {
	if len(data) > MaxObject {
		return fmt.Errorf("blob: %d bytes is over the %d limit", len(data), MaxObject)
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.objs == nil {
		m.objs = map[string][]byte{}
	}
	m.objs[key] = append([]byte(nil), data...)
	return nil
}

func (m *Memory) Get(_ context.Context, key string) ([]byte, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if b, ok := m.objs[key]; ok {
		return append([]byte(nil), b...), nil
	}
	return nil, ErrNotFound
}
