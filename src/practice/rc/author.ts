import type { OptionTrap } from "../../data/traps";
import type { RcOption } from "../types";

/** An option. Leave the trap off the one right answer; give every wrong option its trap. */
export const o = (t: string, why: string, trap?: OptionTrap): RcOption => (trap ? { t, why, trap } : { t, why });
