# Home page, version 2 (D42, 28 Oct 2026)

The owner asked for a home page in the spirit of mba.preparoo.app, the Pixel Buds Pro 2 page and the AirPods Pro page: not copied, used as reference. Screenshots of all three were read on 28 Oct 2026.

## What the references do

| Reference | What works | What we take |
|---|---|---|
| Preparoo | One huge plain headline ("Ace the CAT"); the real product shown big (a real question card in a browser frame); a feature list on the left that swaps a live preview on the right; a closing line with an image trail that follows the cursor | The huge headline; real product previews, not pictures of it; list-plus-preview; one closing moment that answers the pointer |
| Pixel Buds Pro 2 | A rounded hero panel with the object; short headlines; accordions beside media; lots of space | Short headlines; an accordion on phones |
| AirPods Pro | The object first; huge statements on their own; big numbers with small labels ("2x more"); scroll moves things | Big numbers; one scroll-driven moment |

All three show the thing itself. For 99ile the thing is the practice, and the goal is a percentile, so that is what the page shows.

## The page, top to bottom

1. **Hero.** The headline, larger (up to about 7rem). One line under it, one filled button, the countdown. Beside it (under it on a phone) a 3D field of dots shaped as the CAT score curve: each dot is a group of test takers, the top one in a hundred in highlighter yellow, and one blue dot, the student. Scrolling moves the blue dot up the curve and a label reads its percentile live. The dots fall into place once on arrival. A flat drawing of the same curve shows while three.js loads, and stays for Data Saver, 2G or no WebGL.
2. **Today** (returning students only, so the next task is one scroll away).
3. **"Practice that shows its working."** Four items on the left; the right shows each one working: today's passage (the real one), a results grid filling in step by step, a missed question coming back on days 1, 3 and 7, and the real timetable reshaping as you pick 30, 60, 90 or 120 minutes. On a phone the preview opens under the item picked.
4. **Big numbers.** Passages, VA paragraphs, logic sets, and 0 rupees, counting up once when they scroll into view.
5. **The three sections** as wide rows, not three equal cards. DILR shows as open (it said "Coming soon").
6. Today, for new students; updates and the exam pattern; About.
7. **Closing line.** "A little every day, done well." in display size; the highlighter sweeps under it as it scrolls into view.

## Rules kept

The desk palette (paper, blue ink, one yellow highlighter) and the two typefaces stay. No text under 14 px, one filled button per screen, the highlighter only for the top percentile and the closing line. Text is HTML, never drawn into WebGL. Under reduced motion nothing moves: the field is drawn once, the numbers show their values, the highlight is already there. three.js and GSAP never join the first download (D41); the parts below the hero load as a separate file.

## Version 3, same day: layout, timelines, motion (owner feedback)

The owner found some parts empty and others crowded, and asked for better layout, motion and 3D, bolder type, and better versions of the two timelines (the road to CAT and today's plan). More references were read from screenshots: Stripe, Poolside, Linear and Vercel.

| Reference | Taken |
|---|---|
| Stripe | Two-tone headings (the claim in full ink, the detail muted, one paragraph); a bento of tiles, each showing the product working; a stats row with hairlines; art that bleeds off the edge |
| Linear | Title left, detail right; a statement paragraph; product pictures that fade at the edges |
| Vercel | One glowing object in the hero; a bento of recent work |
| Poolside | Restraint; a giant striped wordmark closing the page |

Changes:
- **Type:** Schibsted Grotesk's file already holds weights to 900; the CSS now allows them, and display headings use 800.
- **Hero:** headline, one line, one button, and a one-line status (days left, phase). The countdown moves into its own section. The 3D field is larger and runs to the screen's edge; it breathes, the top 1% glow, the student's dot has a pulsing halo, and scrolling turns the field as the dot climbs.
- **The road to CAT:** a large days-left number and a full-width timeline of the five phases (lengths to scale, month marks, today's pin, the exam flag), each with what it is for. It draws itself once on arrival. Vertical on a phone.
- **Today:** the day's blocks as a timeline (done, next, later), a ring for minutes done, and the week as seven bars.
- **Practice:** a bento of four tiles, all working at once, instead of a list you click through. A soft light follows the pointer over a tile.
- **About:** a statement paragraph whose words light up as it scrolls past, over four short points.
- **Close:** the closing line, then a giant striped "99ile" wordmark whose stripes drift as the page scrolls.

No fade-up on every section: each motion shows something (a dot climbing, a timeline drawing, a day filling, words read).

## Version 3.1: the wordmark and the links (owner feedback)

- **Wordmark:** with a mouse, the pointer is a highlighter (the stripes turn solid yellow in a soft circle round it), and moving it drops a trail of cards from the site (passage titles, question types, "+3", "Day 7: cleared") that pop in and fall away, after Preparoo's image trail. A tap drops one card on a phone. Decoration only, hidden from screen readers, still under reduced motion.
- **Links:** standalone links on the home page are `ArrowLink` (kit): ink text and an arrow, no underline at rest; on hover the arrow steps forward and an underline draws in. Links inside a sentence keep a quiet ink underline. The rest of the site still uses the blue `TextLink`.

## Version 3.2: the hill as a toy (owner feedback)

The owner found the hill flattened after scrolling or clicking, and wanted it larger and more interactive on a desktop.
- **Bug:** the lean towards the pointer was measured against the picture's box after scrolling, unclamped, so a pointer below a scrolled-away hero tipped the hill towards the camera until it looked flat, and the pose differed with every scroll. The lean is now measured only while the pointer is over the picture, clamped, and eases back to rest when it leaves.
- **Larger:** the picture takes more of the hero, runs under the text column a little and to the screen's edge, and the camera sits closer on wide screens.
- **Interactive (mouse only):** the hill swells under the pointer; a drag turns it and it springs back to rest when let go; a click sends a ripple through the crowd from where it landed and returns the hill to rest. Touch keeps scrolling; reduced motion keeps a still picture.
