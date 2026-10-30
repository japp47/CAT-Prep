import { addDays } from "../lib/date";
import type { AppState, PracticeSet } from "../lib/state";
import { LR_GUIDE_BY_TYPE } from "../sections/dilr/guides";
import { CR_CATALOG, LR_CATALOG } from "./catalog.gen";
import { clueReport } from "./lrdrill";
import { CLUE_KIND, type ClueKind } from "./lrlogic";
import { CR_TYPE, CR_TYPES, LR_TYPE, LR_TYPES, RC_QTYPE, type CrType, type LrType, type RcQType, type RcSet } from "./types";
import { VA_KIND, VA_KINDS, type VaKind } from "./va/build";
import { rcStale } from "./versions";

/**
 * The skill map (F89, D63, docs/design/progress-v2.md): one tile per skill, in five states set by a rule over recorded
 * answers, so no tile gives a verdict on too little data (D51) and "strong" means the skill has held: no miss of it
 * left waiting in the redo queue for a week or more.
 */

export const JUDGE_AT = 8;
export const WEAK_UNDER = 60;
export const STRONG_AT = 80;
/** A redo miss older than this and still open means the skill has not held yet. */
export const HELD_DAYS = 7;

export type SkillState = "new" | "learning" | "weak" | "steady" | "strong";
export const STATE_LABEL: Record<SkillState, string> = { new: "Not started", learning: "Learning", weak: "Weak", steady: "Steady", strong: "Strong" };

/** waiting: a miss of this skill has sat in the redo queue for a week or more, which keeps an 80% skill at steady. */
export interface Skill { key: string; label: string; a: number; c: number; pct: number | null; state: SkillState; to: string; waiting?: true }
export interface SkillFamily { id: string; title: string; skills: Skill[] }

/** The state of a skill from its answers and whether an old miss of it is still in the redo queue. */
export function stateOf(a: number, c: number, unfixed: boolean): SkillState {
  if (a === 0) return "new";
  if (a < JUDGE_AT) return "learning";
  const pct = (c / a) * 100;
  if (pct < WEAK_UNDER) return "weak";
  return pct >= STRONG_AT && !unfixed ? "strong" : "steady";
}

type Tally = Map<string, { a: number; c: number }>;
const count = (m: Tally, k: string, ok: boolean) => { const t = m.get(k) ?? { a: 0, c: 0 }; t.a++; if (ok) t.c++; m.set(k, t); };

const CR_OF = new Map(CR_CATALOG.map((c) => [c.id, c.type]));
const LR_OF = new Map(LR_CATALOG.map((s) => [s.id, s.type]));

/** The skill a redo key belongs to: "rc:<set>:<q>", a VA key such as "pj:bees", "cr:<id>" or "lr:<set>:<q>". */
function skillOfRedo(k: string, rcById: ((id: string) => RcSet | undefined) | null): string | null {
  const [kind, id, q] = k.split(":");
  if (kind === "rc") { const t = rcById?.(id)?.questions[+q]?.type; return t ? "rc:" + t : null; }
  if (kind === "cr") { const t = CR_OF.get(id); return t ? "cr:" + t : null; }
  if (kind === "lr") { const t = LR_OF.get(id); return t ? "lr:" + t : null; }
  return kind in VA_KIND ? "va:" + kind : null;
}

/** Skills with a miss added HELD_DAYS or more ago that has not left the redo queue. */
function unfixedSkills(st: AppState, rcById: ((id: string) => RcSet | undefined) | null, today: string): Set<string> {
  const cut = addDays(today, -HELD_DAYS), out = new Set<string>();
  st.redo.forEach((r) => { if (!r.cleared && r.added <= cut) { const s = skillOfRedo(r.k, rcById); if (s) out.add(s); } });
  return out;
}

function family(id: string, title: string, keys: string[], label: (k: string) => string, to: (k: string) => string, tally: Tally, unfixed: Set<string>): SkillFamily {
  return {
    id, title,
    skills: keys.map((k) => {
      const t = tally.get(`${id}:${k}`) ?? { a: 0, c: 0 }, waiting = unfixed.has(`${id}:${k}`);
      const s: Skill = { key: `${id}:${k}`, label: label(k), a: t.a, c: t.c, pct: t.a ? Math.round((t.c / t.a) * 100) : null, state: stateOf(t.a, t.c, waiting), to: to(k) };
      if (waiting) s.waiting = true;
      return s;
    }),
  };
}

/**
 * The map for a section. RC question kinds need the passages (`rcById`); without them the RC family is left out, so
 * the page can show the rest at once and add RC when the passages arrive.
 */
