I went through your [CAT-Prep repository](https://github.com/japp47/CAT-Prep?utm_source=chatgpt.com), the project structure, the roadmap code, and the implementation of its practice tracking and report-card logic. I also checked the product description in your README against the roadmap defined in the code.

My main takeaway is that 99ile has the foundations of a genuinely useful CAT preparation product, but its next evolution should be from a structured study tracker into an intelligent preparation coach.

Your concern about the project feeling too structured is valid. You've built a lot of systems to plan, record, measure, and organize studying. The opportunity now is to make those systems work together in the background, so the student doesn't feel like they're managing a project-management tool just to prepare for CAT.

What's already strong

Your core product

Daily plans, original VARC practice, explanations for wrong options, an error log, spaced repetition, focus timing, progress reports, and offline access. These are useful building blocks, especially when they share the same underlying learning history.

What differentiates the idea

It isn't simply that a student can practise questions or see accuracy charts. It's that every attempt can inform what they should study next, which mistakes keep repeating, and whether their preparation is actually improving.

What I'd build next

One coherent learning loop: practise → understand the mistake → identify the pattern → get a tailored next step → revisit it → verify improvement.

## 1. What I think of the idea

I'd rate the underlying product idea highly, with one important caveat: the advantage won't come from the number of features. It'll come from how well the product learns from a student's behaviour and helps them improve.

## 99ile product assessment

Strong foundation

Product potential

# 8.5/10

Based on concept and current direction

Current differentiation

# 7/10

Promising, still needs validation

These are my qualitative assessments, not user-tested ratings or measured market scores.

The strongest elements I found are:

- Contextual error tracking: Your implementation records the chosen answer, why it was chosen, the correct explanation, and the trap involved. That gives you richer information than a basic wrong-answer counter.
- Progress that looks beyond scores: The report logic considers question types, RC genres, difficulty, reading speed, recurring traps, and summary-writing habits.
- A learning mechanism: Your redo queue brings missed questions back after 1, 3 and 7 days, requiring consecutive correct answers before clearing them.
- A realistic workflow: The timetable and focus timer measure actual study activity, rather than relying solely on what the student intended to complete.

See the [attempt-recording implementation](https://github.com/japp47/CAT-Prep/blob/main/src/practice/record.ts?utm_source=chatgpt.com), [summary-habit analysis](https://github.com/japp47/CAT-Prep/blob/main/src/practice/summary.ts?utm_source=chatgpt.com), and [report card](https://github.com/japp47/CAT-Prep/blob/main/src/pages/tracker/Report.tsx?utm_source=chatgpt.com).

That combination can become genuinely valuable. However, you need to validate whether students use these features consistently and whether they improve outcomes, rather than assuming that more recorded data automatically produces better learning.

## 2. Why the current product may feel too structured

Your roadmap currently spans daily planning, phases, sections, practice, redo queues, flashcards, focus timers, progress reports, error logs, mock analysis, weekly reviews, synchronization, AI tools, leaderboards, MBA college prediction, exam calendars and interviews.

Individually, most of those features make sense. Together, they risk turning preparation into another job.

I would simplify the experience around three user questions.

What should I do today?

One recommended study session, a time estimate, and a clear starting button. The student shouldn't need to configure five settings before beginning.

What am I getting wrong?

A natural-language explanation of recurring mistakes, the underlying skill involved, and a targeted exercise to fix it.

Am I improving?

Show score trends, accuracy, consistency and weaknesses, with concrete evidence. Let students open detailed analytics when they need them instead of showing every chart by default.

My UX principle: keep the structure in the system, not in the student's face.

Keep the error records, scheduling logic and audit trail. Simplify the visible experience into recommendations and actions.

## 3. The AI features I would prioritise

I'd avoid adding a generic chatbot to the website just because AI is available. Make AI operate on the student's preparation history and give it a concrete job.

### A. AI Study Coach

Highest priority

The coach reviews recent attempts, mock performance, available study time and recurring errors. It then answers: What is the highest-value thing for me to do next?

Example: “Your inference accuracy has improved, but you repeatedly choose options that go beyond what the passage proves. Spend 15 minutes on three inference questions, then revisit your weakest previous question.”

### B. AI Error Investigator

Highest priority

Don't stop at recording that an answer was wrong. Identify the likely cause: misunderstood the main argument, missed a qualifier, made an unsupported inference, fell for a trap, or ran out of time.

Show the evidence from the answer and passage. Give the student a small corrective drill and track whether the same error happens again.

### C. AI Progress Narrator

Convert the existing analytics into a short weekly story: what improved, what regressed, which conclusions have enough evidence, and what to do next.

Example: “You improved from 62% to 74% on inference questions across comparable practice sets. Your reading pace is stable, but accuracy on difficult passages remains lower.”

### D. AI Writing and RC Mentor

Evaluate a student's para summary for the main claim, qualifiers, irrelevant examples and unsupported additions. Offer actionable feedback rather than simply generating a replacement answer.

Your existing summary checks give you a useful starting structure for this feature.

### E. AI Practice Generator

Turn a student-selected article into a CAT-style RC exercise, generate plausible distractors, explain why each option works or fails, and create follow-up questions around identified weaknesses.

Keep answer verification and quality checks mandatory before publishing generated material.

These align with features already present in your roadmap, particularly AI practice tools and mock analysis. The change I'd make is to organise them around the same student history rather than releasing them as separate AI features.

### What an AI coach should actually see

It should use structured, relevant data rather than ingesting the student's entire local history indiscriminately.

For instance:

| Signal                                     | How it helps                                  |
| ------------------------------------------ | --------------------------------------------- |
| Accuracy by question type                  | Finds skill gaps                              |
| Wrong-answer explanations and traps        | Identifies recurring patterns                 |
| Time spent per question                    | Separates knowledge gaps from pacing issues   |
| Mock and sectional results                 | Shows performance under exam conditions       |
| Redo history                               | Checks whether a weakness is resolving        |
| Study time available                       | Makes recommendations realistic               |
| Confidence, optionally reported by student | Helps distinguish guessing from understanding |

The AI should return a proposed action, a reason, the supporting evidence, and a way to measure the result. Deterministic code should calculate scores, counts, progress and schedules; AI should interpret those results and explain them.

That separation is important because an eloquent AI explanation is not proof of a student's weakness or a guarantee of a better percentile.

## 4. Your error tracking can become the product's biggest advantage

This is where I'd invest the most product thinking.

Your existing implementation already creates useful error entries with `why`, `fix`, and `trap` fields. That is a stronger foundation than a generic tracker. But right now, the report logic mostly counts trap labels and finds categories with low accuracy.

I'd evolve that into an Error Intelligence System.

EXAMPLE STUDENT INSIGHT

## You're not struggling with inference itself.

Across your last 12 inference attempts, most errors came from selecting options that introduced claims the passage did not support.

Observed pattern

# 7 of 12

Wrong answers involving unsupported claims

Recommended action

# 15 min

Targeted inference drill

The next step

Practise three inference questions. For every option, identify the exact passage evidence that supports or rejects it. Revisit these questions in the redo queue.

Illustrative example only; these are not real student results.

I'd classify mistakes at three levels:

- Question-level: What happened in this individual attempt?
- Pattern-level: Which cognitive mistake is recurring across attempts?
- Outcome-level: Is the student's accuracy improving after targeted practice?

A single question can have multiple possible causes. The product should distinguish evidence from inference, let the student correct an incorrect diagnosis, and avoid labelling a temporary mistake as a permanent weakness.

You can then build a useful feedback loop:

\#chatgpt-mermaid-\_r_q3\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_q3\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_q3\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_q3\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_q3\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_q3\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_q3\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_q3\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_q3\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_q3\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_q3\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_q3\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_q3\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_q3\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;font-size:16px;}#chatgpt-mermaid-\_r_q3\_ p{margin:0;}#chatgpt-mermaid-\_r_q3\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_q3\_ .cluster-label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_q3\_ .cluster-label span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_q3\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_q3\_ .label text,#chatgpt-mermaid-\_r_q3\_ span{fill:rgb(237, 237, 237);color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_q3\_ .node rect,#chatgpt-mermaid-\_r_q3\_ .node circle,#chatgpt-mermaid-\_r_q3\_ .node ellipse,#chatgpt-mermaid-\_r_q3\_ .node polygon,#chatgpt-mermaid-\_r_q3\_ .node path{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-\_r_q3\_ .rough-node .label text,#chatgpt-mermaid-\_r_q3\_ .node .label text,#chatgpt-mermaid-\_r_q3\_ .image-shape .label,#chatgpt-mermaid-\_r_q3\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_q3\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_q3\_ .rough-node .label,#chatgpt-mermaid-\_r_q3\_ .node .label,#chatgpt-mermaid-\_r_q3\_ .image-shape .label,#chatgpt-mermaid-\_r_q3\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_q3\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_q3\_ .root .anchor path{fill:rgb(175, 175, 175)!important;stroke-width:0;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_q3\_ .arrowheadPath{fill:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_q3\_ .edgePath .path{stroke:rgb(175, 175, 175);stroke-width:1px;}#chatgpt-mermaid-\_r_q3\_ .flowchart-link{stroke:rgb(175, 175, 175);fill:none;}#chatgpt-mermaid-\_r_q3\_ .edgeLabel{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_q3\_ .edgeLabel p{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_q3\_ .edgeLabel rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_q3\_ .labelBkg{background-color:rgba(0, 0, 0, 0.5);}#chatgpt-mermaid-\_r_q3\_ .cluster rect{fill:rgb(48, 48, 48);stroke:rgba(255, 255, 255, 0.15);stroke-width:1px;}#chatgpt-mermaid-\_r_q3\_ .cluster text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_q3\_ .cluster span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_q3\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;font-size:12px;background:rgb(48, 48, 48);border:1px solid rgba(255, 255, 255, 0.15);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_q3\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_q3\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_q3\_ .icon-shape,#chatgpt-mermaid-\_r_q3\_ .image-shape{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_q3\_ .icon-shape p,#chatgpt-mermaid-\_r_q3\_ .image-shape p{background-color:rgb(0, 0, 0);padding:2px;}#chatgpt-mermaid-\_r_q3\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_q3\_ .image-shape .label rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_q3\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_q3\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_q3\_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_q3\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_q3\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_q3\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_q3\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_q3\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_q3\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_q3\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_q3\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_q3\_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-\_r_q3\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_q3\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_q3\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_q3\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_q3\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_q3\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_q3\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_q3\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_q3\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_q3\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_q3\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_q3\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-width:1px;}#chatgpt-mermaid-\_r_q3\_ .node rect,#chatgpt-mermaid-\_r_q3\_ .node circle,#chatgpt-mermaid-\_r_q3\_ .node ellipse,#chatgpt-mermaid-\_r_q3\_ .node polygon,#chatgpt-mermaid-\_r_q3\_ .node path{fill:rgb(0, 40, 77);stroke:rgba(255, 255, 255, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_q3\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_q3\_ .node.mermaid-decision .label-container{fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-dasharray:2,2;}#chatgpt-mermaid-\_r_q3\_ .edgePaths .flowchart-link{stroke:rgb(175, 175, 175);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_q3\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_q3\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;}Student attempts questionRecord answer, timing andexplanationClassify likely errorGroup similar errors over timeRecommend targeted drillSchedule reviewMeasure repeat-error rateUpdate student profile

This is the difference between storing errors and actively helping someone stop repeating them.

## 5. Progress tracking: fewer metrics, better conclusions

Your current report card contains a lot of useful information: accuracy, question types, RC genre, difficulty, reading pace, summary habits and recurring traps. That's a good analytical foundation.

I wouldn't add many more charts. I'd make the dashboard answer three things:

1\. Preparation health

Are you making progress on the skills that matter?

Show a small set of trends for accuracy, consistency, timed performance and the current biggest weakness. Never treat hours studied alone as proof of progress.

2\. Weaknesses being fixed

Is targeted practice working?

Track recurring errors before and after a targeted drill, how many scheduled reviews were answered correctly, and whether the improvement persists in new questions.

3\. Exam readiness

How well does practice translate to timed performance?

Emphasise recent mock scores, performance across comparable mocks, sectional pacing and the gap to the student's target. Show percentile estimates as estimates, not promises.

### The audit trail I'd add

Since you mentioned wanting to track and audit everything, I would separate the student's learning record from the system's operational history.

| Record                 | What to capture                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| Attempt history        | Question, answer, correctness, time, explanation and content version                            |
| Error history          | Original error, categorisation, student correction and subsequent outcome                       |
| Recommendation history | Why the coach recommended an action, what evidence it used, and whether the student followed it |
| Plan history           | Original schedule, changes, completed tasks and reasons for rescheduling                        |
| AI history             | Model or prompt version, input references, output, review status and feedback                   |

Keep this history append-only where appropriate, with clear correction records instead of silently overwriting meaningful events. Since 99ile is currently browser-local, a proper audit history could be stored locally first, then synchronised when you introduce accounts. Sync conflicts, backups and deletions need deliberate handling.

Don't log passwords, authentication tokens or unnecessary sensitive data. Also, students' private study records should not become public leaderboard data by default.

The important distinction is that an audit trail should make important decisions explainable and recoverable. It shouldn't mean logging every minor UI interaction or storing unlimited AI conversations.

## 6. What I'd change in the “What's Coming” roadmap

Your [roadmap implementation](https://github.com/japp47/CAT-Prep/blob/main/src/data/roadmap.ts?utm_source=chatgpt.com) already separates shipped, in-progress, planned and later features. That's good for development, but the roadmap reads more like an internal backlog than a cohesive product vision.

I'd regroup it around outcomes rather than feature names.

### Now — Complete the CAT learning loop

Priority 1

Finish mock analysis, the Sunday review and the weakest-area recommendation flow. Connect the existing error log, redo queue and progress report so they reinforce one another.

Success measure: Students complete recommended drills and show fewer repeat mistakes on subsequent questions.

### Next — Complete the three CAT sections

Bring DILR and Quant to a useful level before substantially expanding into XAT, college calculators, community features and other MBA exams.

A tracker is only as valuable as the learning it helps students do. Full CAT coverage makes the existing planner and progress system much more useful.

### Then — Add the AI coach

Build the error investigator, personalised study recommendations and progress narrator on top of real student history. Add AI-generated exercises only after establishing reliable content-quality checks.

### Later — Sync and community

Make sign-in and cross-device sync optional. Add leaderboards, study groups, exam reminders, B-school planning and interview preparation only when they support a clear user need.

One point I would bring forward is your proposed one daily time budget across sections. A student should be able to say “I have 90 minutes today,” and the system should choose a sensible split based on their preparation stage, recent performance and pending revision. That's more valuable than asking them to micromanage three separate timetables.

The coach should also let students override its plan. Exams, college and work commitments change; the system should adapt rather than making students feel they've failed when a schedule slips.

## 7. Implementation priorities

Here's the practical order I'd follow for the existing codebase.

| Priority | Build                                                        | Why                                                   |
| -------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| P0       | Improve the shared learning-history model and error taxonomy | Creates one reliable source of truth                  |
| P0       | Add recommendation records and outcome tracking              | Lets you evaluate whether interventions actually help |
| P1       | Mock-analysis wizard and weekly review                       | Converts existing data into actionable feedback       |
| P1       | Cross-section daily planner                                  | Makes the whole product feel cohesive                 |
| P2       | AI study coach and error investigator                        | Adds interpretation and tailored actions              |
| P2       | AI-generated practice with validation                        | Expands content while controlling quality             |
| P3       | Optional account sync, community and broader MBA tools       | Expands the product after the core loop is proven     |

You don't need to implement a new service for every feature. Keep deterministic planning, scoring, progress calculations and review scheduling in the existing TypeScript domain logic. Add a narrow AI interface for tasks that genuinely need language-model reasoning, with typed inputs and outputs.

Before committing to an AI provider, define the data boundary, user consent, costs, rate limits and failure behaviour. The core practice and tracking experience should still work when AI is unavailable.

One further issue: your README identifies DILR and Quant as placeholders, while the report components already accommodate multiple sections. I would verify the end-to-end behaviour for all three sections, rather than assuming that the shared types and navigation mean all features are fully operational.

## 8. Is there a real product opportunity here?

I think there is a credible opportunity for 99ile to become the preparation companion for students who don't want expensive coaching or a complicated system of spreadsheets, notes and disconnected practice resources.

But the value proposition should not be “everything CAT-related in one place.” That is easy to imitate and risks scope creep.

I'd centre it on:

> A free CAT coach that learns from every mistake and tells you what to do next.

That's clear, useful and consistent with the strongest parts of what you've already built.

Your local-first architecture, free access, offline support and detailed learning records can help distinguish it. The challenge will be building enough high-quality DILR and Quant content, validating the recommendations, earning student trust and proving that people return to the tool.

I wasn't able to inspect the live site's rendered “What's Coming” section directly in this session, and I haven't run the application or tests. The assessment above is grounded in the repository README and the source files I could inspect, not a claim that I verified every screen or every feature in production.

My recommendation: don't expand the feature list yet. Make the existing learning history intelligent, complete the CAT sections, and ensure every error can lead to a targeted action whose result gets measured. That's the product I would build toward.

I actually think your order is right: redesign the homepage → introduce a Go backend → migrate the existing frontend functionality → add intelligence and AI on top.

For 99ile, I wouldn't build the backend just to say the application has one. I'd use it to solve the limitations of the current frontend-only architecture and establish a foundation for the features you want to build next.

Your current React/TypeScript application already has meaningful domain logic for practice attempts, error records, redo scheduling, progress reports and study plans. The backend should preserve that work, not replace it with a completely different system.

## 1. The architecture I'd aim for

React + TypeScript / PWA

Homepage, practice, planner, reports, error log

HTTPS · REST API · JSON

## Go backend — modular monolith

Auth & users

Accounts, sessions, preferences

Practice

Questions, attempts, mocks

Planning

Schedules, redo queue, reviews

Insights & AI

Recommendations, explanations

PostgreSQL

Users, learning history, plans, content metadata, audit events

I'd start with one Go application organised into domain modules, not microservices. Each module can have clear responsibilities and interfaces without requiring independent deployments, service discovery or distributed transactions.

Keep the frontend responsible for rendering the UI and maintaining temporary interaction state. The backend should become authoritative for persistent user records, account access, cross-device sync, shared progress and AI operations.

One important distinction: you don't have to move every calculation to Go. Pure UI logic and convenient client-side calculations can remain in TypeScript. Anything that must be trusted, shared, consistent across devices or protected from tampering belongs on the server.

## 2. Build the backend in phases

I'd divide the work into five phases. Don't start AI until the underlying learning data is reliable.

## 01

### Backend foundation

First

Set up Go, configuration, PostgreSQL, migrations, request validation, structured logging, health checks, error handling and CI.

- Establish a versioned `/api/v1` REST API.
- Add request IDs and consistent error responses.
- Configure secrets through environment variables.
- Add integration tests and a repeatable local development setup.

Deliverable: a deployable backend skeleton with a working database connection.

## 02

### Accounts and data migration

Introduce optional sign-in, user profiles, secure sessions and server-side persistence.

Migrate the existing browser data into the new schema without losing study history. Provide an import/export or recovery path before changing how existing users save their work.

Deliverable: a student can use 99ile on a second device and see their existing preparation data.

## 03

### Learning engine

Move persistence and important domain operations into Go: attempts, error records, redo scheduling, study plans, mock results and progress summaries.

- Keep the existing TypeScript behaviour as a reference during migration.
- Define one consistent source of truth for scores and attempt history.
- Make attempt submissions safe against accidental duplicate requests.
- Test that the new backend produces the same results as the current app.

Deliverable: the core product works through the backend without losing existing features.

## 04

### Insights and auditability

Add a reliable event history, explainable recommendations, weekly summaries and a service that turns student performance into next-step suggestions.

Deliverable: the system can explain what changed, why it recommended something and whether the student improved afterwards.

## 05

### AI layer

Integrate an LLM provider behind a Go interface. Start with error explanations and weekly progress narratives, then personalised planning and validated practice generation.

Deliverable: AI uses the student's permitted learning history, returns structured results and does not become a dependency for normal practice.

## 3. What should the database look like?

I'd start with a small, relational schema in PostgreSQL. Avoid creating a table for every screen or feature.

| Table                             | Purpose                                               |
| --------------------------------- | ----------------------------------------------------- |
| `users`                           | Identity and account preferences                      |
| `study_profiles`                  | Target exam, target score and preparation preferences |
| `questions` / `question_versions` | Practice content and versioned answer keys            |
| `attempts`                        | Answer, result, time spent and question version       |
| `error_entries`                   | Mistake classification, explanation and correction    |
| `study_plans` / `plan_items`      | Planned activities and completion state               |
| `review_items`                    | Due dates and spaced-repetition state                 |
| `mock_attempts`                   | Mock and sectional performance                        |
| `recommendations`                 | Suggested action, evidence and outcome                |
| `audit_events`                    | Important changes and their provenance                |

These are starting entities, not a requirement to create all ten tables on day one. Build them incrementally as each workflow moves to the backend.

I'd also make two decisions early:

- Content versus user data: Keep CAT question content and its versions separate from students' attempts. A change to a question must not silently change the meaning of a historical attempt.
- Events versus current state: Keep convenient current-state tables for fast reads, and record important historical events where you need traceability. Don't rebuild the entire database from events unless there's a compelling reason.

For Go, the standard library's `net/http` is sufficient to start; `chi` is a reasonable routing choice if you prefer explicit middleware and route groups. Use `pgx` for PostgreSQL access and a migration tool such as `golang-migrate` or `goose`. Pick one migration tool, not both.

## 4. The most important architectural decision: local-first or server-first?

Because 99ile currently works in the browser and supports offline use, don't accidentally remove that advantage while introducing Go.

I'd use a server-backed, offline-capable architecture.

- The frontend remains usable for offline reading and practice where the content is cached.
- Local storage temporarily records pending attempts when the network is unavailable.
- A sync process uploads those attempts when connectivity returns.
- The backend validates and persists them, using stable IDs and idempotency to prevent duplicates.
- The UI shows sync status and resolves conflicts explicitly rather than silently overwriting data.

For the first backend release, you can simplify this: make online writes server-authoritative, preserve local data export, and introduce offline write synchronization as a separate milestone. You don't need a complex sync engine on day one.

## 5. What I'd do with AI after the backend

The backend unlocks more than just accounts. It gives you a controlled place to manage AI calls, protect credentials, track costs, version prompts and evaluate outputs.

I'd create an internal interface along these lines:

```
type StudyCoach interface {
    ExplainMistake(ctx context.Context, input MistakeContext) (Explanation, error)
    ReviewProgress(ctx context.Context, input ProgressContext) (ProgressInsight, error)
    RecommendNextStep(ctx context.Context, input StudyContext) (Recommendation, error)
}
```

The concrete types would contain only the relevant, permitted student data. The implementation could call an external LLM or a local model, without coupling your core learning logic to a particular provider.

A few rules I'd enforce:

- The backend calculates scores, accuracy and scheduling deterministically.
- The model interprets evidence and proposes actions.
- Model outputs are schema-validated before being displayed or saved.
- Recommendations store their supporting evidence and model/prompt version.
- Students can dismiss or correct a recommendation.
- AI failures never prevent students from practising or accessing their history.

You don't need Redis, Kafka, Temporal or a fleet of AI microservices immediately. PostgreSQL and a single Go service are enough for the initial system. Add a background worker or queue when real workloads justify asynchronous processing.

## 6. Your next steps, in order

## 99ile implementation checklist

0 of 8

Finish the homepage redesign

Keep the current core product usable while the visual redesign progresses.

Audit the current frontend domain logic

Map storage, attempts, error logs, redo queues, plans and report calculations.

Define the Go API and database schema

Design the first user, attempt and learning-history workflows.

Build the backend foundation

PostgreSQL, migrations, validation, tests, logging and deployment.

Migrate one complete vertical slice

For example: submit an RC attempt → save it → update progress → retrieve the report.

Migrate the remaining features

Move each workflow gradually and verify parity with existing behaviour.

Add audit history and recommendations

Track meaningful changes and explain the resulting study actions.

Introduce AI behind a provider interface

Start with mistake explanations and progress reviews.

&#x20; Copy checklist

My strongest recommendation is to make your first end-to-end backend milestone one RC attempt flowing through the entire system. Submit it, persist it, record the error if necessary, schedule a review, and retrieve updated progress. That single workflow will validate your API design, database model, domain logic, frontend integration and testing strategy.

Once that foundation works, expanding to the other practice types becomes much more straightforward.

The goal isn't to make 99ile more complicated. It's to make the complexity you've already built work together behind a simpler, smarter student experience.

Yes, you've identified the key architectural decision for 99ile: how can a student move their progress between devices without creating an account?

Your current export/import feature is already one solution. But there are other options, each with a trade-off.

## Three approaches for 99ile

1\. Export/import backup — what you have now

Progress lives in the browser. Students export a file on their phone and import it on their laptop.

No account needed

Downside: manual, and progress created afterward won't automatically sync.

2\. Anonymous cloud identity — my recommendation

On first use, 99ile creates a random anonymous user ID and credential. The backend stores that student's progress in PostgreSQL without asking for a name, email, or password.

No signup required

Downside: the anonymous identity must be transferred securely to the other device. If the credential is lost, recovery may be impossible.

3\. Account-based sync

Sign in with Google or email, and 99ile links progress to a recoverable account across devices.

Best for recovery

Downside: more onboarding friction and account-management work.

## How anonymous sync could work

Phone

Local progress + anonymous credential

Go REST API

Authenticate device, sync changes, resolve conflicts

PostgreSQL

Attempts · Error log · Plans · Redo queue · Progress

Laptop

Same anonymous identity, same learning history

The catch is important: a random ID alone is not secure authentication. Use a revocable secret or device credential, store it securely, and never expose it in a public URL. On a second device, you need a way to transfer or link the identity.

Possible linking methods:

- QR code: display a short-lived QR code on one device and scan it on the other.
- Recovery code: let the student securely save a code and enter it on another device.
- Account upgrade: allow the student to attach Google/email login later, preserving their existing progress.

## What I'd build for 99ile

1. Now: Keep local-first practice and export/import. Students should never lose their progress just because the network is unavailable.
2. Backend foundation: Add anonymous identities and cloud sync through Go + PostgreSQL.
3. Device linking: Add QR or recovery-code transfer.
4. Later: Add optional account registration and link it to the anonymous profile.
5. Eventually: Add reliable offline sync with stable event IDs, retries, and conflict handling.

One implementation detail: don't simply overwrite the entire cloud state with whichever device syncs last. Store attempts as individual records, make writes idempotent, and define merge rules for editable settings and study plans. This avoids losing learning history when a phone and laptop have both been used offline.

My product recommendation: Let students start instantly as guests, offer cloud sync without mandatory signup, and ask them to create an account only when they want easier recovery or account-based features. That preserves 99ile's low-friction experience without locking you into a local-only architecture.