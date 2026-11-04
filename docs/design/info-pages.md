# Updates, roadmap and guides, redesigned (4 Nov 2026)

Owner, 4 Nov 2026: "redesign these pages, modern, a better UI and UX … GSAP required; remove 'tell us on GitHub', we have our mail ID." Built in the house language (paper, blue ink, one yellow highlighter; tone not borders; text 14 px and up; one memorable thing per page; nothing moves under reduced motion). daisyUI was not added: it is a second component kit beside shadcn, and new dependencies need the owner's yes. The fonts stay the self-hosted Schibsted Grotesk and Source Serif 4, which the 4G budget was tuned for. ui.watermelon.sh had no timeline, changelog or index patterns (its catalogue lists accordions and alerts), so the patterns are our own.

## Updates (`pages/Updates.tsx`)
- **Coming up**, the one memorable thing: a strip of the dates the entries are about (`dates` on an update), each tile the day in large figures, what happens, and the days left; the nearest in the highlighter. A tap goes to its entry. On a desktop the page uses its full width: the updates on the left and the dates as a calendar column on the right that stays in view (and scrolls inside itself when taller than the screen; owner, 4 Nov 2026: the reading width left half the page empty). On a phone the dates are a sideways strip above the updates. GSAP: the tiles slide in once.
- Entries, newest first, filterable by exam; each lists its dates still ahead with the days left, and links the official page.
- "Every entry checked on …" from `CHECKED`.

## Roadmap (`pages/Roadmap.tsx`)
- **New this month** as cards, each marked Live; the rest of what is live folded under "Also live: 9 more".
- **What's next**, the one memorable thing: a timeline from Now through each dated group. GSAP: the line draws down from Now once and each station marks as it reaches it.
- The GitHub line is gone: "Write to 99ile.team@gmail.com" (`CONTACT_EMAIL`), which opens the mail app in place (`TextLink` now treats `mailto:` that way everywhere).

## Guides (`pages/Guides.tsx`)
- **Start here** featured, its title in the serif; while CAT 2026 is ahead, "The last 25 days before CAT 2026" beside it in the highlighter tone with the days to go. The rest by kind (Strategy and the exam, Mocks, Life around preparation, After the score). GSAP: the two featured cards rise in once.
- **A guide**: a thin reading line under the header that fills as the student reads (scroll-linked, not an animation), the part on screen marked in "In this guide", numbered and bulleted markers in ink blue, "Next guide" labelled.
