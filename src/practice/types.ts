import type { OptionTrap } from "../data/traps";

export type Genre = "economics" | "philosophy" | "psychology" | "science" | "society" | "technology" | "literature" | "history" | "arts";
export const GENRES: Record<Genre, string> = {
  economics: "Economics and business",
  philosophy: "Philosophy",
  psychology: "Psychology",
  science: "Science and ecology",
  society: "Society",
  technology: "AI and technology",
  literature: "Literature",
  history: "History",
  arts: "Arts",
};
export type Difficulty = "easy" | "medium" | "hard";

export type RcQType = "main" | "tone" | "inference" | "detail" | "except" | "strengthen" | "application" | "structure";
export const RC_QTYPE: Record<RcQType, { label: string; error: string }> = {
  main: { label: "Main idea", error: "RC: main idea" },
  tone: { label: "Tone or purpose", error: "RC: tone or purpose" },
  inference: { label: "Inference", error: "RC: inference" },
  detail: { label: "Specific detail", error: "RC: specific detail" },
  except: { label: "EXCEPT", error: "RC: EXCEPT" },
  strengthen: { label: "Strengthen or weaken", error: "RC: strengthen or weaken" },
  application: { label: "Application", error: "RC: application" },
  structure: { label: "Paragraph function", error: "RC: paragraph function" },
};

export interface RcOption {
  t: string;
  /** Why this option is right or wrong */
  why: string;
  /** Set on every wrong option. The one option without a trap is the answer. */
  trap?: OptionTrap;
}
export interface RcQuestion {
  type: RcQType;
  stem: string;
  /** Paragraphs (0-based) that settle the answer, highlighted in review */
  proof: number[];
  options: RcOption[];
  answer: number;
}
export interface RecallQ { q: string; options: string[]; answer: number }

export interface RcSet {
  id: string;
  title: string;
  genre: Genre;
  difficulty: Difficulty;
  paras: string[];
  questions: RcQuestion[];
  /** Two plain recall questions for the reading speed test */
  recall: RecallQ[];
  /** The day this set may join the RC of the day rotation. See dailyPick in daily.ts. */
  since?: string;
  /** The model summary shown after the set, before the answers. claim and qualifier are exact phrases from model. */
  summary?: RcSummary;
}

export interface RcSummary { model: string; tone: Tone; claim: string; qualifier: string }

/** Tones a student can pick for a passage, in the words CAT tone questions use. */
export const TONES = ["analytical", "critical", "sceptical", "appreciative", "cautionary", "persuasive", "ironic", "optimistic", "neutral"] as const;
export type Tone = (typeof TONES)[number];
export const SUMMARY_MAX_WORDS = 25;

export type CrType = "assumption" | "strengthen" | "weaken" | "inference" | "flaw" | "paradox";
/** The six kinds of critical reasoning question, in the order a mixed drill takes them. */
export const CR_TYPE: Record<CrType, { label: string }> = {
  assumption: { label: "Assumption" },
  strengthen: { label: "Strengthen" },
  weaken: { label: "Weaken" },
  inference: { label: "Inference" },
  flaw: { label: "Flaw" },
  paradox: { label: "Paradox" },
};
export const CR_TYPES = Object.keys(CR_TYPE) as CrType[];

/** One critical reasoning question: a short argument or set of statements, one question, four options. */
export interface CrItem {
  id: string;
  type: CrType;
  difficulty: Difficulty;
  topic: string;
  /** The argument, or for inference and paradox questions the statements, as one paragraph */
  stimulus: string;
  /** The conclusion, quoted exactly from the stimulus and highlighted in review. Null for inference and paradox questions, which have none. */
  conclusion: string | null;
  question: string;
  /** Four options. As in RC, the one option without a trap is the answer. */
  options: RcOption[];
  answer: number;
  /** The one rule to take from this question */
  takeaway: string;
  /** Words in the stimulus */
  wordCount: number;
}

/**
 * One authored paragraph. Each one yields four VA items:
 * a para jumble (all the core sentences), an odd sentence out (four of them plus the odd one),
 * a sentence insertion (the core sentences, with ins as the missing one that goes at insAt),
 * and a para summary (the full paragraph, core with ins put back).
 * Older paragraphs have four core sentences and no pj or ooo, so their order is shuffled when an item is built.
 * Newer ones have five, with the order shown fixed by hand in pj and ooo.
 */
export interface VaPara {
  id: string;
  topic: string;
  difficulty: Difficulty;
  /** Core sentences in the right order: four, or five in the newer paragraphs */
  s: string[];
  /** Why each core sentence sits where it does: s[0] is the opener, s[i] follows s[i-1] */
  cues: string[];
  /** Word or phrase in each core sentence that gives its position away, highlighted in review */
  marks: string[];
  /** Words in the core sentences. Newer paragraphs only. */
  wordCount?: number;
  /** Para jumble as shown. show[i] is the number (1-based) of the core sentence at position i + 1; answer is the key, such as "24153". */
  pj?: { show: number[]; answer: string };
  /** Odd sentence out as shown. show[i] is a core sentence number, or 0 for the odd one; answer is the position (1-based) of the odd one; drop is the core sentence left out. */
  ooo?: { show: number[]; answer: number; drop: number };
  odd: string;
  oddWhy: string;
  /** A sentence that belongs in the paragraph at gap insAt (0 = before s[0], s.length = after the last core sentence) */
  ins: string;
  insAt: number;
  insWhy: string;
  /** Four para summary options for the full paragraph. As in RC, the one option without a trap is the answer. */
  sum: [RcOption, RcOption, RcOption, RcOption];
  /** The day this paragraph may join the daily VA rotation. See dailyPick in daily.ts. */
  since?: string;
}

