# Readable pages (F102), planned 11 Nov 2026

Decision D96 in `docs/analyze.md`. Applies the design rules in `docs/design/redesign-plan.md`; changes how content is shown, not what it says.

## The problem

A student's feedback (owner, 11 Nov 2026): the content is good but there is too much of it to read, in Learn and elsewhere. Desktop leaves the right half of the page empty; a phone shows a long wall. Asked for: blocks, animation or short video, something quick to take in, with no cut in substance.

## What the pages are today (measured 11 Nov 2026, built site, headless Chrome)

| Page | Words | Phone, screens tall | Desktop, screens tall | Longest paragraph (words) |
|---|---|---|---|---|
| DILR, Practice tab | 1,930 | 12.1 | 8.7 | 67 |
| DILR, a set-type guide (arrangement) | 1,848 | 14.2 | 7.9 | 54 |
| DILR, Learn tab | 1,437 | 11.2 | 7.9 | 54 |
| Home | 1,277 | 12.4 | 8.6 | 75 |
| Plan and time | 1,318 | 10.6 | 7.1 | 40 |
| VARC, Read tab | 1,252 | 9.7 | 7.7 | 44 |
| VARC, Practice tab | 1,242 | 9.2 | 7.2 | 39 |
| Roadmap | 806 | 5.7 | 3.0 | 125 |
| VARC, Learn tab | 723 (1,101 on desktop) | 6.1 | 5.4 | 43 (97) |

Two findings:
- **Prose carries structure.** Advice that is really a sequence ("one or two sets a day, then study the solution as long as it took"), a rule with numbers ("CAT 2017 to 2022 for timed sections, 2023 to 2026 for mocks") or a comparison is written as a paragraph, so the reader must dig the structure out.
- **Desktop wastes width on purpose, but the wrong way.** Text is capped at a readable line (about 65 characters, the `measure` class), which is right; but nothing uses the rest of the 1,056 px column, so the page is tall and half empty. Wider lines would read worse; the fix is a second column, not longer lines.

## Research behind the shape

