import type { AppState } from "../lib/state";
import { buildDay, budgetFor } from "../planner/engine";
import { goFor } from "../planner/go";
import { LIVE_SECTIONS } from "../sections";
import { rcOfDay } from "./daily";
import { dueRedo } from "./redo";
import { focusToday } from "./week";

/**
 * The next step (docs/feature.md, F41): one thing to do now, with its time and reason. Ranked rules, first match wins;
 * the student can ask for "something else", which is the next rule that matches. One at a time, never a list
 * (docs/research/step-2g.md).
 */
export interface Step { key: string; title: string; mins: number; to: string; why: string }

/** Redo questions due before the queue becomes the next step. */
export const REDO_STEP = 5;

export function nextSteps(st: AppState, today: string, ctx: { sectionalMinsLeft?: number | null } = {}): Step[] {
  const out: Step[] = [];
  if (ctx.sectionalMinsLeft) {
    out.push({ key: "sectional", title: "Finish your sectional", mins: ctx.sectionalMinsLeft, to: "/practice/sectional", why: "It is in progress, and its 40-minute clock keeps running." });
  }
  const focus = focusToday(st, today);
  if (focus && !focus.doneToday) {
    out.push({ key: "focus", title: focus.rec.text, mins: 15, to: focus.rec.to ?? "/review", why: `This week's focus, from your weekly review. ${focus.left === 1 ? "One day left" : `${focus.left} days left`} this week.` });
  }
  const due = dueRedo(st.redo, today).length;
  if (due >= REDO_STEP) {
    const n = Math.min(due, 10);
    out.push({ key: "redo", title: `Redo ${n} questions you missed`, mins: Math.ceil(n * 1.5), to: "/practice/redo", why: `${due} are due today. Getting them right on a spaced schedule is what makes a fix stick.` });
  }
  const rc = rcOfDay(today);
  if (!st.rcAttempts.some((a) => a.set === rc.id && a.d === today)) {
    out.push({ key: "rc", title: `RC of the day: ${rc.title}`, mins: 7, to: `/practice/rc/${rc.id}`, why: "One passage a day keeps your reading in shape." });
  }
  if (!st.vaAttempts.some((a) => a.mode === "daily" && a.d === today)) {
    out.push({ key: "va", title: "Daily VA drill", mins: 12, to: "/practice/va", why: "Eight questions, two of each VA type." });
  }
  const done = st.days[today]?.done ?? {};
  LIVE_SECTIONS.forEach((sec) => {
    const core = buildDay(sec, st, today, budgetFor(sec, st, today), { today }).find((b) => b.pri === 1 && !done[b.key]);
    // The block's own practice when it has one on this site (D56), else its place in today's plan.
    if (core) out.push({ key: "core:" + core.key, title: core.name, mins: core.mins, to: goFor(core, st, today)?.to ?? `#plan-${sec.id}`, why: `The core block of today's ${sec.short} plan.` });
  });
  const mock = [...st.recs].reverse().find((r) => r.status === "open" && r.from === "mock" && r.to);
  if (mock) out.push({ key: "mock:" + mock.id, title: mock.text, mins: 15, to: mock.to!, why: "From your last mock review." });
  if (!out.length) out.push({ key: "done", title: "Today is done. If you have time, one RC from the library.", mins: 7, to: "/practice/library", why: "Everything planned for today is finished." });
  return out;
}
