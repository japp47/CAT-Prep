import type { ArenaRound, LrAttempt } from "../lib/state";
import { addDays } from "../lib/date";
import { LR_CATALOG } from "./catalog.gen";
import { shuffle } from "./random";
import type { LrDiagram, LrMeta } from "./types";

/**
 * The Set Selection Arena (F56, docs/design/arena.md): five unseen DILR sets under one 40-minute clock, the order the
 * student picks before solving, and a debrief that sets the picks against what happened. Pure functions; the page is
 * pages/practice/Arena.tsx.
 */

export const ARENA_SETS = 5;
export const ARENA_SECS = 40 * 60;
/** The look is part of the 40 minutes, as in the exam; past this a quiet line says most toppers have started. */
export const LOOK_NUDGE = 4 * 60;
/** A replay round deals sets last touched at least this many days ago. */
export const REPLAY_AFTER = 30;
/** Fewer pairs than this and a round's selection accuracy is not shown; fewer rounds than this and no trend. */
export const MIN_PAIRS = 3;
export const MIN_ROUNDS = 3;

/** Sets that read like a CAT set: shared clues or tables, not five separate puzzles. */
export const ARENA_POOL: LrMeta[] = LR_CATALOG.filter((m) => !m.apart);

/** The date each set was last tried, and last dealt in a round. */
function lastSeen(lr: LrAttempt[], rounds: ArenaRound[]) {
  const seen = new Map<string, string>(), tried = new Set<string>(), dealt = new Set<string>();
  const note = (id: string, d: string) => { const was = seen.get(id); if (!was || d > was) seen.set(id, d); };
  lr.forEach((a) => { tried.add(a.set); note(a.set, a.d); });
  rounds.forEach((r) => r.sets.forEach((id) => { dealt.add(id); note(id, r.d); }));
  return { seen, tried, dealt };
}

/**
 * Five sets from `cands` in a seeded order: no more than two of a type (so at least three types) and no more than one
 * easy set, so a round always has something worth leaving. If the rules cannot fill five, the rest come in seed order.
 */
function deal(cands: LrMeta[], seed: string): string[] {
  const order = shuffle(cands, seed), out: LrMeta[] = [];
  for (const m of order) {
    if (out.length === ARENA_SETS) break;
    if (out.filter((x) => x.type === m.type).length >= 2) continue;
    if (m.difficulty === "easy" && out.some((x) => x.difficulty === "easy")) continue;
    out.push(m);
  }
  for (const m of order) if (out.length < ARENA_SETS && !out.includes(m)) out.push(m);
  return out.map((m) => m.id);
}

/**
 * The next round: five sets never tried and never dealt. When fewer than five are left, a replay round of sets last
 * touched REPLAY_AFTER or more days ago (fresh ones included), which does not count towards selection accuracy.
 * Undefined when even that cannot fill a round. The same seed deals the same round.
 */
export function pickRound(lr: LrAttempt[], rounds: ArenaRound[], seed: string, today: string, pool: LrMeta[] = ARENA_POOL): { sets: string[]; replay: boolean } | undefined {
  const { seen, tried, dealt } = lastSeen(lr, rounds);
  const fresh = pool.filter((m) => !tried.has(m.id) && !dealt.has(m.id));
  if (fresh.length >= ARENA_SETS) return { sets: deal(fresh, seed), replay: false };
  const cut = addDays(today, -REPLAY_AFTER);
  const stale = pool.filter((m) => !seen.has(m.id) || seen.get(m.id)! <= cut);
  return stale.length >= ARENA_SETS ? { sets: deal(stale, seed), replay: true } : undefined;
}

/** How many fresh sets are left for rounds. */
export const freshLeft = (lr: LrAttempt[], rounds: ArenaRound[], pool: LrMeta[] = ARENA_POOL) => {
  const { tried, dealt } = lastSeen(lr, rounds);
  return pool.filter((m) => !tried.has(m.id) && !dealt.has(m.id)).length;
};

/** Seconds spent on a set in the round, from its visits. */
export const setSecs = (r: ArenaRound, set: string) => r.visits.reduce((s, [id, a, b]) => s + (id === set ? b - a : 0), 0);

