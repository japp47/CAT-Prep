import { API_ENABLED, SIGNIN_ENABLED } from "../lib/api";

export interface RoadItem { title: string; text: string }
export interface RoadGroup { title: string; status: string; items: RoadItem[] }

/**
 * Mirrors the order and dates in docs/plan.md. When a feature ships, move its item up a group and move UPDATED to that
 * day (the page shows it); docs/implement.md's done list asks for this on every feature branch.
 */
export const UPDATED = "2026-11-05";

export const ROADMAP: RoadGroup[] = [
  { title: "New this month", status: "Live", items: [
    { title: "DILR: logical reasoning", text: "47 original sets in 13 types, from arrangements and tournaments to routes and Venn diagrams, each with a timer, a scratch pad, a solution drawn step by step and a two-minute post-mortem. Drills for reading a clue exactly, telling must from could, and choosing where to start, and DILR replay to watch each deduction narrow the answers." },
    { title: "DILR: data interpretation", text: "Chart and table sets at CAT level, drawn from their numbers the way the exam draws them, with CAT's calculator in the player and every answer checked in code. Four are built on real data: GDP and growth, India's trade, the 2025 monsoon and power capacity. From week 4 of Foundation, Today gives a DI set of the day, and Progress shows DI by picture and by question kind: reading, percentages, growth and ranges." },
    { title: "Study reminders", text: "Pick a time and get a nudge, by notification or email, only on days you haven't practised yet. One a day at most, quiet hours, a week's pause, and an email if you miss two days. Turn them on in Settings, or after you finish a set." },
    { title: "Set Selection Arena", text: "Five sets you have not seen and 40 minutes, as in the exam. Read them, pick where to start, solve, then see where the minutes went and whether your picks paid off. Analyse a round like a sectional: why each answer went wrong and what to fix, with the score counted on Progress." },
    { title: "Fairer timing", text: "Back in a set after more than half an hour, you choose: start fresh for an honest time, or carry on with your answers counted and that set's time left out. In the Arena, start solving with one tap; planning the whole order is optional." },
    { title: "Progress with a skill map", text: "One tile per skill, from RC question kinds to LR set types, each saying not started, learning, weak, steady or strong only once there are enough answers to judge, with the one to start with marked." },
    { title: "The DILR page", text: "How the section works, recent slots set by set, a guide for each LR set type and each DI picture, and past CAT DI sets in the order to try them." },
  ] },
  { title: "Live", status: "Live", items: [
    { title: "RC and VA practice", text: "Exam-style RC sets with every option explained, an RC of the day, and a daily VA drill with all four CAT types: para summary, sentence insertion, odd sentence out and para jumbles." },
    { title: "Redo queue", text: "Questions you miss come back after 1, 3 and 7 days, until you get them right three times in a row." },
    { title: "Timed VARC sectional", text: "A full 40-minute VARC section on a CAT-style screen: four RCs and eight VA questions, built from the practice library." },
    { title: "Critical reasoning drill", text: "30 original questions in the six types XAT asks: assumption, strengthen, weaken, inference, flaw and paradox. Every option shows the trap it sets." },
    { title: "Report card and percentile estimator", text: "Accuracy by question type, genre and difficulty, reading pace over time and the traps that cost you most; set a target percentile and turn any score into an estimated percentile." },
    { title: "Mock analysis and weekly review", text: "A guided 15-minute review after any mock, and each weekend what improved, what slipped and one focus for next week." },
    { title: "Learning from mistakes", text: "One next step at the top of Today, patterns in your misses, and a “Not sure” button so lucky guesses come back for a second look." },
    { title: "Focus timer, offline and install", text: "A timer on any timetable block, the whole site without internet, and a daily reminder in your calendar." },
    // Sync and Google sign-in show as live only in builds where they are switched on (VITE_API_ENABLED,
    // VITE_GOOGLE_SIGNIN), and as "next" until then.
    ...(API_ENABLED ? [{ title: "Sync between devices", text: "Keep your progress the same on your phone and laptop without signing up: link a device by scanning a code, get everything back with a recovery code, and download or delete what the server has at any time." }] : []),
    ...(SIGNIN_ENABLED ? [{ title: "Optional Google sign-in", text: "Keep using 99ile without an account, or sign in with Google so your synced progress is tied to your account instead of a recovery code." }] : []),
  ] },
  { title: "Next up", status: "November to December", items: [
    { title: "More DI sets, harder", text: "More chart and table sets through December, harder than the first ones, with more growth and projection questions." },
    { title: "AI feedback", text: "Feedback on your own para summaries, and a plain explanation of why the option you chose was wrong." },
    ...(!API_ENABLED ? [{ title: "Sync between devices", text: "Keep your plan and logs the same on your phone and laptop, without signing up: link a device with a code." }]
      : !SIGNIN_ENABLED ? [{ title: "Optional Google sign-in", text: "Keep using 99ile without an account, or sign in with Google so your synced progress is tied to your account instead of a recovery code." }] : []),
  ] },
  { title: "Planned", status: "January to March 2027", items: [
    { title: "A plan that fits you", text: "Answer a few questions and the plan sets your time and section split; a home that picks up where you left off, a restart plan after a break and a short daily puzzle." },
    { title: "One daily budget across sections", text: "Say \"I have 2 hours today\" and the planner splits it across VARC, DILR and Quant, giving more time to your weakest section." },
    { title: "Quant section", text: "A topic-wise plan for arithmetic, algebra, geometry, numbers and modern maths, with a player that asks for an estimate first and shows why a method fits." },
    { title: "Flashcards and calendar export", text: "Every Error log entry becomes a card that comes back on a schedule, and your whole timetable in Google or Apple Calendar." },
  ] },
  { title: "Later", status: "From April 2027", items: [
    { title: "Study groups and a doubt forum", text: "Small groups that keep each other going, and a place to ask about a question, with moderation from the start." },
    { title: "Article to RC", text: "Turn an article you are reading into a CAT-style RC set, and a weekly note on how your preparation is going." },
    { title: "Past-paper catalogue", text: "Every CAT RC and VA set from 2021 to 2025 by topic and question type, with links to free legitimate solutions." },
    { title: "After the exam", text: "A B-school shortlist calculator from each IIM's published formula, an exam calendar with deadlines, and WAT and PI preparation." },
    { title: "Explanations in Hindi", text: "For students more comfortable reading explanations in Hindi, when there is help to write them well." },
  ] },
];
