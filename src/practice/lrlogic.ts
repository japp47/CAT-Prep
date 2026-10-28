/**
 * Clues as code (D47), for the LR drills: the clue translator (F83), must, could, cannot (F84) and first move (F85).
 * A clue is a small expression over people and things in seats; a model lists who and what gets a seat and each of a
 * set's clues as an expression. The solver counts the seatings that fit, so every drill answer is worked out here,
 * never typed by hand, and a test checks each model against the set's own solution.
 */

/** Someone or something that sits in a seat: a person, or an attribute's value ("Pune", "the teacher"). */
export type Ref = string;
/** Seats to one side: 1 is "immediately", "any" is "somewhere". */
export type Dist = number | "any";

export type Expr =
  | { at: Ref; seat: number }
  | { end: Ref }
  | { left: Ref; of: Ref; d?: Dist }
  | { right: Ref; of: Ref; d?: Dist }
  | { next: [Ref, Ref] }
  | { opp: [Ref, Ref] }
  /** n seats between the two (every seat is taken, so n people); cmp "ge" is "at least", "le" "at most". */
  | { gap: [Ref, Ref]; n: number; cmp?: "eq" | "ge" | "le" }
  | { same: [Ref, Ref] }
  /** Somewhere between two people in a row, never on one of their seats. */
  | { between: Ref; of: [Ref, Ref] }
  /** In a seat between two seat numbers: the two seats themselves only when incl. */
  | { within: Ref; from: number; to: number; incl?: boolean }
  | { not: Expr }
  | { and: Expr[] }
  | { or: Expr[] }
  | { xor: [Expr, Expr] }
  | { if: Expr; then: Expr };

/**
 * Seats in a row or round a table. A row faces "same" way as the reader by default (left is the lower seat number) or
 * "toward" the reader; a table's people face "in" (left is the next seat clockwise seen from above, as the set
 * pictures number them) or "out".
 */
export interface Board { layout: "row" | "circle"; n: number; facing?: "same" | "toward" | "in" | "out" }

/** Seat of each ref, 0-based. */
export type Pos = (r: Ref) => number;

const leftStep = (b: Board) => (b.layout === "row" ? (b.facing === "toward" ? 1 : -1) : b.facing === "out" ? -1 : 1);
const mod = (x: number, n: number) => ((x % n) + n) % n;

/** Steps from a to b the short way round (a circle) or along the row. */
function apart(b: Board, a: number, c: number): number {
  const d = Math.abs(a - c);
  return b.layout === "circle" ? Math.min(d, b.n - d) : d;
}

function side(b: Board, x: number, y: number, dir: number, d: Dist | undefined): boolean {
  const k = d ?? 1;
  if (k === "any") return x !== y && Math.sign(x - y) === dir; // row only (checked by the tests of the content)
  return b.layout === "circle" ? x === mod(y + dir * k, b.n) : x === y + dir * k;
}

/** Whether a clue holds when every ref it names has a seat. */
export function holds(e: Expr, pos: Pos, b: Board): boolean {
  if ("at" in e) return pos(e.at) === e.seat - 1;
  if ("end" in e) return pos(e.end) === 0 || pos(e.end) === b.n - 1;
  if ("left" in e) return side(b, pos(e.left), pos(e.of), leftStep(b), e.d);
  if ("right" in e) return side(b, pos(e.right), pos(e.of), -leftStep(b), e.d);
  if ("next" in e) return apart(b, pos(e.next[0]), pos(e.next[1])) === 1;
  if ("opp" in e) return b.layout === "circle" && b.n % 2 === 0 && apart(b, pos(e.opp[0]), pos(e.opp[1])) === b.n / 2;
  if ("gap" in e) {
    const x = pos(e.gap[0]), y = pos(e.gap[1]);
    if (x === y) return false;
    const g = apart(b, x, y) - 1;
    return e.cmp === "ge" ? g >= e.n : e.cmp === "le" ? g <= e.n : g === e.n;
  }
  if ("same" in e) return pos(e.same[0]) === pos(e.same[1]);
  if ("between" in e) {
    const x = pos(e.between), [p, q] = [pos(e.of[0]), pos(e.of[1])];
    return x > Math.min(p, q) && x < Math.max(p, q);
  }
  if ("within" in e) {
    const s = pos(e.within) + 1;
    return e.incl ? s >= e.from && s <= e.to : s > e.from && s < e.to;
  }
  if ("not" in e) return !holds(e.not, pos, b);
  if ("and" in e) return e.and.every((x) => holds(x, pos, b));
  if ("or" in e) return e.or.some((x) => holds(x, pos, b));
  if ("xor" in e) return holds(e.xor[0], pos, b) !== holds(e.xor[1], pos, b);
  return !holds(e.if, pos, b) || holds(e.then, pos, b);
}

