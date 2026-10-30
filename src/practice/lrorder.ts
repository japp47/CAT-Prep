import type { LrAttempt } from "../lib/state";
import { LR_CATALOG } from "./catalog.gen";
import { LR_TYPES, type LrMeta } from "./types";

const LEVEL = { easy: 0, medium: 1, hard: 2 } as const;
/** Easiest first, then shorter first, type by type: the order a student should meet the sets in. */
export const LR_ORDER: LrMeta[] = [...LR_CATALOG].sort((a, b) => LR_TYPES.indexOf(a.type) - LR_TYPES.indexOf(b.type) || LEVEL[a.difficulty] - LEVEL[b.difficulty] || a.minutes - b.minutes);

/** The first set in the practice order the student has not tried, or undefined when every set is tried. */
export const nextLrSet = (lr: LrAttempt[]): LrMeta | undefined => { const tried = new Set(lr.map((a) => a.set)); return LR_ORDER.find((s) => !tried.has(s.id)); };
