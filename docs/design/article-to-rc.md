# Article to RC and the 99ile extension (F34, F53), planned 13 Nov 2026, side panel 18 Nov 2026 (D110)

Toppers' most repeated advice is "read editorials and long essays every day". Students do read, but reading alone
gives no feedback: they cannot tell whether they caught the author's claim, the qualifier or the tone. This feature
turns any article a student is already reading into a CAT-style RC set, practised and reviewed in 99ile's own player,
and fed into their error log and reading journal.

Moved up from step 7 (April 2027) at the owner's request on 13 Nov 2026; the AI service (D100 to D103) it needs is
built.

## What makes it ours, not another quiz button

General "quiz me on this page" extensions already exist (TakaQuiz, Refresher AI, Quizizz AI and others, checked
13 Nov 2026). They ask recall questions about any page. Ours is narrower and deeper:

- **CAT question types, not recall.** Main idea, inference, tone or purpose, and one of detail, except, strengthen or
  application, with four close options whose wrong ones are labelled with our trap names.
- **Every answer is checked before the student sees it.** A second model answers the questions blind; a question
  whose key it does not reach is dropped. A set with fewer than three surviving questions is not shown.
- **Prove it works on articles too.** Questions carry their deciding lines as sentence references, so the review
  marks the line that settles each one.
- **It joins the student's prep.** Wrong answers go to the error log with a cause; the article goes to the reading
  journal with the model summary; time is measured at CAT pace.
- **"Is this a good CAT read?"** Before any AI, the extension says whether the page reads like a CAT passage
  (argument-heavy, dense) or like news or a list, worked out on the device. It teaches students what to read.

## Shape: the panel is 99ile itself (D110, 18 Nov 2026; replaces "the extension is a doorway", D104)

The owner asked for the shape students know from PracticeRC: select on the article, click, and the set is made and
answered in a panel beside it. D104 kept practice out of the extension for good reasons: one player, data in the
site's store, no account in the extension. The panel keeps all three by being the site:

- **The side panel frames a slim route of 99ile** (`/panel/article`, `/panel/article/:id`, `/panel/words`), outside
  the site's sidebar. The RC player, Prove it, review, error log, redo queue, journal and plan are the site's own
  code; a fix to the site fixes the panel without a new extension release.
- **Sign-in is the site's.** With host access to 99ile.in, Chrome sends the site's cookie to the framed page and
  gives it the site's own storage (tested on Chrome 157, 18 Nov 2026, A158). The extension holds no token and never
  calls the API; the framed page does, as any 99ile tab does.
- **Still exam-like.** The passage is read where it is: the paragraphs the set uses are highlighted lightly on the
  article's own page (owner, 18 Nov 2026), and the panel shows only the questions and the review, never the passage.
  Prove it, which taps a line of the passage, is left out of the panel; review's "Show me in the article" marks the
  deciding line on the page instead.

So the extension does three things only: read the page when asked, put the text into the panel, and highlight a
line on the page when the panel asks.

## Phones first, then the extension

Most students study on phones, where extensions do not run. The order is therefore:

1. **Paste an article (site, all devices).** A page at `/practice/article` takes pasted text (and an optional title
   and link) and makes the set. This is F34 and the whole engine.
2. **The Chrome extension (desktop).** One click instead of copy and paste. It also covers Edge and Brave, which
   install from the Chrome Web Store.
3. **Share to 99ile (Android).** An installed 99ile app appears in Android's share sheet (Web Share Target). Shares
   usually carry only a link and title, so the page asks for the text to be pasted. iPhone Safari does not support
   share targets (checked 13 Nov 2026); there it stays paste.

The server never fetches a link itself: no scraping, no paywall questions, and no way to make our server request
arbitrary addresses.

## The extension

**Permissions:** `activeTab` and `scripting` (read the current tab only after a click), `contextMenus` (the
right-click entries), `sidePanel`, `storage` (the article for a few minutes, in `chrome.storage.session`), and host
access to `https://99ile.in/*` only, so the framed site has its cookie and store. No content script runs on any page
until the student clicks, so the install shows no "all your data on all websites" warning (A160). Chrome 116 or
later; Edge and Brave install from the same store.

**Starting a set,** each of which grants `activeTab` for that tab:
- the toolbar icon: opens the panel and reads the selection if there is one, else the article;
- right-click a selection, "Make an RC set from this";
- Alt+Shift+R.