/** The refs a clue names, in the order it names them. */
export function refsOf(e: Expr): Ref[] {
  const out: Ref[] = [];
  const add = (r: Ref) => { if (!out.includes(r)) out.push(r); };
  const walk = (x: Expr) => {
    if ("at" in x) add(x.at);
    else if ("end" in x) add(x.end);
    else if ("left" in x) { add(x.left); add(x.of); }
    else if ("right" in x) { add(x.right); add(x.of); }
    else if ("next" in x) x.next.forEach(add);
    else if ("opp" in x) x.opp.forEach(add);
    else if ("gap" in x) x.gap.forEach(add);
    else if ("same" in x) x.same.forEach(add);
    else if ("between" in x) { add(x.between); x.of.forEach(add); }
    else if ("within" in x) add(x.within);
    else if ("not" in x) walk(x.not);
    else if ("and" in x) x.and.forEach(walk);
    else if ("or" in x) x.or.forEach(walk);
    else if ("xor" in x) x.xor.forEach(walk);
    else { walk(x.if); walk(x.then); }
  };
  walk(e);
  return out;
}

/** Whether a clue pins a seat number, so turning a round table would change it. */
export const absolute = (e: Expr): boolean =>
  "at" in e || "within" in e || ("not" in e && absolute(e.not)) || ("and" in e && e.and.some(absolute)) || ("or" in e && e.or.some(absolute))
  || ("xor" in e && e.xor.some(absolute)) || ("if" in e && (absolute(e.if) || absolute(e.then)));

// ---------------------------------------------------------------------------------------------------------------
// Seating models and the solver

/** One group of things that each take a different seat: the people first, then each attribute's values. */
export interface Group { name: string; values: Ref[] }

/** A seating set as code: its board, its groups and each clue in order (clue 1 is clues[0]). */
export interface LrModel { set: string; board: Board; groups: Group[]; clues: Expr[] }

/** A seating: the seat (0-based) of every ref placed. */
export type Seating = Map<Ref, number>;

/**
 * Walks every seating of `refs` that keeps each group's refs in different seats and fits every clue, placing refs one
 * at a time and testing each clue as soon as everything it names has a seat. On a round table with no seat numbers the
 * first ref is fixed in seat 1, so seatings that are turns of each other count once. Stops after `cap` seatings.
 * Returns how many it found; `leaf` sees each one.
 */
function walk(board: Board, groupOf: Map<Ref, number>, refs: Ref[], clues: Expr[], cap: number, leaf?: (at: Seating) => void): number {
  const at = new Map<Ref, number>();
  const pos: Pos = (r) => at.get(r)!;
  const used = new Map<number, Set<number>>();
  const fix = board.layout === "circle" && !clues.some(absolute);
  // Each clue is checked at the depth where its last ref is placed.
  const due: Expr[][] = refs.map(() => []);
  clues.forEach((c) => {
    const rs = refsOf(c);
    const unknown = rs.find((r) => !groupOf.has(r));
    if (unknown) throw new Error(`Clue names "${unknown}", which is in no group`);
    due[Math.max(...rs.map((r) => refs.indexOf(r)))]?.push(c);
  });
  let found = 0;
  const place = (i: number): void => {
    if (found >= cap) return;
    if (i === refs.length) { found++; leaf?.(new Map(at)); return; }
    const g = groupOf.get(refs[i])!;
    const taken = used.get(g) ?? used.set(g, new Set()).get(g)!;
    for (let s = 0; s < (fix && i === 0 ? 1 : board.n); s++) {
      if (taken.has(s)) continue;
      at.set(refs[i], s);
      taken.add(s);
      if (due[i].every((c) => holds(c, pos, board))) place(i + 1);
      taken.delete(s);
      at.delete(refs[i]);
    }
  };
  place(0);
  return found;
}

/** Every seating of `refs` that fits the clues (see walk), up to `cap`. */
export function seatings(board: Board, groupOf: Map<Ref, number>, refs: Ref[], clues: Expr[], cap = 1000): Seating[] {
  const out: Seating[] = [];
  walk(board, groupOf, refs, clues, cap, (s) => out.push(s));
  return out;
}

export const groupMap = (m: LrModel) => new Map(m.groups.flatMap((g, i) => g.values.map((v) => [v, i] as const)));

