package notify

import "testing"

func TestMailDomainFollowsTheSite(t *testing.T) {
	for site, want := range map[string]string{
		"https://99ile.in":        "99ile.in",
		"https://99ile.in/":       "99ile.in",
		"https://99ile.pages.dev": "99ile.pages.dev",
		"http://localhost:5173":   "localhost",
		"":                        "99ile.in",
		"not a url":               "99ile.in",
		"https://":                "99ile.in",
	} {
		if got := mailDomain(site); got != want {
			t.Errorf("mailDomain(%q) = %q, want %q", site, got, want)
		}
	}
}
