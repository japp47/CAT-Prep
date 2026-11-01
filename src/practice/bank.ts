/**
 * Loaders for the practice content, one chunk per content file, so a page downloads only what it shows:
 * an RC set loads its own file (about 15 to 30 KB), not every passage. This is the only file that names
 * the content files; content.ts calls these loaders and caches what they return.
 */
import type { LrDrills, MccDrill } from "./lrdrill";
import type { ReplayPuzzle } from "./replay";
import type { ClueItem, LrModel } from "./lrlogic";
import type { CrItem, LrSet, RcSet, VaPara } from "./types";

// Each content/rc/*.json becomes its own chunk. A new file is picked up here without a change.
const RC = import.meta.glob<{ default: unknown }>("../../content/rc/*.json");
const path = (file: string) => `../../content/rc/${file}.json`;

export const RC_FILES = Object.keys(RC).map((p) => p.slice(p.lastIndexOf("/") + 1, -".json".length));

export function loadRcFile(file: string): Promise<RcSet[]> {
  const f = RC[path(file)];
  return f ? f().then((m) => m.default as RcSet[]) : Promise.reject(new Error("No RC file " + file));
}
// Each content/lr/*.json (one LR type) becomes its own chunk too.
const LR = import.meta.glob<{ default: unknown }>("../../content/lr/*.json");
export const LR_FILES = Object.keys(LR).map((p) => p.slice(p.lastIndexOf("/") + 1, -".json".length));

export function loadLrFile(file: string): Promise<LrSet[]> {
  const f = LR[`../../content/lr/${file}.json`];
  return f ? f().then((m) => m.default as LrSet[]) : Promise.reject(new Error("No LR file " + file));
}
export const loadVaParas = (): Promise<VaPara[]> => import("./va/paragraphs").then((m) => m.VA_PARAS);
/** The LR drills' content (F83 to F85, F57): clues to read, set models, must-could-cannot drills and replay sets, in one chunk. */
export const loadLrDrills = (): Promise<LrDrills> => Promise.all([
  import("../../content/lrdrill/clues.json"), import("../../content/lrdrill/models.json"), import("../../content/lrdrill/mcc.json"), import("../../content/lrdrill/replay.json"),
]).then(([c, m, x, r]) => ({ clues: c.default as ClueItem[], models: m.default as unknown as LrModel[], mcc: x.default as unknown as MccDrill[], replay: r.default as unknown as ReplayPuzzle[] }));
export const loadCrItems = (): Promise<CrItem[]> => import("./cr").then((m) => m.CR_ITEMS);
