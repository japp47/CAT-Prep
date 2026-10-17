import type { SectionDef, SectionId } from "./types";
import { VARC } from "./varc";

/** DILR and Quant are placeholders. To launch one, give it a template, phaseText, categories and resources like VARC, then set status to "live". */
const DILR: SectionDef = {
  id: "dilr",
  short: "DILR",
  name: "Data Interpretation and Logical Reasoning",
  status: "soon",
  tagline: "Set selection, arrangements, games and tournaments, and data interpretation.",
  defaults: { wd: 45, we: 90 },
  maxQ: 22,
  practiceTypes: ["Arrangement", "Games and tournaments", "Data interpretation", "Set selection", "Other"],
  errorTypes: ["Arrangement", "Games and tournaments", "Data interpretation", "Set selection", "Other"],
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
