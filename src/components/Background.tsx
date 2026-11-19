import { AutoTicker } from "./AutoTicker";
import { RedoSeeder } from "./Content";

/**
 * Work with nothing to show: the plan ticks itself from practice (AutoTicker) and an old save gets its redo queue
 * (RedoSeeder). Loaded after the page is up, so the content catalog and the planner stay out of the first download (F97).
 */
export default function Background() {
  return <><RedoSeeder /><AutoTicker /></>;
}
