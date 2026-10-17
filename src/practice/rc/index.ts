import type { RcSet } from "../types";
import { ECONOMICS } from "./economics";
import { HUMANITIES } from "./humanities";
import { MIND } from "./mind";
import { SCIENCE } from "./science";
import { SOCIETY } from "./society";

/** Original RC sets written for this site. Add a set by adding it to one of these files. */
export const RC_SETS: RcSet[] = [...ECONOMICS, ...MIND, ...SCIENCE, ...SOCIETY, ...HUMANITIES];
export const rcById = (id: string) => RC_SETS.find((s) => s.id === id);
