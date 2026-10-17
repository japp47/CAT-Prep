/** Why a wrong RC option is wrong. Every wrong option in the library carries one of these. */
export const OPTION_TRAPS = [
  "Extreme wording",
  "Out of scope",
  "Half right, half wrong",
  "True but not the answer",
  "Distorts the passage",
  "Too narrow or too broad",
] as const;
export type OptionTrap = (typeof OPTION_TRAPS)[number];

/** Everything the Error log can record as the cause of a mistake. */
export const TRAPS: string[] = [...OPTION_TRAPS, "Misread the passage", "Calculation slip", "Ran out of time", "Guessed"];
