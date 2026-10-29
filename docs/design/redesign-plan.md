# Redesign plan: Tailwind CSS + shadcn/ui

Written 18 Oct 2026, from an audit of the live pages. **Built 19 Oct 2026** on `feat/redesign-tailwind-shadcn`, all phases (D0 to D5) in one branch; see section 9.

## 1. Why

The site works, but it looks crowded and generic, and the type is too small to read comfortably. The owner asked for:
- a proper CSS framework instead of one hand-written stylesheet;
- better fonts, sizes and spacing;
- desktop and phone layouts that don't feel crowded.

The audit used two design skills (`design-taste-frontend` and `frontend-design`), their linter and their browser inspector, at 1440, 768 and 390 px.

## 2. What the audit found

### Measured

| Check | Today | Target |
|---|---|---|
| Typefaces on a page | 3 (Schibsted Grotesk, Source Serif 4, IBM Plex Mono) | 2: one for the interface, one for long reading |
| Share of text in monospace | 16–39% | 0% |
| Font sizes on one page | 10 to 12 (10 px up to 116 px) | 5 at most |
| Running text size | 13–14 px | 16 px, and 18 px for passages |
| Linter FAILs in `src/` | 143 | 0, except form fields and tables |

The 143 FAILs break down as:
- 54 small all-caps labels above headings;
- 47 monospace uses;
- 30 thin divider lines;
- 29 one-pixel outlined boxes;
- 10 shadows;
- 2 emoji.

### Seen in the screenshots

- **Everything is a box.** The Practice page is eight identical cards. Each has the same small all-caps label, a heading, grey text and a button. Nothing tells the student what to do first.
- **Too much on one page.** On a phone, Practice runs about ten screens: 40 RC sets and 14 past days, all in one list.
- **The main thing is below the fold.** On Today, a phone's first screen holds a caption, the streak, a title, a paragraph, the date bar and eight time chips. The timetable itself starts on screen two.
- **Small grey text everywhere.** The details students need (time, word count, marks) are 12–13 px monospace capitals.
- **No single main thing on app pages.** The largest text is 38 px, and every block is the same weight.
- **The guide boxes and tags look alike.** "Core", "Must-do", "Live" and the question-type tags all use the same small boxed capitals.

## 3. Framework: Tailwind CSS v4 with shadcn/ui

Use both: shadcn/ui is built on Tailwind.

- **Tailwind CSS v4.** It's installed with the `@tailwindcss/vite` plugin. Design tokens live in CSS (`@theme`), so light and dark themes stay simple CSS variables, as they are today.
- **shadcn/ui.** It copies small components into `src/components/ui/` that we own and can edit. They're built on Radix, so focus, keyboard use, screen readers and dialogs come free. It isn't a dependency we can't change.
- Components we'll use:
  - Button, Card, Tabs, ToggleGroup (time chips, filters), Select, Input, Checkbox
  - Dialog and AlertDialog (submit confirmations), Sheet (phone menu, word sheet)
  - Collapsible (guides), Progress, Table, Tooltip, Popover, Skeleton (loading)
  - Sonner (small "Added to Error log" notices)
- **Icons:** keep our own nav icons. shadcn components use Lucide icons inside (chevrons, ticks); that's fine and stays invisible.
- **New packages:** `tailwindcss`, `@tailwindcss/vite`, `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner`, `tw-animate-css`. Each is checked against `package.json` before adding.
- **Bundle:** the main bundle is 427 KB (135 KB gzipped) today. Each page will load only when opened (`React.lazy`), which should cut the first load well below today's, even with Radix added.
- **Reference sites, not dependencies:** `ui.watermelon.sh/developers` for component interaction patterns and `motion.dev` for animation technique, checked before building a non-trivial component or animation and re-expressed in shadcn/Tailwind and GSAP (see the `frontend-reference-sites` skill). Neither is added as a package without asking first.

## 4. Design direction

### The idea

**A student's desk: blue ballpoint, yellow highlighter, clean paper.** Students mark passages with a highlighter and write with a blue pen. The site already uses yellow for core tasks and proof paragraphs. That becomes its one memorable device, used only where it means "this matters": the core task, the proof paragraph, the RC of the day. Everything else is quiet.