**Reading the page.** A script run in the tab after the click takes the selection (`getSelection().toString()`,
which keeps paragraph breaks) or, with nothing selected, runs Mozilla's Readability (Apache 2.0, bundled, no remote
code) on a copy of the page, and returns the title, site name, link and text. Pages it cannot read (Chrome's own
pages, the PDF viewer, Google Docs, which draws on a canvas) show "Copy the text and paste it here" in the panel.

**Into the panel.** The extension keeps the article in `chrome.storage.session` by tab and posts it into the framed
page (`targetOrigin` 99ile.in). The page accepts messages only from the extension's pinned id, checks the shape and
size, and fills the article editor with `origin: "extension"`. The text never goes into an address or history.

**In the panel (360 to 500 px, the student can widen it),** the same steps as `/practice/article`: preview with the
fit check (word count, "A good CAT read", "More news than argument", "Too short, select more"), paragraphs used with
earlier and later, time at CAT pace and sets left today; one filled button, "Make my set" (signed out: "Sign in with
Google to make a set", which opens a tab, since Google refuses to be framed); the progress bar; the questions; review.

**Show me in the article.** In review, each deciding line has "Show me in the article": the panel asks the extension,
which highlights that sentence on the real page in the highlighter's full yellow (CSS Custom Highlight API) and
scrolls to it, still under the same `activeTab`. The passage in use is marked the same way, lighter, as soon as the
article arrives, and again when the student moves to earlier or later paragraphs.

**Words.** Right-click one to three selected words, "Add '<word>' to my words": the panel opens on `/panel/words`
with the word, its sentence from the page and the source, and a meaning in the student's own words (required, as for
every saved word, so no review card is blank). "Save" adds it to My words for spaced review (`vocab`, synced as kind
`word`, "Seen in" holding the sentence and source); a word already there says so with its next review day. No AI: a
meaning is the same for every student, and guessing it from the sentence first is what makes it stick.

