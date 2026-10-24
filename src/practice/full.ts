/**
 * All practice content at once, loaded synchronously. For tests and `npm run catalog` only:
 * the site loads content in parts through content.ts, and a test stops app code importing this file.
 */
import { CR_ITEMS } from "./cr";
import { LR_SETS } from "./lr";
import { makeContent } from "./content";
import { RC_SETS } from "./rc";
import { VA_PARAS } from "./va/paragraphs";

export const CONTENT = makeContent(RC_SETS, VA_PARAS, CR_ITEMS, LR_SETS);
