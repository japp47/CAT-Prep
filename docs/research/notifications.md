# Reminders by push and email: research (5 Nov 2026)

Owner, 5 Nov 2026: "notification ... is must and soon"; "send mails if they miss the RC / DILR of the day or a simple reminder ... not sure at what time, only when they miss it, or at what frequency"; "mail templates we can configure"; "a notification service ... with solid principles, as we will add a different channel". This note covers what students should get and when (the functional side). How it is built comes after the owner agrees to the spec (F65 in `docs/feature.md`, D89 in `docs/analyze.md`).

## 1. What the site has today
- **Who the server knows about.** Students with sync on (Google sign-in or a sync code) send their attempts to the server, so it can tell whether they practised today. Students without sync are invisible to it.
- **Who has an email.** Only students signed in with Google. A sync-code student has none.
- **Reminders.** None from the server. Settings offers a calendar reminder (`lib/ics.ts`, an `.ics` event the student adds to their own calendar).
- **What a reminder can point at.** Every day has an RC of the day, an LR set of the day and a DI set of the day in the plan (`sections/*/plan.ts`, `practice/daily.ts`), and Today has one next step with its minutes and reason (F41, `practice/next.ts`).
- **The weekly review** (F13) is computed on the device (`practice/week.ts`); nothing sends it.
- **Email.** The server emails only the team, once a day, through the team's Gmail over SMTP (`server/internal/digest`). The site has no domain of its own (99ile.pages.dev).

## 2. Findings

### Timing and frequency
- **Duolingo**, the most studied case (Yancey and Settles, KDD 2020), judges a practice reminder by one thing: whether the learner finishes a lesson within two hours of it. Their system gives less weight to wording the learner saw recently, so the same line does not repeat, and some wordings only go to some learners (one needs a streak of three days or more). Takeaway: measure "practised within two hours", rotate the wording, and make the streak wording conditional.
- **Reminders help in the short term.** In a 28-day app study, students who got reminders hit their daily goal more often (Stawarz et al., JMIR 2017).
- **But reminders can become a crutch.** In a CHI 2015 study, reminders kept people repeating a task but slowed the habit forming. Cues tied to an event already in their day ("after dinner") built the habit better (Stawarz, Cox and Blandford). Takeaway: when a student turns reminders on, let them tie the time to their routine, and default to the time they usually practise, not a time we pick.
- **No study** compared reminder times students choose with times set for them. Rules here are judgement, marked so.

### Asking for permission (web push)
- **Chrome** shows a quieter, easy-to-miss permission prompt on sites whose prompts are mostly refused, and to users who usually refuse. Asking on arrival gets refused most often. Google's advice is to ask once the visitor understands the value.
- **Firefox** shows the quiet prompt whenever a site asks without a click.
- **The usual pattern is two steps.** First our own card ("Remind me tomorrow?"). The browser's prompt opens only when the student taps yes, so a "not now" never counts against the site.
- **iPhone and iPad:** web push works only once the site is added to the Home Screen (iOS 16.4 or later; declarative web push from 18.4), and the prompt must come from a tap. In Safari's tabs there is no push at all, so these students need email or the install steps.
- **A push must show something.** Browsers expect every push to show a notification, so the device cannot quietly drop a reminder after practice. The server must decide, and it can only do that for students with sync on.

### Email
- **Gmail and Yahoo rules** (since 2024):
  - SPF, DKIM and DMARC on the sending domain;
  - one-click unsubscribe (RFC 8058) for any mail that is not transactional, honoured within two days;
  - a spam-complaint rate under 0.3%, and under 0.1% to be safe.

  Study reminders are not transactional, so all of this applies. Treat it as the floor from the first email.
- **Sending from a Gmail account is not an option.** It caps a personal account at about 500 recipients a day, and mail sent in bulk from a gmail.com address lands in spam. Reminders need a domain we own (for example `mail.99ile.in`) and an email service. Resend's free plan, for example, sends 100 a day and 3,000 a month; Pro is $20 for 50,000 a month.
- **India: the DPDP Rules** were notified on 13 Nov 2025 and come in over 18 months. The duties on withdrawing consent apply from 13 May 2027, and withdrawing must be as easy as consenting. Signing in with Google is not consent to reminder emails. Build to that now: consent per kind of email, nothing ticked in advance, one-click withdrawal.

## 3. What this means for 99ile
1. **Reminders need sync.** Turning them on asks a student without sync to sign in. Reminders become a reason to sign in, and the calendar reminder stays for the rest.
2. **Push carries the daily reminder. Email is for moments, not every day.**
   - A missed day is the normal case, so "an email on every missed RC" would email most students most days. That leads to unsubscribes, complaints, and a domain whose mail goes to spam.
   - Email works best when the rhythm breaks (two days missed), for the weekly review, and for students who ask for a daily email.
3. **At most one study message a day, across all channels.** Nothing on a day the student practised, wherever they practised. A series that stops by itself when a student has gone quiet.
4. **Ask after the first finished set, never on arrival.** Our card first, the browser's prompt only after a yes.
5. **Wording lives outside code, as content.** It is checked by tests like the question bank, rotated so it does not repeat, and judged by "practised within two hours", without tracking pixels.

## Sources
- Yancey and Settles, "A Sleeping, Recovering Bandit Algorithm for Optimizing Recurring Notifications", KDD 2020: https://research.duolingo.com/papers/yancey.kdd20.pdf
- Implementation intention and reminder effects in a mobile health system, JMIR 2017: https://pmc.ncbi.nlm.nih.gov/articles/PMC5730820/
- Stawarz, Cox and Blandford, "Beyond self-tracking and reminders", CHI 2015: https://discovery.ucl.ac.uk/id/eprint/1468224/
- Chromium blog, quieter permission UI for notifications (Jan 2020): https://blog.chromium.org/2020/01/introducing-quieter-permission-ui-for.html
- OneSignal, web push permission prompting changes: https://onesignal.com/blog/web-push-permission-prompting-changes/
- WebKit, Meet Declarative Web Push: https://webkit.org/blog/16535/meet-declarative-web-push/
- Pushpad, iOS requirements for web push: https://pushpad.xyz/blog/ios-special-requirements-for-web-push-notifications
- Resend, Gmail and Yahoo bulk sending requirements: https://www.resend.com/blog/gmail-and-yahoo-bulk-sending-requirements-for-2024
- Bird, Gmail and Yahoo sender requirements: https://bird.com/docs/knowledge-base/deliverability/gmail-yahoo-requirements
- Resend pricing: https://resend.com/pricing
- Khaitan & Co., DPDP Rules notified (15 Nov 2025): https://www.khaitanco.com/sites/default/files/2025-11/ERGO%20-%20Digital%20Personal%20%20Data%20Protection%20Rules%20-%2015%20November%202025.pdf
- KPMG, DPDP Rules 2025 guidance: https://assets.kpmg.com/content/dam/kpmgsites/in/pdf/2025/11/dpdp-rules-2025-guidance-to-dpdp-act-implementation.pdf
- Primelegal, DPDP Rules timeline: https://blog.primelegal.in/?p=61104
