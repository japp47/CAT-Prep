import type { Cause } from "../lib/state";
/** Why a wrong option is wrong. Every wrong option in the library carries one of these. The last two are for critical reasoning. */
export const OPTION_TRAPS = [
  "Extreme wording",
  "Out of scope",
  "Half right, half wrong",
  "True but not the answer",
  "Distorts the passage",
  "Too narrow or too broad",
  "Wrong direction",
  "Attacks the evidence",
] as const;
export type OptionTrap = (typeof OPTION_TRAPS)[number];

/** Everything the Error log can record as the cause of a mistake. */
export const TRAPS: string[] = [...OPTION_TRAPS, "Misread the passage", "Calculation slip", "Ran out of time", "Guessed"];

/** What happened to the student on a wrong answer, as the mock review asks it. Apart from the option's trap above. */
export const CAUSES: Record<Cause, string> = {
  misread: "Misread the question",
  qualifier: "Missed a qualifier",
  beyond: "Read too much into it",
  trap: "Fell for a trap option",
  method: "Did not know the method",
  slip: "Careless slip",
  guess: "Guessed",
  select: "Should have skipped it",
  time: "Ran out of time",
};
