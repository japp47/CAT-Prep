// Package httpx holds what every handler shares: JSON responses, the error shape, the router and middleware.
// Errors always look like {"error": {"code": "...", "message": "..."}}, with messages written for students
// (docs/architecture.md §4.4).
package httpx

import (
	"encoding/json"
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