/**
 * What lists, the daily rotation and the redo queue need to know about an RC set, without its text.
 * catalog.gen.ts holds one of these per set, so the full passages can load only when a practice page opens.
 */
/** lead is the opening paragraph's length in characters: the home page reserves that much room while the text loads. */
/** v is the content version (contentHash): it changes when a question, option or answer changes, so old attempts can tell. */
export interface RcMeta { id: string; title: string; genre: Genre; difficulty: Difficulty; words: number; questions: number; lead: number; v: string; since?: string }
export interface VaMeta { id: string; topic: string; difficulty: Difficulty; v: string; since?: string }
export interface CrMeta { id: string; type: CrType; difficulty: Difficulty; topic: string; v: string }

/** Logical reasoning set types (docs/research/lr.md §2). One content/lr/<type>.json file each. */
export type LrType = "arrangement" | "selection" | "distribution" | "ranking" | "tournament" | "caselet" | "scheduling" | "binary" | "setmax" | "venn" | "routes" | "directions" | "relations" | "clocks" | "quant-lr" | "cubes" | "mixed";
export const LR_TYPE: Record<LrType, { label: string }> = {
  // The order a student meets the types in (practice list, next set): the commonest in CAT first.
  arrangement: { label: "Arrangement" },
  tournament: { label: "Games and tournaments" },
  caselet: { label: "Reasoning DI and caselets" },
  binary: { label: "Binary logic" },
  distribution: { label: "Distribution and matching" },
  selection: { label: "Grouping and selection" },
  scheduling: { label: "Scheduling" },
  routes: { label: "Routes and networks" },
  directions: { label: "Directions and distances" },
  setmax: { label: "Set theory: maximum and minimum" },
  venn: { label: "Venn diagrams and syllogisms" },
  relations: { label: "Blood relations" },
  clocks: { label: "Clocks and calendars" },
  ranking: { label: "Ranking and ordering" },
  "quant-lr": { label: "Quant-based LR" },
  cubes: { label: "Cubes and dice" },
  mixed: { label: "Mixed" },
};
export const LR_TYPES = Object.keys(LR_TYPE) as LrType[];

/** A table shown with a set, or the final grid in its solution. */
export interface LrTable { caption?: string; head: string[]; rows: string[][] }
/**
 * One question. answer is an option index (MCQ) or the text to type (TITA). uses names the clues (from 1) that settle
 * it, highlighted in review. if is an extra condition for this question only ("if additionally…").
 */
export interface LrQuestion { stem: string; kind: "mcq" | "tita"; options?: string[]; answer: number | string; uses: number[]; why: string[]; if?: string; fig?: LrDiagram }
/**
 * The solution as a picture that fills in step by step (F23 review), and the blank layout of the scratch pad.
 * frames[i] is the picture after solution step i: frames[i][row][seat] holds the lines written in that seat, the
 * person first ("" when only an attribute is known); [] while nothing is known, null for a seat known to be empty.
 * A line ending in "?" is one possible place, not a fact. A row picture may have several rows (one per morning, say).
 * Seats run left to right, or for a circle round to the left (clockwise seen from above) from the bottom.
 * A grid is a table: rows are its row heads, seats its column heads, and null a cell that cannot hold anything (a team
 * against itself). mirror, for a results grid whose first columns are the row teams in the same order, fills in the
 * other team's result on the scratch pad (W in Aces v Bulls writes L in Bulls v Aces). A bracket has one row per round
 * and one seat per match slot, null for slots a round does not have; a match lists both players, then the winner if
 * known, then any notes ("upset"). A network has one seat per town, placed at `at` ([x, y], 0 to 100 across and down),
 * joined by `links` ([from seat, to seat, label]); a seat's lines are what is known about the town (its distance);
 * `lit[step]` lists the links drawn bold at that step (the route found). A venn has two or three circles named in
 * `sets` and one seat per region, in the order A only, B only, AB (two circles) or A only, B only, C only, AB only,
 * AC only, BC only, ABC (three), then None (outside every circle); a region whose first line is "empty" is shaded.
 * The newer layouts (D53, docs/design/lr-visuals.md): a `tree` is a family tree drawn like a network (a link labelled
 * "=" is a marriage, any other a parent to a child); a `clock` has one dial per seat, its first line a time ("8:24",
 * "4:54 6/11") and an optional second line the angle shaded between the hands ("108°"); a `map` draws one walk per
 * seat from `paths` (points in metres east and north of the start), `legs[step][path]` legs of each drawn so far and
 * `ties[step]` dashed distance lines; a `timeline` has one lane per row and `bars` ([lane, start, end, label]) on a
 * `span` axis, `lit[step]` naming the bars shown; `bars` draws one bar per seat, its height the number its first line
 * starts with. A question's own picture (`fig`) has one frame per line of its explanation.
 */
