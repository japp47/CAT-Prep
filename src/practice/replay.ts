import { allCases, gridCsp, gridVars, labelOf, matches, search, type Case, type GridModel, type Val } from "./solver";

/**
 * DILR Replay (F57, docs/design/replay.md): a set in one of three formats on a board the student marks, with the number
 * of arrangements left after every step, worked out by the general solver (D64). Content: content/lrdrill/replay.json.
 * Three modes fade the help (D66): watch the worked steps, do them one at a time, then solve alone.
 */

export type ReplayFormat = "scheduling" | "grouping" | "tournament";
export const FORMAT: Record<ReplayFormat, { label: string; about: string }> = {
  scheduling: { label: "Scheduling", about: "People into days or slots, one each." },
  grouping: { label: "Grouping and selection", about: "People into teams, or in and out of a committee." },
  tournament: { label: "Tournaments", about: "Results tables, points and ranks." },
};
export const FORMATS = Object.keys(FORMAT) as ReplayFormat[];

/** One worked step: the clues it uses (numbers from 1) and what a topper would write beside them. */
export interface ReplayStep { use: number[]; say: string }
export interface ReplayPuzzle {
  id: string;
  format: ReplayFormat;
  title: string;
  /** The skill the set trains, in a few words. */
  skill: string;
  /** The LR set this replays, when it is one (its intro and clues are the same). */
  set?: string;
  intro: string[];
  clues: string[];
  model: Omit<GridModel, "set">;
  steps: ReplayStep[];
}

/** LR sets that have a replay set, so a set's review can link to it without loading the replay content. A test keeps it in step with replay.json. */
export const REPLAY_OF_SET: Record<string, string> = { "tour-archery-rounds": "rp-archery" };

export type ReplayMode = "watch" | "steps" | "solve";
export const MODE: Record<ReplayMode, string> = { watch: "Watch", steps: "Step by step", solve: "On your own" };

export const modelOf = (p: ReplayPuzzle): GridModel => ({ ...p.model, set: p.id });

/** Counts stop here: the widest board (three rounds of five ranks) has 1,728,000 arrangements before any clue. */
export const COUNT_CAP = 200_000;
/** Up to this many arrangements are listed to read the cells off; above it each cell is tested on its own. */
const LIST_CAP = 20_000;

export const ways = (n: number, capped = false) => (capped ? `over ${COUNT_CAP.toLocaleString("en-IN")}` : n.toLocaleString("en-IN"));

export type Mark = "in" | "out";
export const cellKey = (name: string, v: Val) => `${name}=${v}`;

/** One grid of the board: a row per value to fill, a column per choice. A league's results are one grid whose cells are named per row. */
export interface BoardGroup { title: string; rows: { name: string; label: string }[]; cols: { v: Val; label: string }[]; perRow: boolean; distinct: boolean }

export function boardOf(m: GridModel): BoardGroup[] {
  const groups: BoardGroup[] = m.vars.map((g) => ({
    title: g.title ?? "",
    rows: g.names.map((name, i) => ({ name, label: g.rows?.[i] ?? name })),
    cols: g.values.map((v) => ({ v, label: g.labels?.[String(v)] ?? String(v) })),
    perRow: false,
    distinct: !!m.distinct?.some((d) => g.names.every((n) => d.includes(n))),
  }));
  if (m.league) groups.push({ title: "Results", rows: matches(m.league).map(([name]) => ({ name, label: name })), cols: ["W", "D", "L"].map((v) => ({ v, label: v })), perRow: true, distinct: false });
  return groups;
}

/** A cell's label: the column's, or for a league match the result in words ("Aces won", "Draw"). */
export const cellLabel = (m: GridModel, g: BoardGroup, name: string, v: Val) => (g.perRow ? labelOf(m, name, v) : g.cols.find((c) => c.v === v)!.label);

/** What some clues settle: how many arrangements fit, and each cell that is placed in all of them or ruled out in all. */
export interface Settled { count: number; capped: boolean; cells: Map<string, Mark> }

export function settledBy(m: GridModel, clues: number[]): Settled {
  const csp = gridCsp(m, clues);
  const vars = gridVars(m);
  const cells = new Map<string, Mark>();
  const cases = allCases(csp, LIST_CAP);
  if (cases.length < LIST_CAP) {
    vars.forEach(({ name, domain }) => domain.forEach((x) => {
      const n = cases.filter((c) => c.get(name) === x).length;
      if (n && n === cases.length) cells.set(cellKey(name, x), "in");
      else if (!n) cells.set(cellKey(name, x), "out");
    }));
    return { count: cases.length, capped: false, cells };
  }
  // Too many to list: a cell is ruled out when no arrangement has it, and placed when every other choice is ruled out.
  vars.forEach(({ name, domain }) => {
    const out = domain.filter((x) => search({ ...csp, rules: [...csp.rules, { deps: [name], test: (g) => g(name) === x }] }, 1) === 0);
    out.forEach((x) => cells.set(cellKey(name, x), "out"));
    if (out.length === domain.length - 1) cells.set(cellKey(name, domain.find((x) => !out.includes(x))!), "in");
  });
  const count = search(csp, COUNT_CAP);
  return { count, capped: count >= COUNT_CAP, cells };
}

/** The board before any clue and after each worked step, with the cells each step newly settles. */
export interface TrailStep { clues: number[]; settled: Settled; fresh: string[] }

export function trailOf(p: ReplayPuzzle): TrailStep[] {
  const m = modelOf(p);
  const out: TrailStep[] = [{ clues: [], settled: settledBy(m, []), fresh: [] }];
  const used: number[] = [];
  p.steps.forEach((s) => {
    used.push(...s.use);
    const settled = settledBy(m, [...used]), before = out[out.length - 1].settled.cells;
    out.push({ clues: [...used], settled, fresh: [...settled.cells.keys()].filter((k) => !before.has(k)) });
  });
  return out;
}

