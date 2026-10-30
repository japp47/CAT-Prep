import { PHASES, START_ISO } from "../data/exam";
import { addDays, dow, isWeekend, shortDate } from "../lib/date";
import type { AppState } from "../lib/state";
import type { Block, DayTemplate, PlanCtx, SectionDef } from "../sections/types";

export interface PlacedBlock extends Block {
  /** Key in DayRec.done, "section:block" */
  key: string;
  mins: number;
  carryFrom?: string;
}

export const doneKey = (sec: SectionDef, id: string) => sec.id + ":" + id;
const ctxOf = (st: AppState): PlanCtx => ({ ticks: st.ticks, mocks: st.mocks });

/** Before a section joined the timetable (`liveSince`) it has no blocks and no time, so nothing is owed (D56). */
const notYet = (sec: SectionDef, d: string) => !!sec.liveSince && d < sec.liveSince;

export function templateFor(sec: SectionDef, st: AppState, d: string): DayTemplate {
  return sec.template && !notYet(sec, d) ? sec.template(d, ctxOf(st)) : { base: [], extra: [] };
}

/** The section's usual minutes for this date, before any one-day change. */
export function defaultMin(sec: SectionDef, st: AppState, d: string): number {
  const s = st.settings[sec.id];
  const o = s.dow[dow(d)];
  return typeof o === "number" ? o : isWeekend(d) ? s.we : s.wd;
}
export function budgetFor(sec: SectionDef, st: AppState, d: string): number {
  if (notYet(sec, d)) return 0;
  const v = st.days[d]?.min?.[sec.id];
  return typeof v === "number" ? v : defaultMin(sec, st, d);
}
export function coreOf(sec: SectionDef, st: AppState, d: string): Block | null {
  return templateFor(sec, st, d).base.find((b) => b.pri === 1) ?? null;
}

/** The most recent core task from the last 7 days that had time planned but was not done. */
export function carryInfo(sec: SectionDef, st: AppState, today: string): { date: string; block: Block } | null {
  const from = st.since > START_ISO ? st.since : START_ISO;
  for (let i = 1; i <= 7; i++) {
    const d = addDays(today, -i);
    if (d < from) break;
    const rec = st.days[d] ?? {};
    const core = coreOf(sec, st, d);
    if (!core) continue;
    if (rec.carried?.[sec.id] || rec.dismiss?.[sec.id]) continue;
    if (budgetFor(sec, st, d) < core.mm) continue;
    if (rec.done?.[doneKey(sec, core.id)]) continue;
    return { date: d, block: core };
  }
  return null;
}

/**
 * Fits the day's blocks into the budget.
 * Pass 1 places each block at its minimum, in priority order. Pass 2 tops blocks up to their usual length, core first.
 * Leftover time adds extra blocks, and anything still left goes to reading.
 */
export function buildDay(sec: SectionDef, st: AppState, d: string, budget: number, opts: { today: string; noCarry?: boolean }): PlacedBlock[] {
  if (budget <= 0) return [];
  const t = templateFor(sec, st, d);
  const base: (Block & { carryFrom?: string })[] = [...t.base].sort((a, b) => a.pri - b.pri);
  const carry = !opts.noCarry && d === opts.today ? carryInfo(sec, st, opts.today) : null;
  if (carry) {
    base.splice(1, 0, {
      ...carry.block, id: "carry", carryFrom: carry.date, pri: 1.5, ord: 1.5,
      name: "Catch up: " + carry.block.name, desc: "Missed on " + shortDate(carry.date) + ". " + carry.block.desc,
    });
  }
  const out: PlacedBlock[] = [];
  let rem = budget;
  const place = (b: Block, m: number, pri = b.pri) => out.push({ ...b, pri, key: doneKey(sec, b.id), mins: m });
  base.forEach((b) => { if (b.mm <= rem) { place(b, b.mm); rem -= b.mm; } });
  out.forEach((b) => { const add = Math.min(b.m - b.mins, rem); if (add > 0) { b.mins += add; rem -= add; } });
  if (!out.length && base.length) { place(base[0], budget); rem = 0; }
  t.extra.forEach((b) => { if (rem >= b.mm) { const m = Math.min(b.m, rem); place(b, m, 9); rem -= m; } });
  if (rem > 0 && out.length) (out.find((b) => b.id === "read") ?? out[out.length - 1]).mins += rem;
  return out.sort((a, b) => a.ord - b.ord);
}

/**
 * Ticks a block as done. Its minutes are the focus-timer time if there is any, else the planned length.
 * Finishing a catch-up block also marks the missed day as caught up.
 */
export function markBlockDone(st: AppState, d: string, secId: SectionDef["id"], key: string, planned: number, carryFrom?: string): void {
  const rec = (st.days[d] ??= {});
  (rec.done ??= {})[key] = rec.spent?.[key] || planned;
  if (carryFrom) ((st.days[carryFrom] ??= {}).carried ??= {})[secId] = 1;
}

export function doneMinutes(st: AppState, d: string, sec?: SectionDef): number {
  const m = st.days[d]?.done ?? {};
  return Object.keys(m).filter((k) => !sec || k.startsWith(sec.id + ":")).reduce((s, k) => s + m[k], 0);
}

/** A date inside the phase to preview a typical weekday or Saturday. */
export function sampleDate(phaseId: number, weekend: boolean, today: string): string {
  const p = PHASES.find((x) => x.id === phaseId)!;
  const start = p.start > today ? p.start : today <= p.end ? today : p.start;
  for (let i = 0; i < 14; i++) {
    const x = addDays(start, i);
    if (x > p.end) break;
    const g = dow(x);
    if (weekend ? g === 6 : g >= 1 && g <= 5) return x;
  }
  return p.start;
}