/** The model with some clues left out (numbers from 1). */
export const without = (m: LrModel, drop: number[] = []): Expr[] => m.clues.filter((_, i) => !drop.includes(i + 1));

/**
 * Every whole seating that fits the clues (all clues, or all but `drop`): the set's cases. Refs the clues name are
 * placed first, so the search cuts early; the rest fill the seats left, each way they can.
 */
export function solve(m: LrModel, drop: number[] = [], cap = 1000): Seating[] {
  const clues = without(m, drop);
  const named = [...new Set(clues.flatMap(refsOf))];
  const rest = m.groups.flatMap((g) => g.values).filter((r) => !named.includes(r));
  return seatings(m.board, groupMap(m), [...named, ...rest], clues, cap);
}

/** Counting stops here: past it, a clue leaves "more than" this many ways, and the bars need no more. */
export const OPEN_CAP = 5000;

/**
 * How many ways the people and things named by some clues can sit, given only those clues (F85): what starting with
 * them leaves open. Turns of a round table count once. Counts stop at OPEN_CAP.
 */
export function openCases(m: LrModel, picked: number[]): number {
  const clues = picked.map((k) => m.clues[k - 1]);
  return walk(m.board, groupMap(m), [...new Set(clues.flatMap(refsOf))], clues, OPEN_CAP);
}

/** A seating as rows: for each seat, its value in each group (or "" when that group has nobody there). */
export function seatRows(m: LrModel, s: Seating): string[][] {
  const rows = Array.from({ length: m.board.n }, () => m.groups.map(() => ""));
  m.groups.forEach((g, gi) => g.values.forEach((v) => { const k = s.get(v); if (k !== undefined) rows[k][gi] = v; }));
  return rows;
}

/** Turns a seating so the first person sits in seat 1, the way the set pictures a round table. */
export function settle(m: LrModel, s: Seating): Seating {
  if (m.board.layout !== "circle") return s;
  const k = s.get(m.groups[0].values[0]);
  if (k === undefined) return s;
  return new Map([...s].map(([r, x]) => [r, mod(x - k, m.board.n)]));
}

/** must, could or cannot: in every case, in some, in none (F84). */
export type Bin = "must" | "could" | "cannot";
export function binOf(e: Expr, cases: Seating[], b: Board): Bin {
  const n = cases.filter((s) => holds(e, (r) => s.get(r)!, b)).length;
  return n === cases.length ? "must" : n ? "could" : "cannot";
}

// ---------------------------------------------------------------------------------------------------------------
// The clue translator (F83)

/**
 * A two-part rule, as the four cases of P and Q, in the order: both, P without Q, Q without P, neither. true = allowed.
 * "P only if Q" rules out P without Q; "P unless Q" rules out neither; and so on.
 */
export type Rule = "if" | "onlyif" | "unless" | "iff" | "or" | "xor" | "nand" | "nor";
export const WORLDS = ["both", "p", "q", "neither"] as const;
export type World = (typeof WORLDS)[number];
const TABLE: Record<Rule, [boolean, boolean, boolean, boolean]> = {
  if: [true, true, false, true], // P if Q: Q, then P
  onlyif: [true, false, true, true], // P only if Q: P, then Q
  unless: [true, true, true, false], // P unless Q: if not Q, then P
  iff: [true, false, false, true],
  or: [true, true, true, false],
  xor: [false, true, true, false],
  nand: [false, true, true, true],
  nor: [false, false, false, true],
};
/** The cases a rule rules out. */
export const ruledOut = (r: Rule): World[] => WORLDS.filter((_, i) => !TABLE[r][i]);

/**
 * The misreadings the drill names (docs/research/lr.md §3.1). Each changes a clue in one way; the drill works out what
 * the changed clue allows and, when the student's answer matches it, says which misreading it was.
 */
export type Misread =
  | "reversed" | "one-way" | "unless-not-both" | "exclusive" | "inclusive" | "neither" | "not-both"
  | "swapped" | "somewhere" | "immediately" | "seats-for-people" | "people-for-seats" | "at-least" | "at-most" | "exactly"
  | "either-side" | "inclusive-ends" | "next-to-one";

