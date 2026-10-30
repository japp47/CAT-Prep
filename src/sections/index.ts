import { DILR_PHASE_TEXT, dilrTemplate } from "./dilr/plan";
import type { SectionDef, SectionId } from "./types";
import { VARC } from "./varc";

/**
 * DILR is live: its LR sets, drills and plan blocks are in the timetable (F22, D56); data interpretation joins in
 * December. Quant is a placeholder. To make a section live, give it a template and phaseText, then set status to "live".
 */
const DILR: SectionDef = {
  id: "dilr",
  short: "DILR",
  name: "Data Interpretation and Logical Reasoning",
  status: "live",
  tagline: "Logical reasoning first: set types, how to read clues, how to choose sets. Data interpretation joins in December.",
  defaults: { wd: 30, we: 60 },
  maxQ: 22,
  phaseText: DILR_PHASE_TEXT,
  template: dilrTemplate,
  // The day DILR joined the timetable: set it to the day this ships, so no earlier day owes a catch-up.
  liveSince: "2026-10-30",
  setup: { 1: ["d-quant-basics", "d-t-dipak"], 2: ["d-cr-pyq"], 3: ["d-cr-sect"], 4: ["d-cr-mock"] },
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