/** What a set returned. later: from practice after the round (a left or unreached set solved later). */
export interface SetResult { right: number; marks: number; mins: number; later?: true }

const SPENT = 60;

/**
 * A set's result for this round: its attempt in the round, or 0 marks when the student spent a minute or more on it
 * and answered nothing; otherwise its first attempt after the round, if any ("reality arrives later").
 */
export function resultOf(r: ArenaRound, set: string, lr: LrAttempt[]): SetResult | undefined {
  const secs = setSecs(r, set);
  const mine = r.attempts[set] ? lr.find((a) => a.id === r.attempts[set]) : undefined;
  if (mine) return { right: mine.c, marks: 3 * mine.c - mine.w, mins: (secs || mine.secs) / 60 };
  if (secs >= SPENT) return { right: 0, marks: 0, mins: secs / 60 };
  const inRound = new Set(Object.values(r.attempts));
  const later = lr.filter((a) => a.set === set && a.d >= r.d && !inRound.has(a.id)).sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))[0];
  return later ? { right: later.c, marks: 3 * later.c - later.w, mins: later.secs / 60, later: true } : undefined;
}

/** Marks a minute; a set takes at least half a minute, so a stray tap does not look infinitely good. */
const rate = (x: SetResult) => x.marks / Math.max(x.mins, 0.5);

/** The student's rank for each dealt set: its place in the order, every left (or unranked) set sharing the last rank. */
const rankOf = (r: ArenaRound, set: string) => { const i = r.order.indexOf(set); return i < 0 ? r.order.length : i; };

/**
 * Selection accuracy (D60): over pairs of sets that both have a result and different ranks, the pairs where the set
 * picked earlier returned at least as many marks a minute. Undefined under MIN_PAIRS pairs.
 */
export function selectionAccuracy(r: ArenaRound, lr: LrAttempt[]): { right: number; pairs: number } | undefined {
  const res = r.sets.map((id) => ({ rank: rankOf(r, id), x: resultOf(r, id, lr) })).filter((s): s is { rank: number; x: SetResult } => !!s.x);
  let right = 0, pairs = 0;
  for (let i = 0; i < res.length; i++) for (let j = 0; j < res.length; j++) {
    const a = res[i], b = res[j];
    if (a.rank >= b.rank) continue;
    pairs++;
    if (rate(a.x) >= rate(b.x)) right++;
  }
  return pairs >= MIN_PAIRS ? { right, pairs } : undefined;
}

/** Selection accuracy over every counted round (replays left out): shown only from MIN_ROUNDS rounds. */
export function arenaTrend(rounds: ArenaRound[], lr: LrAttempt[]): { pct: number; rounds: number; byRound: number[] } | undefined {
  const acc = [...rounds].filter((r) => !r.replay).sort((a, b) => a.updatedAt - b.updatedAt).map((r) => selectionAccuracy(r, lr)).filter((a) => !!a);
  if (acc.length < MIN_ROUNDS) return undefined;
  const right = acc.reduce((s, a) => s + a.right, 0), pairs = acc.reduce((s, a) => s + a.pairs, 0);
  return { pct: Math.round((right / pairs) * 100), rounds: acc.length, byRound: acc.map((a) => Math.round((a.right / a.pairs) * 100)) };
}

/** The round's marks and the most it could have scored. */
export function roundScore(r: ArenaRound, lr: LrAttempt[], meta: (id: string) => LrMeta | undefined = byId) {
  const marks = Object.values(r.attempts).reduce((s, id) => { const a = lr.find((x) => x.id === id); return s + (a ? 3 * a.c - a.w : 0); }, 0);
  const max = r.sets.reduce((s, id) => s + 3 * (meta(id)?.questions ?? 0), 0);
  return { marks, max };
}

const META = new Map(LR_CATALOG.map((m) => [m.id, m]));
const byId = (id: string) => META.get(id);

/** The letter a set was dealt under (A to E). */
export const letterOf = (r: ArenaRound, set: string) => String.fromCharCode(65 + r.sets.indexOf(set));

