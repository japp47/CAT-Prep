# Article to RC and the 99ile extension (F34, F53), planned 13 Nov 2026

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

## Shape: the extension is a doorway, 99ile is the room

The practice happens on 99ile.in, not inside the extension.

- **Exam-like.** CAT shows a plain passage beside its questions. 99ile's RC player already does that, with the
  passage pane, timer, Prove it and review; an article in our reader, without its ads and pictures, is closer to the
  exam than the article in its own page.
- **One player, one design.** A second player inside a side panel would drift from the site's and double the work.
- **Data stays where it is.** Attempts, errors and the journal live in the site's storage and sync; the extension
  holds nothing but the article it just read, for a few minutes.
- **No account in the extension.** Sign-in, caps and AI stay on the site; the extension has no key, no token and
  never calls the API.

So the extension does three things only: read the page when asked, judge whether it is a good CAT read, and hand the
text to 99ile.

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

**Permissions:** `activeTab` and `scripting` (read the current tab only after a click), `contextMenus` (right-click
on a selection), `storage` (the hand-off, for a few minutes). No host permissions, so it cannot read any page on its
own. `externally_connectable` lists 99ile.in, so only our site can ask it for the article.

**Reading the page.** On a click, a script in the tab runs Mozilla's Readability (Apache 2.0, bundled, no remote
code) on a copy of the page and returns the title, site name, link and paragraphs. A right-click on selected text
uses the selection instead, for pages where Readability fails or for one section of a long piece.

**The fit check (on the device, no AI).**
- Length: 350 to 1,200 words is used as is. Longer pieces are cut to the run of paragraphs nearest 600 to 900 words,
  which the student can move on the next page. Shorter ones are refused with the reason.
- Argument: the share of sentences with claim and contrast markers (however, yet, argue, suggest, unless, …),
  sentence length and the share of long words. Verdicts: "A good CAT read", "Easy, more news than argument", "Not an
  article" (lists, product pages, threads).
- Time at CAT pace: about seven minutes for a 700-word passage and four questions.

**Hand-off.** The popup saves the article in `chrome.storage.session` under a random id and opens
`99ile.in/practice/article#from=<id>`. The page asks the extension for that id through `externally_connectable`;
the extension answers once and deletes it. The text never goes into an address, a log or browsing history. If the
student must sign in first, the page keeps the id and asks again on return (the article waits 30 minutes).

**Popup (about 360 px wide), in the site's idiom.**
```
┌────────────────────────────────────┐
│ 99ile                              │
│ The case for slower cities         │
│ Aeon · 1,240 words                 │
│ ┌────────────────────────────────┐ │
│ │ A good CAT read                │ │
│ │ Dense argument; we'll use six  │ │
│ │ paragraphs, about 7 minutes.   │ │
│ └────────────────────────────────┘ │
│ [  Practise as a CAT RC         ]  │  one filled button
│    Write a summary instead         │  text link: reading journal
└────────────────────────────────────┘
```
Same tokens, fonts and rules as the site (no text under 14 px, tone over borders, one filled button, reduced
motion). "Not an article" shows what to read instead, linking to the reading list.

## On the site: `/practice/article`

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

The student's article sets are listed under VARC practice as "Your articles", newest first.

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
3. **Solver** (a different model, blind: no key, no notes): answers each question and names its line. Questions
   where it misses the key are dropped. Fewer than three left: one more try, then "We could not make a fair set from
   this article" (nothing is charged to the student's cap).
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

A side panel for answering beside the page; sharing a set with friends (it would republish the article); Firefox and
Safari; the summary second opinion and "Explain my mistake" on article sets (the server would need the article
again); tables to DI caselets (F63, later, on the same extension); a premium tier.

## Decided (owner, 13 Nov 2026)

1. Paste page first (with the server pipeline), the Chrome extension second, Android share third.
2. Two new article sets a student a day.
3. Finished sets cached 30 days under the article's hash; no article text kept.
4. `@mozilla/readability` is added as a dependency of the extension.

Still open: a Chrome Web Store developer account (one-time US$5) under the team address, needed only when the
extension is ready to list.
