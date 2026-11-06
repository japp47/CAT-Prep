import { addDays, diffDays } from "../lib/date";

/**
 * Which CAT a student is aiming for, and the road to it (D87, docs/design/your-cat-year.md). The exams are data: a
 * new year is one row in CATS, and nothing else in the code names a year or a date. A student's road is worked out
 * from their exam and the day they started, so a CAT 2028 student never gets a CAT 2027 plan.
 */

export interface CatExam {
  year: number;
  /** The exam date: the official one once announced, else the expected one (the last Sunday of November). */
  date: string;
  confirmed: boolean;
}

/** Update a row when iimcat.ac.in announces the date; add a row each year. */
export const CATS: CatExam[] = [
  { year: 2026, date: "2026-11-29", confirmed: true },
  { year: 2027, date: "2027-11-28", confirmed: false },
  { year: 2028, date: "2028-11-26", confirmed: false },
  { year: 2029, date: "2029-11-25", confirmed: false },
  { year: 2030, date: "2030-11-24", confirmed: false },
];

/** The day 99ile's plan began; nobody's road starts earlier. */
export const PLAN_START = "2026-10-17";
/** Date the resource links and updates were last checked. */
export const CHECKED_ON = "17 Oct 2026";
/** Choices start with the first CAT at least this many days away: a shorter road is not a plan. */
export const MIN_LEAD_DAYS = 90;

export const catName = (e: CatExam) => `CAT ${e.year}`;
export const catByYear = (year: number | undefined): CatExam | undefined => CATS.find((e) => e.year === year);

/** The CAT a student is taken to aim for until they choose: the first one far enough from the day they started. */
export function defaultCat(since: string): CatExam {
  const start = since > PLAN_START ? since : PLAN_START;
  return CATS.find((e) => diffDays(start, e.date) >= MIN_LEAD_DAYS) ?? CATS[CATS.length - 1];
}

/** The three CATs a student can choose today, plus their current one if it is no longer among them. */
export function catChoices(today: string, current?: CatExam): CatExam[] {
  const first = CATS.findIndex((e) => diffDays(today, e.date) >= MIN_LEAD_DAYS);
  const out = first < 0 ? [] : CATS.slice(first, first + 3);
  return current && !out.includes(current) && current.date >= today ? [current, ...out] : out;
}

export interface Phase {
  /** 0 is the head start a long road begins with; 1 to 5 are Foundation to Taper. */
  id: number;
  name: string;
  start: string;
  end: string;
  /** What the phase is for, in one line. */
  focus: string;
}

const FOCUS: Record<number, [string, string]> = {
  0: ["Head start", "A light daily habit: one article, one RC, a few words. The full plan starts later."],
  1: ["Foundation", "A reading habit, every question type untimed, word roots."],
  2: ["Build", "Daily drills by type, a timed past paper every two weeks."],
  3: ["Apply", "Harder passages, a timed paper every week, a mock series picked."],
  4: ["Mock phase", "Mocks every weekend with full analysis, short sets on weekdays."],
  5: ["Taper", "Light practice and Error log revision."],
};

export interface Road {
  exam: CatExam;
  name: string;
  /** The first day of the road: the student's start, never before the plan began. */
  start: string;
  phases: Phase[];
  /** The early phases were shortened because the road starts late. */
  short: boolean;
}

/** Below this, a phase is not worth having: its days go to the next one. */
const MIN_PHASE = 14;
/** Foundation's longest; a longer lead opens with a head start. */
const LONG_FOUNDATION = 125;
const TAPER_DAYS = 10;

/**
 * The road from a start day to an exam. The phases sit on the calendar: Build from 1 February of the exam's year,
 * Apply from 1 June, the mock phase from 1 September, the taper over the last ten days. Foundation runs up to
 * Build; a lead longer than about four months opens with a light head start; a late start shares the days before the
 * mock phase among Foundation, Build and Apply, 1 : 3 : 2, so every one of them still happens.
 */
