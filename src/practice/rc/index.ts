import type { RcSet } from "../types";
import economics from "../../../content/rc/economics.json";
import humanities from "../../../content/rc/humanities.json";
import mind from "../../../content/rc/mind.json";
import science from "../../../content/rc/science.json";
import society from "../../../content/rc/society.json";
import arts from "../../../content/rc/arts.json";
import aiTechnology from "../../../content/rc/ai&technology.json";

/**
 * Original RC sets written for this site, kept as JSON in content/rc/ so the server can read them later (docs/plan.md, "Where data lives").
 * Add a set to one of those files. JSON has no types, so content.test.ts checks their shape and answer keys.
 */
export const RC_SETS: RcSet[] = [...economics, ...mind, ...science, ...society, ...humanities, ...arts, ...aiTechnology] as unknown as RcSet[];
/** The same sets by file name. The site loads one file at a time (bank.ts); the catalog records which file holds each set. */
export const RC_BY_FILE = { economics, mind, science, society, humanities, arts, "ai&technology": aiTechnology } as unknown as Record<string, RcSet[]>;
export const rcById = (id: string) => RC_SETS.find((s) => s.id === id);
