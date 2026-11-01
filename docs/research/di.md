# Data interpretation (DI): research, 1 Nov 2026

The owner asked for research before any DI set is written: what CAT's DI looks like in the papers, what levels to write (medium, hard, CAT level and beyond), and how to make DI easy to learn, practise and understand, "and be creative". Nothing here is a question for students yet. Coaching analyses disagree on details, so set lists are cross-checked against the papers themselves (2IIM hosts every DILR paper since 2017), and numbers are ranges with their source. Plan and decisions from this note: `docs/analyze.md` (A55 to A61, D70 to D76), `docs/feature.md` (F90 to F96).

## 1. What CAT's DI looks like now

- **Less pure DI, more reasoning DI.** Time4Education on CAT 2023: "hardly any sets that were purely LR based" and no sets on graphs or charts at all ([CAT 2023 analysis summary](https://www.shiksha.com/mba/articles/ims-cat-2023-analysis-slot-1-2-and-3-blogId-144359)). Cracku's count for CAT 2025 (66 questions over three slots): 39 LR, 15 mixed DI-LR, 12 pure DI, so about **two in five questions touch data**, but only one in five is a chart set read and calculated ([Cracku PYQ analysis](https://cracku.in/cat-dilr-pyq-analysis-2025-2020/)). Its five-year table still puts "bar, line and other graphs" at 56 of 312 questions and "tables, missing data" at 23: DI has not left, it has changed shape. (The page's own totals do not all add up; treat as a direction, not a count.)
- **A slot usually has one or two data sets out of five.** CAT 2025 slot 1: one real chart set (import tariffs, a radar chart of tariff rates plus a bar chart of tariff amounts) and four LR or numbers-driven LR sets ([2IIM paper](https://online.2iim.com/CAT-question-paper/CAT-2025-Question-Paper-Slot-1-DILR/)); slot 3: a phone-call table with missing cells, two cumulative line charts of puzzles solved, and a trade set in text ([2IIM paper](https://online.2iim.com/CAT-question-paper/CAT-2025-Question-Paper-Slot-3-DILR/)). CAT 2024 slot 3 had four data sets: a nutrient table with blanks, OTT subscriber shares over two years, an AC temperature line graph with rules, a GDP table given as fractions of other countries ([2IIM paper](https://online.2iim.com/CAT-question-paper/CAT-2024-Question-Paper-Slot-3-DILR/); [Career Launcher's list](https://insideiim.com/amp/cat-2024-slot-2-analysis)).
- **TITA is about half.** DILR TITA rose from 8 (2021) to 11 of 22 (2025) ([Careers360 five-year trend](https://www.careers360.com/mba/articles/cat-dilr-5-year-trend-analysis-2021-2025-topics-sets)). In data sets the TITA answer is usually a count, a value or a percentage, so "closest to" option-spotting does not save a weak calculation.
- **The on-screen calculator.** A basic calculator (four operations; square root and reciprocal per most sources; no keyboard) has been part of the interface since 2016 ([Cracku](https://cracku.in/cat-onscreen-calculator), [PW](https://www.pw.live/mba/exams/cat-on-screen-calculator-explained)). Clicking is slow, so the skill is knowing when to use it, not avoiding it.

### What the data sets in the papers actually ask (read from the papers)

| Paper | Set | Picture | What makes it hard |
|---|---|---|---|
| 2025 S1 | Import tariffs, five countries | Radar (rates) + bar (amounts) | Imports are amount ÷ rate; one country's imports are another's exports; trade balances need both charts |
| 2025 S3 | Phone minutes among six friends | Table with blanks + facts | Fill cells by chaining row and column totals and "no calls" facts |
| 2025 S3 | Puzzles solved over time | Two cumulative line charts | Separate one kind from the other by subtracting charts; exact times |
| 2025 S3 | Trade among P, X, C, rest of world | Text with percentages | Chained percentage relations before any balance can be computed |
| 2024 S3 | Nutrients in seven grains | Table with blanks | Multiples-of-5 and multiples-of-4 rules, rank rules, a cross-row link |
| 2024 S3 | OTT subscribers, 2023 and 2024 | Percentage shares | Percentages to counts; the minimum possible share of multi-app users |
| 2024 S3 | AC and room temperature | Line graph + rate rules | Infer unseen switch-offs from slopes; actions only on the hour or half hour |
| 2024 S3 | GDP and population, ten countries | Table of fractions and growth rates | Back out absolute values; GDP ÷ GDP per capita; compound three years |
| 2023 S2 | Daily draw scores | Two-day averages + ranks | Averages to totals, ranks to inequalities, case analysis; max, min, could |
| 2021 S1 | Sales by subcategory | Horizontal bars + 2019 markers | "Closest to" from marker positions; growth per category, then compare |
| 2021 S1 | Smoothie shop | Recipe table + revenue table | Work back from revenue to units with a ₹1 loss per leftover unit; ranges |

The pattern: **a chart or table is the start, not the question.** Most data sets add rules (multiples, ranks, rates, "only on the hour"), hide values (blanks, fractions of other rows, percentages without bases), and end in counting, extremes (minimum possible, maximum) and "can it be determined". Classic one-step calculation sets (read two bars, divide) still appear, but as the easy set of a slot.

## 2. Our DI taxonomy: pictures, question kinds, levels

### Pictures (what the student must read), by how often they appear 2021 to 2025
1. **Tables**, often with missing values and rules. Most common.
2. **Bar charts**: grouped, stacked, horizontal with markers, percentage bars.
3. **Line charts**: including cumulative and step charts, and lines with rate rules.
4. **Shares**: pie or percentage tables, usually over two years.
5. **Two linked charts**: radar plus bar, two tables, a chart plus a table.
6. **Scatter or point charts** (two measures per item).
7. **Text-only data (caselet DI)**: percentages and flows described in sentences, the student draws the table.

### Question kinds (each set mixes three or four)
| Kind | Example in words | Curcio level |
|---|---|---|
| Read a value | "What was X's protein content?" | Reading the data |
| Count with a condition | "In how many years did A exceed B?" | Between |
| Change and growth | Percentage change, compound growth over years | Between |
| Share and convert | Percentage to count, count to percentage | Between |
| Average, median, weighted average | "Median protein across grains" | Between |
| Reverse | The base from a percentage and an amount; imports from tariff and rate | Between, two steps |
| Projection | "Largest population in 2027 at these growth rates" | Beyond |
| Extremes | Minimum possible share, maximum possible count | Beyond, with constraints |
| Determinacy | "For how many can it be determined?", must, could, cannot | Beyond, with cases |

The three levels (reading the data, between the data, beyond the data) come from graph-comprehension research (Curcio; Friel, Curcio and Bright 2001); studies find them roughly ordered in difficulty, with "beyond" hardest at every age ([summary](https://bsrlm.org.uk/wp-content/uploads/2016/02/BSRLM-IP-23-3-6.pdf); [SERJ](https://iase-web.org/ojs/SERJ/article/download/339/281/1602)). CAT's hard sets live at "beyond". The visualization literacy test VLAT (Lee, Kim and Kwon 2017) breaks reading into tasks such as retrieving a value, finding an extreme, comparing and finding a trend, and finds visualization literacy correlates with numeracy ([IEEE TVCG](https://researcher.watson.ibm.com/publications/vlat-development-of-a-visualization-literacy-assessment-test)): a reason to train the reading tasks separately from the arithmetic.

### Levels we write (the owner's "medium to hard and beyond, CAT level")
| Level | What it is | Picture | Questions | Target |
|---|---|---|---|---|
| ~~L1 Learn~~ (dropped 1 Nov 2026: the owner asked for CAT level only) | For learning a picture, use the outside DI basics pages instead | | | |
| **L2 Medium** (a slot's easy set) | One or two charts, derived values | One or two | Change, share, average, count with a condition; 1 "closest to" | 8 to 10 min |
| **L3 Hard** (the CAT core) | Missing values and rules, reverse and convert, two linked charts | One or two + rules | Fill, convert, extremes, one determinacy question | 12 to 15 min |
| **L4 CAT+** (beyond) | DI-LR hybrids: rates and events from a graph, chained trade, integer constraints, cases | Any + rules | Extremes, "how many can be determined", must/could | 15 to 20 min |

A first library of 24 sets: 6 at L2, 12 at L3, 6 at L4 (CAT level only, owner 1 Nov 2026), with every picture type at L2 or above and half the questions TITA.

## 3. Why students find DI hard (papers, coaching guides, Reddit)

- **Calculation fear, not concept gaps.** On r/CATpreparation the commonest DI complaint is calculation: "the calculation intensive part of DI sets bothers the hell out of me", how to do long divisions, whether to use the calculator; non-engineers say it most. Yet the same students call DI "your safe option when LR is hard". (Reddit, read 1 Nov 2026; §7.)
- **Not knowing in the first minutes.** "You either know the set or you don't. The first few minutes go on a set without any answer, and time creeps in." Half the time gone halfway through one set.
- **Reading errors that look like calculation errors.** The wrong base for a percentage (a 20% rise and a 20% fall do not cancel), the wrong series or year, units (lakhs and crores), a scale whose small divisions are not 1, an "obvious" answer that is a trap ([gmatclub on percentage bases](https://gmatclub.com/forum/3-major-concerns-students-face-in-solving-percentage-problems-267894.html); [PW on line graphs](https://www.pw.live/mba/exams/cat-lrdi-line-graphs); [Hitbullseye on tables](https://www.hitbullseye.com/Data-Interpretation-Table-Charts.php?amp=1)).
- **Rounding at the wrong time.** Approximation is safe when options are far apart (23%, 31%, 47%) and dangerous when close (23.4%, 23.8%) ([source](https://www.pagalguy.com/articles/tricks-to-speed-up-calculations-for-data-interpretation-questions-in-cat-2011-14278?amp=1)); the 2023 AC set had students whose answers "did not match the options" ([PW slot 3](https://www.pw.live/mba/exams/cat-2023-slot-3-exam-analysis)).
- **Treating a reasoning set as a calculation set.** Missing-value tables need "map rows and columns, turn each condition into a fill, solve the blanks, then answer" ([PW tables](https://www.pw.live/mba/exams/cat-lrdi-tables)), not reading off.

## 4. How DI is learned (what our activities rest on)

- **Separate reading from arithmetic first, then join them.** Reading levels are a hierarchy (§2); visualization literacy and numeracy are related but distinct. So: chart-reading drills with easy numbers, number-sense drills without charts, then sets.
- **Worked examples, then fading** (as in Replay, D66): watch a set filled in, do it step by step, then alone.
- **Interleave the kinds.** Mixed practice beats one type at a time for choosing a strategy: in a four-month trial with 54 Grade 7 classes, 61% against 38% a month later (Rohrer, Dedrick, Hartwig and Cheung 2020; [summary](https://www.unh.edu/teaching-learning-resource-hub/sites/default/files/media/2023-06/itow-spaced-and-interleaved-mathematics-practice-rohrer-hartwig.pdf)). DI questions should mix kinds within a set and drills should mix pictures.
- **Learn a few calculation tools well.** Coaching guides agree: fraction–percentage pairs (1/7 = 14.29%, 1/8 = 12.5% …), percentage change as a ratio (new/old), comparing fractions by cross-multiplying, bounding ("98/202 is under 49%"), and option spacing to decide how exact to be; "do not learn tens of shortcuts, learn the ones you can use confidently" ([PaGaLGuY](https://www.pagalguy.com/articles/tricks-to-speed-up-calculations-for-data-interpretation-questions-in-cat-2011-14278?amp=1); [Hitbullseye](https://mba.hitbullseye.com/cat/Maximise-Your-DI-LR-Score-in-CAT.php)). Evidence that estimation games speed arithmetic is thin (a search found apps and handouts, no trials), so the gym is short, spaced and tied to DI, not a game for its own sake.
- **Track where the minutes go.** Careers360's advice for DI practice: log reading, calculation and reasoning time separately, call a set easy under 8 to 10 minutes, and do not prepare DI and LR as separate worlds ([Careers360](https://www.careers360.com/mba/articles/cat-dilr-5-year-trend-analysis-2021-2025-topics-sets)).

## 5. What to build (and the creative part)

Sets alone repeat what every coaching site has. What is ours, building on the solver, Replay and the Arena:

1. **DI sets in the LR player, with real charts.** Charts drawn from the set's numbers (bar, stacked, line, cumulative/step, shares, radar, scatter, tables with blanks), the way the exam shows them: no hover values while solving. Every answer **computed by code from the set's data** in tests, as every LR answer is solved by code; missing-value tables proved to have one fill by the general solver.
2. **The CAT calculator, and a calculation log.** The player gets CAT's basic calculator (same keys, memory). Each press is logged; the review lists the calculations and marks those the options made unnecessary ("options were 12 points apart: 1,780 / 2,410 is about 74%, no need to divide"). New: no prep site shows a student their own calculations.
3. **Read the chart (warm-up drill, F91).** Ninety seconds, one chart, five questions climbing the three levels, each wrong option a named reading trap (wrong base, wrong series, scale, units, average of averages). Charts generated from small data so there are hundreds.
4. **Number sense for DI (gym, F92).** Two minutes a day: fraction–percentage pairs, change as a ratio, compare two fractions, "is it near 23 or 31?" with option spacing shown, and **"calculator or mind?"** (pick, then see which was faster for you). Spaced like the redo queue.
5. **Fill the table (DI Replay, F93).** Replay (F57) for missing-value tables: each rule fills cells, and "unknown cells: 14 → 9 → 3 → 0" falls as it does. The solver checks every fill. The skill students lack most (§3) gets the tool we already have.
6. **Can it be answered? (F94).** Statements to sort as "answer it", "cannot be determined", or "needs one more fact", from a set's data: the determinacy questions CAT now asks, trained like must/could/cannot.
7. **Question order inside a set (F95).** DI sets usually have one expensive question. In review: minutes per question, and "these two took half your time for one mark"; in the Arena's debrief, the same.
8. **Real numbers (F96, owner to decide).** Some sets on real, openly licensed data (World Bank under CC BY 4.0, data.gov.in under the Government Open Data Licence), cited under the chart: India's exports, rainfall, UPI volumes. Real data reads like CAT's trade, GDP and pollution sets and makes the practice feel worth it. Numbers are rounded and dated; the questions stay ours.
9. **DI error causes and the skill map.** Wrong base, wrong series or year, scale or units misread, rounded too early, average of averages, calculation slip, missed condition, time sink: in the Error log and the redo queue as LR causes are; on Progress, DI tiles by picture and by question kind.

What we do **not** build: a calculator-free "speed maths" course (CAT has a calculator; the skill is choosing), timed calculation leaderboards, or 3D charts (a 3D bar misleads the eye; D51 asks 3D to carry data, and DI is exactly where it would distort it).

## 6. Free resources to link (DI), added 1 Nov 2026

On the DILR page (`sections/dilr/resources.ts`, D77), every link opened on 1 Nov 2026:

- **Start here (Learn tab, 10):** MBA Wallah's DI starter kit (8 videos, one per picture: tables, pies, bars, lines, word problems, two charts; about 1.6 lakh views) as the must-do; Unacademy's lesson-by-lesson DI course (Ashish Kumar, 30); The Arun Sharma Academy's course on calculations (7); PW's four short primers (tables, bars, lines, pies); PaGaLGuY on calculation tricks; Cracku on the on-screen calculator; Careers360's five-year trend.
- **Books.** Pearson split Sinha's *Logical Reasoning and Data Interpretation for CAT* into an LR and a DI book; the combined book has a partial preview on Google Books (`PoiqDwAAQBAJ`, 793 pages, the DI part from page 2-1), the DI-only edition (ISBN 9789367133569) is not on Google Books and Pearson's site did not load, so it links to a store search. Also Arun Sharma's DI-only book (no preview) and T.I.M.E.'s *Data Interpretation for the CAT* (Pearson 2011, partial preview, `jB48BAAAQBAJ`) for reading the basics free. Google Books "partial preview" shows some pages, not the book. (The Books API was over its shared daily quota; the older feed `books.google.com/books/feeds/volumes?q=` still answers.)
- **DI sets by topic (Practice tab, 6):** Cracku's past-CAT DI pages: basics (103+ questions), tables with missing values (79+), charts (168+), special charts (54+), change over a period (75+), and the index.
- **Past CAT DI sets, easiest first (Practice tab, 12):** read from the papers on 2IIM (§1): 2021 S1 sales bars; 2022 S2 four companies (two plots); 2025 S1 tariffs (radar + bar); 2025 S3 cumulative puzzles; 2024 S3 streaming shares; 2024 S3 GDP fractions; 2025 S3 call minutes (blanks); 2024 S3 nutrients (blanks and rules); 2021 S1 smoothie shop; 2020 S1 board marks; 2024 S3 AC temperature; 2023 S2 draw scores. Eight come from 2023 to 2025, which the page otherwise keeps for mocks; they show DI as CAT asks it now, and one seen set in five leaves the slot usable.
- **Watch tab (4):** Rodha's DI and Venn playlist (18), Cracku's charts-based DI workshops (11), Unacademy's CAT 2024 DI PYQs (20), 2IIM's DI questions for CAT and IIFT (24). About 60 DI-related playlists were opened; bank-exam DI (a different level) and playlists of a few videos were left out.

## 7. Reddit, r/CATpreparation (read 1 Nov 2026)

Read as in `docs/research/lr.md` §9 (RSS, one request a minute). Six searches (data interpretation, DI sets, DI calculation, DI charts, DI tables missing, DILR DI weak); 386 posts, 317 about DI; comments read on the eight most useful threads (few: most replies there are bots).

**What students say most:**
- Calculation is the pain, especially for non-engineers: long divisions, "non-friendly numbers", whether to use the calculator; requests for "calculation intensive DI" handouts.
- DI is the safe set: "these sets are your safe options whenever the LR questions are very difficult"; "I usually get through both DI sets but LR seems a very daunting task".
- CAT has moved on: "CAT has shifted to more cognitive deductions than long calculation"; slot reports name "logic-based" and "number puzzle" sets more than charts.
- Time inside a set: halfway through, half the time gone; a bad start ruins the section; "you either know the set or you don't".
- A topper's tip that recurs: for a numbers set, draw as many tables as needed and see which one matches.

**From the comments:**
- DI as the floor of a section: "spending 10 to 15 minutes on DI at least guarantees you 2 to 3 questions, which is not the case in LR".
- A selection rule a student uses: attempt graphs and tables with missing info first, and give a set "a maximum of 8 minutes to see if I'm getting anywhere". Matches the Arena's lesson and F95.
- On the calculator: "I used calculators for small calculations too and scored decently; using the calculator isn't really a waste of time". Supports teaching when to use it (F92), not avoiding it.
- On slow sets: asked whether they logged the time per set and what took long, a student who had solved 100 sets said no, "I just need to improve my analysis on what exactly took me long". The gap F95 fills.
