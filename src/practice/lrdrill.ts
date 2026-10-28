import type { LrDrillRun } from "../lib/state";
import { absolute, binOf, CLUE_KIND, groupMap, kindOfClue, MISREAD, openCases, refsOf, seatings, settle, solve, type Bin, type ClueItem, type ClueKind, type Expr, type LrModel, type Misread, type Seating } from "./lrlogic";

/**
 * The three LR drills (F83 to F85, D47): what each run shows and how runs add up. The content is in content/lrdrill/
 * (docs/content/lr-drills.md) and loads with the drill pages only; the answers come from practice/lrlogic.ts.
 */

/** A must, could, cannot drill: a modelled set with some clues left out, and statements to sort. */
export interface MccDrill { id: string; set: string; drop: number[]; statements: { text: string; expr: Expr }[] }
export interface LrDrills { clues: ClueItem[]; models: LrModel[]; mcc: MccDrill[] }

export type DrillKind = LrDrillRun["kind"];
export const DRILL: Record<DrillKind, { h: string; path: string }> = {
  clue: { h: "Clue translator", path: "/practice/clues" },
  mcc: { h: "Must, could, cannot", path: "/practice/must-could" },
  first: { h: "First move", path: "/practice/first-move" },
};

/** Clues in a translator run. Eight take about three minutes. */
export const CLUE_RUN = 8;

/**
 * The clues for one run: never-seen clues first, then those last answered wrong, then the rest, oldest first. Kinds the
 * student misreads most come first among equals, and no kind takes more than two places, so a run covers four kinds or more.
 */
export function pickClues(items: ClueItem[], runs: LrDrillRun[], n = CLUE_RUN, rand: () => number = Math.random, only?: ClueKind): ClueItem[] {
  // A run on one kind (from Progress or a set's review) takes its clues from that kind alone.
  if (only) items = items.filter((c) => c.kind === only);
  const cap = only ? n : 2;
  const last = new Map<string, { ok: boolean; at: number }>();
  const miss = new Map<ClueKind, number>();
  const kindOf = new Map(items.map((c) => [c.id, c.kind]));
  runs.filter((r) => r.kind === "clue").forEach((r, ri) => r.items.forEach((x) => {
    last.set(x.k, { ok: x.ok, at: ri });
    const k = kindOf.get(x.k);
    if (k && !x.ok) miss.set(k, (miss.get(k) ?? 0) + 1);
  }));
  const tier = (c: ClueItem) => { const l = last.get(c.id); return !l ? 0 : !l.ok ? 1 : 2; };
  const scored = items.map((c) => ({ c, t: tier(c), at: last.get(c.id)?.at ?? -1, m: miss.get(c.kind) ?? 0, r: rand() }));
  scored.sort((a, b) => a.t - b.t || (a.t === 2 ? a.at - b.at : 0) || b.m - a.m || a.r - b.r);
  const out: ClueItem[] = [], per = new Map<ClueKind, number>();
  for (const s of scored) {
    if (out.length === n) break;
    if ((per.get(s.c.kind) ?? 0) >= cap) continue;
    out.push(s.c);
    per.set(s.c.kind, (per.get(s.c.kind) ?? 0) + 1);
  }
  return out;
}

/** How the student reads clues (F83, Progress): right and total per kind, weakest first, and each misreading's count, most first. */
export function clueReport(runs: LrDrillRun[]) {
  const kinds = new Map<ClueKind, { c: number; a: number }>();
  const slips = new Map<Misread, number>();
  runs.filter((r) => r.kind === "clue").forEach((r) => r.items.forEach((x) => {
    const k = kindOfClue(x.k);
    if (!k) return;
    const s = kinds.get(k) ?? { c: 0, a: 0 };
    s.a++;
    if (x.ok) s.c++;
    kinds.set(k, s);
    if (x.miss && x.miss in MISREAD) slips.set(x.miss as Misread, (slips.get(x.miss as Misread) ?? 0) + 1);
  }));
  return {
    kinds: [...kinds].map(([k, s]) => ({ kind: k, label: CLUE_KIND[k], ...s })).sort((a, b) => a.c / a.a - b.c / b.a || b.a - a.a),
    slips: [...slips].map(([how, n]) => ({ how, n })).sort((a, b) => b.n - a.n),
    answered: [...kinds.values()].reduce((s, x) => s + x.a, 0),
  };
}

/** The drill to do next of a kind: the first never done, else the one done longest ago. */
export function nextOf<T>(list: T[], idOf: (x: T) => string, runs: LrDrillRun[], kind: DrillKind): T | undefined {
  const at = new Map<string, number>();
  runs.forEach((r, i) => { if (r.kind === kind && r.ref) at.set(r.ref, i); });
  return [...list].sort((a, b) => (at.get(idOf(a)) ?? -1) - (at.get(idOf(b)) ?? -1))[0];
}

