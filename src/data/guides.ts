export interface GuidePart { h: string; p?: string[]; ul?: string[]; ol?: string[] }
export interface Guide {
  id: string;
  title: string;
  summary: string;
  tag: "Start" | "Strategy" | "Mocks" | "Life" | "Admissions";
  minutes: number;
  parts: GuidePart[];
}

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
        "Log every timed set in Progress and every mistake in the Error log. Those two pages tell you what to fix.",
      ] },
      { h: "Your data", p: ["Everything you enter stays in this browser. Use Settings to download a backup and to move it to another device."] },
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
        "Practise writing a 300-word essay in 20 minutes once a week from December.",
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
    id: "exam-day", tag: "Strategy", minutes: 2,
    title: "Exam day checklist",
    summary: "Things to settle before you walk in.",
    parts: [
      { h: "The night before", ul: ["Print the admit card and keep a valid photo ID with it.", "Check the reporting time and route to the centre.", "No new material. Read your error log, then sleep."] },
      { h: "In the exam", ul: [
        "Each section is 40 minutes and you cannot switch between sections.",
        "Attempt TITA questions; they have no negative marking.",
        "Follow the attempt order and time split you fixed in mocks.",
        "If a section feels hard, it probably feels hard for everyone. Percentiles are relative.",
      ] },
    ],
  },
];
