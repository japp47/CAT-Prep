import type { CrItem } from "../types";
import items from "../../../content/cr/items.json";

/**
 * Original critical reasoning questions written for this site, kept as JSON in content/cr/ so the server can read them later.
 * CAT does not ask them, but XAT does. JSON has no types, so content.test.ts checks their shape and answer keys.
 */
export const CR_ITEMS: CrItem[] = items as unknown as CrItem[];
