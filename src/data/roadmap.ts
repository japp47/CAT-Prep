export interface RoadItem { title: string; text: string }
export interface RoadGroup { title: string; status: string; items: RoadItem[] }

export const ROADMAP: RoadGroup[] = [
  { title: "Next up", status: "In progress", items: [
    { title: "DILR section", text: "Concepts, set types, question banks, past paper sets, videos and a phase plan with its own time settings." },
    { title: "Quant section", text: "Topic-wise plan for arithmetic, algebra, geometry, numbers and modern maths, with formula sheets and question banks." },
    { title: "One daily budget across sections", text: "Say \"I have 2 hours today\" and the planner splits it across VARC, DILR and Quant, giving more time to your weakest section." },
  ] },
  { title: "Planned", status: "Planned", items: [
    { title: "Accounts and sync", text: "Optional sign-in so your plan, logs and flashcards follow you across phone and laptop." },
    { title: "Install as an app and work offline", text: "Add to home screen, open without internet, and get a daily study reminder." },
    { title: "Calendar export", text: "Send your timetable to Google Calendar or Apple Calendar." },
    { title: "Percentile estimator", text: "Turn a mock score into an estimated percentile using past years' score tables." },
    { title: "B-school shortlist calculator", text: "Estimate your composite score for each IIM using its published formula: academics, work experience and CAT score." },
    { title: "Timed VARC sectional", text: "A full 40-minute VARC section on a CAT-style screen: four RCs and eight VA questions, built from the practice library." },
    { title: "Report card", text: "Accuracy by RC question type, genre and difficulty, reading pace over time, and the traps that cost you most." },
  ] },
  { title: "Later", status: "Ideas", items: [
    { title: "WAT and PI preparation", text: "Essay prompts, a current affairs digest, and an interview question bank by background." },
    { title: "Exam calendar with deadlines", text: "Every MBA exam's registration and test dates in one place, with reminders." },
    { title: "Community", text: "Study groups, accountability partners, streaks and a doubt forum." },
    { title: "Story submissions", text: "A form for toppers and converts to share their preparation and interview stories." },
    { title: "Updates without code", text: "A simple editor so moderators can post updates and add resources without touching the code." },
  ] },
];
