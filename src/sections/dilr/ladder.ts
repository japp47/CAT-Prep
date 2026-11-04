import type { Priority } from "../types";

/**
 * The past CAT DI sets in the order to try them (D77): [id, title, link to the paper, where in it, what it asks,
 * priority]. Its own file so the plan's DI block (planner/go.ts) can name the next one without loading every DILR
 * resource; resources.ts lists them on the Practice tab.
 */
export const DI_LADDER: [string, string, string, string, string, Priority][] = [
  ["d-di-l01", "1. Sales across product subcategories", "https://online.2iim.com/CAT-question-paper/CAT-2021-Question-Paper-Slot-1-DILR/", "CAT 2021, slot 1. Horizontal bars with markers", "Mostly direct reading and calculation; the last question compares growth across categories. The place to start.", "must"],
  ["d-di-l02", "2. Four companies' revenue, costs and staff", "https://online.2iim.com/CAT-question-paper/CAT-2022-Question-Paper-Slot-2-DILR/", "CAT 2022, slot 2. Two plots, three years", "Read two charts and combine them; averages and differences, no cases.", "must"],
  ["d-di-l03", "3. Import tariffs among five countries", "https://online.2iim.com/CAT-question-paper/CAT-2025-Question-Paper-Slot-1-DILR/", "CAT 2025, slot 1. Radar chart and bar chart", "Two linked charts: imports are the tariff amount divided by the rate, and one country's imports are another's exports.", "must"],
  ["d-di-l04", "4. Puzzles solved over time", "https://online.2iim.com/CAT-question-paper/CAT-2025-Question-Paper-Slot-3-DILR/", "CAT 2025, slot 3. Two cumulative line charts", "Subtract one chart from the other to separate the two kinds, and read exact times off a step-like line.", "good"],
  ["d-di-l05", "5. Subscribers of streaming apps over two years", "https://online.2iim.com/CAT-question-paper/CAT-2024-Question-Paper-Slot-3-DILR/", "CAT 2024, slot 3. Percentage shares", "Turn shares into counts, then find the smallest possible overlap: a minimum, not a reading.", "good"],
  ["d-di-l06", "6. GDP and population of ten countries", "https://online.2iim.com/CAT-question-paper/CAT-2024-Question-Paper-Slot-3-DILR/", "CAT 2024, slot 3. Table of fractions and growth rates", "Back out real values from fractions of another country, then grow them over three years.", "good"],
  ["d-di-l07", "7. Call minutes among six friends", "https://online.2iim.com/CAT-question-paper/CAT-2025-Question-Paper-Slot-3-DILR/", "CAT 2025, slot 3. Table with blanks", "Fill the blanks from row and column totals and the facts given. Practise the fill before any question.", "good"],
  ["d-di-l08", "8. Nutrients in seven grains", "https://online.2iim.com/CAT-question-paper/CAT-2024-Question-Paper-Slot-3-DILR/", "CAT 2024, slot 3. Table with blanks and rules", "Multiples, ranks and a link between rows decide each blank; a missing-value set close to a logic puzzle.", "good"],
  ["d-di-l09", "9. Smoothie shop sales and costs", "https://online.2iim.com/CAT-question-paper/CAT-2021-Question-Paper-Slot-1-DILR/", "CAT 2021, slot 1. Two tables", "Work back from revenue to units sold, with a loss on each unsold unit; several cases stay open.", "good"],
  ["d-di-l10", "10. Board exam marks with missed subjects", "https://online.2iim.com/CAT-question-paper/CAT-2020-Question-Paper-Slot-1-DILR/", "CAT 2020, slot 1. Table with rules", "Averages under rules about missed exams; case analysis, six questions.", "good"],
  ["d-di-l11", "11. Air conditioner and room temperature", "https://online.2iim.com/CAT-question-paper/CAT-2024-Question-Paper-Slot-3-DILR/", "CAT 2024, slot 3. Line graph with rate rules", "Infer when the AC was switched off from the slopes; actions only on the hour or half hour.", "good"],
  ["d-di-l12", "12. Daily draw scores of three players", "https://online.2iim.com/CAT-question-paper/CAT-2023-Question-Paper-Slot-2-DILR/", "CAT 2023, slot 2. Two-day averages and ranks", "Turn averages into totals and ranks into inequalities, then work through cases. CAT+ level: try it last.", "good"],
];
