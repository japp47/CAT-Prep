package ai

import (
	"encoding/json"
	"testing"
)

func TestValidWord(t *testing.T) {
	ok := []WordIn{
		{Word: "ostensibly", Sentence: "The reform was ostensibly about efficiency."},
		{Word: " laissez  faire ", Sentence: "A laissez faire state taxes little."},
		{Word: "Phoenicians", Sentence: "Romans, Greeks and Phoenicians on galleys."},
	}
	for _, in := range ok {
		if err := validWord(&in); err != nil {
			t.Errorf("%q refused: %v", in.Word, err)
		}
	}
	bad := []WordIn{
		{Word: "", Sentence: "Something long enough."},
		{Word: "one two three four", Sentence: "one two three four is a sentence."},
		{Word: "<b>x</b>", Sentence: "A sentence with <b>x</b> in it."},
		{Word: "ostensibly", Sentence: "Short"},
		{Word: "ostensibly", Sentence: "A sentence without the word at all."},
	}
	for _, in := range bad {
		if err := validWord(&in); err == nil {
			t.Errorf("%q in %q accepted", in.Word, in.Sentence)
		}
	}
}

func TestCheckWord(t *testing.T) {
	out, err := checkWord(`{"meaning":"apparently, though not really."}`, "ostensibly")
	if err != nil {
		t.Fatal(err)
	}
	var m Meaning
	_ = json.Unmarshal(out, &m)
	if m.Meaning != "apparently, though not really" {
		t.Errorf("meaning %q", m.Meaning)
	}
	for _, raw := range []string{
		`{"meaning":""}`,
		`{"meaning":"in an ostensible way"}`,    // the word again
		`{"meaning":"see https://example.com"}`, // a link
		`{"meaning":"**apparently**"}`,          // markdown
		`{"meaning":"one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen"}`,
		`not json`,
	} {
		if _, err := checkWord(raw, "ostensibly"); err == nil {
			t.Errorf("accepted %s", raw)
		}
	}
}
