import type { RcSet } from "../types";
import economics from "../../../content/rc/economics.json";
import humanities from "../../../content/rc/humanities.json";
import mind from "../../../content/rc/mind.json";
import science from "../../../content/rc/science.json";
import society from "../../../content/rc/society.json";

/**
 * Original RC sets written for this site, kept as JSON in content/rc/ so the server can read them later (docs/plan.md, "Where data lives").
 * Add a set to one of those files. JSON has no types, so content.test.ts checks their shape and answer keys.
 */
export const RC_SETS: RcSet[] = [...economics, ...mind, ...science, ...society, ...humanities] as unknown as RcSet[];
export const rcById = (id: string) => RC_SETS.find((s) => s.id === id);
