import type { SectionDef } from "../types";
import { varcTemplate } from "./plan";
import { CATEGORIES, RESOURCES } from "./resources";

export const VARC: SectionDef = {
  id: "varc",
  short: "VARC",
  name: "Verbal Ability and Reading Comprehension",
  status: "live",
  tagline: "Reading habit first, then method, then timed papers and mocks.",
  defaults: { wd: 60, we: 120 },
  maxQ: 24,
  practiceTypes: ["RC", "Para jumble", "Para summary", "Odd sentence out", "Para completion", "Critical reasoning"],
  errorTypes: ["RC: main idea", "RC: tone or purpose", "RC: inference", "RC: specific detail", "RC: EXCEPT", "RC: strengthen or weaken", "RC: application", "Para jumble", "Para summary", "Odd sentence out", "Para completion", "Critical reasoning"],
  phaseText: {
    1: { goal: "Read dense prose daily without strain, finish Gejo's course, learn word roots, and get used to RC question types untimed.",
      check: "By 31 Jan: 30 minutes of Aeon-level reading feels normal, all 17 Gejo modules done, untimed RC accuracy around 60%." },
    2: { goal: "Learn the method for every question type through daily drills, work through Arun Sharma levels 2 and 3, and start timed sectionals from CAT 2017 to 2022 every two weeks.",
      check: "By 31 May: RC accuracy 70% or more, para jumbles and odd sentence out above 60%, about 8 timed sectionals done." },
    3: { goal: "Raise the difficulty with XAT, LSAT and GMAT passages, take a timed sectional every week, and start a mock series in August.",
      check: "By 31 Aug: 12 or more correct in timed sectionals, all 2017 to 2022 papers done, mock series chosen." },
    4: { goal: "Two mock or real-paper sections every weekend with full analysis, CAT 2023 to 2026 papers as real tests, and short timed sets on weekdays.",
      check: "By mid-November: 15 or more correct in most mocks with 3 or fewer wrong." },
    5: { goal: "Light practice, error log revision and sleep at hours that match your slot.",
      check: "Walk in rested, with a fixed attempt order and time split." },
  },
  template: varcTemplate,
  categories: CATEGORIES,
  resources: RESOURCES,
};
