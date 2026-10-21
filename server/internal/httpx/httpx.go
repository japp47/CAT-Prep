// Package httpx holds what every handler shares: JSON responses, the error shape, the router and middleware.
// Errors always look like {"error": {"code": "...", "message": "..."}}, with messages written for students
// (docs/architecture.md §4.4).
package httpx

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
)

// WriteJSON writes v as JSON with the given status.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("write json", "error", err)
	}
}

type errorBody struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

// WriteError writes the shared error shape. code is a stable machine name such as "not_found";
// message is a short sentence a student can read.
func WriteError(w http.ResponseWriter, status int, code, message string) {
	var b errorBody
	b.Error.Code, b.Error.Message = code, message
	WriteJSON(w, status, b)
}

// DecodeJSON reads a JSON body into v and answers 400 (or 413 past the body limit) when it cannot. Unknown fields
// are refused, so a typo in a client shows up at once. An empty body is accepted when optional is true.
func DecodeJSON(w http.ResponseWriter, r *http.Request, v any, optional bool) bool {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	err := dec.Decode(v)
	if err == nil || (optional && errors.Is(err, io.EOF)) {
		return true
	}
	var tooBig *http.MaxBytesError
	if errors.As(err, &tooBig) {
		WriteError(w, http.StatusRequestEntityTooLarge, "too_large", "That request is too big.")
		return false
	}
	WriteError(w, http.StatusBadRequest, "bad_request", "That request could not be read.")
	return false
}
