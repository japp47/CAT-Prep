# Notifications: the email template and the notification service (5 Nov 2026)

What students get and when is F65 in `docs/feature.md` (decision D89). The research is in `docs/research/notifications.md`. This document covers how it looks (§1) and how it is built (§2 to §10).

Owner, 5 Nov 2026:
- "As we don't have a domain let's work with Gmail for now";
- the default is fine ("only when I miss days");
- "a minimalist modern email template in our theme, with direct links to the website";
- "a notification service with principles, and workers that can use either queue mechanism".

## 1. The email template

**Files.** `server/internal/notify/templates/`:
- `layout.html`: the one email layout, a Go `html/template`;
- `layout.txt`: the same words as plain text;
- `messages.json`: the wording of every kind and variant, for email and push.

**Look.** The site's desk, on paper:
- a light page (#f5f6f8) with a white sheet, rounded 20px, set apart by tone, not borders or shadows;
- the logo and wordmark above the sheet;
- a 26px heading in Schibsted Grotesk (Arial where a client loads no web fonts, which includes Gmail);
- 16px body text, and nothing smaller than 14px;
- the task in a tone card, its title on the yellow highlighter, the only highlight in the email;
- one blue filled button, then one quiet link ("Want the whole day? Open Today");
- a footer saying why the student gets the email, with "Change reminders" and "Stop these emails".

**Dark mode** follows the reader's mail app where it allows (Apple Mail, iOS Mail, Outlook.com). Gmail applies its own.

**What the email never contains:** capitals-only labels, monospace, emoji, tracking images, or the student's answers.

**Every link opens the site at the task.**
- The button opens the RC or the set itself (`/practice/rc/<id>`).
- "Open Today" opens `/today`. The weekly review opens `/review`. "Change reminders" opens `/settings#reminders`. "Stop these emails" opens `/unsubscribe?t=…`.
- Each link carries `?from=reminder-<kind>&m=<message id>`. That is how a visit from an email is counted (§8).

**Kinds in `messages.json`.** `daily`, `daily-streak` (a streak of 3 days or more), `missed-2`, `missed-5`, `missed-12` and `weekly`. Each has two or three variants, and each variant holds:
- subject (at most 50 characters) and preview line;
- heading, body paragraphs, button, an optional second link;
- the push title and body (at most 120 characters together).

**Placeholders.** `{{.Name}}`, `{{.Streak}}`, `{{.Missed}}`, `{{.Task.Label}}`, `{{.Task.Title}}`, `{{.Task.Mins}}`, `{{.Week.Days}}`, `{{.Week.Questions}}`. The sheet's optional parts appear only when there is data for them: the task card (`Task`) and the week's three figures and lines (`Week`).

**Checked by a test.** It renders every variant with sample data and fails on:
- a missing placeholder;
- a subject over 50 characters, or a push over 120;
- a font size under 14px in the layout;
- a missing unsubscribe link.

**Previewing.**
- `go run ./cmd/notify -preview out/` writes every variant as HTML and text.
- `-send-test you@example.com` emails all of them to one address.
- Previewed 5 Nov 2026 at 720px and on a 390px phone, light and dark. While checking, `public/icon-192.png` turned out broken (the "99" cut in half and repeated, live on the site and used for the Android home-screen icon). It was rebuilt from `icon-512.png`.

## 2. Principles
1. **One rule book, many channels.** What to send and when is decided once, by pure functions with tests. Push, email and later the inbox only deliver. Adding a channel means adding one sender, with no change to the rules.
2. **Decide twice: when planning, and again just before sending.** A student who practised, paused or unsubscribed while a message waited in the queue gets nothing.
3. **Idempotent by key.** Each message has a key (`student : kind : their local date`), and the database refuses a second one. If a job runs twice, a student still gets one message.
4. **At least once, but never twice in practice.** A crash after sending but before recording can repeat a message. The key and the "sent" mark make that rare, and it is accepted.
5. **Fail closed.** When the worker is unsure (no time zone, a stale activity row, a channel erroring), it sends nothing.
6. **Settings are data, not code.**
   - The wording is in `messages.json`.
   - The rules' numbers are in `policy.json`: the missed-day series (2, 5, 12), the Sunday hour, default quiet hours, caps per day and per week.
   - The sender's limits come from environment variables.
   - Nothing names a date, a limit or a sentence in Go code.
7. **Private by design.**
   - No tracking pixels.
   - A message holds only what it needs to render.
   - Unsubscribe links are signed and work without signing in.
   - Every row is removed with the student's identity.
   - Keys and passwords live only in secrets.
8. **Small and boring until the numbers say otherwise.** Postgres is the queue. The worker runs on a schedule. Nothing new to host.

## 3. The pipeline
```
 every 15 min (GitHub Actions)                         the student's browser
 ┌──────────────────────────── cmd/notify ───────────────────────────┐   │ sync push (attempts)
 │ PLAN                         QUEUE                  WORK          │   ▼
 │ candidates (SQL) ─► Decide() ─► notify.messages ─► claim (SKIP    │  API: activity row updated
 │ prefs, activity,    rules       insert, unique       LOCKED) ─►   │  in the same transaction
 │ what was sent       (pure)      dedupe key           guard: Decide│
 │                                                      again ─►     │
 │                                                      render ─►    │
 │                                                      send by      │
 │                                                      channel ─►   │
 │                                                      record       │
 └───────────────────────────────────────────────────────────────────┘
          channels: Email (Gmail SMTP now) · WebPush (VAPID) · Inbox (January)
```
- **Plan.** One SQL query finds the candidates: reminders on and not paused; the local time past the student's reminder time; inside the day's window and outside quiet hours; no message for today's key yet. `Decide` turns each candidate into zero or one message per channel. The messages go in with `insert … on conflict (dedupe_key) do nothing`.
- **Work.** The worker claims a batch:

  ```sql
  update … set status = 'working', locked_until = now() + interval '2 minutes'
  where id in (select id … where status = 'queued' and run_at <= now()
               order by priority, run_at for update skip locked limit 50)
  ```

  For each message it checks the rules again, renders, sends, then records `sent`, `skipped` (with the reason) or `failed`. A lock left behind by a crash runs out, and the message is claimed again.

## 4. The Go package (`server/internal/notify`)
Ports and adapters: the rules and the pipeline depend on small interfaces, and the edges implement them.

```
internal/notify/
  policy.go        Policy from policy.json (go:embed), validated at start
  rules.go         Decide(in Input) []Intent: pure; every F65 rule; table tests
  plan.go          Planner: candidates query → Decide → Queue.Enqueue
  worker.go        Worker: Claim → guard (Decide again) → Render → Channel.Send → Complete or Fail
  queue.go         type Queue interface { Enqueue; Claim; Complete; Fail; Skip }
  queue_pg.go      Postgres queue (SKIP LOCKED); the only one for now
  channel.go       type Channel interface { Name() string; Send(ctx, Message) error }
                   errors: Temporary (retry) or Permanent (stop; for example a dead address)
  email_smtp.go    Channel "email": multipart text and HTML, List-Unsubscribe headers, pacing
  webpush.go       Channel "push": VAPID (ES256) and RFC 8291 encryption, standard library only
  render.go        Renderer: kind, variant, channel and vars → subject, html, text or push JSON
  variant.go       picks a variant not sent to this student last time for this kind
  budget.go        a daily cap per channel (email 300), and a breaker per channel
  token.go         signed unsubscribe tokens (HMAC-SHA256 of identity, kind)
  handler.go       /v1/notify/* and /v1/unsubscribe
  templates/       layout.html, layout.txt, messages.json, policy.json (go:embed)
cmd/notify/        -plan, -drain, -once (default: plan then drain for up to 5 minutes), -loop, -preview, -send-test
```

**Patterns, and why each one:**
- **Strategy plus a registry for channels.** Email and push differ only in how they deliver. A third channel (the inbox, or a real email service once there is a domain) is one more `Channel`.
- **The Queue interface.** You asked for workers that can use either queue mechanism. The worker sees only `Queue`, so a different queue can replace Postgres without touching the rules or the channels (§7 says when).
- **Transactional outbox.** Planning writes messages in the same database where the facts live. Nothing is lost between deciding and sending.
- **Retry with backoff and jitter.** A temporary error retries after 1, 5, then 30 minutes. After 4 tries the message is marked `dead`, and the run's log and the admin counts show it.
- **Circuit breaker per channel.** Five failures in a row (for example, Gmail refusing the password) stop that channel for the rest of the run, and the owner is told (§9). The other channel carries on.
- **A clock interface.** Every rule about time is tested at fixed instants: midnight in the student's zone, quiet hours across midnight, exam day.

## 5. Data (new schema `notify`, one migration)

| Table | Holds | Notes |
|---|---|---|
| `notify.prefs` | one row per identity: on, time of day (minutes), days of the week (bit mask), time zone, quiet hours, email mode (`off`, `missed`, `daily`; default `missed`), weekly review on, paused until, email state (`ok`, `bounced`, `unsubscribed`) | The address is not copied: it is read from `account.users` (Google) when sending |
| `notify.push_subs` | one row per device: endpoint (unique), keys, the device it belongs to, last success, failures in a row | 404 or 410 from the push service deletes the row |
| `notify.activity` | one row per identity: last practice time, last practice day (local), streak | Updated in the sync push transaction when an attempt kind arrives (`rc`, `va`, `cr`, `lr`, `lrDrill`, `arena`, `speed`, `sectional`); no scan of records at send time |
| `notify.messages` | the queue: kind, channel, dedupe key (unique), variant, vars (jsonb, only what the template needs), priority, run at, status, attempts, lock, last error, sent at | Kept 30 days, then rolled up into `notify.stats` by the cleanup job: 10,000 students would otherwise fill the free database |
| `notify.stats` | per day, kind, variant and channel: sent, skipped, failed, opened, practised within two hours, unsubscribed | The figures F65 is judged by |

**Practised within two hours.** When the activity row is updated, the latest message sent to that student in the last two hours is marked as practised.

**Practice done offline** syncs later. A student who practised offline may still get that day's reminder. This is accepted and written down.

**Deleting an identity** removes every `notify` row (foreign keys with `on delete cascade`). The data export includes `prefs`.

## 6. Email through Gmail, for now
- **Sender: the team account, 99ile.team@gmail.com** (owner, 5 Nov 2026), through `smtp.gmail.com:587` with the app password the digest already uses.
  - Students see one sender everywhere, and their replies reach the team directly.
  - Because the mail is sent through Google's own servers as that account, Gmail signs it (DKIM) and SPF passes. Nothing to set up.
  - **The cost:** one daily limit for everything the account sends, the team's own replies included. Running out blocks all sending, replies included, for up to 24 hours. So reminders stop well short of the limit (below).
  - Bounces and one-click "unsubscribe" mails land in the team inbox; a Gmail filter files them under a label.
  - **Moving to a separate account or a domain is a setting** (`NOTIFY_SMTP_USER`, `NOTIFY_SMTP_PASSWORD`), not code.
- **Limits:**
  - a personal Gmail account sends to about 500 recipients a day, so `NOTIFY_EMAIL_DAILY_CAP` is 300, leaving about 200 for the team's own mail and the digest;
  - sending is paced to about 20 a minute;
  - when the cap is reached, push is not affected, and emails go by priority: missed days, then the weekly review, then daily emails; the rest are skipped with the reason "cap".
- **Headers on every email:**
  - `List-Unsubscribe: <https://99ile.pages.dev/api/v1/unsubscribe?t=…>, <mailto:99ile.team@gmail.com?subject=unsubscribe>`;
  - `List-Unsubscribe-Post: List-Unsubscribe=One-Click`;
  - `Auto-Submitted: auto-generated`;
  - a `Message-ID`;
  - `multipart/alternative` with the text first.
- **What Gmail cannot do for us:**
  - Bounces come back to the sender's inbox as mail. In R1 the owner sees them. In R2 a small IMAP check on each run marks the address bounced.
  - There is no spam-complaint report for gmail.com senders, so complaints are invisible. Keeping volume low and every email asked-for is the defence.
- **When to move off Gmail:** when about 250 emails a day are due, or at the first sign of throttling. Then buy a domain, set up SPF, DKIM and DMARC, and add an email service as a second `Channel` behind the same name. Only configuration changes.

## 7. Queue and workers: what runs where
- **Now: Postgres as the queue, GitHub Actions as the clock.**
  - `.github/workflows/notify.yml` runs `go run ./cmd/notify` at minutes 7, 22, 37 and 52 of every hour. Odd minutes avoid the busy top of the hour, when GitHub delays scheduled runs most.
  - It is the same pattern as the digest and the cleanup jobs: free for a public repository, nothing new to host, and the API's 0.1 CPU is left to students.
  - **Trade-offs:**
    - A scheduled run can start 5 to 20 minutes late, so the reminder promises "around 7:30 pm". Reminder times are in 15-minute steps.
    - GitHub stops scheduled workflows after 60 days without commits. Not a risk at the current pace, and written down.
- **Also safe: more than one worker.** Because claiming uses `SKIP LOCKED`, the API could run the same worker in-process (`NOTIFY_WORKER=1`, a goroutine with a 1-minute ticker) beside or instead of the scheduled job. Nothing would be sent twice.
- **Later, only if the numbers ask:**

| Change | When | What changes |
|---|---|---|
| `cmd/notify -loop` as a Render background worker | Reminders must be on time to the minute, or the plan pass takes over 5 minutes | A paid worker; no code change |
| River (a Go job queue on Postgres) | Many job kinds beyond notifications (AI, exports) | A new `Queue` adapter; a dependency, asked first |
| Redis or Valkey streams, or a cloud queue (SQS, Cloudflare Queues) | Over about 50,000 messages a day, or several services producing jobs | A new `Queue` adapter and new infrastructure |

## 8. API and the browser
- **API, behind the `/v1` gate and the device cookie, camelCase:**
  - `GET /v1/notify/prefs`, `PUT /v1/notify/prefs`;
  - `GET /v1/notify/push-key` (the public VAPID key);
  - `POST /v1/notify/push` (subscribe this device), `DELETE /v1/notify/push`;
  - `POST /v1/notify/opened {m}` (the site was opened from a message).
- **Outside the gate:** `POST /v1/unsubscribe?t=` (one-click, RFC 8058; answers 200 with no body) and `GET /v1/unsubscribe?t=`. Both are rate limited.
- **The browser:**
  - a "Reminders" card in Settings, and the turn-on card on a set's result screen (F65);
  - `push` and `notificationclick` in `pwa/sw.js`: show `{title, body, url, tag: "reminder"}` (a new reminder replaces the old one), then open or focus the URL;
  - the `/unsubscribe` page, which confirms and offers "Change reminders instead";
  - on any page opened with `?from=reminder-…&m=`, the visit is reported once and the parameters are removed from the address.
  - All of it loads only when used, so the first download does not grow.

## 9. Running it safely
- **Secrets** (GitHub Actions and Render): `NOTIFY_SMTP_USER`, `NOTIFY_SMTP_PASSWORD`, `NOTIFY_VAPID_PUBLIC`, `NOTIFY_VAPID_PRIVATE`, `NOTIFY_TOKEN_SECRET`, the database URL. Never in the repository.
- **Switches:** `NOTIFY_EMAIL=off` and `NOTIFY_PUSH=off` stop a channel at once. `NOTIFY_DRY=1` plans and renders but sends nothing (the first week in production starts dry).
- **Logs per run:** candidates, planned, sent, skipped by reason, failed, dead, emails left in today's budget.
- **Telling the owner:**
  - an open circuit fails the run, so GitHub emails the owner (built in R1; a GitHub issue can come later);
  - the admin page gets a Reminders panel with the `notify.stats` figures in R2.
- **Tests:**
  - table tests for `Decide` and the policy;
  - the content test (§1);
  - a Postgres integration test for the queue (four workers, one claim each, a lock that runs out, the unique key);
  - the push encryption against the RFC 8291 example;
  - the email builder against a saved message;
  - the handlers with a fake channel.

## 10. Built in parts
- **R1, about two weeks:**
  - migration `notify`, the policy, `Decide` with its tests, the Postgres queue, the email and push channels, the templates and their test, the API, `cmd/notify` and its workflow (dry for the first days);
  - in the browser: the Settings card, the turn-on card, the service worker's push handlers, the unsubscribe page;
  - the counts.
- **R2, about a week:** missed days and the weekly review (rules and data), variant rotation, the owner's preview and test send, bounces by IMAP, the admin panel.
- **Owner, before R1 goes live:**
  - add the secrets: the team account's app password (the digest's) as `NOTIFY_SMTP_PASSWORD`;
  - a Gmail filter for bounces and unsubscribe mails;
  - make the VAPID keys with `go run ./cmd/notify -vapid` (prints a new pair once).

