/**
 * The full practice content: every passage, question and paragraph.
 * Import it only through loadContent() in content.ts, so it stays out of the main bundle.
 */
import { CR_ITEMS } from "./cr";
import { RC_SETS } from "./rc";
import type { Content } from "./content";
import { VA_PARAS } from "./va/paragraphs";

const byId = new Map(RC_SETS.map((s) => [s.id, s]));
const crById = new Map(CR_ITEMS.map((c) => [c.id, c]));
export const CONTENT: Content = { rcSets: RC_SETS, rcById: (id) => byId.get(id), vaParas: VA_PARAS, crItems: CR_ITEMS, crById: (id) => crById.get(id) };