Checked against the generic defaults in the `frontend-design` skill:
- not cream with terracotta;
- not black with neon;
- not newspaper hairlines;
- not the SaaS card kit;
- no monospace labels.

### Colour (light; dark mirrors it)

| Role | Hex | Use |
|---|---|---|
| Paper | `#F5F6F8` | Page background |
| Sheet | `#FFFFFF` | Raised surfaces: the panel you're working in |
| Ink | `#141A24` | All running text, in full ink, not grey |
| Ballpoint | `#2340C8` | One accent: primary buttons, links, current page |
| Highlighter | `#FFE15A` | Core task, proof paragraph, RC of the day. Nothing else |
| Muted ink | `#5B6577` | Secondary notes only |

Green and red appear only for right and wrong answers and scores. Surfaces are separated by a step in tone, not by a border or a shadow.

### Type

- **Interface and headings:** Schibsted Grotesk. It's already loaded, plain and confident, and made for a news publisher, which suits a daily-reading habit. Weights 400, 500, 600 and 700.
- **Passages and guides:** Source Serif 4 at 18 px with 1.65 line height, 65–72 characters a line. Long passages read better in a serif, as they do in print.
- **Removed:** IBM Plex Mono. Numbers use tabular figures in Schibsted Grotesk.

| Step | Size (desktop / phone) | Use |
|---|---|---|
| Display | 96 / 64 px | Home countdown only |
| Title | 36 / 28 px | Page title |
| Heading | 22 / 20 px | Section and panel headings |
| Body | 16 px | Everything you read |
| Small | 14 px | Secondary notes, table cells |

- No text below 14 px.
- Labels are sentence case, never small all-caps.
- Meta lines use words ("Society and technology, medium, 387 words"), not dot-joined fragments.

### Space and layout

- 4 px base. Page gutter is 16 px on phones and 32 px on desktop. Content max width is 1120 px; reading width is 68 characters.
- The gap between sections (48 px on app pages, 96 px on the home page) is clearly larger than any gap inside a panel (16–24 px).
- Corner radius is decided once: 8 px for buttons and inputs, 14 px for panels.
- Buttons: one filled primary action per screen. Everything else is a quiet or text button.

### Rules carried from the skills (app version)

- No small all-caps labels above headings. The heading says it, or the label goes.
- No monospace outside code.
- No thin divider lines or outlined boxes, except form fields, tables and the CAT exam palette, which copies the real exam's look.
- No shadows on things at rest; only menus, sheets and dialogs float.
- No gradients, glass or decorative shapes.
- No numbered markers unless the content really is a sequence (method steps are).
- Motion only answers the student's action: opening, confirming, moving to the next question.

The taste skill's marketing-page rules (a picture floor, 8vw headlines, scroll animation counts) don't fit a study app, so they apply only to the home page's first screen.

## 5. Page by page: less crowding

**App shell**
- Desktop: the sidebar keeps its labels, with smaller group names in sentence case.
- Phone: a thin top bar (wordmark and menu), the bottom bar as today, and the menu as a Sheet.

**Home.** Keep the new structure. The countdown is the one display-size element, and the Today panel uses tone instead of borders.

**Today**
```
Phone, first screen
┌───────────────────────────┐
│ Today          ‹ 18 Oct › │  date control folded into the title row
│ 120 min planned ▾         │  opens time choices in a sheet
│ ▌Gejo's course, 45 min    │  highlighter = core task
│  Start timer   Done       │
│  Long read, 40 min        │
│  Three RCs, 25 min        │
└───────────────────────────┘
```
- The phase line moves under the title as one plain sentence.
- The time chips move into a popover on desktop and a sheet on phones.

**Practice hub**
```
Desktop
┌ Practice ───────────────────────────────────────┐
│ ▌RC of the day: The myth of the neutral algorithm│  big, highlighted, one Start
│  Daily VA drill   ·   Timed sectional            │  two medium panels
├──────────────────────────────────────────────────┤
│ Redo queue (3 due) · Speed test · Drill one type │  one quiet row
│ RC library →  (its own page, with filters)       │
└──────────────────────────────────────────────────┘
```
- The 40-set library and the past RCs of the day move to `/practice/library`, with genre filters and tabs. The hub fits on about two phone screens.

