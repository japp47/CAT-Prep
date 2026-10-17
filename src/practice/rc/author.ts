import type { OptionTrap } from "../../data/traps";
import type { RcOption, RcQType, RcQuestion, RecallQ } from "../types";

/** An option. Leave the trap off the one right answer; give every wrong option its trap. */
export const o = (t: string, why: string, trap?: OptionTrap): RcOption => (trap ? { t, why, trap } : { t, why });

export const q = (type: RcQType, stem: string, proof: number[], options: RcOption[]): RcQuestion =>
  ({ type, stem, proof, options, answer: options.findIndex((x) => !x.trap) });

export const recall = (q: string, options: string[], answer: number): RecallQ => ({ q, options, answer });
