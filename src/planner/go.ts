import type { AppState } from "../lib/state";
import { rcOfDay } from "../practice/daily";
import { nextLrSet } from "../practice/lrorder";
import type { Block } from "../sections/types";

/**
 * The on-site action of a plan block (D56): where its one button goes on Today, and what it says. A block can name it
 * (`go`); RC and VA practice blocks open the RC of the day and the daily VA drill; otherwise the block's first link
 * inside the site. Null when the block's work happens elsewhere (an article, a book, a course).
 */
export interface Go { to: string; label: string }

const VA_TYPES = new Set(["Para jumble", "Para summary", "Odd sentence out", "Sentence insertion"]);
const NAMED: Record<string, string> = {
  "/practice/clues": "Start the clue translator",
  "/practice/must-could": "Start must, could, cannot",
  "/practice/first-move": "Start first move",
  "/practice/redo": "Open the redo queue",
};

export function goFor(b: Pick<Block, "go" | "ptype" | "links">, st: AppState, today: string): Go | null {
  if (b.go === "lr-next") {
    const s = nextLrSet(st.lrAttempts);
    return s ? { to: `/practice/lr/${s.id}`, label: `Start ${s.title}` } : { to: "/dilr/practice", label: "Choose a set to retake" };
  }
  if (b.go) return { to: b.go, label: NAMED[b.go] ?? "Open" };
  if (b.ptype === "RC") {
    const rc = rcOfDay(today), done = st.rcAttempts.find((a) => a.set === rc.id && a.d === today);
    return done ? { to: `/practice/rc/${rc.id}?review=${done.id}`, label: "Review the RC of the day" } : { to: `/practice/rc/${rc.id}`, label: "Start the RC of the day" };
  }
  if (b.ptype && VA_TYPES.has(b.ptype)) return { to: "/practice/va", label: "Start the daily VA drill" };
  if (b.ptype === "Critical reasoning") return { to: "/practice/cr", label: "Start a critical reasoning drill" };
  const inside = b.links.find(([, u]) => u.startsWith("/"));
  return inside ? { to: inside[1], label: inside[0] } : null;
}
