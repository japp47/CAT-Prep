# Explain my mistake (F35), planned 13 Nov 2026; removed the same day (D105)

**Removed on 13 Nov 2026 (D105).** For the library's fixed questions, "why this option looked right" is the same
for every student who picks it, so live AI only re-wrote, for each new student, what could be written once into the
content, at the cost of a sign-in, a wait, a daily cap and an unchecked answer. The button, the endpoint, the explain
model order and the questions in `/ai/rc.json` are gone. If the idea returns it will be content: a "why it looked
right" line per wrong option, drafted once, reviewed and tested, shown to everyone. The plumbing built for it (the
gate, the router, the cache, flags, the admin view) serves the summary features below and article to RC (F34).

Decision D100 in `docs/analyze.md`. The sections up to "Data" describe the removed feature and are kept as the record.

## What it adds over what exists
Every RC option already has a written note on why it is wrong and its trap, and since F103 every question with one
has its deciding line. A model repeating those notes would add nothing. What no note can do is answer **this
student's** mistake: the option they chose, the trap that caught them, and, when they marked one, the line they
thought proved it. So the explanation is built from exactly those, after the answer is revealed:
- **Why it looked right** (one or two sentences, naming the trap in plain words, and the misreading of their own line
  when they marked one);
- **The line that settles it**, shown from our content, never quoted by the model;
- **Next time** (one sentence: what to check before choosing).

## Principles (feature.md, "AI": principle 3)
- **After the answer, never before.** The button appears in the review, only on a wrong answer. An AI that hands out
  answers made students worse on the real exam (Bastani et al. 2024, `reports/Standing out in AI learning.md`).
- **Code checks every output.** The model returns a fixed shape (Groq strict structured output); it cites the deciding
  sentence by its number, and the server accepts only a number that is a deciding line (or, for a question without one,
  a sentence in a proof paragraph). Lengths are capped; links are refused. A failed check retries once, then the student
  sees the written note, which is the fallback.
- **The browser sends ids, never text.** `{set, version, question, chosen, line}`. The server builds the prompt from the
  site's published content (`/ai/rc.json`, written at build), so the endpoint is not an open model for anyone's prompt,
  and a passage cannot be swapped.
- **Shared answers.** One explanation per (set, version, question, chosen option, marked line), cached in Postgres: the
  second student with the same mistake gets it free and at once.
- **Budgets.** Ten new explanations a student a day (cached ones do not count), a total daily token budget below the
  provider's free limit, and `AI_ENABLED=0` as the kill switch. Over a budget: "Explanations are busy today; here is the
  written note."
- **Private.** The model sees the passage, the question and the options. Never who the student is.
- **Flag it.** "This explanation is wrong" records one flag per student; the owner's panel shows flagged explanations,
  and a flagged one can be dropped so the next request makes a fresh one.

## Model and cost (researched 13 Nov 2026)
- Groq retired the free small Llama models on 16 Aug 2026 and recommends `openai/gpt-oss-20b` (131K context, strict
  structured outputs, reasoning kept out of the content with `include_reasoning: false`, `reasoning_effort: "low"`).
  Free tier about 30 requests a minute, 1,000 a day and 200K tokens a day; paid about $0.075 per million input tokens
  and $0.30 per million output tokens, so a thousand explanations cost about ₹15.
- An explanation is about 1,500 tokens in and 200 out; the free tier covers about a hundred new ones a day, and the
  cache covers repeats.
- One OpenAI-compatible client; which models and in what order is set in `models.json` (below, "Models and keys").

## Data (migration 16, schema `ai`)
- `ai.cache`: key (sha-256 of kind, set, version, question, chosen, line), kind, model, prompt version, output (jsonb),
  tokens, created at, flags.
- `ai.usage`: per day and kind, generations and tokens (the global budget).
- `ai.usage`: the row with kind `all` holds the day's total, reserved before each call and settled after.
- `ai.daily`: per identity and day, new explanations and summary checks requested (the student cap).
- `ai.flags`: one row per cache key and identity.

## Summary feedback (F36, D101), built 13 Nov 2026
- **What it adds.** The four self-checks after an RC summary are honest only if the student is strict, and self-ticks
  run generous. Summarising helps learning only with feedback (Dunlosky et al. 2013). So after the student ticks, a
  "Get a second opinion" button asks AI to judge the same four checks against the passage and the model summary.
- **Ticks first, and not sent.** The student commits to their own verdict before seeing the AI's; the request carries
  the set, its version and the summary text, never the ticks, so the model is not led by them. The site shows all
  four verdicts ("AI's verdict: 1 of 4 met"), each met or not yet with its line and the student's own words, in the
  checklist's order, and highlights the rows where the AI and the tick differ. (A first version spelled out only the
  differences; an empty checklist then "agreed" with four misses and showed no notes at all.) The ticks stay editable
  and stay the score.
- **Never rewrites.** The model summary is already on screen; a second rewrite would teach copying. The model may only
  quote the student's words, and code refuses a reply whose quote is not in the student's text.
- **Habits.** The verdicts are saved with the summary (`SummaryEntry.ai`, synced); the habit line in the report counts
  them in place of the ticks where they exist.