/**
 * The drill to open from the drills page (D49). Must-could-cannot and first move show a set's answer, so sets the
 * student has already solved come first; among them, and then among the rest, the drill never done, else the one done
 * longest ago.
 */
export function nextDrill<T>(list: T[], idOf: (x: T) => string, setOf: (x: T) => string, runs: LrDrillRun[], kind: DrillKind, solved: Set<string>): T | undefined {
  const done = list.filter((x) => solved.has(setOf(x)));
  return nextOf(done.length ? done : list, idOf, runs, kind);
}

/** A must, could, cannot drill worked out: its cases (turned the way the set pictures them) and each statement's bin. */
export function mccSolved(d: MccDrill, m: LrModel): { cases: Seating[]; bins: Bin[] } {
  const cases = solve(m, d.drop).map((s) => settle(m, s));
  return { cases, bins: d.statements.map((s) => binOf(s.expr, cases, m.board)) };
}

/** Moves in a first-move run. */
export const FIRST_MOVES = 3;

/**
 * One step of a first-move run (F85): for every clue not yet picked, how many ways the people and things named so far
 * could sit if it were added, and the fewest. Any clue with the fewest is a best move.
 */
export function firstMoveStep(m: LrModel, picked: number[]): { counts: { clue: number; n: number }[]; best: number } {
  const counts = m.clues.map((_, i) => i + 1).filter((k) => !picked.includes(k)).map((k) => ({ clue: k, n: openCases(m, [...picked, k]) }));
  return { counts, best: Math.min(...counts.map((c) => c.n)) };
}

/** The only seating of the people and things some clues name, when those clues fix it, else null. */
export function fixedBy(m: LrModel, picked: number[]): Seating | null {
  const clues = picked.map((k) => m.clues[k - 1]);
  const s = seatings(m.board, groupMap(m), [...new Set(clues.flatMap(refsOf))], clues, 2);
  return s.length === 1 ? settle(m, s[0]) : null;
}

/**
 * Why a clue leaves as many ways as it does, in a few words (D48): it fixes a seat, it names someone already placed,
 * it only says where someone is not or gives a choice, or it places people against each other but not against anyone
 * placed yet.
 */
export function moveReason(m: LrModel, picked: number[], k: number, n: number): string {
  const e = m.clues[k - 1];
  const placed = new Set(picked.flatMap((p) => refsOf(m.clues[p - 1])));
  const loose = "not" in e || "xor" in e || "or" in e || "if" in e;
  if (loose) return "it only says where someone is not, or gives a choice, so many ways stay open";
  if (absolute(e)) return n === 1 ? "it fixes a seat number" : "it pins a seat, but leaves some choice";
  if (refsOf(e).some((r) => placed.has(r))) return n === 1 ? "it names someone already placed, so it fixes where the other one sits" : "it names someone already placed";
  if (!picked.length && m.board.layout === "circle" && n === 1) return "at a round table, seat one person anywhere; this clue then fixes the other";
  return "it places people against each other, but not against anyone placed yet";
}

/** Which of a must-could-cannot drill's seatings the left-out clues keep: the set's own answer (-1 when none is left out). */
export function keptBy(d: MccDrill, m: LrModel, cases: Seating[]): number {
  if (!d.drop.length) return -1;
  const full = solve(m).map((s) => settle(m, s));
  const key = (s: Seating) => [...s].sort(([a], [b]) => (a < b ? -1 : 1)).join();
  return cases.findIndex((c) => full.some((f) => key(f) === key(c)));
}

/** People and things that sit in a different seat in some seating: where "could" comes from. */
export function movers(cases: Seating[]): Set<string> {
  const out = new Set<string>();
  cases[0]?.forEach((k, r) => { if (cases.some((c) => c.get(r) !== k)) out.add(r); });
  return out;
}

/** A sentence that explains a statement's bin from where it holds (D48). */
export function binWhy(per: boolean[]): string {
  const yes = per.flatMap((t, i) => (t ? [i + 1] : [])), no = per.flatMap((t, i) => (t ? [] : [i + 1]));
  const list = (xs: number[]) => (xs.length === 1 ? `seating ${xs[0]}` : `seatings ${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
  if (!no.length) return `True in every seating, so it must be true.`;
  if (!yes.length) return `False in every seating, so it cannot be true.`;
  return `True in ${list(yes)} but false in ${list(no)}: true in some, so it could be true, but not must.`;
}

/** A safe "back to the set" address from ?back=: only an LR set's page on this site. */
export const backTo = (x: string | null): string | null => (x && /^\/practice\/lr\/[a-z0-9-]+(\?[\w=&-]*)?$/.test(x) ? x : null);
