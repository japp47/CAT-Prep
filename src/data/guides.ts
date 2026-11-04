export interface GuidePart { h: string; p?: string[]; ul?: string[]; ol?: string[] }
export interface Guide {
  id: string;
  title: string;
  summary: string;
  tag: "Start" | "Strategy" | "Mocks" | "Life" | "Admissions";
  minutes: number;
  parts: GuidePart[];
}

/** The day every guide was last read through against the site and the exam (the Guides page shows it). */
export const REVIEWED = "2026-11-04";

export const GUIDES: Guide[] = [
  {
    id: "start-here", tag: "Start", minutes: 4,
    title: "Start here: a year to CAT 2027",
    summary: "What the next 13 months look like, and how to use this site day to day.",
    parts: [
      { h: "The shape of the year", ol: [
        "Foundation, to 31 January. Build a reading habit, learn every question type untimed, learn word roots.",
        "Build, February to May. Daily drills by question type, and a timed past paper every two weeks.",
        "Apply, June to August. Harder passages from XAT, LSAT and GMAT, a timed paper every week, and pick a mock series.",
        "Mock phase, September to mid-November. Mocks and real past papers every weekend, full analysis, short sets on weekdays.",
        "Taper, the last ten days. Light practice and error log revision.",
      ] },
      { h: "How to use the site", ul: [
        "Open Today each day. It builds a timetable from your phase and the time you have.",
        "Set your usual time per section in Plan. The defaults are 1 hour on weekdays and 2 hours on Saturday and Sunday.",
        "Busy day? Tap a smaller time on Today and the plan shrinks to the most important blocks. Free evening? Tap a bigger one and extra blocks appear.",
        "Tick blocks as you finish. A missed core task comes back the next day as a catch-up.",
        "Sets you solve on this site log themselves. Log mocks and sets done elsewhere in Progress, and every mistake in the Error log. Those two pages tell you what to fix.",
      ] },
      { h: "DILR on this site", ul: [
        "Logical reasoning first: Today gives an LR set of the day, type by type, with a short drill.",
        "Data interpretation from week 4 of Foundation: a DI set of the day beside it, with CAT's calculator in the player.",
        "Set Selection Arena: five sets and 40 minutes, where you practise choosing which sets to solve, the skill that decides a DILR score.",
      ] },
      { h: "Your data", p: ["Everything you enter stays in this browser unless you switch on sync. Settings keeps a backup and links your phone and laptop so they stay in step."] },
    ],
  },
  {
    id: "working", tag: "Life", minutes: 4,
    title: "Preparing while working or in college",
    summary: "How to fit CAT around a job or classes without burning out.",
    parts: [
      { h: "Protect a fixed slot", p: ["Pick the same hour every weekday, ideally before work or classes. Consistency beats long weekend marathons. Six one-hour days are worth more than one six-hour Sunday."] },
      { h: "Plan for bad weeks", ul: [
        "On Today, drop a day to 30 or 45 minutes instead of skipping it. The planner keeps the core task and drops the rest.",
        "For a week of exams or a work deadline, use Plan, Set time for a date range, to lower every day at once.",
        "Make up lost time at the weekend by raising Saturday or Sunday for that week only.",
      ] },
      { h: "Use dead time", ul: ["Read an article on the commute.", "Review flashcards in queues.", "Keep heavy work, such as timed papers and analysis, for the days you can sit for 90 minutes without interruptions."] },
      { h: "Work experience counts", p: ["Many IIMs give marks for work experience in their shortlisting formula. Keep doing good work. It helps your interview story too."] },
    ],
  },
  {
    id: "mock-analysis", tag: "Mocks", minutes: 5,
    title: "How to analyse a mock",
    summary: "The analysis is where the marks come from. Spend 1.5 to 2 times the test time on it.",
    parts: [
      { h: "Same day", ol: [
        "Log the score in Progress before you look at solutions.",
        "Re-attempt every question you skipped, untimed. If you now get it right, you have a selection problem, not a knowledge problem.",
        "For every wrong answer, read the solution and write an error log entry: question type, trap and the right reasoning.",
        "Check questions you got right by luck. Treat them as wrong.",
      ] },
      { h: "Look for patterns", ul: [
        "The Error log shows your weakest question types and traps. Fix the top one first.",
        "Time spent per question: did one RC or one DILR set eat 15 minutes?",
        "Attempt order: did starting with a hard passage cost you easy questions later?",
      ] },
      { h: "Before the next mock", p: ["Pick one change to try, such as reading the RC questions only after the passage, or leaving a set after 4 minutes with no progress. Test one change at a time."] },
    ],
  },
  {
    id: "choose-mocks", tag: "Mocks", minutes: 3,
    title: "Choosing a mock series",
    summary: "One good series with a large test pool is enough.",
    parts: [
      { h: "What matters", ul: [
        "A large number of test takers, so your percentile means something.",
        "Difficulty close to recent CAT papers, not much harder.",
        "Good solutions and analysis, ideally with time per question.",
      ] },
      { h: "Free first", p: ["Cracku and Career Launcher give several free full mocks. Take one free mock from two or three providers in July or August, then buy one series if you need more."] },
      { h: "How many", p: ["20 to 30 full mocks is typical for 99 percentile scorers, most of them from September. Ten well-analysed mocks beat thirty rushed ones."] },
    ],
  },
  {
    id: "after-cat", tag: "Admissions", minutes: 5,
    title: "After the score: shortlists, WAT and PI",
    summary: "Your percentile gets you a shortlist. The rest of the profile decides the final call.",
    parts: [
      { h: "How shortlisting works", ul: [
        "Most IIMs combine the CAT score with marks from class 10, class 12 and graduation, work experience and diversity factors such as gender and academic background.",
        "Each IIM publishes its admission policy. Read the policy of every school you want, because the weights differ a lot.",
        "Section-wise cutoffs apply, so a very weak section can block a call even with a high overall percentile.",
      ] },
      { h: "Timeline", ul: [
        "Results usually come out in the first week of January.",
        "Interview calls arrive from January to March.",
        "Written ability tests and interviews run from February to April.",
      ] },
      { h: "Start early", ul: [
        "Keep a running list of your achievements, projects and responsibilities from now on.",
        "Read the news for 15 minutes a day from September. Interviews often ask about current affairs and your field of work or study.",
        "Practice writing a 300-word essay in 20 minutes once a week from December.",
      ] },
    ],
  },
  {
    id: "habits", tag: "Life", minutes: 3,
    title: "Staying consistent for a year",
    summary: "A plan only works if you keep showing up.",
    parts: [
      { h: "Small and steady", ul: [
        "Never skip two days in a row. A 20-minute day still counts.",
        "Keep one full rest day a week if you need it. Set it to Rest on Today and the core task moves to the next day.",
        "Track minutes, not just marks. The weekly bar on Today shows whether you are keeping up.",
      ] },
      { h: "When scores drop", p: ["Mock scores go up and down by 10 to 15 percentile points even for toppers. Judge your trend over five mocks, not one. If the trend is flat, look at your error log, not your number of hours."] },
      { h: "Look after yourself", p: ["Sleep, food and some exercise matter more than one extra hour of practice. In the last month, sleep at the hours that match your exam slot."] },
    ],
  },
  {
    id: "last-25-days", tag: "Strategy", minutes: 4,
    title: "The last 25 days before CAT 2026",
    summary: "For students sitting CAT on 29 November 2026: mocks, analysis and rest, with no new topics.",
    parts: [
      { h: "The one rule", p: ["Nothing new now. A new topic in the last month costs more confidence than it gains marks. Every hour goes to mocks, their analysis and your own mistakes."] },
      { h: "Week by week", ol: [
        "4 to 15 November: three full mocks a week on the real interface, each analysed the next day. Take the official mock as soon as it is up on iimcat.ac.in. Keep at most three fixes from each mock.",
        "16 to 24 November: two mocks a week, at your slot's time once the admit card shows it. Sectionals only for your weakest section. Read your Error log every day.",
        "25 to 28 November: your last full mock on 25 or 26 November. Then short sets, the Error log and formula notes. Print the admit card, check the route to the centre, and sleep at the hours your slot needs.",
        "29 November: the Exam day checklist, the next guide.",
      ] },
      { h: "Section by section", ul: [
        "VARC: read the passage before the questions, and attempt the TITA para jumbles. Keep to the attempt order your mocks settled.",
        "DILR: spend the first three to five minutes reading all five sets, pick two or three, and leave a set after five to seven minutes with no way in. Two sets solved fully beats four half done.",
        "Quant: two rounds, easy questions first, and skip anything that has no first step in a minute. TITA answers have no negative marking.",
      ] },
      { h: "On this site", ul: [
        "Today's plan counts down to CAT 2027. For these 25 days use these instead: Analyse a mock in Progress after every mock, the VARC sectional, Set Selection Arena rounds for DILR picking, and the Error log.",
        "Log every mock in Progress so the percentile estimator and your report card follow your scores.",
      ] },
      { h: "Look after yourself", p: ["Sleep and routine matter more than one more mock. A bad mock in the last week says little about the exam; analyse it, keep one fix and move on."] },
    ],
  },
  {
    id: "exam-day", tag: "Strategy", minutes: 2,
    title: "Exam day checklist",
    summary: "Things to settle before you walk in.",
    parts: [
      { h: "The night before", ul: ["Print the admit card and keep a valid photo ID with it.", "Check the reporting time and route to the centre.", "No new material. Read your error log, then sleep."] },
      { h: "In the exam", ul: [
        "Each section is 40 minutes and you cannot switch between sections.",
        "Attempt TITA questions; they have no negative marking.",
        "In DILR, read all five sets in the first three to five minutes, then solve the two or three that look most direct. Leave a set after five to seven minutes with no way in.",
        "Follow the attempt order and time split you fixed in mocks.",
        "If a section feels hard, it probably feels hard for everyone. Percentiles are relative.",
      ] },
    ],
  },
];
