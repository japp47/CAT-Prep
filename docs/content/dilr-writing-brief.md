# DILR sets to write: a brief (4 Nov 2026)

For the owner, writing sets in parallel with the build. It says which sets the library needs next, what makes a set CAT level, and how to send it. Grounded in `docs/research/di.md` (what CAT 2021 to 2025 asked), `docs/research/lr.md`, the library as it stands, and the rules that came out of the first DI sets (D79). Send sets in any form; they are turned into the JSON format (`docs/content/lr-format.md`), checked by code, and solved by two independent agents before they go live.

## 1. What the library has, and what it needs

| Type | Sets now | CAT 2023–25 | Write next |
|---|---|---|---|
| **DI: tables and missing data** | 1 | The commonest data picture | **3** |
| **DI: charts** (bar, line, shares, two linked, special) | 1 | One or two data sets a slot | **3** (plus 4 on real data, written here) |
| **Quant-based LR** (scores, ratings, averages, integer limits) | 0 | Rising every year (train tickets, employee ratings, draw scores) | **3** |
| **Ranking and ratings** (ranks over rounds, tie rules, moves between groups) | 0 | CAT 2025 had it in two slots | **2** |
| **Distribution and matching** (people × attributes, allocation under limits) | 1 | Common | **2** |
| **Grouping and selection with one answer** | 1 (13 valid teams) | Common | **2** |
| **Scheduling with one answer** (days, slots, precedence) | 3, all optimisation | Steady | **2** |
| **Mixed DI-LR** (a table plus rules that need cases) | 0 | A third of recent data sets | **2** |
| Arrangement, games, routes, Venn, binary, set theory | 4–6 each | Steady or falling | none for now |

Total from the owner: **19 sets**, about 90 questions. Order: the six DI sets first (the build needs them by mid-December), then quant-based LR, ranking, and the rest.

## 2. What makes a set CAT level

- **Shape.** 4 or 5 questions per set. A story of 80 to 200 words, numbered facts or clues, and any table or chart. Target time 12 to 15 minutes.
- **Difficulty.** Mostly medium to hard in CAT terms. A set should need a real deduction or a case split, not only reading. "Easy" means the easiest set of a CAT slot, never a textbook warm-up.
- **Every fact is needed.** If a fact can be dropped and the answers stay the same, cut it or make it matter.
- **One answer.** The facts lead to one arrangement or one filled table (or the questions say exactly which detail they need when several cases survive).
- **Typed answers (TITA).** About half the questions, as in CAT. **Whole numbers**, as CAT's typed answers almost always are. If a percentage must be typed, ask "to the nearest integer" and keep the exact value at least 0.1 away from x.5.
- **Wording.** Plain CAT phrasing: "Which of the following must be true?", "How many … can be determined?", "If it is additionally known that …, then …", "Additional information for questions 4 and 5: …". No trick grammar.

## 3. The question kinds to mix (three or four kinds in every set)

| Kind | Example |
|---|---|
| Read or fill a value | "How many students enrolled in batch D in January?" |
| Count with a condition | "In how many months did E enrol more students than A?" |
| Change, share, ratio | "By approximately what percentage did bulk cargo rise?" |
| Reverse (find the base) | "What were Japan's imports from India?" (amount ÷ rate) |
| Extremes | "What is the minimum possible …?", "the maximum number of …" |
| Must, could, cannot | "Which of the following must be true?" |
| Determinacy | "For how many of the five can the score be determined?" |
| Changed condition | "If the information in point 4 were not available, which could NOT …?" |

A set needs at least one question beyond reading: an extreme, a determinacy question, or a changed condition.

## 4. Options (multiple choice)

- **Each wrong option comes from a real mistake:** the wrong base for a percentage, the wrong year, averaging rates, one case only, a missed condition. Say which mistake each one is, if you can; that becomes the explanation.
- **No giveaways.** An option ruled out by a single printed number (as option 50 was in the first table set) is a free mark.
- **Close options only when the question needs an exact calculation.** Otherwise space them so that estimating is the skill.
- **Names that are letters clash with option letters A to D.** Write "Batch B", or ask for a number instead.
- **No "none of these" and no "cannot be determined"** unless it is the real answer in some questions and not in others.

## 5. DI sets in particular

- **Pictures to cover** across the six DI sets: a table with blanks and totals (two sets), a grouped or stacked bar, a line or cumulative line, a share (pie or percentage) chart over two years, and two linked charts where one value comes from each.
- **Give the exact numbers** behind every chart; the site draws the chart from them. Keep values readable off a chart (multiples of 5 or 10 on a bar axis, or say "values are labelled").
- **Units and bases stated:** "₹ crore", "% of total revenue", "million tonnes".
- **Tables with blanks:** 6 to 10 blanks, row and column totals, and three or four facts (a multiple rule, no ties, a rising row, a rank), every one needed.
- **Real data** (World Bank, data.gov.in) is written here, not by the owner: it needs licences and citations.

## 6. Not allowed

Sets copied or adapted from CAT papers, coaching material or books, even with names changed (D38). Write your own story and numbers; using a past set as inspiration for the kind of logic is fine.

## 7. How to send a set

Any form works: typed, a document, a photo. For each set:

```
Title:
Type: (from the table in §1)
Your level: medium / hard
Story:
Data or table (exact numbers):
Facts or clues (numbered):
Q1 (MCQ or typed):          Options:          Answer:
Q2 …
Explanations (optional; drafted for you if missing):
Source: written by me / used with permission from …
```

What happens next: converted to the format, checked by code (every answer recomputed, a table's blanks proved to fill one way, every fact needed), then solved by two independent agents. Anything they disagree on, find ambiguous or too easy comes back to you with a suggested fix before the set goes live.
