# Updates, roadmap and guides, redesigned (4 Nov 2026)

Owner, 4 Nov 2026: "redesign these pages, modern, a better UI and UX … GSAP required; remove 'tell us on GitHub', we have our mail ID." Built in the house language (paper, blue ink, one yellow highlighter; tone not borders; text 14 px and up; one memorable thing per page; nothing moves under reduced motion). daisyUI was not added: it is a second component kit beside shadcn, and new dependencies need the owner's yes. The fonts stay the self-hosted Schibsted Grotesk and Source Serif 4, which the 4G budget was tuned for. ui.watermelon.sh had no timeline, changelog or index patterns (its catalogue lists accordions and alerts), so the patterns are our own.

## Updates (`pages/Updates.tsx`)
- **Coming up**, the one memorable thing: a strip of the dates the entries are about (`dates` on an update), each tile the day in large figures, what happens, and the days left; the nearest in the highlighter. A tap goes to its entry. On a desktop the page uses its full width: the updates on the left and the dates as a calendar column on the right that stays in view (and scrolls inside itself when taller than the screen; owner, 4 Nov 2026: the reading width left half the page empty). On a phone the dates are a sideways strip above the updates. GSAP: the tiles slide in once.
- Entries, newest first, filterable by exam; each lists its dates still ahead with the days left, and links the official page.
- "Every entry checked on …" from `CHECKED`.

## Roadmap (`pages/Roadmap.tsx`)
- **New this month** as cards, two to a row across the full page width (owner, 4 Nov 2026: "use more width … reduce height, increase width of block"), a lone last card spanning the row; each marked Live. The rest of what is live folded under "Also live: 9 more". The timeline's lists sit two to a row on wide screens.
- **What's next**, the one memorable thing: a timeline from Now through each dated group. GSAP: the line draws down from Now once and each station marks as it reaches it.
- The GitHub line is gone: "Write to 99ile.team@gmail.com" (`CONTACT_EMAIL`), which opens the mail app in place (`TextLink` now treats `mailto:` that way everywhere).
- The shared feedback invite is a quiet rounded tone surface, with its email link beside the copy on wide screens and below it on phones.

## Guides (`pages/Guides.tsx`)
- **Start here** featured, its title in the serif; while CAT 2026 is ahead, "The last 25 days before CAT 2026" beside it in the highlighter tone with the days to go. The rest by kind (Strategy and the exam, Mocks, Life around preparation, After the score). GSAP: the two featured cards rise in once.
- **A guide**: a thin reading line under the header that fills as the student reads (scroll-linked, not an animation), the part on screen marked in "In this guide", numbered and bulleted markers in ink blue, "Next guide" labelled.

## Topper stories (`pages/Stories.tsx`)
Owner, 4 Nov 2026: "redesign this page also … looks very awful." Before, ten identical cards with the score in small grey type, uneven buttons, and an interview list that repeated four interviews already linked from the cards.
- **The score first**, the one memorable thing: the highest score (Sarthak Gupta, 100 in VARC) as a wide lead card with the figure in display size; the other nine in three columns, each opening with its percentile in large figures and what it is a percentile in. The figures count up once on arrival (GSAP), in proportional digits so "99.94" does not space out round the point.
- **What they have in common**: the four habits as cards, each pointing to the page that builds it here (Reading journal, Error log, the report card, Analyse a mock).
- **More from toppers** and **How each CAT went** side by side, leaving out the interviews already on a card.
- Sharing a story: write to the team email, in place of "story submissions are on the roadmap".
- The shared feedback invite uses the same quiet, responsive treatment as the roadmap.

## Settings and backup (`pages/Settings.tsx`), 5 Nov 2026
Owner, 5 Nov 2026: "a redesign of … settings and backup page." Before, one narrow column with half the desktop empty: theme, Not sure, install and the reminder each a heading, a paragraph and a control, then eight "0" tiles above the backup, three filled buttons, and the backup (the page's job) fifth.
- **Your backup first**, the one memorable thing and the one filled button: what a backup holds in a sentence ("3 days of study, 1 practice set and 1 mistake logged", `holds` in `lib/backup.ts`, empty parts left out), when the last one was made from this browser (pref `lastBackup`, set on Download), in the highlighter once it is more than 14 days old or there has never been one, then Download and Restore. With sync on (signing in turns it on) the server keeps a copy of every record, so the line says so and is never highlighted: a backup file is only extra safety. Beside it: how full this browser is as a thin bar (red near the 5 MB limit), and whether sync is on, linking to the You page.
- **Two cards of setting rows** across the full width: "How it looks and works" (theme, the Not sure button) and "On this device" (install, the daily reminder). Each row is its name and what it does on the left, its control on the right; stacked on a phone.
- **Start over** as the last row, its button in the danger tone, not filled.
- No motion: a settings page should hold still.
