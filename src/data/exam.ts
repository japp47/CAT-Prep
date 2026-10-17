/** CAT 2027 is not announced yet. This date is Cracku's estimate; update it once iimcat.ac.in publishes the notification. */
export const EXAM_ISO = "2027-11-28";
export const EXAM_NAME = "CAT 2027";
export const EXAM_CONFIRMED = false;
export const START_ISO = "2026-10-17";
/** Date the resource links and updates were last checked. */
export const CHECKED_ON = "17 Oct 2026";

export interface Phase {
  id: number;
  name: string;
  start: string;
  end: string;
}

/** Phases are shared by every section. Each section supplies its own goal and checkpoint text per phase. */
export const PHASES: Phase[] = [
  { id: 1, name: "Foundation", start: "2026-10-17", end: "2027-01-31" },
  { id: 2, name: "Build", start: "2027-02-01", end: "2027-05-31" },
  { id: 3, name: "Apply", start: "2027-06-01", end: "2027-08-31" },
  { id: 4, name: "Mock phase", start: "2027-09-01", end: "2027-11-17" },
  { id: 5, name: "Taper", start: "2027-11-18", end: "2027-11-27" },
];

export type PhaseInfo =
  | { kind: "phase"; phase: Phase }
  | { kind: "pre" }
  | { kind: "exam" }
  | { kind: "after" };

export function phaseOf(d: string): PhaseInfo {
  if (d < PHASES[0].start) return { kind: "pre" };
  if (d === EXAM_ISO) return { kind: "exam" };
  if (d > EXAM_ISO) return { kind: "after" };
  for (const p of PHASES) if (d >= p.start && d <= p.end) return { kind: "phase", phase: p };
  return { kind: "phase", phase: PHASES[PHASES.length - 1] };
}

export interface ExamSection {
  id: string;
  name: string;
  questions: number;
  minutes: number;
  notes: string;
}

/** Pattern used in CAT 2024 and CAT 2025. Confirm against the CAT 2027 notification. */
export const CAT_PATTERN: ExamSection[] = [
  { id: "varc", name: "Verbal Ability and Reading Comprehension", questions: 24, minutes: 40, notes: "16 RC questions over 4 passages, 8 VA. The VA mix changes each year across para summary, sentence insertion, odd sentence out and para jumbles." },
  { id: "dilr", name: "Data Interpretation and Logical Reasoning", questions: 22, minutes: 40, notes: "Usually 4 or 5 sets of 4 to 6 questions. Set selection matters more than speed." },
  { id: "quant", name: "Quantitative Ability", questions: 22, minutes: 40, notes: "Arithmetic and algebra carry the most weight, then geometry, numbers and modern maths." },
];
