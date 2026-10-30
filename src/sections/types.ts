import type { Mock } from "../lib/state";

export type SectionId = "varc" | "dilr" | "quant";

/** [label, href]. An href starting with "/" is a page inside this site. */
export type Link = [string, string];

export type Priority = "must" | "good" | "opt";

export interface Resource {
  id: string;
  /** Category id */
  c: string;
  n: string;
  u: string;
  /** Type and size, e.g. "Book. Arun Sharma" */
  t: string;
  /** Why it is useful */
  w: string;
  p: Priority;
  /** Link opens a search rather than the item itself */
  find?: 1;
  /** Link was not opened during research */
  flag?: 1;
  alt?: { l: string; u: string };
}

export interface Category {
  id: string;
  tab: string;
  n: string;
  note: string;
}

export interface Block {
  id: string;
  name: string;
  /** Usual length in minutes */
  m: number;
  /** Minimum useful length in minutes */
  mm: number;
  /** 1 is the core task. Extras use 0 and are shown as 9 once placed. */
  pri: number;
  ord: number;
  desc: string;
  links: Link[];
  kind?: "practice" | "paper";
  ptype?: string;
  paper?: string;
  pkind?: string;
  /** The on-site action the block's button opens: a path, or "lr-next" for the next LR set (planner/go.ts, D56) */
  go?: string;
}

export interface PlanCtx {
  ticks: Record<string, 1>;
  mocks: Mock[];
}

export interface DayTemplate {
  base: Block[];
  extra: Block[];
}

export interface PhaseText {
  goal: string;
  check: string;
}

export interface SectionDef {
  id: SectionId;
  short: string;
  name: string;
  /** live: page and timetable. open: the page, learn guides and resources, not yet in the timetable. soon: a placeholder. */
  status: "live" | "open" | "soon";
  tagline: string;
  /** Default minutes on a weekday and on Saturday or Sunday */
  defaults: { wd: number; we: number };
  /** Question count in the CAT section, used to validate scores */
  maxQ: number;
  practiceTypes: string[];
  errorTypes: string[];
  phaseText?: Record<number, PhaseText>;
  template?: (d: string, ctx: PlanCtx) => DayTemplate;
  /** One-time setup for each phase (resource ids, ticked like the Learn tab's): Today's "Set up your prep" (D57) */
  setup?: Record<number, string[]>;
  /** The first day the section is in the timetable: earlier days plan no time for it and owe no catch-up (D56) */
  liveSince?: string;
  /** The curated resource list, loaded on demand: only the section page and Today show it. Use useResources(). */
  resources?: () => Promise<SectionResources>;
}

export interface SectionResources { categories: Category[]; resources: Resource[] }
