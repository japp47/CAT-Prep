/**
 * The full practice content: every passage, question and paragraph.
 * Import it only through loadContent() in content.ts, so it stays out of the main bundle.
 */
import { RC_SETS } from "./rc";
import type { Content } from "./content";
import { VA_PARAS } from "./va/paragraphs";

const byId = new Map(RC_SETS.map((s) => [s.id, s]));
export const CONTENT: Content = { rcSets: RC_SETS, rcById: (id) => byId.get(id), vaParas: VA_PARAS };