## 11. As built, R1 (5 Nov 2026, `feat/reminders`)
- **Server:**
  - `internal/notify`: `policy.go`, `rules.go` (`Decide`), `queue.go` (`Queue`, `PG`), `store.go`, `service.go` (`Plan`, `Drain`), `channel.go` and `channels.go` (email, push), `webpush.go` (VAPID and RFC 8291, standard library), `render.go`, `token.go`, `activity.go`, `daily.go`, `handler.go`;
  - `internal/mailx`, shared with the digest;
  - migration `00012_notify.sql`;
  - `cmd/notify` and `.github/workflows/notify.yml`;
  - routes in `cmd/api/main.go`;
  - the practice hook: `syncapi.Options.Practice`, run inside the push transaction.
- **Site:**
  - `lib/notify.ts`;
  - `components/Reminders.tsx`: the Settings card and the offer on result screens, inside `ScoreCard`;
  - `components/SettingRows.tsx`;
  - `pages/Unsubscribe.tsx`;
  - push handlers in `pwa/sw.js`;
  - `scripts/daily.ts`, which writes `dist/daily.json` at build.
- **Changes from the plan above:**
  - **The day's task comes from the site.** The server cannot work out the RC of the day, so the build publishes `daily.json` (yesterday to 60 days ahead) and each run reads it from the live site. Without it, messages point at Today's plan.
  - **Exam days come from `policy.json`** (`exams`) until the CAT-year choice (D87) gives each student their own.
  - **The missed-day series** steps on exactly the 2nd, 5th and 12th day. A step that falls on a day the student switched off is skipped, not moved.
  - **The missed-day series is in R1**, with its wording; R2 keeps the weekly review email (the server does not compute a student's week yet), bounces read by IMAP and the admin panel.
- **Tests:**
  - the rules (33 cases), wording and layout, tokens;
  - RFC 8291's example byte for byte, the VAPID signature, the email's headers and parts;
  - with Postgres: plan and drain, practice cancelling a waiting message, retry then failure, four workers claiming at once;
  - the API end to end as `cat_app`, including one-click unsubscribe and deleting the identity.

## 12. The worker moves into the API (D91, 6 Nov 2026)
GitHub's schedule ran the job 3 times in its first 12 hours instead of 48, so reminders would have come hours late.
Of the ways to run it, the API wins for production:
- **cron-job.org starting the GitHub job:** about a minute late each time, two outside services and a token to keep.
- **Render's cron jobs:** need a card (D11).
- **The API itself:** always on (cron-job.org pings it every 5 minutes), free, and nothing new to run or watch.

**How it runs:**
- `notify.Worker` passes every two minutes: fresh `daily.json` hourly, then plan, then send for up to 1.5 minutes, then old rows forgotten daily. The email connection is closed after each pass.
- It starts with the API when `NOTIFY_WORKER=1` and stops with it. A message in flight finishes first; one cut off is sent again after its two-minute lease, never twice.
- Migration 13 gives `cat_app` the queue: insert, the status columns, delete.

**Alerts:** a paused channel emails the team at most every six hours, now that no failed GitHub run does it.

**`cmd/notify`** is one pass of the same worker, and the workflow is a manual button. Running it beside the API is safe, because of `SKIP LOCKED` and the dedupe keys.

**Settings are all on Render:** `NOTIFY_WORKER`, `NOTIFY_TOKEN_SECRET`, `NOTIFY_VAPID_PUBLIC` and `_PRIVATE`, `NOTIFY_SMTP_USER` and `_PASSWORD` (its own app password), `NOTIFY_DRY`, `NOTIFY_EMAIL`, `NOTIFY_PUSH`, `NOTIFY_EMAIL_DAILY_CAP`.

**Tests:**
- a pass sends once, and a dry pass queues nothing;
- a broken channel alerts once within the gap;
- the worker stops with its context;
- the worker runs as `cat_app` against the real grants;
- the settings and their errors.

## 13. Email through Gmail's API (D92, 6 Nov 2026)
The worker's first email timed out: `dial tcp …:587: i/o timeout`. Since September 2025 Render's free web services block outbound SMTP (ports 25, 465, 587); push, over HTTPS, was sent.

**The fix keeps the same account and Google's servers:** `notify.GmailAPI` posts the very message `buildEmail` makes to `gmail.googleapis.com/gmail/v1/users/me/messages/send` over port 443.

**Sign-in:**
- An OAuth "Desktop app" client in the sign-in project.
- The `gmail.send` scope only: it cannot read or delete mail.
- A refresh token from `cmd/notify -gmail-token`: once, on the owner's Mac, with PKCE and a loopback redirect. Google shows its "unverified app" screen to the owner once; nobody else ever signs in to it.
- The access token renews on its own, one per hour, reused across sends.

**Errors:**
- A refused refresh token (revoked, or the account's password changed) is permanent. Its message says to run `-gmail-token` again, and the team alert carries it.
- 429 and 5xx are retried. Other 4xx are permanent.
- Bounces still arrive in the team inbox, later.

**Which way email goes:** `EmailChannelFor` picks Gmail's API when its three settings are present, else SMTP with an app password (a laptop or GitHub, where the ports are open). The team alert follows the same choice. There is no new dependency: `golang.org/x/oauth2` was already there for sign-in, with Google's endpoints written out.

**Logs:** every message that is not sent gets a warning line: id, kind, channel, attempt, permanent or not, and the error. Never the address.

**Tests:** a fake Google issues one token for two sends and receives the whole message; rate limits and server errors retry; bad requests and a refused token stop; the channel choice; the three settings go together.

**Other ways considered:**
- cron-job.org starting GitHub for email: two systems and a token.
- A Render paid instance: a card, $7 a month.
- An email service sending as @gmail.com: it lands in spam.


## 14. The site's own screens: one promise, two channels (7 Nov 2026)

Owner, 7 Nov 2026: the Settings card "looks too much, like we are asking for a lot", and on a phone it "looks so
much filled"; a bell somewhere in the header or sidebar could hold the time and the two toggles, with the rest in
Settings.

**What was wrong.** The card (F65) asked seven questions at once — on/off, time, days, this device, email, quiet
hours, pause — each as a title, a one- or two-sentence hint and a control. On a 390px phone the control drops below
the text, so one decision ("nudge me to study") ran about five screens of grey prose. Everything carried the same
weight, there were three time fields, and reminders could be on with no channel switched on, which the card showed
as a perfectly healthy state while nothing would ever arrive.

**The shape now.**
1. **The promise, then the switch.** The card opens with what will actually happen — "Around *7:30 pm*, every day,
   if you haven't practised yet." — beside one switch. The time in that sentence is a button: it opens the details
   and lands on the time field, so the sentence is also the control. Off, the sentence says what reminders would do.
2. **Where they go**, one row per channel, set apart by tone: this device, email (with "If I miss days" or
   "Every day" under it), and the weekly review, which F65 asks for and the old card never showed. Each row is one
   switch, not a pair of On/Off words for what is one decision.
3. **Time, days and quiet hours** sit behind a disclosure, closed by default and remembered per browser. Days are a
   seven-column grid that fills a phone's width instead of wrapping.
4. **Nothing arrives, said plainly.** Reminders on with no channel shows a line on the warning tone; a pause shows
   on the highlighter, with "Resume now" in it.

**The bell** (`components/ReminderBell.tsx`, panel in `components/ReminderPanel.tsx`) sits with the sidebar's bottom
controls, beside the theme, install and account buttons, and holds the promise sentence, the switch and the channel
rows — the same rows as the card (`components/ReminderControls.tsx`), so the two cannot drift. "Time, days and quiet
hours" links to `/settings#reminders`. It is **not** in the phone header: that header already carries five 44px
buttons and a sixth overflows a 360px screen. On a phone, reminders stay in Settings (search finds "reminders"
too), and the offers after practice remain the way most students turn them on. The panel and its request load on
the first tap, and the bell is absent from builds without the API, so it never opens on nothing. The sidebar's
Updates row took a megaphone, since the bell now means study reminders.

**Also.** Settings' calendar `.ics` row is now "Calendar reminder", not "Daily study reminder": two things called a
study reminder on one page read as a contradiction when one needs sync and the other does not.

**When the server holds no push key** (`pushReady` false, which is `NOTIFY_VAPID_PUBLIC` unset: `notify/handler.go`),
"On this device" is not shown at all. It used to read "Not switched on yet", which sounded like something the
student had left off, when in fact nobody could switch it on. The card's existing rule now covers the row too:
students never see a feature the server has not switched on, and a development build says why it is missing and
names `go run ./cmd/notify -vapid`. Email and the weekly review still show, and "nothing will arrive yet" still
appears if no channel is on.
