/**
 * The general solver (D51): values to fill, the choices each can take, and rules between them. Seating sets, team
 * selection, truth-tellers and liars, and league tables are all this one shape, so must-could-cannot, first move, and
 * later DILR Replay (F57) and the daily puzzle (F61) share one search. A model says what its values and rules are
 * (seat models in practice/lrlogic.ts, grid models here); the search counts the ways that fit.
 */

export type Val = string | number;
/** One way the values can be filled: the value of every name placed. */
export type Case = Map<string, Val>;

/** A rule over some names: tested once every name it reads has a value. */
export interface CRule { deps: string[]; test: (get: (name: string) => Val) => boolean }

/**
 * A puzzle for the search. `vars` in the order to fill them (names the rules read first cuts the search early);
 * `distinct` groups whose names must all take different values (people in seats, say).
 */
export interface Csp { vars: { name: string; domain: Val[] }[]; distinct: string[][]; rules: CRule[] }

/**
 * Fills the values one at a time, depth first, testing each rule at the depth where its last name is filled. Stops
 * after `cap` ways. Returns how many it found; `leaf` sees each one.
 */
export function search(csp: Csp, cap = 1000, leaf?: (c: Case) => void): number {
  const at = new Map<string, Val>();
  const get = (r: string) => at.get(r)!;
  const index = new Map(csp.vars.map((v, i) => [v.name, i]));
  const due: CRule[][] = csp.vars.map(() => []);
  csp.rules.forEach((r) => {
    const missing = r.deps.find((d) => !index.has(d));
    if (missing) throw new Error(`A rule reads "${missing}", which is not a value to fill`);
    due[r.deps.length ? Math.max(...r.deps.map((d) => index.get(d)!)) : 0]?.push(r);
  });
  // A rule that reads nothing is tested once, before anything is filled.
  const free = csp.rules.filter((r) => !r.deps.length);
  if (free.some((r) => !r.test(get))) return 0;
  const groups = csp.vars.map((v) => csp.distinct.filter((g) => g.includes(v.name)));
  let found = 0;
  const fill = (i: number): void => {
    if (found >= cap) return;
    if (i === csp.vars.length) { found++; leaf?.(new Map(at)); return; }
    const v = csp.vars[i];
    for (const x of v.domain) {
      if (groups[i].some((g) => g.some((o) => o !== v.name && at.has(o) && at.get(o) === x))) continue;
      at.set(v.name, x);
      if (due[i].every((r) => !r.deps.length || r.test(get))) fill(i + 1);
      at.delete(v.name);
    }
  };
  fill(0);
  return found;
}

/** Every way that fits, up to `cap`. */
export function allCases(csp: Csp, cap = 1000): Case[] {
  const out: Case[] = [];
  search(csp, cap, (c) => out.push(c));
  return out;
}

/** The names first in the order the rules name them, then the rest: the search then cuts as early as it can. */
export function orderVars(vars: Csp["vars"], named: string[]): Csp["vars"] {
  const by = new Map(vars.map((v) => [v.name, v]));
  return [...named.filter((n) => by.has(n)).map((n) => by.get(n)!), ...vars.filter((v) => !named.includes(v.name))];
}

// ---------------------------------------------------------------------------------------------------------------
// Grid models: values that are not seats (in or out of a team, truth-teller or liar, a match's result)

/** A number from the values: a value itself, a sum, a count of conditions that hold, or a league figure. */
export type Term =
  | number
  | { v: string }
  | { sum: Term[] }
  | { count: Cond[] }
  | { wins: string } | { draws: string } | { losses: string } | { points: string };

/**
 * A condition. `is` / `isnt` test one value; the comparisons take two terms; `iff` is "exactly when" (a truth-teller's
 * statement is true exactly when they are a truth-teller); `beat` and `drew` read a league's match.
 */
export type Cond =
  | { is: [string, Val] }
  | { isnt: [string, Val] }
  | { eq: [Term, Term] } | { ne: [Term, Term] } | { lt: [Term, Term] } | { le: [Term, Term] } | { gt: [Term, Term] } | { ge: [Term, Term] }
  | { not: Cond }
  | { and: Cond[] }
  | { or: Cond[] }
  | { xor: [Cond, Cond] }
  | { iff: [Cond, Cond] }
  | { if: Cond; then: Cond }
  | { beat: [string, string] }
  | { drew: [string, string] };