const mins = (m: number) => { const n = Math.max(1, Math.round(m)); return `${n} minute${n === 1 ? "" : "s"}`; };
const ordinal = (i: number) => ["first", "second", "third", "fourth", "fifth"][i] ?? `${i + 1}th`;

/**
 * The set that cost the most: of the sets given three minutes or more in the round, the fewest marks a minute (then
 * the most minutes). Only time and marks recorded in the round; nothing guessed.
 */
export function costliest(r: ArenaRound, lr: LrAttempt[]): { set: string; mins: number; right: number; marks: number } | undefined {
  const cands = r.sets.map((id) => ({ id, x: resultOf(r, id, lr) })).filter((s) => s.x && !s.x.later && s.x.mins >= 3) as { id: string; x: SetResult }[];
  cands.sort((a, b) => rate(a.x) - rate(b.x) || b.x.mins - a.x.mins);
  const c = cands[0];
  return c && { set: c.id, mins: c.x.mins, right: c.x.right, marks: c.x.marks };
}

/**
 * One plain sentence per dealt set, from numbers only: the guess against what happened, a left set with "our estimate"
 * (the author's minutes; no "most students" until real times exist, A36), and what a later practice attempt showed.
 */
export function debrief(r: ArenaRound, lr: LrAttempt[], meta: (id: string) => LrMeta | undefined = byId): { set: string; letter: string; text: string }[] {
  return r.sets.map((id) => {
    const L = letterOf(r, id), m = meta(id), x = resultOf(r, id, lr), g = r.guess[id] ?? {};
    const n = m?.questions ?? 0, est = m ? `Our estimate: ${mins(m.minutes)} for ${n} questions.` : "";
    const rank = r.order.indexOf(id);
    let text: string;
    if (rank < 0) {
      text = `You left ${L}. ${est}`;
      if (x?.later) text += ` You solved it later: ${x.right} of ${n} right in ${mins(x.mins)}.`;
    } else if (!x || x.later) {
      text = `You picked ${L} ${ordinal(rank)} but did not reach it. ${est}`;
      if (x?.later) text += ` Later you got ${x.right} of ${n} in ${mins(x.mins)}.`;
    } else if (!r.attempts[id]) {
      text = `You spent ${mins(x.mins)} on ${L} and answered nothing.`;
    } else {
      const took = `${mins(x.mins)} for ${x.right} right`;
      if (g.min !== undefined && g.right !== undefined) text = `${L} looked like ${mins(g.min)} and ${g.right} right; it took ${took}.`;
      else if (g.min !== undefined) text = `${L} looked like ${mins(g.min)}; it took ${took}.`;
      else if (g.right !== undefined) text = `You expected ${g.right} right on ${L}; it took ${took}.`;
      else text = `${L} took ${took}.`;
    }
    return { set: id, letter: L, text: text.trim() };
  });
}

/**
 * The 40 minutes as a timeline picture (TimelineFigure): a lane for the look, then one per set in deal order, a bar
 * per visit in minutes, and each lane's result at its right end.
 */
export function visitLanes(r: ArenaRound, lr: LrAttempt[], meta: (id: string) => LrMeta | undefined = byId): { g: LrDiagram; lit: number[] } {
  const bars: [number, number, number, string][] = [];
  if (r.look > 0) bars.push([0, 0, r.look / 60, ""]);
  r.visits.forEach(([id, a, b]) => { const lane = r.sets.indexOf(id) + 1; if (lane > 0 && b > a) bars.push([lane, a / 60, b / 60, ""]); });
  const ends = r.sets.map((id) => {
    const x = resultOf(r, id, lr);
    if (r.order.indexOf(id) < 0) return "left";
    return x && !x.later ? `${x.right} of ${meta(id)?.questions ?? 0}` : "not reached";
  });
  const g: LrDiagram = { layout: "timeline", seats: ["Result"], rows: ["Look", ...r.sets.map((id) => letterOf(r, id))], bars, span: [0, ARENA_SECS / 60], frames: [[[[""]], ...ends.map((e) => [[e]])]] };
  return { g, lit: bars.map((_, i) => i) };
}
