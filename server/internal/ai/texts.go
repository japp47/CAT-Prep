package ai

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/japp47/CAT-Prep/server/internal/account"
	"github.com/japp47/CAT-Prep/server/internal/blob"
	"github.com/japp47/CAT-Prep/server/internal/httpx"
)

// Article text in object storage (D107). When a set is made, the article's paragraphs are kept, compressed, in a
// private bucket under the text's hash, once however many students use it; a student may read it back only for a set
// they made. The bucket's lifecycle rule and the cleanup job both drop text after 90 days.

// TextsPerDay caps new objects across the site a day: a guard on the bill, far above what the AI can make.
const TextsPerDay = 500

func textKey(hash []byte) string { return "articles/" + hex.EncodeToString(hash) + ".json.gz" }

// keepText stores an article's text if it is not stored yet, and records that this student may read it. Failures are
// logged, not returned: the student still has the text on their device.
func (s *Service) keepText(ctx context.Context, identity, job string, hash []byte, a *ArticleIn) {
	if s.Articles == nil {
		return
	}
	var stored, today int
	if err := s.DB.QueryRow(ctx, `select (select count(*) from ai.article_texts where hash = $1),
		(select count(*) from ai.article_texts where (stored_at at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date)`, hash).Scan(&stored, &today); err != nil {
		s.Log.Warn("ai: article text", "error", err)
		return
	}
	if stored == 0 {
		if today >= TextsPerDay {
			s.Log.Warn("ai: article text cap reached; text kept on the device only", "cap", TextsPerDay)
			return
		}
		data, err := packText(a)
		if err == nil {
			err = s.Articles.Put(ctx, textKey(hash), data)
		}
		if err != nil {
			s.Log.Warn("ai: store article text", "error", err)
			return
		}
		if _, err := s.DB.Exec(ctx, `insert into ai.article_texts (hash, bytes) values ($1, $2) on conflict (hash) do update set stored_at = now(), bytes = excluded.bytes`, hash, len(data)); err != nil {
			s.Log.Warn("ai: article text row", "error", err)
		}
	}
	if _, err := s.DB.Exec(ctx, `insert into ai.student_articles (identity_id, job_id, hash) values ($1, $2, $3) on conflict do nothing`, identity, job, hash); err != nil {
		s.Log.Warn("ai: article access row", "error", err)
	}
}

// packText is the paragraphs as the site shows them (sentences joined back with one space), as compressed JSON.
func packText(a *ArticleIn) ([]byte, error) {
	paras := make([]string, len(a.Paras))
	for i, p := range a.Paras {
		paras[i] = strings.Join(p, " ")
	}
	raw, _ := json.Marshal(map[string]any{"v": 1, "paras": paras})
	var b bytes.Buffer
	w := gzip.NewWriter(&b)
	if _, err := w.Write(raw); err != nil {
		return nil, err
	}
	if err := w.Close(); err != nil {
		return nil, err
	}
	return b.Bytes(), nil
}

func unpackText(data []byte) ([]string, error) {
	r, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	raw, err := io.ReadAll(io.LimitReader(r, 256<<10))
	if err != nil {
		return nil, err
	}
	var t struct{ Paras []string }
	if err := json.Unmarshal(raw, &t); err != nil {
		return nil, err
	}
	return t.Paras, nil
}

// TextHandler is GET /v1/ai/article/{job}/text: the article's paragraphs, for the student who made that set only.
func (s *Service) TextHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if s.Articles == nil {
			httpx.WriteError(w, http.StatusNotFound, "not_found", "The article's text is on the device where you made this set.")
			return
		}
		d, _ := account.FromContext(r.Context())
		var hash []byte
		err := s.DB.QueryRow(r.Context(), `select hash from ai.student_articles where identity_id = $1 and job_id = $2`, d.IdentityID, r.PathValue("job")).Scan(&hash)
		if err != nil {
			// Not theirs, never made, a malformed id, or gone after 90 days: all the same to the student.
			httpx.WriteError(w, http.StatusNotFound, "not_found", "The article's text is not kept any more. Your questions, score and mistakes are in your history.")
			return
		}
		data, err := s.Articles.Get(r.Context(), textKey(hash))
		if errors.Is(err, blob.ErrNotFound) {
			httpx.WriteError(w, http.StatusNotFound, "not_found", "The article's text is not kept any more. Your questions, score and mistakes are in your history.")
			return
		}
		var paras []string
		if err == nil {
			paras, err = unpackText(data)
		}
		if err != nil {
			s.Log.Warn("ai: read article text", "error", err)
			httpx.WriteError(w, http.StatusServiceUnavailable, "busy", "The article could not be fetched just now. Try again shortly.")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"paras": paras})
	})
}