/**
 * A league: every team plays every other once. Each match is a value named "X v Y" (X before Y in `teams`), "W" when X
 * won, "D" a draw, "L" when Y won.
 */
export interface League { teams: string[]; win: number; draw: number }

/** How a case is shown: one row per value, its label for each choice (people as truth-teller or liar, say). */
export interface GridModel {
  set: string;
  kind: "grid";
  /** Values to fill, in groups sharing their choices; `labels` names each choice for a person reading the case. */
  vars: { names: string[]; values: Val[]; labels?: Record<string, string> }[];
  league?: League;
  /** Groups whose values must all differ. */
  distinct?: string[][];
  /** What always holds and is not a numbered clue: the size of a team, the surviving cells of a table. */
  facts?: Cond[];
  /** The set's clues, in order (clue 1 is clues[0]). */
  clues: Cond[];
  /** How a case's rows read; "members" lists the names whose value is 1. */
  show?: "rows" | "members";
}

export const matchName = (a: string, b: string) => `${a} v ${b}`;

/** Every match of a league, as [name, first team, second team]. */
export function matches(l: League): [string, string, string][] {
  const out: [string, string, string][] = [];
  l.teams.forEach((a, i) => l.teams.slice(i + 1).forEach((b) => out.push([matchName(a, b), a, b])));
  return out;
}

/** A team's result in one match, from the match's value: W, D or L for that team. */
function resultFor(l: League, team: string, get: (n: string) => Val): ("W" | "D" | "L")[] {
  return matches(l).filter(([, a, b]) => a === team || b === team).map(([n, a]) => {
    const x = get(n) as "W" | "D" | "L";
    return a === team || x === "D" ? x : x === "W" ? "L" : "W";
  });
}

/** The names a term or condition reads. */
export function namesOf(x: Term | Cond, l?: League): string[] {
  const out = new Set<string>();
  const team = (t: string) => { if (!l) throw new Error("League figures need a league"); matches(l).forEach(([n, a, b]) => { if (a === t || b === t) out.add(n); }); };
  const walk = (y: Term | Cond): void => {
    if (typeof y === "number") return;
    if ("v" in y) out.add(y.v);
    else if ("sum" in y) y.sum.forEach(walk);
    else if ("count" in y) y.count.forEach(walk);
    else if ("wins" in y) team(y.wins);
    else if ("draws" in y) team(y.draws);
    else if ("losses" in y) team(y.losses);
    else if ("points" in y) team(y.points);
    else if ("is" in y) out.add(y.is[0]);
    else if ("isnt" in y) out.add(y.isnt[0]);
    else if ("not" in y) walk(y.not);
    else if ("and" in y) y.and.forEach(walk);
    else if ("or" in y) y.or.forEach(walk);
    else if ("xor" in y) y.xor.forEach(walk);
    else if ("iff" in y) y.iff.forEach(walk);
    else if ("if" in y) { walk(y.if); walk(y.then); }
    else if ("beat" in y || "drew" in y) {
      const [a, b] = "beat" in y ? y.beat : y.drew;
      if (!l) throw new Error("Match results need a league");
      const m = matches(l).find(([, p, q]) => (p === a && q === b) || (p === b && q === a));
      if (!m) throw new Error(`No match between ${a} and ${b}`);
      out.add(m[0]);
    } else {
      const [p, q] = Object.values(y)[0] as [Term, Term];
      walk(p); walk(q);
    }
  };
  walk(x);
  return [...out];
}

