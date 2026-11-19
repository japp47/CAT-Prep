import type { SectionId } from "../sections/types";

/**
 * A plan that fits you, part 1 (F82, D116; docs/design/personal-plan.md): four answers become each live section's
 * usual minutes and the first step. Rules only, each with a test (`fit.test.ts`); research in
 * docs/research/personal-plan.md. No answer reaches this file without the student choosing "Use this plan": skipping
 * the setup keeps the standard plan exactly.
 */

export type Work = "studying" | "working" | "both";
/** Where the student stands: just starting, prepared before, taken CAT before, or not sure. */
export type Stand = "new" | "some" | "repeat" | "unsure";

export interface Answers {
  work: Work;
  /** Minutes a weekday and a weekend day, across the live sections. */
  wd: number;
  we: number;
  stand: Stand;
  /** The section that feels hardest, or null for "not sure". */
  weak: SectionId | null;
}

/** Modest starts, more one tap away (research findings 2 and 5): Duolingo's high goals lost people; toppers' hours are where students end up. */
export const TIME_BY_WORK: Record<Work, { wd: number; we: number }> = {
  studying: { wd: 60, we: 120 },
  working: { wd: 45, we: 120 },
  both: { wd: 30, we: 90 },
};
export const WD_CHOICES = [30, 45, 60, 90, 120];
export const WE_CHOICES = [60, 90, 120, 180, 240, 300];

/** Each section's share before the hardest one is weighted: today's plan gives VARC two parts to DILR's one. */
const WEIGHT: Record<SectionId, number> = { varc: 2, dilr: 1, quant: 2 };
/** Points of the day moved to the hardest section; more for a repeater, who knows where the marks went (finding 6). */
const BOOST = { usual: 0.1, repeat: 0.15 };
/** Every live section keeps at least this much, so none is starved (sectional cut-offs, finding 6). */
export const FLOOR = { wd: 15, we: 30 };

const round5 = (n: number) => Math.round(n / 5) * 5;

/**
 * The day's minutes split across the live sections: weighted, the hardest section boosted, every section at least the
 * floor, multiples of five that add up to the total exactly (the rounding goes to the largest share).
 */
export function split(total: number, live: SectionId[], weak: SectionId | null, repeat: boolean, floor: number): Record<SectionId, number> {
  const out = {} as Record<SectionId, number>;
  if (!live.length) return out;
  if (live.length === 1) { out[live[0]] = total; return out; }
  const sum = live.reduce((s, id) => s + WEIGHT[id], 0);
  const share = Object.fromEntries(live.map((id) => [id, WEIGHT[id] / sum])) as Record<SectionId, number>;
  if (weak && live.includes(weak)) {
    const before = share[weak], after = Math.min(0.9, before + (repeat ? BOOST.repeat : BOOST.usual));
    for (const id of live) share[id] = id === weak ? after : (share[id] * (1 - after)) / (1 - before);
  }
  // Too little time for every floor: an even split is the fairest thing left.
  if (total < floor * live.length) {
    const each = round5(total / live.length);
    live.forEach((id) => { out[id] = each; });
  } else {
    live.forEach((id) => { out[id] = Math.max(floor, round5(total * share[id])); });
  }
  // Add up exactly: the difference goes to (or comes from) the largest share, never below the floor.
  const byShare = [...live].sort((a, b) => out[b] - out[a]);
  let diff = total - live.reduce((s, id) => s + out[id], 0);
  for (const id of byShare) {
    if (!diff) break;
    const room = diff > 0 ? diff : Math.max(diff, Math.min(0, floor - out[id]));
    out[id] += room;
    diff -= room;
  }
  return out;
}

/** What the student does first (finding 7): a repeater starts from evidence, a newcomer from the method. */
export interface FirstStep { kind: "guide" | "today" | "sectional"; label: string; to: string }
export function firstStep(stand: Stand): FirstStep {
  if (stand === "repeat") return { kind: "sectional", label: "A timed VARC sectional, to see where you stand", to: "/practice/sectional" };
  if (stand === "some") return { kind: "today", label: "Today's plan, as it is", to: "/today" };
  return { kind: "guide", label: "The Start here guide, then today's plan", to: "/guides/start-here" };
}

export interface FittedPlan {
  minutes: Record<SectionId, { wd: number; we: number }>;
  first: FirstStep;
}

/** The plan the answers make for the live sections. */
export function fitPlan(a: Answers, live: SectionId[]): FittedPlan {
  const repeat = a.stand === "repeat";
  const wd = split(a.wd, live, a.weak, repeat, FLOOR.wd), we = split(a.we, live, a.weak, repeat, FLOOR.we);
  const minutes = Object.fromEntries(live.map((id) => [id, { wd: wd[id], we: we[id] }])) as Record<SectionId, { wd: number; we: number }>;
  return { minutes, first: firstStep(a.stand) };
}

const WORK_WORDS: Record<Work, string> = { studying: "Studying", working: "Working", both: "Studying and working" };
/** The one line that says why the plan looks as it does: "Working, DILR feels hardest". */
export function why(work: Work | undefined, weak: string | null | undefined): string {
  const parts = [work ? WORK_WORDS[work] : null, weak ? `${weak} feels hardest` : null].filter(Boolean);
  return parts.join(", ");
}