/** The step (from 1) that cut the arrangements by the largest factor: the one to remember. */
export function biggestCut(trail: TrailStep[]): number {
  let best = 1, by = 0;
  for (let i = 1; i < trail.length; i++) {
    const r = Math.log(trail[i - 1].settled.count) - Math.log(Math.max(1, trail[i].settled.count));
    if (r > by) { by = r; best = i; }
  }
  return best;
}

/** The answer: the one arrangement that fits every clue. */
export function answerOf(p: ReplayPuzzle): Case {
  const m = modelOf(p);
  return allCases(gridCsp(m, m.clues.map((_, i) => i + 1)), 2)[0];
}

/** The student's marks: "in" (a tick) or "out" (a cross) by cell. */
export type Marks = Record<string, Mark>;
/** What the board shows: the student's marks, and crosses that follow from a tick (the rest of its row, and of its column in a one-each grid). */
export type Shown = Map<string, Mark | "auto">;

export function shownOf(groups: BoardGroup[], marks: Marks): Shown {
  const out: Shown = new Map(Object.entries(marks));
  for (const g of groups) for (const r of g.rows) for (const c of g.cols) {
    if (marks[cellKey(r.name, c.v)] !== "in") continue;
    g.cols.forEach((o) => { const k = cellKey(r.name, o.v); if (!out.has(k)) out.set(k, "auto"); });
    if (g.distinct) g.rows.forEach((o) => { const k = cellKey(o.name, c.v); if (!out.has(k)) out.set(k, "auto"); });
  }
  return out;
}

/** A tap: empty, then a cross, then a tick, then empty again. */
export function tap(marks: Marks, key: string): Marks {
  const next = { ...marks };
  if (!marks[key]) next[key] = "out";
  else if (marks[key] === "out") next[key] = "in";
  else delete next[key];
  return next;
}

const isIn = (s: Shown, k: string) => s.get(k) === "in";
const isOut = (s: Shown, k: string) => s.get(k) === "out" || s.get(k) === "auto";

/** Marks that contradict the answer: a tick on a wrong cell, a cross on the right one (crosses from a wrong tick count once, with it). */
export function wrongMarks(marks: Marks, answer: Case): string[] {
  return Object.entries(marks).filter(([k, m]) => {
    const [name, v] = splitKey(k);
    const right = String(answer.get(name)) === v;
    return m === "in" ? !right : right;
  }).map(([k]) => k);
}

export const splitKey = (k: string): [string, string] => { const i = k.lastIndexOf("="); return [k.slice(0, i), k.slice(i + 1)]; };

/** A row is known once its right cell is ticked or every other cell is crossed. */
export function rowKnown(g: BoardGroup, name: string, shown: Shown, answer: Case): boolean {
  const right = cellKey(name, answer.get(name)!);
  return isIn(shown, right) || g.cols.every((c) => cellKey(name, c.v) === right || isOut(shown, cellKey(name, c.v)));
}

/** Solved: no wrong mark and every row known. */
export function solvedBy(groups: BoardGroup[], marks: Marks, answer: Case): boolean {
  if (wrongMarks(marks, answer).length) return false;
  const shown = shownOf(groups, marks);
  return groups.every((g) => g.rows.every((r) => rowKnown(g, r.name, shown, answer)));
}

/**
 * How a step-by-step answer went: marks against the answer, ticks on cells the clues so far do not settle yet (a guess,
 * even when right), and the placements the step settles that the student did not mark.
 */
export function stepCheck(groups: BoardGroup[], marks: Marks, answer: Case, settled: Settled) {
  const shown = shownOf(groups, marks);
  const wrong = wrongMarks(marks, answer);
  const ahead = Object.keys(marks).filter((k) => !wrong.includes(k) && !settled.cells.has(k));
  const placed = [...settled.cells].filter(([, m]) => m === "in").map(([k]) => k);
  const missed = placed.filter((k) => !isIn(shown, k) && !groups.some((g) => { const [n] = splitKey(k); return g.rows.some((r) => r.name === n) && rowKnown(g, n, shown, answer); }));
  return { wrong, ahead, placed, missed };
}

/** The board as the solver has it after some clues: a tick on each placed cell, a cross on each ruled-out one. */
export const marksOf = (s: Settled): Marks => Object.fromEntries(s.cells);

/**
 * A hint for the board as marked: wrong marks first (nothing safe follows from them), else the first worked step whose
 * placements are not all on the board yet, named by its clues.
 */
export function hintFor(groups: BoardGroup[], p: ReplayPuzzle, trail: TrailStep[], marks: Marks, answer: Case): { wrong: string[] } | { step: number; clues: number[] } | null {
  const wrong = wrongMarks(marks, answer);
  if (wrong.length) return { wrong };
  const shown = shownOf(groups, marks);
  for (let i = 1; i < trail.length; i++) {
    const open = [...trail[i].settled.cells].some(([k, m]) => (m === "in" ? !isIn(shown, k) && !rowOf(groups, k, shown, answer) : !isOut(shown, k) && !rowOf(groups, k, shown, answer)));
    if (open) return { step: i, clues: p.steps[i - 1].use };
  }
  return null;
}
const rowOf = (groups: BoardGroup[], k: string, shown: Shown, answer: Case) => {
  const [n] = splitKey(k);
  const g = groups.find((x) => x.rows.some((r) => r.name === n));
  return !!g && rowKnown(g, n, shown, answer);
};