- People scan web pages; they read only a fraction of the words (Nielsen, "How little do users read?", NN/g, 2008: at most about 28% of the words on an average visit). The pattern that works best is the **layer cake**: clear headings, each with a one-line summary, so a scan of the headings alone gets the gist (NN/g, "Text scanning patterns", 2019).
- Learning from multimedia (Mayer's principles): **segmenting** (short parts the learner moves through), **signalling** (cues that show what matters), **coherence** (cut what does not serve the goal) and **spatial contiguity** (a word next to the picture it explains) all improve learning. Pictures with words beat words alone when the picture shows the structure (dual coding).
- Video: shorter is watched more; in a study of 6.9 million MOOC sessions, engagement fell off past about six minutes, and talking over a tablet sketch held attention better than slides (Guo, Kim and Rubin, Learning at Scale, 2014).
- Our own students: the research report (`reports/Standing out in AI learning.md`) found working professionals asking for "not endless videos, not unnecessary overload" and a syllabus they can finish.

## Decisions (D96)

1. **Lead with the action, the reason after it (layer cake).** Every section opens with a heading and one line that says what to do, in ink; the reasoning follows in muted ink (see "Built shape"). Only bulky detail folds away. Nothing is deleted; it is layered.
2. **Structure goes into blocks, not paragraphs.** A small set of kit blocks, each for one shape of content:
   - **Key line**: the one sentence that matters, with the yellow highlighter (once a page, as the rules say).
   - **Steps**: a numbered sequence (only when the content is a sequence).
   - **Fact strip**: three to five figures a student acts on ("15 to 20 min a set", "2 sources", "59 sets").
   - **Do and don't**: paired advice ("Do: finish two sources. Don't: collect PDFs").
   - **Timeline**: phases or years ("2017 to 2022: timed sections. 2023 to 2026: full mocks").
   - **Compare**: a small table or two cards side by side.
   - **Why**: a collapsed explanation under any block.
3. **Two columns on a wide screen.** From the `lg` breakpoint, a page's main column keeps the readable line, and a side column carries what a student glances at: the fact strip, "in 30 seconds" summaries, the page's own contents, next steps. On a phone the side column folds in above the main one, as a short card.
4. **Pictures and motion that explain, not decorate.** A guide's method gets one stepped animated scene where the method is visual (see "Animated explainers" below): the student steps through it or presses Play, and under reduced motion it is a still picture with numbered captions; GSAP through `lib/motion.ts`.
5. **Short videos made by the site itself.** The Replay clip engine (F101) already draws and encodes video in the browser. Guides get a "the method in 60 seconds" clip built the same way from the guide's own worked example: no recording, no hosting, true by construction, and the same clip is Instagram material. Starts with the six DILR set types that have replays.
6. **A word budget per page, kept by a test.** Above the first expander, a page section holds at most about 120 words; a paragraph at most 45 words; a page's always-visible text at most about 600 words. A content test reads the section data and fails when a block grows past its budget, so the pages stay light as content is added.

## Animated explainers (owner, 11 Nov 2026: "can we also use some animated thing")

### What the research says animation is good for
- Animation beats a still picture when it **shows the process itself** (a seat being filled, a figure compounding), not when it decorates: a meta-analysis of 26 studies found an overall advantage for animation, largest when the animation represents the thing being learned (Höffler and Leutner, Learning and Instruction, 2007).
- Many animations teach no better than a good still, because they run too fast to follow; they help when the learner **controls the pace** and can step back (Tversky, Morrison and Bétrancourt, "Animation: can it facilitate?", 2002).
- Learners do better when an explanation is **cut into segments they advance themselves** than as one continuous run (Mayer and Chandler, 2001).

So every explainer here is a **stepped scene**: a picture that changes one step at a time, with a caption per step, Next and Back, and Play to run it through. It is the Replay's shape (F57), which students already know.

### Explainers as data
A scene is content, not code: `{ picture, steps: [{ show, highlight, caption }] }`, kept with the guide it belongs to and checked by a test (every step has a caption, every highlight names a part of the picture). One component draws any scene in SVG: parts appear, move or light up between steps (GSAP through `lib/motion.ts`, loaded on the first Play). Under reduced motion, or before Play, the scene shows the final picture with its captions as a numbered list, so nothing depends on motion. A scene is at most eight steps and about 30 seconds when played through. The same data can be drawn into a video by the clip engine (F101), so each explainer is also a post.

### What gets one first (one per method that is visual)
| Where | Scene | What moves |
|---|---|---|
| DILR guide, arrangement | Fix the anchor, then place around it | Seats appear; the clue that fixes each one lights; impossible seats cross out |
| DILR guide, tournaments | Points decide results | A points table fills; each total rules out results in the match grid |
| DILR, choosing sets | Read four sets in 4 minutes, pick two | Four set cards turn over; each gets a quick score; two slide forward |
| DI guide, charts | Growth compounds, it does not add | 100 → 120 → 144 as bars, beside the wrong 100 → 140 |
| DI guide, tables | Weighted against simple average | Two groups of different sizes; the average moves towards the bigger one |
| DI guide, percentages | The base changes | "Up 20%, then down 20%" lands below where it started |
| VARC, reading RC | Find the claim, the evidence, the qualifier | A short passage; the three parts light in turn; an option that drops the qualifier crosses out |
| VARC, para jumbles | Link the sentences | Pronoun and connector links draw between sentences until one order is left |
| VARC, para summary | Eliminate by trap | Four options; each trap (too narrow, too broad, distorts) strikes out with its name |
| Practice routine | The loop | Solve → study the solution → the mistake returns in the redo queue → solved again |

### Where animation is not used
No motion on page load, no scroll-triggered reveals of text, no looping decoration: a page's one orchestrated moment is the scene the student asks for (design rules, `docs/design/redesign-plan.md`). Numbers and tables stay still and readable.

## Before and after (DILR, Practice tab, top of the page)

Today: a heading, a 59-word paragraph, a button, then two paragraphs of 31 and 54 words about how to practise and which papers to keep.

After (phone, top to bottom; desktop puts "How to practise" and "Past papers" side by side):

```
Practice on 99ile                                  [Open DILR practice]
┌ 59 sets ─┬ LR and DI ─┬ Timer, CAT calculator ─┬ Solution and 2-minute post-mortem ┐

How to practise
 1  One or two CAT-level sets a day, 15 to 20 minutes each.
 2  Study the solution for as long as the set took.
 3  Pick two sources and finish them.           ▸ Why only two

Past papers
 2017–2022  Timed sections, in the Build and Apply phases
 2023–2026  Full papers, in the Mock phase      ▸ Why eight 2023–25 sets appear below
```

Same facts, about 70 words visible instead of 144, and the rule about papers reads in one glance.

## Order of work

1. **Blocks** in `components/blocks.tsx` (not `kit.tsx`, which is in every page's first download, at 148 of its 150 KB): Two, Lead, Note, Steps, Timeline, Stages, Fold and Split (see "Built shape" below). One branch.
2. **Pilot on the worst page, DILR Practice and Learn**, then measure again with the same script (words visible, screens tall) and show the owner before going on.
3. **VARC tabs, Plan and time, Home**, then the set-type guides.
4. **Animated explainers**: the scene component and its data format, then the ten scenes in the table above, DILR and DI first; each can also be exported as a clip (F101).
5. **The word-budget test**, once the pages meet it.

## Built shape (12 Nov 2026, after the owner's review)

The first pilot used stat tiles, white cards in the side column, numbered circles and a "Why" or "Details" toggle under almost every line. The owner found it looked odd, and it was: stat tiles are the generic dashboard move (and "Timer" is not a figure), the cards were the SaaS card kit the redesign plan rules out, and a dozen blue toggles meant nothing was the main thing. It was rebuilt in the site's own idiom (redesign plan section 4, home page D42):
- **Two-tone lines instead of toggles.** What to do in ink, the reason after it in muted ink, in one paragraph (the home page's heading device at body size). A student who scans reads only the ink; nothing waits behind a click. Only bulky things fold (`Fold`): the slots table, and the type tables on a phone.
- **One main thing per tab** (`Lead`): a sheet with a two-tone statement in the home page's heading voice and the tab's one filled button.
- **Margin notes, not cards** (`Note`, `Split`): on a wide screen the routine sits on the paper beside the lists, and stays in view; on a phone it comes after the lead.
- **Blue-pen numerals** for a real sequence (`Steps`), no circles; **stages along a road** like the home page's for a plan in weeks (`Stages`).
- **Phases you are not in read as not yet**: their heading in muted ink with the list and link count, no box.

## The first animated explainer (12 Nov 2026)

The owner found the Learn tab still heavy on a phone and asked when animation would come. The four format paragraphs at its top became the first stepped scene, "How the 40 minutes go" (`components/Explainer.tsx`): five sets appear, the student reads all five, picks the direct ones, leaves one with no way in, solves two, and the score lands at about a 99. Six two-tone captions carry every fact the paragraphs held. Back, Next and Play; CSS transforms and opacity only, still under reduced motion (stepping still works); captions share one grid cell so the panel never changes height; a live region reads each step. It is the "choosing sets" scene from the table above, built first because it replaced the heaviest block.

## Tabs, margin and scrolling (12 Nov 2026, owner's review)

- **One look for every switch.** The page tabs (section pages, Progress, the practice library), the kit's `Segmented` and the toggle groups now match the LR/DI switch: a card-toned pill on a soft track, full ink and semibold for the chosen one, no outline. The page tabs' pill slides to the chosen tab (transform and width, still under reduced motion), and the active tab carries the card tone itself until the pill is measured, so nothing flashes.
- **Margin notes on the accent tint.** `Note` sits on the brand's accent tone with an icon chip; step numbers and year ranges are card-toned chips that stand out on it. Contrast: muted text on the tint is about 5:1 (light) and 6.5:1 (dark).
- **A tall margin scrolls before it sticks.** When the margin is taller than the screen it scrolls with the page until its end is in view, then holds (`Split` sets its sticky offset from the measured height), so no note is hidden below the screen.

## What a student must still find (12 Nov 2026)

The owner asked that no shortening leave a student without information. Every line removed from the DILR and VARC content was traced to where it now lives. Six gaps were found in the DILR rewrite and put back: what TITA means ("you type the answer"), "keep one LR set a day going" in the DI weeks, "one or two LR sets a day", "100 sets solved and studied" (the studying is the point), that the site's sets are both logic and data, and that the slot table was read from the papers. Details that moved rather than vanished: the course names (Quantifiers, Rodha) are in the courses list, "past DI sets two a week" is in that list's note on the Practice tab, and "pure DI is shrinking" is in the DI half's intro.

`src/sections/facts.test.ts` now lists 53 facts across the two pages (format, marking, TITA, time split, the 99 targets and benchmark, the weekly plans, which papers to use when, the reading sources, what the site's practice gives) and fails if a rewrite drops one. Retiring a fact means deleting it from that list in the same change, so a loss is a decision.

VARC was moved to the same shape on 12 Nov 2026: its own "How the 40 minutes go" explainer (four passages of four, the four VA types with two questions each, which are MCQ and which TITA, the 28 and 10 to 12 minute split, 15 to 17 right for a 99 with the live benchmark), "Starting from zero" as stages, the VA mix as its conclusion with the table folded, a lead panel and a past-papers margin on Practice, and two-tone notes on Read, Watch and Vocabulary.

## Pilot results (12 Nov 2026, same script and widths as the audit above)

| Page | Words visible | Phone, screens tall | Desktop, screens tall | Longest paragraph |
|---|---|---|---|---|
| DILR, Practice tab | 1,930 → 770 | 12.1 → 5.5 | 8.7 → 3.5 | 67 → 41 |
| DILR, Learn tab | 1,437 → 924 | 11.2 → 7.3 | 7.9 → 6.6 | 54 → 54 |
| VARC, Learn tab | 723 → 613 (1,101 → 991 desktop) | 6.1 → 5.3 | 5.4 → 4.8 | 43 → 43 |
| VARC, Practice tab | 1,242 → 1,241 | 9.2 → 9.2 | 7.2 → 6.5 | 39 → 39 |

Words visible now count the muted reasons, which a scan skips. VARC Practice is as long as before: it has no phases to fold, and its length is the link lists themselves (the next step there, as on DILR Learn). Learn is not yet half as tall on a phone; what is left is the guide list (13 types) and the link lists, and the next step there is folding optional links per list.

## Done when

The pages in the table above are at most half as tall on a phone, every section's first line says what to do, desktop pages use both columns from `lg` up, no content is lost (every cut sentence lives in a "Why"), and the checks at 390 and 1440 wide in both themes are clean.
