import type { LrSet } from "../types";
import arrangement from "../../../content/lr/arrangement.json";
import caselet from "../../../content/lr/caselet.json";
import routes from "../../../content/lr/routes.json";
import setmax from "../../../content/lr/setmax.json";
import tournament from "../../../content/lr/tournament.json";
import venn from "../../../content/lr/venn.json";

/**
 * Logical reasoning sets (docs/content/lr-format.md), one JSON file per type in content/lr/. Only original sets or sets
 * used with permission (D38). Add a new type's file here too; catalog.test.ts fails if the two lists differ. JSON has no
 * types, so content.test.ts checks every set's shape and answers.
 */
export const LR_BY_FILE = { arrangement, caselet, routes, setmax, tournament, venn } as unknown as Record<string, LrSet[]>;
export const LR_SETS: LrSet[] = Object.values(LR_BY_FILE).flat();