**At install** the extension opens `99ile.in/extension`: what it does, the three ways to start, the privacy summary,
and "Sign in with Google" (the site's own flow). A student who is signed in sees "You're set".

**Panel layout (about 360 px).**
```
┌──────────────────────────────┐
│ The case for slower cities   │
│ Aeon · 1,240 words           │
│ ┌──────────────────────────┐ │
│ │ A good CAT read          │ │  tone, no border
│ │ Six paragraphs, about    │ │
│ │ 7 minutes at CAT pace.   │ │
│ └──────────────────────────┘ │
│ [      Make my set        ]  │  one filled button
│  Use earlier paragraphs      │  text links
│  1 of 2 sets left today      │
└──────────────────────────────┘
```
Same tokens, fonts and rules as the site (no text under 14 px, tone over borders, one filled button, reduced motion).

**Build (built 18 Nov 2026):** `extension/` in this repo: three small TypeScript files (`background.ts`, `panel.ts`,
`reader.ts`) and tested helpers (`text.ts`), bundled by the esbuild that Vite already brings (`npm run ext:build`, or
`ext:dev` for the local site); no framework, since the shell is a frame and a relay. Readability is the one new
package. The manifest's `key` pins the id to `jdbigbpnbadjaphglkhomapjbhajbphe`, the one the site allows; when the
store gives the listing its own id, it is added to `src/lib/panel.ts` and `public/_headers`.

## Panel home and the store (18 Nov 2026, D111)

**Panel home.** Guide first, then the student's own things. With no article sets yet, the whole panel is the guide: a
drawing in HTML of selected lines and the right-click menu with "Make an RC set from this", three steps, and at the
bottom "Sign in with Google" (the one filled button, when signed out) and "Paste the text instead". A returning student
gets one line on how to start, sets left today (`articlesLeft` from `GET /v1/ai`, on the IST day), recent sets, words
due and today's RC. There is no "Use this page" button: Chrome documents page access for the icon, the menu and the
shortcut only, not for clicks inside a side panel.

**Where the site points to it.** The home page (a band on computers only, with a drawing of the panel beside an
article), VARC practice ("Practise an article"), the article page (a card on computers only),
the RC library's "Your articles", the sidebar's More ("Chrome extension"), and `/extension`, which opens at install
with `?from=install` (sign-in is then its filled button; otherwise "Add to Chrome" is). The short link
`99ile.in/chrome` goes to `/extension` until the listing is live, then to the listing. Every install button is
`components/GetExtension.tsx`: "See the extension" while the listing is in review, "Add to Chrome, free" to the listing
once `STORE_LIVE` (in `data/site.ts`, with the store id `mjgmdkefkachokakimleommdodchkgfo`) is set. The store id is
allowed beside the development id in `src/lib/panel.ts` and `public/_headers`.

**Store.** `npm run ext:store` builds without the manifest `key` and zips it. The listing text, permission reasons,
data answers and reviewer notes are in `extension/listing/listing.md`; the five 1280×800 screenshots show the real panel
beside a sample essay page (our own passage, a made-up magazine), with the promo tile and icon. Order: upload a draft,
copy the id and public key from its Package tab, switch the site and `extension/key.txt` to them, deploy, fill the
listing, submit.

## Selecting (18 Nov 2026, D112)

Select text and, when the selection ends, a small button appears beside it: "Add to RC set · 212 words" for 15 words
or more, "Add to my words" for one to three. A click opens the panel (Chrome 157 allows it from the click) and adds
the text as a part of the passage; more selections add more parts ("2 parts, 498 words"), each marked lightly on the
page, until "Start over", "Make my set" or a new page. The right-click entry adds a part the same way; the icon with
nothing selected still takes the whole article.

Where it appears: on every site once the student turns on "Add to RC set as you select" in the bar under the panel
(Chrome asks once; `optional_host_permissions`), else on any page where they already clicked the icon or the
right-click entry. The script (`extension/src/select.ts`) draws the button in a closed shadow root, loads nothing (the
logo is inlined SVG), watches only for selections and sends nothing until the click.

## Getting the article in (decided 14 Nov 2026, D107)

On a phone the hard part is not the clipboard (it holds a whole article) but selecting one: dragging across many
screens, with ads, "Also read" links and captions in the way. So:

- **Paste button:** one tap reads the clipboard (after the browser asks once); the box still takes a long-press paste.
- **Clean-up by code:** "Advertisement", "Also read …", share labels, captions, datelines and bylines are dropped,
  and lines are joined back into paragraphs.
- **A one-line hint per browser:** Reader view, Select all, Copy.
- **Upload a .txt or .pdf:** daily editorials circulate as PDFs (Telegram compilations of The Hindu and others). The
  file is read on the device with Mozilla's `pdfjs-dist`, loaded only on this page; it never leaves the device and is
  never stored. In a PDF with many articles the student picks one by its heading, then the paragraphs. Text PDFs only;
  a scanned PDF or a screenshot needs OCR, which is later.

## Where the article text lives (decided 14 Nov 2026, D107)

The owner chose object storage over the phone's storage, so a student sees the full article on every device without
filling the browser's storage.

- **Cloudflare R2** (S3-compatible; free tier 10 GB-month of storage, 1M write and 10M read operations a month, no
  egress fees, checked 14 Nov 2026). At about 4 KB compressed, an article costs nothing for years, and a popular
  editorial is stored once however many students use it (keyed by the text's hash).
- **Private:** an article is read only through the API, and only by students who made a set from it
  (`ai.student_articles`); there is no public link.
- **Kept** 90 days after the last student opened it; a student can delete their own copy at any time. Questions,
  scores and mistakes stay in their history.
- **Without R2 configured** the text stays on the device that made the set; nothing else changes.
- The uploaded file itself is never stored anywhere.

## On the site: `/practice/article`

**Page layout (14 Nov 2026, D109).** The page opens with a short promise, then a focused article editor beside a three-step guide and privacy note on wide screens. On phones the editor comes first and the guide follows it. The passage preview and the one next action stay with the editor, so pasting, checking the chosen passage and making a set read as one flow.

1. **Receive.** From the extension, from a share, or pasted. The text is split into paragraphs and sentences with
   the site's own `sentences()` rule, the one Prove it uses.
2. **Preview.** Title, source, the paragraphs that will be used and their word count, with "Use earlier / later
   paragraphs". The filled button is "Make my set". Signed out: "Sign in with Google to make a set" (AI needs an
   account, D101).
3. **Making it** (about 20 to 40 seconds), with honest steps: Reading the article; Writing four questions; Checking
   them with a second AI. The page can be left; the set waits.
4. **Practise** in the normal RC player, timed at CAT pace, with Prove it.
5. **Review** as for any set: verdicts, deciding lines, option notes and traps, the model summary and tone, "Report a
   bad question". Wrong answers go to the error log with a cause; the article goes to the reading journal.

The student's article sets are listed as "Your articles" (a tab of the RC library, and on the article page), newest
first, each with where it came from (pasted, a PDF with its file name, a text file; later the extension or a share),
its source (typed, or the site's name from the link), the date and the last score. A set's title is the student's,
else the article's own headline (its first line, found by code), else the PDF's file name, else a 3 to 8 word title
the writer gives in the same call. The page says what happens to the article: a file is read on the device and never
uploaded; only the chosen paragraphs are sent, kept privately for 90 days in R2 so the set can be reviewed on any of
the student's devices (built 14 Nov 2026: `internal/blob`, a hand-written SigV4 client checked against AWS's
published example; `texts.go`; migration 18; `GET /v1/ai/article/{job}/text` for the student who made the set; at
most 500 new texts a day across the site and 64 KB each). The same page serves
phones and computers; the extension will open it with the article already in.

## Server

**`POST /v1/ai/article`** with `{title, site, link?, paras: string[][]}` (sentences, as split by the site) starts a
job and answers `202 {job}`; **`GET /v1/ai/article/{job}`** answers `{state, set?}`. A job is needed because the
work takes longer than a request may (10 s here, 30 s on Render). The gate is the one every AI answer passes (Google
account, address limit, student cap, reserved budget), with a larger reservation and a separate cap of two article
sets a student a day.

**Pipeline**, each step checked by code:
1. **Limits:** 350 to 1,200 words, at most 40 sentences per paragraph and 12 paragraphs, 16 KB of body.
2. **Writer** (`gpt-oss-120b`, strict schema): four questions of the types above; four options each; the key; a note
   and, for wrong options, a trap name from our list; deciding lines as sentence numbers; and a model summary with
   claim, qualifier, tone, tone cue and reason. Code checks every sentence number, that options differ, that the trap
   names are ours, the summary's length and that the tone cue is an exact phrase of the article.
3. **Solver** (blind: no key, no notes, in a call of its own): answers each question and names its line. Questions
   where it misses the key are dropped. Fewer than three left: another try (three in all), then "We could not make a
   fair set from this article" (nothing is charged to the student's cap).

   Changed 14 Nov 2026 after live use: the writer writes **five** questions and the set keeps the first four that
   pass; each question is checked on its own, so one slip drops that question, not the set; and the strong model
   checks first, because the small one failed good questions often enough to sink sets. With these, a 636-word
   article made a four-question set in three runs out of three (10 to 40 seconds).
4. **Result** stored with the job for 24 hours, then deleted. The article text is never stored; only a hash of it.

**Cache.** A finished set is kept 30 days under the hash of the normalised paragraphs, so a popular editorial
practised by many students is made once. It holds the questions, not the article (decided, below).

**Cost.** About 7,000 tokens a set (writer about 4,500, solver about 2,500). On Groq's free tier,
`gpt-oss-120b` allows 200K tokens a day, so about 25 new sets a day across all students before the fallback models
take over; repeats cost nothing.

## Data on the device

`articles`: `{id, title, site, link?, paras, questions, summary, created, origin}` in the store and in sync (kind
`article`), the newest 30 kept. RC attempts on them are ordinary attempts whose set id starts with `art-`. The error
log, journal and Prove it read them like any set; the timed sectional, the arena and the daily set do not use them.

## Copyright and privacy

- The student sends text they can already read, for their own practice. Nothing is published or shared: a set is
  visible only to the student who made it.
- The server keeps no article text, and keeps generated questions only under a hash, for 30 days.
- The extension reads a page only after a click, sends nothing anywhere itself, and its listing says so. The privacy
  page gains a section on articles.

## Not in this version

Choosing a question type to focus on, and adding several parts of a page to one set (next, D110); sharing a set with friends (it would republish the article); Firefox and
Safari; the summary second opinion and "Explain my mistake" on article sets (the server would need the article
again); tables to DI caselets (F63, later, on the same extension); a premium tier.

## Decided (owner, 13 Nov 2026)

1. Paste page first (with the server pipeline), the Chrome extension second, Android share third.
2. Two new article sets a student a day.
3. Finished sets cached 30 days under the article's hash; no article text kept.
4. `@mozilla/readability` is added as a dependency of the extension.

Still open: a Chrome Web Store developer account (one-time US$5) under the team address, needed only when the
extension is ready to list.
