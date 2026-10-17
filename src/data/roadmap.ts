export interface RoadItem { title: string; text: string }
export interface RoadGroup { title: string; status: string; items: RoadItem[] }

/** Mirrors the order in docs/plan.md. Move items up a group as they ship. */
export const ROADMAP: RoadGroup[] = [
  { title: "Just shipped", status: "Live", items: [
    { title: "RC and VA practice", text: "Exam-style RC sets with every option explained, an RC of the day, and a daily VA drill with all four CAT types: para summary, sentence insertion, odd sentence out and para jumbles." },
    { title: "Redo queue", text: "Questions you miss come back after 1, 3 and 7 days, until you get them right three times in a row." },
    { title: "Focus timer", text: "Start a timer on any timetable block. It keeps running while you Practice, suggests a break every 25 minutes, and logs the real minutes against the plan." },
    { title: "Install as an app and work offline", text: "Add the site to your home screen and open it without internet. A daily study reminder goes straight into Google, Apple or Outlook calendar." },
  ] },
  { title: "Next up", status: "In progress", items: [
    { title: "Timed VARC sectional", text: "A full 40-minute VARC section on a CAT-style screen: four RCs and eight VA questions, built from the practice library." },
    { title: "Report card", text: "Accuracy by RC question type, genre and difficulty, reading pace over time, and the traps that cost you most." },
    { title: "Percentile estimator", text: "Turn a score into an estimated percentile using past years' score tables, with an attempts and accuracy grid." },
    { title: "Mock analysis wizard", text: "A guided 20-minute review after any coaching mock: time per question, skipped versus wrong, and traps. The result shapes next week's plan." },
    { title: "Sunday review", text: "A short weekly report on what improved, your weakest area and what to focus on next. The plan updates itself." },
    { title: "Optional sign-in and sync", text: "Use the site as a guest as today, or sign in with email or Google so your plan and logs follow you across phone and laptop." },
    { title: "DILR section", text: "Concepts, set types, a set player with MCQ and TITA questions, past paper sets and a phase plan with its own time settings." },
    { title: "Quant section", text: "Topic-wise plan for arithmetic, algebra, geometry, numbers and modern maths, with formula sheets and timed drills." },
  ] },
  { title: "Planned", status: "Planned", items: [
    { title: "One daily budget across sections", text: "Say \"I have 2 hours today\" and the planner splits it across VARC, DILR and Quant, giving more time to your weakest section." },
    { title: "Flashcards from mistakes", text: "Every Error log entry becomes a card that comes back on a schedule, next to your word cards." },
    { title: "Working-professional mode", text: "A 30-minute weekday plan and a one-RC commute set for the phone." },
    { title: "AI practice tools", text: "Turn any article into a CAT-style RC set, get a plain explanation of why your option was wrong, and feedback on your own para summaries." },
    { title: "Past-paper catalogue", text: "Every CAT RC and VA set from 2021 to 2025 by topic and question type, with links to free legitimate solutions." },
    { title: "Daily leaderboard", text: "See how your RC of the day compares, for students who sign in." },
    { title: "Calendar export", text: "Send your whole timetable to Google Calendar or Apple Calendar." },
  ] },
  { title: "Later", status: "Ideas", items: [
    { title: "B-school shortlist calculator", text: "Estimate your composite score for each IIM using its published formula: academics, work experience and CAT score." },
    { title: "Exam calendar with deadlines", text: "Every MBA exam's registration and test dates in one place, with reminders." },
    { title: "WAT and PI preparation", text: "Essay prompts, a current affairs digest, and an interview question bank by background." },
    { title: "Explanations in Hindi", text: "For students more comfortable reading explanations in Hindi." },
    { title: "Community", text: "Study groups, accountability partners and a doubt forum." },
    { title: "Story submissions", text: "A form for toppers and converts to share their preparation and interview stories." },
  ] },
];