export function skillMap(st: AppState, sec: "VARC" | "DILR", today: string, rcById: ((id: string) => RcSet | undefined) | null): SkillFamily[] {
  const tally: Tally = new Map();
  const unfixed = unfixedSkills(st, rcById, today);
  if (sec === "VARC") {
    if (rcById) st.rcAttempts.forEach((a) => {
      const set = rcById(a.set);
      // An attempt on a set rewritten since would count its answers against the new questions.
      if (!set || rcStale(a)) return;
      set.questions.forEach((q, i) => { if (a.ans[i] != null) count(tally, "rc:" + q.type, a.ans[i] === q.answer); });
    });
    st.vaAttempts.forEach((a) => a.items.forEach((i) => { const kind = i.k.split(":")[0]; if (kind in VA_KIND && i.a !== "") count(tally, "va:" + kind, i.ok); }));
    st.crAttempts.forEach((a) => a.items.forEach((i) => { const t = CR_OF.get(i.k.replace(/^cr:/, "")); if (t && i.a !== null) count(tally, "cr:" + t, i.ok); }));
    return [
      ...(rcById ? [family("rc", "RC questions", Object.keys(RC_QTYPE), (k) => RC_QTYPE[k as RcQType].label, () => "/varc?guide=rc", tally, unfixed)] : []),
      family("va", "Verbal ability", VA_KINDS, (k) => VA_KIND[k as VaKind].label, (k) => `/practice/va?type=${k}&n=6`, tally, unfixed),
      family("cr", "Critical reasoning", CR_TYPES, (k) => CR_TYPE[k as CrType].label, (k) => `/practice/cr?type=${k}&n=6`, tally, unfixed),
    ];
  }
  // DILR: every answered question of an LR set counts for its type; the set's c is how many were right.
  st.lrAttempts.forEach((a) => {
    const t = LR_OF.get(a.set);
    if (!t) return;
    const n = a.ans.filter((x) => x !== null && x !== "").length;
    const tt = tally.get("lr:" + t) ?? { a: 0, c: 0 };
    tally.set("lr:" + t, { a: tt.a + n, c: tt.c + Math.min(a.c, n) });
  });
  clueReport(st.lrDrills).kinds.forEach((k) => tally.set("clue:" + k.kind, { a: k.a, c: k.c }));
  const types = LR_TYPES.filter((t) => LR_CATALOG.some((s) => s.type === t));
  return [
    family("lr", "Set types", types, (k) => LR_TYPE[k as LrType].label, (k) => (LR_GUIDE_BY_TYPE.has(k as LrType) ? `/dilr?guide=${k}` : "/dilr/practice"), tally, unfixed),
    family("clue", "Reading clues", Object.keys(CLUE_KIND), (k) => CLUE_KIND[k as ClueKind], (k) => `/practice/clues?kind=${k}`, tally, unfixed),
  ];
}

/** The skill to start with: the weakest with a verdict (weak before steady, then lowest accuracy, then most answers). */
export function startHere(fams: SkillFamily[]): Skill | null {
  const judged = fams.flatMap((f) => f.skills).filter((s) => s.state === "weak" || s.state === "steady");
  judged.sort((x, y) => Number(y.state === "weak") - Number(x.state === "weak") || x.pct! - y.pct! || y.a - x.a);
  return judged[0] ?? null;
}

/** How many skills are in each state, for the map's one-line summary. */
export function stateCounts(fams: SkillFamily[]): Record<SkillState, number> {
  const out: Record<SkillState, number> = { new: 0, learning: 0, weak: 0, steady: 0, strong: 0 };
  fams.forEach((f) => f.skills.forEach((s) => out[s.state]++));
  return out;
}

/** Fewer questions than this in a week and its bar is drawn empty, not as a percentage. */
export const WEEK_MIN = 10;

/** Accuracy in each of the last `weeks` seven-day spans ending today, oldest first, from a section's practice rows. */
export function weeklyAccuracy(practice: PracticeSet[], sec: string, today: string, weeks = 6): { from: string; to: string; a: number; c: number; pct: number | null }[] {
  return Array.from({ length: weeks }, (_, i) => {
    const to = addDays(today, -7 * (weeks - 1 - i)), from = addDays(to, -6);
    const rows = practice.filter((p) => p.sec === sec && p.d >= from && p.d <= to);
    const a = rows.reduce((s, p) => s + p.a, 0), c = rows.reduce((s, p) => s + p.c, 0);
    return { from, to, a, c, pct: a >= WEEK_MIN ? Math.round((c / a) * 100) : null };
  });
}
