import { addDays, dow, weekStart } from "../lib/date";
import type { AppState, WeekReview } from "../lib/state";

// Kept apart from week.ts so the home page can ask "is the review ready?" without loading the review's logic.

/**
 * The week the review is about, when it is open: from Saturday 18:00 to the end of Monday.
 * On Saturday and Sunday it is this week; on Monday, the week that just ended. Otherwise null.
 */
export function reviewWeek(today: string, hour: number): string | null {
  const day = dow(today);
  if ((day === 6 && hour >= 18) || day === 0) return weekStart(today);
  if (day === 1) return addDays(weekStart(today), -7);
  return null;
}

/** The review of a week, if one was saved or dismissed. */
export const reviewOf = (st: AppState, monday: string): WeekReview | undefined => st.weekReviews.find((r) => r.id === monday);