- **Model.** `openai/gpt-oss-120b` first (the summary order in `models.json`): judging a paraphrase is harder than explaining a written
  note, and requests are few. Same client, budget and caps.
- **Limits.** 5 to 25 words and 300 characters, checked before anything is spent; the cache key is the normalised
  text (case and spacing ignored), so a replay costs nothing.

## Tone, revise and the smallest fix (F36b, D103), 13 Nov 2026
Effort first, the smallest hint next, the whole answer last (the model summary, already on screen).
- **Tone.** The student picks the author's tone; "Analytical, you chose neutral" said only that it was wrong. Now a
  wrong pick gets what each tone means ("neutral reports without judging; analytical weighs a claim"), whether it was
  a close call (a fixed table of near pairs: neutral and analytical, critical and sceptical, …), and the passage line
  that shows the author's tone (`summary.toneCue`, an exact phrase, and `summary.toneWhy`, one sentence). The line
  depends only on the set, so it is written content, drafted once, checked by tests (the cue must be in the passage)
  and free to show, signed in or not. The AI does not judge tone or overrule the key.
- **Revise yours.** After the verdicts, while any check is not met, the student may edit their own summary once and
  check it again; the panel shows the change in count ("was 1 of 4, now 3 of 4"). Revising after feedback is where
  the learning is. The first verdicts are the ones kept for habits (they show what the student misses unprompted);
  the revised text is kept beside the first.
- **The smallest fix.** Only after a revision still misses a check: "Show the smallest fix" asks the AI to change as
  few of the student's words as possible so all four checks are met. Code refuses a fix that rewrites (more than
  about 40% of the words changed), runs over 25 words, copies the model summary, or carries links or markdown; the
  site marks the words added and struck out. One AI answer from the same daily cap, cached by text.
- **Not built:** judging the tone of the student's own writing (CAT does not test it), or letting the AI accept a
  tone the key does not.

## Models and keys (D102), built 13 Nov 2026
- **No model in code.** `server/internal/ai/models.json` lists providers (base URL and the environment variable that
  holds their keys), models (provider, id, settings such as `reasoning_effort`) and each task's order. `AI_EXPLAIN` and
  `AI_SUMMARY` on Render replace an order without a deploy; `AI_CATALOG` swaps the whole file. A bad name or a task
  with no usable key stops the API at start with the reason.
- **Fall back across models, not keys.** Groq's limits apply per account (organisation) and per model, and all three
  of `openai/gpt-oss-20b`, `openai/gpt-oss-120b` and `qwen/qwen3.8-27b` take strict JSON schemas (checked 13 Nov 2026;
  Qwen turns reasoning off with `reasoning_effort: "none"`). So a 429 rests that model for Groq's `Retry-After` and the
  next model answers: three models are three daily quotas. A reply that fails the check is retried on another model.
- **Keys are spares, not quota.** `GROQ_API_KEYS` takes several; a refused key (401/403) rests an hour and the next is
  used. More keys in one account add no quota, and opening extra accounts to multiply a free tier goes against
  Groq's terms; more room comes from Groq's paid tier or another provider added to `models.json`.
- **Seen, not guessed.** Every call is counted per model and day in `ai.model_usage` (answered, refused by the check,
  limited, failed, tokens). Admin → AI shows each task's order, which models rest and why, and working keys as counts;
  key text never leaves the server, and a refused key's reply is not kept because it can echo the key.
- **Not built:** switching models from the admin page. State kept per server would be lost on a restart and an order
  kept in the database is one more thing to secure; the Render setting is one field and restarts in a minute.

## Security: who could spend the tokens (D101)
The only thing worth stealing here is model time. Audited 13 Nov 2026; each finding is fixed and tested
(`server/cmd/api/v1_ai_int_test.go`, `TestAIGateHoldsAgainstAbuse`).
- **Free identities.** A sync identity costs one request to make, so a per-student cap alone could be multiplied by a
  script. A new generation now needs a verified Google account; a signed-out student sees "Sign in with Google" in
  place of the button. Cached answers need no account check beyond sync.
- **One machine, many accounts.** A per-address limit (`AI_PER_ADDRESS`, 30 new generations an hour) sits in front
  of the student cap: a household or a hostel, not a script.
- **Races.** Fifty requests at once could all read "under the cap" and all go through. The student's seat is taken by
  one conditional upsert on `ai.daily`, and the day's budget is reserved (2,500 tokens) on the `ai.usage` row `all`
  before the call, then settled to what the call used; a seat is given back when nothing was made. Twenty parallel
  requests against a cap of three make exactly three.
- **Free text.** Only the summary endpoint takes text. It is capped by words and characters, the body by 2 KB, the
  prompt holds it inside `<summary>` tags as data, the reply is held to a strict schema, and every quote must be in
  the student's text. Instructions inside a summary are judged as a summary.
- **What a model call can cost at worst** is the daily budget (`AI_DAILY_TOKENS`), which the provider's free tier
  also bounds; the kill switch is `AI_ENABLED`.

## Not in this version
VA, CR and DILR explanations (RC first: it has deciding lines and the most distrust), summary feedback for outside
articles (no model summary to judge against), and a follow-up question.