/** A term's number. A value that is not a number counts as 0 (so a sum over in-or-out values stays honest). */
export function evalTerm(t: Term, get: (n: string) => Val, l?: League): number {
  if (typeof t === "number") return t;
  if ("v" in t) { const x = get(t.v); return typeof x === "number" ? x : 0; }
  if ("sum" in t) return t.sum.reduce<number>((s, x) => s + evalTerm(x, get, l), 0);
  if ("count" in t) return t.count.filter((c) => evalCond(c, get, l)).length;
  const team = "wins" in t ? t.wins : "draws" in t ? t.draws : "losses" in t ? t.losses : t.points;
  const rs = resultFor(l!, team, get);
  const w = rs.filter((r) => r === "W").length, d = rs.filter((r) => r === "D").length;
  if ("wins" in t) return w;
  if ("draws" in t) return d;
  if ("losses" in t) return rs.length - w - d;
  return w * l!.win + d * l!.draw;
}

export function evalCond(c: Cond, get: (n: string) => Val, l?: League): boolean {
  if ("is" in c) return get(c.is[0]) === c.is[1];
  if ("isnt" in c) return get(c.isnt[0]) !== c.isnt[1];
  if ("not" in c) return !evalCond(c.not, get, l);
  if ("and" in c) return c.and.every((x) => evalCond(x, get, l));
  if ("or" in c) return c.or.some((x) => evalCond(x, get, l));
  if ("xor" in c) return evalCond(c.xor[0], get, l) !== evalCond(c.xor[1], get, l);
  if ("iff" in c) return evalCond(c.iff[0], get, l) === evalCond(c.iff[1], get, l);
  if ("if" in c) return !evalCond(c.if, get, l) || evalCond(c.then, get, l);
  if ("beat" in c || "drew" in c) {
    const [a, b] = "beat" in c ? c.beat : c.drew;
    const m = matches(l!).find(([, p, q]) => (p === a && q === b) || (p === b && q === a))!;
    const x = get(m[0]);
    if ("drew" in c) return x === "D";
    return m[1] === a ? x === "W" : x === "L";
  }
  const [op, [p, q]] = Object.entries(c)[0] as ["eq" | "ne" | "lt" | "le" | "gt" | "ge", [Term, Term]];
  const x = evalTerm(p, get, l), y = evalTerm(q, get, l);
  return op === "eq" ? x === y : op === "ne" ? x !== y : op === "lt" ? x < y : op === "le" ? x <= y : op === "gt" ? x > y : x >= y;
}

/** Every value of a grid model with its choices: the declared groups, then one per league match. */
export function gridVars(m: GridModel): Csp["vars"] {
  return [
    ...m.vars.flatMap((g) => g.names.map((name) => ({ name, domain: g.values }))),
    ...(m.league ? matches(m.league).map(([name]) => ({ name, domain: ["W", "D", "L"] as Val[] })) : []),
  ];
}

const rule = (c: Cond, l?: League): CRule => ({ deps: namesOf(c, l), test: (get) => evalCond(c, get, l) });

/**
 * The puzzle for some of a grid model's clues (numbers from 1) and its facts. With `only`, only the values those clues
 * and facts read are filled: what first move counts.
 */
export function gridCsp(m: GridModel, clues: number[], only = false): Csp {
  const cs = clues.map((k) => m.clues[k - 1]);
  const named = [...new Set(cs.flatMap((c) => namesOf(c, m.league)))];
  const all = gridVars(m);
  const facts = (m.facts ?? []).filter((f) => !only || namesOf(f, m.league).every((n) => named.includes(n)));
  const vars = only ? all.filter((v) => named.includes(v.name)) : orderVars(all, [...named, ...new Set(facts.flatMap((f) => namesOf(f, m.league)))]);
  return { vars: orderVars(vars, named), distinct: (m.distinct ?? []).map((g) => g.filter((n) => vars.some((v) => v.name === n))), rules: [...facts, ...cs].map((c) => rule(c, m.league)) };
}

/** A grid model's label for a value's choice: the declared label, a league match's result in words, else the choice. */
export function labelOf(m: GridModel, name: string, x: Val): string {
  const g = m.vars.find((v) => v.names.includes(name));
  if (g?.labels?.[String(x)] !== undefined) return g.labels[String(x)];
  if (m.league) {
    const mt = matches(m.league).find(([n]) => n === name);
    if (mt) return x === "D" ? "Draw" : `${x === "W" ? mt[1] : mt[2]} won`;
  }
  return String(x);
}
