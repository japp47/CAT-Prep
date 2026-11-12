import { TRAPS } from "../data/traps";
import { weekFacts } from "../practice/week";
import { SECTION_BY_ID } from "../sections";
import { api } from "./api";
import { weekStart } from "./date";
import { WEEKMAIL_SENT } from "./reminders";

export { WEEKMAIL_SENT };
import type { AppState } from "./state";

/**
 * The weekly review email's figures (F65 R2, D97, docs/design/notifications.md §15.1). The server keeps synced
 * records without reading them, so this browser, which already works out the week for /review, sends the same
 * figures while the weekly review is on: counts and percentages, and names only from the site's fixed lists (a
 * question type, a trap). Never an answer or anything the student typed. The server checks every field again
 * (server/internal/notify/week.go, WeekMail).
 */
export interface WeekMail {
  monday: string;
  studied: number;
  daysSoFar: number;
  questions: number;
  correct: number;
  acc: number | null;
  minutes: number;
  planned: number;
  light: boolean;
  improved: { name: string; before: number; after: number } | null;
  slipped: { name: string; before: number; after: number } | null;
  trap: { name: string; n: number } | null;
  redo: { cleared: number; due: number };
  focus: { name: string; n: number; acc: number | null } | null;
}

/** The weekly review's question types (VARC, as /review counts them) and the Error log's traps. */
const TYPES = new Set(SECTION_BY_ID.varc.practiceTypes);
const TRAP_NAMES = new Set(TRAPS);
const cap = (n: number, most: number) => Math.max(0, Math.min(most, Math.round(n)));

/** This week so far, as /review shows it. */
export function weekMail(st: AppState, today: string): WeekMail {
  const monday = weekStart(today);
  const f = weekFacts(st, monday, today);
  const move = (m: (typeof f.improved)[number] | undefined) => (m && TYPES.has(m.type) ? { name: m.type, before: m.before, after: m.after } : null);
  const lf = f.lastFocus;
  return {
    monday,
    studied: f.studied,
    daysSoFar: f.daysSoFar,
    questions: cap(f.questions.attempted, 5000),
    correct: cap(f.questions.correct, Math.min(5000, f.questions.attempted)),
    acc: f.questions.acc,
    minutes: cap(f.minutes.done, 7 * 24 * 60),
    planned: cap(f.minutes.planned, 7 * 24 * 60),
    light: f.light,
    improved: move(f.improved[0]),
    slipped: move(f.slipped[0]),
    trap: f.trap && TRAP_NAMES.has(f.trap.name) ? { name: f.trap.name, n: cap(f.trap.n, 5000) } : null,
    redo: { cleared: cap(f.redo.cleared, 5000), due: cap(f.redo.due, 5000) },
    focus: lf && lf.rec.skill.kind === "type" && TYPES.has(lf.rec.skill.key) ? { name: lf.rec.skill.key, n: cap(lf.attempted, 5000), acc: lf.acc } : null,
  };
}

/** Sends the week. Quietly does nothing useful offline or signed out: the next change tries again. */
export const sendWeek = (w: WeekMail) => api<null>("/notify/week", w, { method: "PUT" });