export const MISREAD: Record<Misread, { h: string; fix: string }> = {
  reversed: { h: "Read backwards", fix: "\"P only if Q\" means if P, then Q. It says nothing about Q without P. Reversing the arrow, or negating both sides, is the classic slip." },
  "one-way": { h: "Read one way only", fix: "\"If and only if\" runs both ways: each needs the other, so either one alone is ruled out." },
  "unless-not-both": { h: "Read \"unless\" as \"not both\"", fix: "\"P unless Q\" means if not Q, then P. It rules out only neither; both together is still allowed." },
  exclusive: { h: "Added \"but not both\"", fix: "\"Either P or Q\" alone allows both. Only \"but not both\" rules that out." },
  inclusive: { h: "Dropped \"but not both\"", fix: "\"But not both\" rules out the case where both happen, as well as neither." },
  neither: { h: "Read \"not both\" as \"neither\"", fix: "\"Not both\" rules out only the two together; one without the other, or neither, is fine." },
  "not-both": { h: "Read \"neither\" as \"not both\"", fix: "\"Neither P nor Q\" rules out each of them: only the case where neither happens is left." },
  swapped: { h: "Left and right swapped", fix: "Left and right are the person's own. Facing the centre of a table, or facing you, their left is not your left." },
  somewhere: { h: "Read \"immediately\" as \"somewhere\"", fix: "\"Immediately\" means the very next seat, nothing between." },
  immediately: { h: "Read \"somewhere\" as \"immediately\"", fix: "\"To the left of\" on its own means anywhere on that side, not only the next seat." },
  "seats-for-people": { h: "Counted the seats, not the people between", fix: "\"Two people between\" means two seats in the middle, so the two are three seats apart." },
  "people-for-seats": { h: "Counted the people, not the seats", fix: "\"Second to the left\" is two seats along, with one person between, not two." },
  "at-least": { h: "Read \"exactly\" as \"at least\"", fix: "\"Exactly\" fixes the number. More is not allowed." },
  "at-most": { h: "Read \"exactly\" as \"at most\"", fix: "\"Exactly\" fixes the number. Fewer is not allowed." },
  exactly: { h: "Read \"at least\" or \"at most\" as \"exactly\"", fix: "\"At least two\" also allows three or more; \"at most two\" also allows one or none." },
  "either-side": { h: "Forgot which side", fix: "The clue names a side. The same distance on the other side does not fit." },
  "inclusive-ends": { h: "Counted the end seats", fix: "\"Between seats 2 and 6\" means seats 3, 4 and 5: the two named seats are the edges, not part of it." },
  "next-to-one": { h: "Read \"between\" as \"next to\"", fix: "Between two people means somewhere on the stretch from one to the other, not beside one of them." },
};

/** What a misreading turns a rule into. */
export const RULE_TRAPS: Record<Rule, [Misread, Rule][]> = {
  onlyif: [["reversed", "if"]],
  if: [["reversed", "onlyif"]],
  unless: [["unless-not-both", "nand"], ["exclusive", "xor"]],
  iff: [["one-way", "onlyif"], ["one-way", "if"]],
  or: [["exclusive", "xor"]],
  xor: [["inclusive", "or"]],
  nand: [["neither", "nor"], ["exclusive", "xor"]],
  nor: [["not-both", "nand"]],
};

/** A clue changed by one misreading, or null when the misreading does not change it. */
export function misread(e: Expr, how: Misread): Expr | null {
  const map = (x: Expr): Expr => {
    if ("left" in x || "right" in x) {
      const [who, of, d] = "left" in x ? [x.left, x.of, x.d ?? 1] : [x.right, x.of, x.d ?? 1];
      const dir = "left" in x ? "left" : "right";
      const mk = (dd: Dist, flip = false): Expr => ((dir === "left") !== flip ? { left: who, of, d: dd } : { right: who, of, d: dd });
      if (how === "swapped") return mk(d, true);
      if (how === "somewhere" && d === 1) return mk("any");
      if (how === "immediately" && d === "any") return mk(1);
      if (how === "people-for-seats" && typeof d === "number") return mk(d + 1);
      if (how === "either-side" && typeof d === "number") return { gap: [who, of], n: d - 1 };
      return x;
    }
    if ("gap" in x) {
      const cmp = x.cmp ?? "eq";
      if (how === "seats-for-people" && x.n > 0) return { ...x, n: x.n - 1 };
      if (how === "at-least" && cmp === "eq") return { ...x, cmp: "ge" };
      if (how === "at-most" && cmp === "eq") return { ...x, cmp: "le" };
      if (how === "exactly" && cmp !== "eq") return { gap: x.gap, n: x.n };
      return x;
    }
    if ("within" in x) return how === "inclusive-ends" && !x.incl ? { ...x, incl: true } : x;
    if ("between" in x) return how === "next-to-one" ? { or: [{ next: [x.between, x.of[0]] }, { next: [x.between, x.of[1]] }] } : x;
    if ("not" in x) return { not: map(x.not) };
    if ("and" in x) return { and: x.and.map(map) };
    if ("or" in x) return { or: x.or.map(map) };
    if ("xor" in x) return { xor: [map(x.xor[0]), map(x.xor[1])] };
    if ("if" in x) return { if: map(x.if), then: map(x.then) };
    return x;
  };
  const out = map(e);
  return JSON.stringify(out) === JSON.stringify(e) ? null : out;
}

