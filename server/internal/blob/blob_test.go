package blob

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"
)

// The "GET Object" example from AWS's Signature Version 4 documentation (Amazon S3 API reference, "Example:
// GET Object"): the same keys, date, bucket and Range header must give its published signature.
func TestSignatureMatchesAWSExample(t *testing.T) {
	s := &S3{Endpoint: "https://examplebucket.s3.amazonaws.com", Region: "us-east-1", AccessKey: "AKIAIOSFODNN7EXAMPLE",
		SecretKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"}
	req, _ := http.NewRequest(http.MethodGet, "https://examplebucket.s3.amazonaws.com/test.txt", nil)
	req.Header.Set("Range", "bytes=0-9")
	s.sign(req, nil, time.Date(2013, 5, 24, 0, 0, 0, 0, time.UTC))
	want := "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41"
	if got := req.Header.Get("Authorization"); got != want {
		t.Errorf("signature\n got %s\nwant %s", got, want)
	}
}

func TestPutRefusesLargeObjectsAndMemoryRoundTrips(t *testing.T) {
	ctx := context.Background()
	m := &Memory{}
	if err := m.Put(ctx, "a/x", []byte(strings.Repeat("x", MaxObject+1))); err == nil {
		t.Error("an object over the limit was stored")
	}
	if err := m.Put(ctx, "a/x", []byte("hello")); err != nil {
		t.Fatal(err)
	}
	if b, err := m.Get(ctx, "a/x"); err != nil || string(b) != "hello" {
		t.Errorf("get: %q %v", b, err)
	}
	if _, err := m.Get(ctx, "a/none"); err != ErrNotFound {
		t.Errorf("missing: %v", err)
	}
	s := NewR2("acct", "bucket", "k", "s")
	if err := s.Put(ctx, "a/x", make([]byte, MaxObject+1)); err == nil {
		t.Error("the R2 client accepted an object over the limit")
	}
}
