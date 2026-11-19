import type { PhaseText } from "../types";

/** What each phase asks of DILR, shown on Plan and Today. Kept apart from the plan template so pages that only show
 * section names do not load the plan (F97, D115). */
export const DILR_PHASE_TEXT: Record<number, PhaseText> = {
  0: { goal: "Foundation's sets at your own pace: one LR set or a short drill on most days, so set types are familiar long before the plan gets serious.", check: "By the end of the head start: a set of every LR type tried once, and the habit of a set most days." },
  1: { goal: "Meet every LR set type untimed, then from week 4 a DI set beside it: one of each a day, a short drill, and a guide when a type is new.", check: "You have tried a set of every type, LR and DI, and can say where to start one." },
  2: { goal: "Two sets a day by type, three of them a week DI, and a timed DILR section of a past paper every other Saturday.", check: "You pick two or three of five sets in a 40-minute section without being told." },
  3: { goal: "A timed section every Saturday from recent papers, with the analysis the next day.", check: "Your section scores hold steady and the misses are first moves, not misreadings." },
  4: { goal: "Mock DILR sections analysed on Sundays, two short sets on weekdays.", check: "Set selection is the same in every mock: read all, pick, solve, move on." },
  5: { goal: "One easy set a day and your Error log, to stay warm without new strain.", check: "You know your set-picking rule by heart." },
};
