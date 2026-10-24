import type { SectionDef, SectionId } from "./types";
import { VARC } from "./varc";

/**
 * DILR is open: its page, Learn tab and resources are up (LR first, D37), but it is not in the timetable until it has
 * plan blocks and its own practice. Quant is a placeholder. To make a section live, give it a template and phaseText
 * like VARC, then set status to "live".
 */
const DILR: SectionDef = {
  id: "dilr",
  short: "DILR",
  name: "Data Interpretation and Logical Reasoning",
  status: "open",
  tagline: "Logical reasoning first: set types, how to read clues, how to choose sets. Data interpretation joins in December.",
  defaults: { wd: 45, we: 90 },
  maxQ: 22,
  practiceTypes: ["Arrangement", "Games and tournaments", "Data interpretation", "Set selection", "Other"],
  errorTypes: ["Arrangement", "Games and tournaments", "Data interpretation", "Set selection", "Other"],
  resources: () => import("./dilr/resources").then((m) => ({ categories: m.CATEGORIES, resources: m.RESOURCES })),
};
const QUANT: SectionDef = {
  id: "quant",
  short: "Quant",
  name: "Quantitative Ability",
  status: "soon",
  tagline: "Arithmetic, algebra, geometry, number system and modern maths.",
  defaults: { wd: 45, we: 90 },
  maxQ: 22,
  practiceTypes: ["Arithmetic", "Algebra", "Geometry", "Number system", "Modern maths", "Other"],
  errorTypes: ["Arithmetic", "Algebra", "Geometry", "Number system", "Modern maths", "Other"],
};

export const SECTIONS: SectionDef[] = [VARC, DILR, QUANT];
export const SECTION_BY_ID: Record<SectionId, SectionDef> = { varc: VARC, dilr: DILR, quant: QUANT };
export const LIVE_SECTIONS = SECTIONS.filter((s) => s.status === "live");
/** Short label used in score and error records, e.g. "VARC". */
export const SECTION_LABELS = SECTIONS.map((s) => s.short);
export const sectionByLabel = (label: string) => SECTIONS.find((s) => s.short === label) ?? VARC;