/** A clue to read, as the content file holds it (content/lrdrill/clues.json, docs/content/lr-drills.md). */
export type ClueKind = "onlyif" | "unless" | "iff" | "either" | "count" | "immediate" | "between" | "facing";
interface ClueBase { id: string; kind: ClueKind; text: string; why?: string; from?: string }
/** A two-part rule: the student taps the cases it rules out. np and nq are P and Q said negatively. */
export interface RuleClue extends ClueBase { p: string; q: string; np: string; nq: string; rule: Rule }
/** A seating clue: some people sit already; the student taps every seat `who` can take. */
export interface SeatClue extends ClueBase { board: Board; fixed: Record<Ref, number>; who: Ref; expr: Expr; traps: Misread[] }
export type ClueItem = RuleClue | SeatClue;
export const isRuleClue = (c: ClueItem): c is RuleClue => "rule" in c;

export const CLUE_KIND: Record<ClueKind, string> = {
  onlyif: "Only if", unless: "Unless", iff: "If and only if", either: "Either, or, not both",
  count: "Exactly, at least, at most", immediate: "Immediately or somewhere", between: "Between", facing: "Left and right",
};

/** A clue's id starts with its kind's prefix, so a run can be read by kind without loading the clues (a test checks). */
export const CLUE_PREFIX: Record<string, ClueKind> = { oi: "onlyif", un: "unless", if: "iff", ei: "either", co: "count", im: "immediate", bw: "between", fa: "facing" };
export const kindOfClue = (id: string): ClueKind | undefined => CLUE_PREFIX[id.slice(0, id.indexOf("-"))];

/**
 * The translator kind a set's clue belongs to, so a clue the student misread in a set leads to practice on clues like
 * it (D48). Undefined for clues no kind covers (a plain "next to", a seat number).
 */
export function kindOfExpr(e: Expr): ClueKind | undefined {
  if ("if" in e) return "onlyif";
  if ("xor" in e || "or" in e) return "either";
  if ("gap" in e) return "count";
  if ("between" in e || "within" in e) return "between";
  if ("left" in e || "right" in e) {
    const d = e.d ?? 1;
    return d === "any" || d === 1 ? "immediate" : "facing";
  }
  if ("not" in e) return kindOfExpr(e.not);
  if ("and" in e) return e.and.map(kindOfExpr).find(Boolean);
  return undefined;
}

/** The seats (from 1) where `who` can sit, given the people already seated and a clue. */
export function seatsFor(c: Pick<SeatClue, "board" | "fixed" | "who">, e: Expr): number[] {
  const taken = new Set(Object.values(c.fixed));
  const out: number[] = [];
  for (let s = 1; s <= c.board.n; s++) {
    if (taken.has(s)) continue;
    const pos: Pos = (r) => (r === c.who ? s : c.fixed[r]) - 1;
    if (holds(e, pos, c.board)) out.push(s);
  }
  return out;
}

/** The right answer to a clue: seats `who` can take, or the cases the rule rules out. */
export const answerOf = (c: ClueItem): (number | World)[] => (isRuleClue(c) ? ruledOut(c.rule) : seatsFor(c, c.expr));

/** Each misreading this clue tests, with what it would have the student answer. */
export function trapsOf(c: ClueItem): { how: Misread; answer: (number | World)[] }[] {
  if (isRuleClue(c)) return RULE_TRAPS[c.rule].map(([how, r]) => ({ how, answer: ruledOut(r) }));
  return c.traps.flatMap((how) => { const e = misread(c.expr, how); return e ? [{ how, answer: seatsFor(c, e) }] : []; });
}

const sameSet = <T,>(a: T[], b: T[]) => a.length === b.length && a.every((x) => b.includes(x));

/** Marks an answer: right, or which misreading it matches, if any. */
export function markClue(c: ClueItem, picked: (number | World)[]): { ok: boolean; miss?: Misread } {
  if (sameSet(picked, answerOf(c))) return { ok: true };
  return { ok: false, miss: trapsOf(c).find((t) => sameSet(t.answer, picked))?.how };
}
