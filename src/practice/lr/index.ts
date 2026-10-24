import type { LrSet } from "../types";
import arrangement from "../../../content/lr/arrangement.json";

/**
 * Logical reasoning sets (docs/content/lr-format.md), one JSON file per type in content/lr/. Only original sets or sets
 * used with permission (D38). Add a new type's file here too; catalog.test.ts fails if the two lists differ. JSON has no
 * types, so content.test.ts checks every set's shape and answers.
 */
export const LR_BY_FILE = { arrangement } as unknown as Record<string, LrSet[]>;
export const LR_SETS: LrSet[] = Object.values(LR_BY_FILE).flat();
