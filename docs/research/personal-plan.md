# Step 4b research: a plan that fits you (F82, part 1), 19 Nov 2026

The owner asked to research before building the first-visit setup. Two questions: how products that keep learners set a
plan in about a minute, and how CAT students preparing a year or more ahead should spend their time. Outputs:
`docs/analyze.md` (A187 to A193, D116), `docs/feature.md` (F82), `docs/design/personal-plan.md`. Not about CAT 2026
takers. The evidence notes behind each finding are below the summary, with their sources.

**A gap in the sources.** Reddit could not be read this time: its RSS search, which worked in October, returned 404 on
every try, and web search refuses reddit.com. So the numbers on study hours come from coaching sites and toppers' own
accounts. They are advice, not a record of what students actually do; the plan treats them as starting points that
practice corrects.

## Findings

1. **A short quiz makes the plan feel like yours, and that alone moves the first step.** In Headspace's controlled trial
   (Irrational Labs, five versions), a short quiz before recommending a course raised course starts from 31% to 63%;
   even a quiz that led to the same beginner course added 7.6 points. It did not change how many days people kept going:
   they could not find their plan again. So the result must be on screen at once and stay the first thing they see.
2. **A modest default keeps more people.** Duolingo found high daily goals hurt the habit; nearly 40% of learners with no
   streak were on the top goal. Separating the streak from the goal raised day-14 retention 3.3%. Toppers' and coaching
   numbers (working: 1.5 to 2 h on weekdays; college: 1 to 2 h) are where people end up, not where a new student should
   start.
