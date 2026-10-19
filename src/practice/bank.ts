/**
 * Loaders for the practice content, one chunk per content file, so a page downloads only what it shows:
 * an RC set loads its own file (about 15 to 30 KB), not every passage. This is the only file that names
 * the content files; content.ts calls these loaders and caches what they return.
 */
import type { CrItem, RcSet, VaPara } from "./types";

// Each content/rc/*.json becomes its own chunk. A new file is picked up here without a change.
const RC = import.meta.glob<{ default: unknown }>("../../content/rc/*.json");
const path = (file: string) => `../../content/rc/${file}.json`;

export const RC_FILES = Object.keys(RC).map((p) => p.slice(p.lastIndexOf("/") + 1, -".json".length));

export function loadRcFile(file: string): Promise<RcSet[]> {
  const f = RC[path(file)];
  return f ? f().then((m) => m.default as RcSet[]) : Promise.reject(new Error("No RC file " + file));
}
export const loadVaParas = (): Promise<VaPara[]> => import("./va/paragraphs").then((m) => m.VA_PARAS);
export const loadCrItems = (): Promise<CrItem[]> => import("./cr").then((m) => m.CR_ITEMS);