export function roadFor(exam: CatExam, since: string): Road {
  const start = since > PLAN_START ? since : PLAN_START;
  const y = exam.year;
  const taper = addDays(exam.date, -TAPER_DAYS);
  const mock = `${y}-09-01` < taper ? `${y}-09-01` : addDays(taper, -MIN_PHASE);
  const anchors: [number, string][] = [[2, `${y}-02-01`], [3, `${y}-06-01`]];
  const phases: Phase[] = [];
  const add = (id: number, from: string, to: string) => {
    if (from <= to) phases.push({ id, name: FOCUS[id][0], start: from, end: to, focus: FOCUS[id][1] });
  };
  let short = false;
  const beforeMock = diffDays(start, mock);

  if (beforeMock >= MIN_PHASE && start <= addDays(anchors[0][1], -MIN_PHASE)) {
    // On time: Foundation up to 31 January, with a head start before it when the lead is long.
    const foundation = start <= addDays(anchors[0][1], -LONG_FOUNDATION) ? `${y - 1}-10-01` : start;
    if (foundation > start) add(0, start, addDays(foundation, -1));
    add(1, foundation, addDays(anchors[0][1], -1));
    add(2, anchors[0][1], addDays(anchors[1][1], -1));
    add(3, anchors[1][1], addDays(mock, -1));
  } else if (beforeMock >= MIN_PHASE) {
    // Late: the days before the mock phase, shared 1 : 3 : 2; a share under two weeks goes to the next phase.
    short = true;
    const shares = [1, 3, 2].map((w) => Math.floor((beforeMock * w) / 6));
    let from = start, carry = 0;
    shares.forEach((n, i) => {
      const len = n + carry;
      if (len < MIN_PHASE && i < 2) { carry = len; return; }
      carry = 0;
      const to = i === 2 ? addDays(mock, -1) : addDays(from, len - 1);
      add(i + 1, from, to);
      from = addDays(to, 1);
    });
  } else {
    // Under two weeks before the mock phase: it starts on the first day.
    short = true;
  }
  add(4, beforeMock >= MIN_PHASE ? mock : start, addDays(taper, -1));
  add(5, start > taper ? start : taper, addDays(exam.date, -1));
  return { exam, name: catName(exam), start, phases, short };
}

export type PhaseInfo =
  | { kind: "phase"; phase: Phase }
  | { kind: "pre" }
  | { kind: "exam" }
  | { kind: "after" };

/** Where a day falls on a road. */
export function phaseIn(road: Road, d: string): PhaseInfo {
  if (d === road.exam.date) return { kind: "exam" };
  if (d > road.exam.date) return { kind: "after" };
  if (!road.phases.length || d < road.phases[0].start) return { kind: "pre" };
  for (const p of road.phases) if (d >= p.start && d <= p.end) return { kind: "phase", phase: p };
  return { kind: "phase", phase: road.phases[road.phases.length - 1] };
}

/** How many numbered phases a road has; a head start is not numbered. */
export const phaseCount = (road: Road) => road.phases.filter((p) => p.id > 0).length;
/** A phase's number as the student sees it: its place among the numbered phases (a late road may begin with Build). */
export const phaseNo = (road: Road, p: Phase) => road.phases.filter((x) => x.id > 0).indexOf(p) + 1;
/** "Phase 2 of 5, Build", or "Head start". */
export const phaseLabel = (road: Road, p: Phase) => (p.id === 0 ? p.name : `Phase ${phaseNo(road, p)} of ${phaseCount(road)}, ${p.name}`);

const roads = new Map<string, Road>();

/** A student's road: their chosen CAT (about.exam), or the default for when they started. Kept, as days ask often. */
export function roadOf(st: { since: string; about: { exam?: number } }): Road {
  const exam = catByYear(st.about.exam) ?? defaultCat(st.since);
  const key = exam.year + ":" + st.since;
  let r = roads.get(key);
  if (!r) roads.set(key, (r = roadFor(exam, st.since)));
  return r;
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
  { id: "dilr", name: "Data Interpretation and Logical Reasoning", questions: 22, minutes: 40, notes: "Five sets since CAT 2024: three of 4 questions and two of 5. Picking the two or three to solve matters more than speed." },
  { id: "quant", name: "Quantitative Ability", questions: 22, minutes: 40, notes: "Arithmetic and algebra carry the most weight, then geometry, numbers and modern maths." },
];
