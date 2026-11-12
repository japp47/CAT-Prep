import { describe, expect, it } from "vitest";
import { weekFacts } from "../practice/week";
import { blankState, type AppState } from "./state";
import { weekMail } from "./weekmail";

const MON = "2026-10-19", PREV = "2026-10-12", SUN = "2026-10-25";
const row = (st: AppState, d: string, t: string, a: number, c: number) => st.practice.push({ id: d + t + a + c, d, sec: "VARC", t, a, c, src: "" });
const err = (st: AppState, d: string, trap: string) =>
  st.errors.push({ id: d + trap + st.errors.length, d, sec: "VARC", t: "RC", trap, src: "my notes on the passage", why: "I rushed", fix: "slow down" });

/** The exact fields the server accepts (server/internal/notify/week.go, WeekMail): nothing else may be sent. */
const FIELDS = ["monday", "studied", "daysSoFar", "questions", "correct", "acc", "minutes", "planned", "light", "improved", "slipped", "trap", "redo", "focus"];

describe("the weekly email's figures (D97)", () => {
  it("are the review page's own numbers for this week", () => {
    const st = blankState();
    row(st, PREV, "Para summary", 10, 5); row(st, MON, "Para summary", 10, 8);
    row(st, PREV, "RC", 10, 8); row(st, "2026-10-21", "RC", 12, 6);
    err(st, MON, "Out of scope"); err(st, "2026-10-21", "Out of scope");
    const w = weekMail(st, SUN), f = weekFacts(st, MON, SUN);
    expect(Object.keys(w).sort()).toEqual([...FIELDS].sort());
    expect(w).toMatchObject({ monday: MON, studied: f.studied, daysSoFar: 7, questions: 22, correct: 14, acc: f.questions.acc, light: f.light });
    expect(w.improved).toEqual({ name: "Para summary", before: 50, after: 80 });
    expect(w.slipped).toEqual({ name: "RC", before: 80, after: 50 });
    expect(w.trap).toEqual({ name: "Out of scope", n: 2 });
  });

  it("send only names from the site's fixed lists, never what a student typed", () => {
    const st = blankState();
    // A restored backup could carry anything in these fields.
    row(st, PREV, "my own type, see https://x.example", 10, 9); row(st, MON, "my own type, see https://x.example", 10, 2);
    err(st, MON, "I wrote this trap myself"); err(st, "2026-10-20", "I wrote this trap myself");
    const w = weekMail(st, SUN);
    expect(w.slipped).toBeNull();
    expect(w.trap).toBeNull();
    const text = JSON.stringify(w);
    for (const typed of ["https", "I wrote", "my notes", "I rushed", "slow down"]) expect(text).not.toContain(typed);
  });

  it("describe an empty week plainly, with the week's Monday", () => {
    const w = weekMail(blankState(), "2026-10-21");
    expect(w).toMatchObject({ monday: MON, studied: 0, daysSoFar: 3, questions: 0, correct: 0, acc: null, improved: null, slipped: null, trap: null, focus: null });
  });
});
