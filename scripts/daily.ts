/**
 * Writes dist/daily.json after the build: the RC of the day from yesterday to 60 days ahead. The reminder job
 * (server/cmd/notify) reads it from the live site, so an email names the same passage Today shows
 * (docs/design/notifications.md §1). Every student gets the same RC on the same date (src/practice/daily.ts).
 */
import { writeFileSync } from "node:fs";
import { addDays, todayIso } from "../src/lib/date";
import { rcOfDay } from "../src/practice/daily";

const RC_MINS = 7; // as Today's next step says (src/practice/next.ts)
const start = addDays(todayIso(), -1);
const days: Record<string, { rc: { id: string; title: string; questions: number; mins: number } }> = {};
for (let i = 0; i <= 61; i++) {
  const d = addDays(start, i);
  const rc = rcOfDay(d);
  days[d] = { rc: { id: rc.id, title: rc.title, questions: rc.questions, mins: RC_MINS } };
}
writeFileSync("dist/daily.json", JSON.stringify({ v: 1, from: start, days }) + "\n");
console.log(`dist/daily.json: ${Object.keys(days).length} days from ${start}`);