3. **Self-rated level is a weak guide to placement.** Across studies, what learners say they know correlates about .34
   with what they can do (Sitzmann et al. 2010). Use "where you stand" for tone and the first step, and let practice
   correct the plan; a test on the first visit is too long for a free site (Math Academy's diagnostic is 30 to 45 min).
4. **Two to four questions, each skippable, no account.** Education apps median about two onboarding questions; none of
   the Indian prep apps offers a self-serve plan without an account (they ask for a phone number and sell a batch). A
   one-minute plan with no sign-up is open ground.
5. **Hours by profile** (coaching and toppers): working people 12 to 20 h a week (1.5 to 2 h on weekdays, about 5 h a
   weekend day); college students 1 to 2 h on weekdays, 3 to 4 h at weekends; college plus a job about 13 h a week near
   the exam. Over a year that is roughly 550 to 1,100 h; InsideIIM puts the floor at 200 h.
6. **The split follows the weak section, but never starves the others.** No source gives percentages; their minutes
   imply about 35/30/35 (VARC/DILR/Quant). Weak Quant or non-engineers start nearer 30/25/45, weak VARC nearer 45/25/30;
   repeaters move 10 to 15 points to the weak section. Two sources warn against drilling only the weak one, because
   each section has its own cut-off. Daily reading of 20 to 45 min is the one "every day" item all agree on.
7. **Repeaters start from evidence.** They should check first whether their problem is speed or understanding (a timed
   sectional), and start mocks earlier; first-timers start with concepts and the type guides.
8. **What keeps people going:** weekly targets rather than daily quotas, short fixed blocks, forgiveness for missed days.
   What breaks them: plans copied from toppers, irregular days for working people, burnout over long horizons (our
   students start early), mocks without analysis.

## What changes in the plan

| Finding | Change |
|---|---|
| 1 | The setup ends on the plan itself: today's minutes per section and the first task, with "Start today's plan"; the same line stays on Plan and You |
| 2 | Defaults are modest: studying 60 min on weekdays and 120 at weekends, working 45 and 120, both 30 and 90; more is one tap away |
| 3 | "Where you stand" sets the first step and the wording, not a placement; part 2's reality check after mocks corrects it |
| 4 | Four questions on one page, all skippable, each with a default; no account; skipping keeps today's plan exactly |
| 5 | The time choices offered start from the profile's default and reach the coaching ranges (up to 120 min on weekdays, 300 at weekends) |
| 6 | Base split between live sections as today (VARC two parts, DILR one); "weakest section" moves 10 points of the day to it (15 for repeaters), never below 15 min a section; reading stays inside VARC |
| 7 | A repeater's first task is a timed VARC sectional; a first-timer's is the Start here guide and the type guides |
| 8 | Missed work already carries over as one block (D51); a weekly-target style stays planned for part 1b, after this branch |

---

## Notes A: onboarding in learning products

Scratch note, 2026-11-19, to merge into `docs/research/personal-plan.md`. [U] = unverified (secondary source, old, or inferred). Counts come from teardowns of past app versions; flows are A/B tested and change often.

### Product by product

**Duolingo.** About 7 questions before the first lesson. One recorded screen reads "Just 7 quick questions before we start your first lesson!" [U, screen capture, undated] (https://screensdesign.com/articles/duolingo-onboarding-design/). The order is roughly: language, where you heard of us, why you are learning, how much you know, daily goal, then "start from scratch" or "find my level" (https://goodux.appcues.com/blog/duolingo-user-onboarding, https://userguiding.com/blog/duolingo-onboarding-ux). The daily goal has 4 tiers: Casual 5, Regular 10, Serious 15, Intense 20 min (CNET gives Casual as 3 min) [U, labels change]. The placement test is optional and offered only to people who say they have some knowledge. It is adaptive: it starts easy and gets harder, then unlocks the skills it decides you already know. Duolingo publishes no question count (https://blog.duolingo.com/partial-credit-improvements-to-duolingos-placement-test/). Answers set the daily XP goal, the starting point on the path, and the reminder copy. No account is needed before the first lesson.
- Evidence: moving signup to after the first lesson raised DAU by about 20%, and a later tuning of the "soft wall" added 8.2%. These figures come from an executive interview, and secondary posts attribute them differently [U] (https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker).
- Evidence: a high daily goal got in the way of building a habit. Almost 40% of daily learners who had no streak were on "Intense". Separating the streak from the goal, so that one lesson keeps the streak, raised D14 retention by 3.3% and new learners' share on a streak by 19%. This is an A/B test published by Duolingo (https://blog.duolingo.com/improving-the-streak). **Lesson: an ambitious goal chosen at setup can hurt. Default low, let it rise.**

**Headspace.** 3 short questions in older flows: meditation experience, what brought you here (multi-select), and when you will practise [U for the exact current set] (https://goodux.appcues.com/blog/headspaces-mindful-onboarding-sequence). The answers pick a recommended course. Best evidence: Irrational Labs ran an RCT with 5 arms (https://irrationallabs.com/case-studies/headspace-doubled-course-starts/).
- Course starts rose from 31% to 63%. A quiz followed by the *same* Basics course ("perceived fit") still added +7.6 pts over defaulting straight to Basics. Asking makes a plan feel like *mine*, even when the output barely changes.
- The precommitment arm (which days, when, what trigger) raised app opens by 7.5%.
- **No arm changed actual meditation days.** The team's explanations: people could not find their course again when they came back, and the course did not match what newcomers expected. Setup moves the first action. It does not move the habit on its own.

**Calm.** One multi-select goal question: sleep, anxiety, focus, and so on. Calm says why it asks ("to personalise"). After the first session it asks you to *choose a reminder time*. Amplitude credits the reminder with "3x retention", but gives no baseline, no control group and no adoption share [U, vendor case study] (https://amplitude.com/blog/meditate-every-day, https://goodux.appcues.com/blog/calm-intros-for-new-users-and-features).

**Math Academy.** No preference quiz. You pick a course, then take an adaptive diagnostic of about 30 to 45 minutes, which can be split across sittings. It uses the knowledge graph to keep the number of questions low. It finds the "knowledge frontier", including gaps in lower courses. The report gives a course placement, per-topic mastery, and *estimated completion dates for several daily XP paces* (https://mathacademy.com/how-it-works, https://www.mathacademy.com/faq). The FAQ recommends 20 to 40 XP a day, 3 to 5 days a week (1 XP ≈ 1 focused minute), and the pace can be changed. This is the clearest example of showing the plan as "pace → finish date". The cost is a long first session. That works for motivated, paying, often parent-directed learners, not for a free site's first visit.

**Brilliant.** About 12 steps: a goal/interest quiz, then *real problems* as a level check, then account, then a paywall (annual plan with a 7-day trial), then a recommended course [U, single showcase] (https://screensdesign.com/showcase/brilliant-learn-by-doing). The answers fill the home screen with matching courses. The level is checked by doing problems, not by self-rating.

**Khan Academy.** In the redesigned learner experience, first run is "a short onboarding... a couple of details" plus a choice of courses. Placement is the optional *Course challenge* or unit test, not a gate. Teacher-set "Course Mastery Goals" were replaced by Unit Missions (support.khanacademy.org returned 403 to fetching, so [U], and the mirror is old: https://rosetta.to/u/khanacademy/new-khan-academy-learning-flow).

**Anki.** No onboarding at all. The default is 20 new cards a day (and 200 reviews in older defaults). The manual warns that users who study hundreds of new cards in their first days get buried in reviews (https://docs.ankiweb.net/deck-options.html). This is the "sane default, editable later" end of the range. The default does the planning.

**Indian exam-prep apps.** None shows a minute-long plan generator in public material.
- *Unacademy:* phone OTP, then "Choose your goal" (exam), then language, then batches. The goal can be edited later (https://unacademy.com/manage-goals) [U for order].
- *PhysicsWallah:* you choose a batch by current class and target-exam year, then OTP signup. No diagnostic (https://www.pw.live/online-course-physics-wallah-jee). Its CAT plan is a static article with tables for "strong vs weak concepts" (https://www.pw.live/mba/exams/preparation-plan-for-cracking-cat-and-omets).
- *Testbook:* exam-first, covering 350+ exams. The onboarding screens are not documented [U].
- *Oliveboard:* markets "personalized study planners" built from weak areas and time available. Inputs not documented [U] (https://www.oliveboard.in/whyoliveboard.php, https://us.fitgap.com/products/021905/oliveboard).
- *Cracku:* fixed plans by duration (30/40/90 days, 5, 6 and 8 months) and "daily targets" (90 to 120 for 95 to 99+%ile). No generator found (https://cracku.in/cat-6-months-preparation-plan, https://cracku.in/how-many-daily-targets-do-cat-99-percentilers-attempt/).
- *IMS:* myIMS has topic "benchmarking tests" with bands Learner <80%, Capable 80 to 95% (move on), Advanced, Ninja ≥99%, plus *human* myPlan mentor sessions (https://support.imsindia.com/support/solutions/articles/81000416792). Its GMAT page advertises a 30-minute mini-diagnostic.
- *TIME:* known for a fixed planned schedule plus mocks [U].
- *Career Launcher:* "personalized mentorship to build your study plan". It is human, with no tool (https://www.careerlauncher.com/center/blog/creating-a-personalized-study-plan--cat-clat-cuet-ipm-16902).
- *iQuanta:* advertises a "Personalized Study Plan / Strategy Builder" and multi-year courses. No visible diagnostic (https://www.iquanta.in/cat-mock-test) [U].

**Gap in the Indian market:** the market pattern is exam picker, then OTP, then sell a batch. Personal plans come from a mentor, a static article, or a duration-bucketed PDF. A self-serve plan that you can set up anonymously, changes with you, and gives an honest pace and finish date looks unclaimed.

### Benchmarks on length (weak)

- In Lazyweb's corpus, *education* quiz apps average **2.2 question screens (median 2, max 5)**. Health/fitness apps average 6.2, and all 119 quiz apps average 3.9. This counts screens and has no completion data [U, single vendor, July 2026] (https://design.lazyweb.com/blog/how-many-quiz-questions-education-apps, https://www.lazyweb.com/research/how-many-quiz-questions-onboarding).
- Cutting a quiz from 8 to 4 questions gave +12% conversion. This is a forum anecdote [U] (https://community.web2wave.com/t/how-long-should-the-quiz-be-before-the-paywall/105).
- Product tours of 3 steps have about a 66% completion rate, and longer tours drop. This is Chameleon's tour benchmark, not a quiz benchmark [U] (https://plushcap.com/content/chameleon/blog/chameleon-benchmark-report).
- Form length: findings are mixed. HubSpot data via blogs shows 3 to 5 fields beating 1 or 2. An Unbounce test that cut a form from 9 fields to 6 *lost* 14%. Making the phone field optional cut drop-off from 39% to 4%. Dropdowns and free text hurt more than simple taps [U, secondary] (https://ventureharbour.com/how-form-length-impacts-conversion-rates/).
- I found no published Appcues or Mixpanel benchmark of question count against completion. Do not cite one. 99ile should measure completion per step itself.

### Self-report vs short diagnostic

- Sitzmann et al. 2010 is a meta-analysis (k=137 effect sizes, about 17k learners) in *AMLE* 9(2):169–191. Self-assessed knowledge correlates **ρ≈.34** with tested learning, but .51 with satisfaction and .59 with motivation. Self-rating mostly reflects how people *feel*. Accuracy improves when people rate their *level* rather than their gain (.44 vs .00), when the rating closely matches the test (.47), and when people rate more than once *with feedback on accuracy* (.51). Web-based instruction is lowest (.19) (https://www.gwern.net/doc/psychology/cognitive-bias/illusion-of-depth/2010-sitzmann.pdf). Students also tend to overestimate (Falchikov & Boud 1989, *RER*).
- Implications:
  - A self-rating ("new / some practice / strong") is fine for *tone and first step*. It is poor for *placement*.
  - A self-rating tied to something concrete ("my last mock percentile was ___", "I can finish an RC set in ~__ min") is better than an abstract "how good are you".
  - The answer should be corrected from real practice data within the first week, and the user should be shown the correction, since feedback on accuracy is what improves self-rating.
  - A short diagnostic of ~5 to 10 items gives a signal, but a full one (Math Academy at 30 to 45 min, ALEKS-style at 20 to 30 items) is too long for a first visit. Duolingo and Khan make placement *opt-in*, and Brilliant uses a few real problems.

### Synthesis: what makes a one-minute setup work

1. **Ask 2 to 4 questions, and only what you cannot infer.** For CAT these are: when you plan to sit the exam (sets the horizon, 6 to 18 months), time per day or week (sets pace), and where you stand (sets the starting point, with a "not sure" option). The goal percentile is optional. Skip name, email, phone, and "how did you hear".
2. **Order: easiest and most motivating first.** Exam year or "when" is one tap. Time comes second. Level comes last and has an escape hatch ("not sure → find out with a 5-question check").
3. **Use defaults that pick the modest option.** Duolingo found an ambitious goal stopped habits forming, and Anki's default of 20 protects beginners. Preselect a mid-low pace, such as 30 min/day on 5 days.
4. **Show the result on the same screen:** "At this pace you cover X by Y. Today: one RC set (12 min)." Math Academy's "pace → completion date" is the model. Headspace showed that a *perceived* fit doubles first-action rates.
5. **Make the first action the plan's first item.** The Headspace failure was that people could not find their course again when they came back. The plan must be the home screen's next step, not something buried.
6. **Let people skip and edit later.** Every question needs "skip, use defaults". The plan stays editable (Unacademy "edit goal", Math Academy pace changes), and replanning is cheap.
7. **Add an implementation intention, optionally.** "Which days / when?" raised opens by 7.5% (Headspace). A user-chosen reminder time is the Calm pattern. On a website, put this behind an opt-in.
8. **Don't gate on an account.** Duolingo's delayed signup is worth roughly +20% DAU [U]. 99ile already stores data in localStorage first, which fits.

**Pitfalls:**
- Long fitness-style quizzes.
- Asking what usage will reveal: weak areas, speed, accuracy.
- Self-rated placement treated as truth.
- Ambitious defaults.
- A "personalised" plan that is really a fixed PDF.
- A plan screen that disappears after onboarding.
- Making the user commit to percentile targets too early, which feeds anxiety and is off-mission for future aspirants.

## Notes B: how CAT students spend their time

Researched 19 Nov 2026; to be merged into `docs/research/personal-plan.md`. Audience: people starting a year or more ahead (CAT 2027+).

**Caveats.**
- **Reddit could not be read.** `search.rss` and `/top/.rss` on r/CATpreparation and r/MBAIndia returned HTTP 404 on six tries about a minute apart, plus one 429. WebSearch refuses reddit.com. So no line below records what students *report* on Reddit. **Unverified** until Reddit is re-checked.
- Nearly every other source is a coaching institute with a course to sell. Topper figures are self-reported.
- Figures I computed are marked *(calc)*.

### 1. Daily time by profile

**Working professionals: a short weekday block and a long weekend block, about 12–20 h a week.**
- InsideIIM, Manas Sathe (99.08, CA at KPMG): weekdays "2 hours per day", weekends "5 hours per day", about 20 h a week. Floor of 200 h in total (500 h ≈ 6.5 months). Plan weekly, not daily, so work spikes don't break the plan. https://insideiim.com/prepare-cat-full-time-job
- InsideIIM / VistaMind (2015): "13 to 15 hours per week is a better answer". 5-day job: at least 1 h a weekday (about 30 min verbal plus 30 min speed maths) and 4–5 h a weekend day. https://insideiim.com/managing-cat-prep-and-work
- Cracku: 1–2 h on weekdays (its own table says 2–3) and 5–8 h a weekend day. "The main problem … isn't even a shortage of time but rather irregular study routines." https://cracku.in/cat-preparation-with-full-time-job
- Career Launcher: 2–3 h on weekdays, 5–6 h at weekends. https://www.careerlauncher.com/center/blog/the-complete-study-plan-for-cat-2026-19756
- 2IIM calls 50 h a week "unrealistic written all over it", but "practically everyone can find an additional 20 hours per week". https://online.2iim.com/cat-exam/blogs/cat-preparation-strategy/3-common-mistakes-every-cat-aspirant-must-avoid/
- What working toppers report:
  - Siddhant Sharma (99.94): "Even one focused hour a day adds up over time." https://lptedtech.com/blog/cat/toppers/siddhant-sharma/
  - Dipak Agrawal (99.83): about 1.5 h before office and 1.5 h after. https://dipakagrawal.substack.com/p/how-i-scored-9983-in-cat-2023-and
  - Arnab Das (99.75, Visa): "Job ke baad ek ghanta do ghanta" ("an hour or two after work"). https://www.pw.live/mba/exams/from-a-9-to-5-job-to-cat-99-75-arnab-das-on-why-pw-marathons-are-a-game-changer

**College students.**
- Cracku, for CAT 2027: "1-2 hours daily on weekdays and 3-4 hours on weekends". "Two focused hours every day beat ten rushed hours once a week." "7 hours of sleep is non-negotiable." https://cracku.in/how-to-prepare-for-cat-2027-while-in-college
- Careers360, final year: "around 2.5 hours on weekdays and 6 hours across weekends", about 18.5 h a week *(calc)*. https://www.careers360.com/mba/articles/cat-2026-preparation-for-final-year-students
- Outlier: one CAT 2025 topper did "around six hours … on most days" in final year (Dhruv Aggarwal; seen only in a search snippet, **unverified**).

**Both college and a job or internship.**
- Career Launcher's table: weekdays 1–2 h (8 h across the week), Sat 3 h (mock plus analysis), Sun 2 h. About 13 h a week. "Start with 1.5–2 hours and increase to 3 hours as the exam nears." Also "20-minute revision sessions before bed". https://www.careerlauncher.com/center/blog/how-to-balance-college-job-and-cat-2025-prep-without-burning-out-16607

**Totals over a year.**
- At 2–3 h a day for 12 months: 730–1,100 h *(calc on Cracku's table)*. https://cracku.in/how-much-time-is-needed-to-prepare-for-cat-exam-in-2026
- Working week of 13–20 h over 40–45 real weeks: about 550–900 h *(calc)*.
- Agrawal's volume targets for 99: about 500 DILR sets, 2,500+ Quant questions, 200–300 RCs and 50+ mocks.

**Recommended vs reported.** Coaching pages cluster at 2–3 h on weekdays and 5–8 h at weekends. Working toppers mostly report 1–2 h on weekdays. Six-hour days come from students or the final months. What typical students actually log is **unmeasured**, because Reddit was unavailable.

### 2. First attempt vs repeater

**2IIM on repeaters.**
- "Take more mocks and start taking them *earlier*."
- Work out whether the problem is speed ("focus on drill") or understanding ("focus on fundamentals").
- Accuracy bars: above 95% in Quant and DI, above 80% in Verbal.
- "Prep plan is very simple if you know your weak section."
- Warning: thinking of CAT "every day for 18 months can burn you out".
- https://online.2iim.com/cat-exam/blogs/cat-preparation-strategy/3-must-do-things-for-cat-repeater/

**Career Launcher.** Repeaters: the first 2 months fix weak topics, then 2–3 mocks a week from month 3. Working first-timers start with "Diagnostics & Basics". College first-timers start with Foundation plus one baseline mock.

**Counterpoint.** Don't drill only the weak section, since sectional cutoffs apply (Careers360 via a search summary, **unverified**; Sharma says the same).

**Early mocks for first-timers too.** Agrawal took a mock on day 1 and scored 29/198. Career Launcher, for non-engineers: "a free mock within the first 2–3 weeks, before you feel ready". https://www.careerlauncher.com/blogs/cat-mba/cat-preparation-for-non-engineers/

**Rule idea.**
- Everyone takes a week-1 diagnostic.
- For a first-timer it only orders topics, and the plan stays concepts-first.
- For a repeater, the diagnostic or last scorecard sets the weak-section weight, and mocks start in month 1 at a low cadence.

### 3. Splitting time across VARC, DILR and Quant

No source gives percentages. These are their daily minutes:

| Source | VARC | DILR | Quant | V/D/Q *(calc)* |
|---|---|---|---|---|
| CATKing 8-month plan (https://catking.in/cat-2026-8-month-preparation-strategy-engineers-non-engineers) | 60–90 + 30 reading | 60 | 90–120 | ~39/22/39 |
| Careers360, final year | 45–60 | 45–60 | 60–90 | ~29/29/42 |
| Cracku, college | "equally" | | | 33/33/33 |
| Exam weight (Cracku) | 36% | 32% | 32% | — |

Shift by profile (Careers360: "no fixed ratio"; https://www.careers360.com/mba/articles/cat-preparation-2026-varc-strong-weak-quant-strategy):

| Profile | VARC/day | Quant/day |
|---|---|---|
| Strong VARC, weak Quant | 45–60 min | 2–2.5 h |
| Weak VARC, strong Quant | 2 h | 1–1.5 h |
| Weak in both | 1.5–2 h | 1.5–2 h |
| Strong in both | 1–1.5 h | 1–1.5 h |

**By background.**
- CATKing: engineers "spend extra time on VARC daily". Non-engineers "start QA from basics (NCERT level)".
- Prep length (Sharma page): about 3 months for an engineer fluent in English, about 6 months for a non-engineer, about 9 months after an academic gap.

**Minimum daily touch. Sources conflict.**
- Career Launcher: 20–40 QA questions, 1 RC and 1 timed DILR set a day.
- Cracku: "no more than two sections per day to avoid burnout". Its college plan rotates sections by weekday.
- Common ground: **20–45 min of reading every day** ("Daily reading is the backbone of VARC", Cracku). Each section is touched several times a week.

### 4. Phases and when mocks start

- **College student, 10–12 months (Career Launcher).**
  - Foundation, months 1–3: a baseline mock, then 1 sectional a week.
  - Strengthening, months 4–6: 2 mocks a month.
  - Application, months 7–9: 1 mock a week.
  - Final lap: 3–4 mocks a week.
- **Working professional, 6–8 months (Career Launcher).**
  - Diagnostics, month 1.
  - Core: a mock every 10 days.
  - Acceleration: 1–2 a week.
  - Last 2 months: 3–4 a week.
- **12 months (Cracku).** Fundamentals in months 1–2, topic practice in 3–4, sectionals and full mocks from 5–6, advanced practice in 7–9, then revision. Hours scale with time left: 12+ months 2–3 h a day, 6 months 3–6 h, 3 months 6–8 h.
- **Multi-year college track (Cracku, CAT 2027).** Year 1: no mocks. Year 2: 1–2 trial mocks. Final year: 1 a week in the last 3–4 months.
- **Mock count by target (Careers360).** 85–90 percentile: 15–20 mocks. 95–99: 30–40. 99+: 40–50. Analysis time rises from 1–2 h to 3+ h per mock.
- **Late start.** Phases shrink but are not skipped. Cracku's 3 months: concepts, then sectionals, then mocks. Career Launcher: a mock immediately, 2 a week in weeks 3–6, 3–4 a week in the final month. VistaMind: "Five months is more than enough … provided one does this systematically and consistently."
- **Mocks from day 1?** Sathe says "right from the beginning". Cracku warns against waiting until the syllabus is finished. Others wait until months 5–6.
- **Synthesis:** an early diagnostic, sparse sectionals during foundation, and full mocks that ramp up over the last 4–6 months.

### 5. Failure modes and what keeps people consistent

**Failure modes.**
- **Plans that are too big, or copied from a topper.** "An overly ambitious or inflexible plan can lead to stress and burnout" (Careers360 via a search summary).
- **Irregular routines in working people.** "Covering the entire Cat Exam Syllabus during weekends might kill you" (Cracku).
- **Long horizons.** The 2IIM 18-month burnout warning matters for us, because our users start early.
- **Skipping VARC.** Aspirants assume "general reading skills are sufficient" (Career Launcher, https://careerlauncher.com/center/blog/avoiding-common-mistakes-in-varc--what-to-focus-on-in-the-final-weeks-before-cat-13139). Agrawal: "I practiced very few sectionals for VARC and in hindsight, it was a mistake."
- **Mocks without analysis.** "One thoroughly dissected mock in a week is much more effective than taking several tests" (Cracku).
- **Too many strategy videos and resources, and changing strategy late** (Cracku).

**What keeps people consistent.**
- **A weekly target over a daily quota.** Sathe plans by the week. Careers360's weekly targets: 12–15 RCs, 15–20 DILR sets, topic-wise Quant.
- **Short fixed blocks.** Morning before work (2IIM, Sharma), 50–60 min blocks, 20 min before bed.
- **Concrete goals.** "Complete 2 QA topics + 2 RC passages" instead of "study everything today" (coaching blog via search).
- **Forgive missed days.** 2IIM: "Sometimes you … waste the whole day. It's fine … never regret." (https://online.2iim.com/cat-exam/blogs/cat-preparation-strategy/how-to-stay-consistent-while-preparing-for-cat/)
- **Breadth before depth.** 10 questions from each of 20 chapters beats 200 from one (Sathe).

### Summary table (my synthesis for plan rules, not a quoted source)

Defaults for someone 12+ months out. "Late" means the last 4–6 months.

| Profile | Weekday min | Weekend-day min | ≈ h/week | Split V/D/Q | Basis |
|---|---|---|---|---|---|
| College student | 60–90 (late 120–180) | 150–240 (late 300–360) | 10–15 (late 18–25) | 35/30/35 | Cracku 1–2 h / 3–4 h; Careers360 2.5 h + 6 h |
| Working professional | 45–75 (late 90–120) | 120–240 (late 300) | 8–14 (late 15–20) | 35/30/35 | Toppers 1–2 h weekdays; Sathe 2 h / 5 h |
| College + job/internship | 30–60 | 120–180 | 6–10 (late ~13) | 35/30/35 | Career Launcher ≈13 h/week |
| Repeater | as profile | as profile | as profile | weak section +10–15 pts, taken from strongest | 2IIM; Career Launcher |
| Non-engineer / weak Quant | as profile | as profile | as profile | 30/25/45 at first | Careers360 table |
| Engineer / weak VARC | as profile | as profile | as profile | 45/25/30 | CATKing |

Proposed floors, all **unverified** as rules:
- 15–20 min of reading every day.
- At most two practice sections a day, plus reading.
- Each section at least 3 times a week.
- A missed day rolls into the weekly target and is never doubled up the next day.
