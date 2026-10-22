# VARC verbal ability types: research and plan

Researched 17 Oct 2026. Plan items A and B (section 6) were built in step 2a on 18 Oct 2026. C and D are planned in step 2 (see `docs/plan.md`).

## Why this exists

The VARC Learn tab has a short paragraph on each type: after every article, RC, para jumbles, para summary, odd sentence out, sentence insertion and critical reasoning. Resources and Practice, though, are almost all RC.

What the site has today for the VA types:
- **Learn:** one paragraph of method per type, and Gejo's free course (which covers para jumbles and summaries).
- **Practice:** Cracku's general VA bank, one Cracku para jumble PDF, Cracku's critical reasoning bank (38 questions), and an open-source practice site.
- **In-app drills:** para summary, para jumbles, odd sentence out and sentence insertion, built from 50 original paragraphs.

Missing:
- A method guide, video and question bank for each type.
- Any in-app critical reasoning.
- A way to practice the "after every article" summary.

## 1. Can we copy questions from these sites? No.

- **There are no official CAT papers.** IIM Indore has never released actual CAT question papers. The "previous year papers" online are coaching institutes' reconstructions from candidates' memory ([PaGaLGuY](https://www.pagalguy.com/?p=17075)).
- **CAT forbids reproducing its content.** The CAT disclaimer says publishing or reproducing its contents may be an offence, citing the Copyright Act 1957 and the IT Act 2000 ([MBA Universe](https://www.mbauniverse.com/article/id/9830/CAT-2016)).
- **Coaching questions are protected.** The Madras High Court upheld 2IIM's copyright in its own CAT questions ([SpicyIP](https://spicyip.com/author/sreyoshi-guha)).
- **Cracku's terms ban it explicitly.** Users may not "cut, copy, distribute, modify, recreate… publish" its content or make derivative works. Wholesale copying is barred "for commercial or non-commercial purposes", and scraping bots are barred too ([cracku.in/terms](https://cracku.in/terms)).
- **GMAT and LSAT questions belong to GMAC and LSAC.** The ReClor dataset is built from them (91% from real GMAT and LSAT papers) and its licence is unclear: "other" on Hugging Face, CC BY-NC elsewhere. It is not safe to reuse ([arXiv](https://arxiv.org/pdf/2002.04326), [Hugging Face](https://huggingface.co/datasets/metaeval/reclor)).

**What we can do:**
- Link to free banks.
- Study past papers for structure and trap patterns.
- Write original questions in the same formats, as the site already does.

## 2. Texts we may legally adapt into our own questions

Para jumbles, odd sentence out and insertion questions all rearrange or cut a text, which counts as making a derivative. So the source text must allow changes.

| Source | Licence | Can we adapt it? |
|---|---|---|
| Project Gutenberg | Public domain (in India, 60 years after the author's death) | Yes |
| Wikipedia | CC BY-SA | Yes, with attribution; the adapted passage carries CC BY-SA |
| Our World in Data articles | CC BY ([FAQ](https://ourworldindata.org/faqs)) | Yes, with attribution |
| PLOS journals | CC BY ([licence](https://journals.plos.org/plosone/s/content-license)) | Yes, with attribution |
| The Conversation | CC BY-ND, no edits, no systematic republishing ([guidelines](https://theconversation.com/republishing-guidelines)) | No |
| Aeon essays | Paid agreement, $650, no edits; 250-word quotes for critique only ([republish](https://aeon.co/republish)) | No |

Original writing remains the simplest and safest route. The open texts are useful as topic seeds and for science or data passages.

## 3. The VA mix: sources disagree

- For CAT 2025 Slot 1, IMS and InsideIIM report 2 each of summary, completion, odd sentence and jumble ([IMS](https://www.imsindia.com/cat-2025-slot-1-analysis/), [InsideIIM](https://insideiim.com/cat-2025-slot-1-analysis-exam-pattern-difficulty-level-key-insights)).
- Collegedunia reports 3 jumbles, 1 odd one out and no completion ([Collegedunia](https://collegedunia.com/news/e-242-cat-2025-slot-1-exam-analysis)).

Our table follows the majority. The counts are recalled by candidates, so they can be off by one.

## 4. By type

### Para jumbles (TITA)
**Method (consistent across sources):**
1. Find the opener: a general statement with no pronoun or connector pointing back.
2. Lock the mandatory pairs: pronoun and its noun, connector and the idea before it, general claim and its example, time order.
3. Practice with the options hidden, since CAT asks for typed answers.
4. Write down your working order as you go.
5. Read the final order through, and test two or three orders before committing.

([HitBullseye](https://mba.hitbullseye.com/cat/Parajumbles-CAT.php), [iQuanta](https://www.iquanta.in/blog/how-to-tackle-parajumbles-cat-verbal/))

**Free practice:**
- [Cracku 198+ para jumbles, PDF with video solutions](https://cracku.in/blog/?p=210914)
- [Cracku para jumbles quiz](https://cracku.in/blog/para-jumbles-quiz-for-cat/)
- [2IIM sentence rearrangement](https://iim-cat-questions-answers.2iim.com/verbal/sentence-rearrangement/): 49 free questions, each with a written explanation
- [Bodhee Prep, 40 questions with solutions](https://bodheeprep.com/cat-parajumbles-questions-solutions-practice)
- [Verbalhub graded drills](https://www.verbalhub.com/cat-parajumbles-practice-questions.php)
- [Toprankers guide and PDF](https://www.toprankers.com/para-jumbles-for-cat)
- [Careers360 guide](https://bschool.careers360.com/articles/para-jumbles-cat-2026-xat-strategies-examples-mba-enrance-exams)

**Advice on timing and volume:**
- iQuanta suggests doing jumbles in the last 10 to 12 minutes, and says two right beats four attempted.
- Daily volume advice ranges from 1 to 30 jumbles a day across sources, so treat any single number with care.

### Para summary (MCQ)
**Method:**
1. Put the paragraph in one line of your own before reading the options.
2. Remove options that are too narrow (one example), too broad, add a new idea, make extreme or causal claims, or shift the author's stance or tone.
3. Prefer crisp options over detailed ones.

([Cracku tips](https://cracku.in/blog/?p=100566), [PW](https://www.pw.live/mba/exams/cat-varc-para-summary))

A drill: Careers360 suggests cutting a 200-word paragraph to 25 words every day.

**Free practice:**
- [Cracku 96+ questions](https://cracku.in/cat-para-summary-questions): grouped by year, 1991 to 2025, with written and video solutions; a pop-up may ask for sign-in
- [Cracku cheatsheet](https://cracku.in/cat/verbal-ability/para-completion-and-summary/cheatsheet)
- [SelfStudys practice test](https://www.selfstudys.com/mcq/cat/verbal-ability-reading-comprehension/practice-test/7-paragraph-summary)

### Odd sentence out (TITA)
**Method:**
1. Build the coherent four-sentence paragraph first.
2. The odd sentence is usually on the topic but off the focus: the same keywords with a different scope.
3. If every sentence shares keywords, look for the one that cannot sit before or after any of the others.
4. Remove your candidate and check that the other four read as one paragraph.

([Cracku](https://cracku.in/blog/how-to-solve-odd-one-out-in-cat-varc/), [Careers360](https://bschool.careers360.com/articles/cat-varc-preparation-strategy-2026-section-wise-plan-rc-va-accuracy))

**Free practice:**
- [Cracku 48+ questions with video solutions](https://cracku.in/cat-odd-one-out-questions)
- [Cracku set 3, from past-paper patterns](https://cracku.in/blog/odd-sentence-out-questions-for-cat-set-3-pdf/)
- [Handa Ka Funda, 25 questions on PaGaLGuY](https://www.pagalguy.com/t/cat-preparation-tips-by-handa-ka-funda/3031727?page=5)

### Sentence insertion / para completion (MCQ)
**Method:**
1. Work out the job the missing sentence does: introduce, explain, give an example, give a reason, conclude, or contrast.
2. The right gap links to both neighbours.
3. Rule out a gap when the sentences on either side already follow on directly.
4. Rule out options whose scope is wrong.
5. Spotting what doesn't fit is easier than spotting what does.

([iQuanta](https://www.iquanta.in/blog/how-to-approach-paracompletion), [Cracku 5 tips](https://cracku.in/blog/?p=100524), [PW](https://www.pw.live/mba/exams/cat-varc-para-completion))

**Free practice:**
- [PW video list](https://www.pw.live/mba/exams/top-videos-on-para-completion-varc-for-cat-exam-2026)
- Cracku's VA bank, filtered by year

Older guides (MBA Universe 2014, PaGaLGuY 2013) describe the earlier format, where you pick the sentence that completes the paragraph. Recent CAT asks where a given sentence fits.

### Critical reasoning (XAT, and as RC training)
CAT no longer asks it as a separate type, but XAT does: assumption, inference, strengthen or weaken, conclusion, and cause and effect.

**Free practice:**
- [Cracku CAT critical reasoning, 38 questions](https://cracku.in/cat-critical-reasoning-questions) (already listed on the site)
- [Cracku XAT critical reasoning PDF](https://cracku.in/xat-2026-critical-reasoning-questions-pdf)
- [Quantifiers XAT verbal tests](https://quantifiers.in/xat-english-verbal-tests/)
- [LawHub free drill sets](https://www.lsac.org/blog/lsat-inbox-april-2026-lsat-prep-and-general-information) and [logical reasoning sample questions](https://www.lawhub.org/prepare-for-the-lsat/whats-in-the-lsat/logical-reasoning-sample-questions)
- [Manhattan Review, 92 free LSAT questions](https://manhattanreview.com/lsat-practice-questions)
- [e-GMAT critical reasoning samples](https://e-gmat.com/blogs/gmat-critical-reasoning-practice-questions/)
- The GMAT official free practice exams (already listed on the site)

Khan Academy's LSAT prep closed in July 2024 and moved to LawHub ([Daily Trojan](https://dailytrojan.com/2024/04/23/students-discuss-end-of-khan-academy-lsat-prep/)), so don't link to it.

### After every article (summary writing)
**Method:**
1. Write the theme in one line.
2. Cut the passage to about a third, in your own words, without lifting phrases.
3. Do one a day.

Toppers describe summarising articles as active reading ([CATking](https://catking.in/blog/cat-verbal-ability-strategy-by-topper-how-to-improve-varc-for-cat-exam)).

No free tool gives feedback on a written summary. That is the gap our planned AI summary feedback (plan item 36) would fill.

## 5. Not covered
- **Reddit:** reddit.com is blocked from this environment, and searches never returned Reddit threads. To include community advice, allow reddit.com in network settings and I'll go through r/CATpreparation.
- **Medium:** no relevant CAT verbal ability articles turned up.
- **Official sample questions:** the IIMs publish an official mock on iimcat.ac.in before each CAT, but it needs a registration login ([Careers360](https://news.careers360.com/cat-2024-mock-test-link-active-at-iimcat-ac-in-exam-pattern-answering-process-previous-year-question-paper)).

## 6. Proposed plan (A and B built; C and D in step 2)

**A. A Learn guide for each type.** Each type gets:
- The method steps above.
- A checklist of clues (pronouns, connectors, pairs, scope).
- That type's common traps.
- One worked example we write ourselves.
- Three links: a written guide, a video, and a free bank.

The critical reasoning section gets the same, with its question types.

**B. Practice tab by type.** Group the free banks in section 4 under each type, with question counts and whether sign-in is needed.

**C. New in-app practice:**
1. **Critical reasoning drill.** A new item type: a short argument and one question (assumption, strengthen, weaken, inference, flaw or paradox), with options explained and traps, like RC. Start with 30 original items.
2. **Summary writing.** After an RC set or a reading block, the student writes a 25-word summary. Then they see a model summary and a checklist: did it keep the main claim and its qualifier, and add nothing new? AI feedback comes later, in step 7.
3. **Learn then drill.** Each Learn guide ends with a "Drill 6 of these" button, using the custom drills that already exist.

**D. Content targets:**
- 100 VA paragraphs, up from 50; each paragraph gives all four VA types.
- 40 critical reasoning items.
- Everything original, or adapted from public-domain, CC BY or CC BY-SA texts with attribution.

**E. Where it fits:** after step 2 (the sectional needs a full mix of types), or as a small step 2a before it. Your call.