export interface LrDiagram {
  layout: "row" | "circle" | "grid" | "bracket" | "network" | "venn" | "tree" | "clock" | "map" | "timeline" | "bars";
  /** false when the blank layout would give the answer away: the attempt then shows the notes box alone */
  pad?: false;
  /** grid and row: a cell whose first line is a key takes that tone ("true": "good") */
  tones?: Record<string, "good" | "bad" | "key">;
  paths?: { name: string; pts: [number, number][] }[];
  legs?: number[][];
  ties?: [[number, number], [number, number], string][][];
  span?: [number, number];
  bars?: [number, number, number, string][];
  seats: string[];
  rows?: string[];
  mirror?: Record<string, string>;
  at?: [number, number][];
  links?: [number, number, string][];
  lit?: number[][];
  sets?: string[];
  /** venn only: the scratch pad's circle names, when each question has its own groups (syllogisms) */
  padSets?: string[];
  note?: string;
  frames: (string[] | null)[][][];
}
/** A logical reasoning set (docs/content/lr-format.md). source says it is original or used with permission (D38). */
export interface LrSet {
  id: string;
  title: string;
  type: LrType;
  sub?: string;
  difficulty: Difficulty;
  /** Target time in minutes */
  minutes: number;
  source: string;
  /** The day the set may join a daily rotation, as for RC */
  since: string;
  intro: string[];
  clues: string[];
  tables?: LrTable[];
  questions: LrQuestion[];
  solution: { steps: string[]; grid?: LrTable; cases?: number; diagram?: LrDiagram };
}
/** apart: each question is its own short puzzle (no shared clues or tables), so the set is not a CAT-style set for the Arena. */
export interface LrMeta { id: string; title: string; type: LrType; sub?: string; difficulty: Difficulty; minutes: number; questions: number; since: string; v: string; apart?: true }

/**
 * A short fingerprint (32-bit FNV-1a, 8 hex digits) of what decides an answer. Not for security; it only has to change
 * when the content does. RC sets hash their questions, options and answers but not the passage, so fixing a typo in a
 * paragraph does not mark old attempts as outdated.
 */
export function contentHash(x: unknown): string {
  const str = JSON.stringify(x);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, "0");
}
export const rcVersion = (s: RcSet) => contentHash(s.questions.map((q) => [q.stem, q.options.map((o) => o.t), q.answer]));

export function rcMeta(s: RcSet): RcMeta {
  const m: RcMeta = { id: s.id, title: s.title, genre: s.genre, difficulty: s.difficulty, words: setWords(s), questions: s.questions.length, lead: s.paras[0].length, v: rcVersion(s) };
  if (s.since) m.since = s.since;
  return m;
}
/**
 * A passage's opening paragraph, split before its last sentence. That sentence is usually where
 * the passage turns ("This defence contains a truth and hides a confusion."), so Home highlights it.
 */
export function rcLead(s: RcSet): [string, string] {
  const p = s.paras[0];
  const sents = p.match(/[^.!?]+[.!?]+["”’)]*\s*/g);
  if (!sents || sents.length < 2) return [p, ""];
  const at = p.lastIndexOf(sents[sents.length - 1].trim());
  return [p.slice(0, at).trimEnd(), p.slice(at).trim()];
}
/** An LR set's content version: what decides its answers (the story, clues, tables and questions), not explanations or dates. */
export const lrVersion = (s: LrSet) => contentHash([s.intro, s.clues, s.tables ?? [], s.questions.map((q) => [q.stem, q.kind, q.options ?? [], q.answer, q.if ?? ""])]);
export function lrMeta(s: LrSet): LrMeta {
  const m: LrMeta = { id: s.id, title: s.title, type: s.type, difficulty: s.difficulty, minutes: s.minutes, questions: s.questions.length, since: s.since, v: lrVersion(s) };
  if (s.sub) m.sub = s.sub;
  if (!s.clues.length && !s.tables?.length) m.apart = true;
  return m;
}
export const crMeta = (c: CrItem): CrMeta => ({ id: c.id, type: c.type, difficulty: c.difficulty, topic: c.topic, v: contentHash(c) });
/** A VA paragraph's content version; its publishing date does not count. */
export function vaVersion(p: VaPara): string {
  const { since: _since, ...rest } = p;
  return contentHash(rest);
}
export function vaMeta(p: VaPara): VaMeta {
  const m: VaMeta = { id: p.id, topic: p.topic, difficulty: p.difficulty, v: vaVersion(p) };
  if (p.since) m.since = p.since;
  return m;
}

/** The whole paragraph as a para summary question shows it: the core sentences with ins in its gap. */
export function paraText(p: VaPara): string {
  const s: string[] = [...p.s];
  s.splice(p.insAt, 0, p.ins);
  return s.join(" ");
}

export const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
export const setWords = (s: RcSet) => s.paras.reduce((n, p) => n + words(p), 0);
