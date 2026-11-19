import type { DayTemplate, PlanCtx, SectionId } from "../sections/types";
import { dilrTemplate } from "../sections/dilr/plan";
import { varcTemplate } from "../sections/varc/plan";

/**
 * Each live section's day template. It lives here, beside the planner, and not on the section, so the pages and the
 * sidebar that only show section names do not carry the plan, its links and papers in the first download (F97, D115).
 * A section without a template plans no time.
 */
export const TEMPLATES: Partial<Record<SectionId, (d: string, ctx: PlanCtx) => DayTemplate>> = {
  varc: varcTemplate,
  dilr: dilrTemplate,
};