**Players (RC, VA, sectional, redo, speed)**
- Passages in 18 px serif. Options as large tap targets.
- Explanations in full ink, with the trap as a coloured word.
- Confirmations use AlertDialog instead of inline boxes.

**VARC section**
- Tabs become shadcn Tabs.
- Resource rows lose their outlines: tone separation, with the "Must-do" mark as a highlighter stroke on the name.

**Progress, Error log, Words, Plan, Settings**
- Tables stay tables, with larger text.
- Forms use shadcn inputs.
- Empty states give one clear next step.

**Explore pages (updates, exams, guides, stories, roadmap):** reading layout, one column at 68 characters, and the guide's side rail kept.

## 6. Phases

Each phase is its own branch and commit. The app keeps working after every phase; the old stylesheet shrinks as pages move over.

| Phase | Build | Done when |
|---|---|---|
| **D0 Setup** | Tailwind v4, shadcn init (`@/` path alias, `cn()` helper), tokens for light and dark, fonts. Old `styles.css` loaded after Tailwind so nothing changes visually | Every page looks the same as before; checks pass |
| **D1 Shell and home** | Sidebar, top bar, bottom bar, Sheet menu, home page, shared pieces (page header, panel, stat, empty state) | Home and shell pass the linter |
| **D2 Daily path** | Today, Practice hub, new `/practice/library` | A phone's first screen shows the core task and the RC of the day |
| **D3 Players** | RC, VA, sectional, redo, speed test | Passages at 18 px serif; dialogs replace inline confirmations |
| **D4 Section and tracking** | VARC page and guides, Progress, Error log, Words, Plan, Settings | No text under 14 px |
| **D5 Explore and clean-up** | Updates, exams, guides, stories, roadmap, 404. Delete `styles.css` | Linter: 0 FAIL outside tables and forms. Inspector: 2 typefaces, ≤5 sizes, body ≥16 px |

Step 2c (report card) and later features are built in the new system, after D5.

## 7. Verification, every phase

- `npm run typecheck`, `npm test`, `npm run build`, and check bundle size.
- Screenshots of every changed page at 1440, 768 and 390 px, in light and dark, reviewed by eye.
- The taste-skill linter and inspector on the changed pages, with the numbers recorded in the phase report.
- Keyboard pass: tab through each changed page; focus is always visible.
- The Playwright flows that already exist still pass: RC, VA, sectional and redo.

## 8. Decisions (18 Oct 2026)

1. **Fonts:** keep Schibsted Grotesk for the interface and Source Serif 4 for passages; remove IBM Plex Mono everywhere.
2. **Order:** the full redesign (D0 to D5) comes first. Step 2c and the rest of step 2 follow in the new system.

## 9. Result (19 Oct 2026)

| Check | Before | After |
|---|---|---|
| Typefaces | 3, monospace 16–39% of text | Schibsted Grotesk for the interface; Source Serif 4 only in passages and guides |
| Font sizes on a page | 10 to 12 | 5 to 8 (Home has the display countdown) |
| Running text | 13–14 px | 16 px on every page measured |
| Linter FAILs | 143 | 0 (overlay shadows, real tables and the bottom bar are marked `taste-skill-ignore`) |
| Main JS bundle | 427 KB | 445 KB (140 KB gzipped); every page except Home now loads on demand |

What changed beyond the look:
- Practice hub split: the RC library and past RCs of the day moved to `/practice/library`.
- Today: the time choices fold into a popover, so a phone's first screen shows the core task.
- Confirmations use dialogs; "Added to Error log" and word saves show a short notice.
- React 19 (shadcn's components need it), and React Router's v7 flags turned on.
- Fixed along the way: on phones the sectional jumped back to the passage after every "Save and next".

Not done, on purpose:
- The inspector still fails app pages on pictures, motion and a giant headline. Those are marketing-page rules; the plan applies them only to the home page's first screen, and the owner has not supplied photographs.
