import { describe, expect, it } from "vitest";
import { blankState } from "../lib/state";
import { RC_SETS } from "./rc";
import { CR_ITEMS } from "./cr";
import { LR_SETS } from "./lr";
import { recordCr, recordRc, rcErrorSrc } from "./record";
import { recordLr } from "./lrattempt";

// D114: a wrong answer is in the Error log as soon as the set is submitted; a skipped one is not; a retake adds nothing twice.
describe("wrong answers go into the Error log on their own", () => {
  const set = RC_SETS[0];
  const wrong = (qi: number) => (set.questions[qi].answer + 1) % set.questions[qi].options.length;

  it("logs each wrong RC answer once, not a skip, not a right answer", () => {
    const st = blankState();
    const ans = set.questions.map((q, qi) => (qi === 0 ? wrong(0) : qi === 1 ? null : q.answer));
    recordRc(st, "a1", set, ans, 400, 120, "library", "2026-11-19", [0]);
    expect(st.errors.map((e) => e.src)).toEqual([rcErrorSrc(set, 0)]);
    expect(st.errors[0]).toMatchObject({ att: "a1", cause: "guess" });
    recordRc(st, "a2", set, ans, 400, 120, "library", "2026-11-20");
    expect(st.errors).toHaveLength(1);
  });

  it("does the same for critical reasoning and LR", () => {
    const st = blankState();
    const items = CR_ITEMS.slice(0, 3);
    recordCr(st, "c1", items, [(items[0].answer + 1) % 4, null, items[2].answer], 100, "2026-11-19");
    expect(st.errors).toHaveLength(1);
    const lr = LR_SETS.find((s) => s.id === "arr-six-colleagues")!;
    recordLr(st, "l1", lr, [2, 1, null, "13", "4"], 300, "2026-11-19", [], 1000);
    const lrRows = st.errors.filter((e) => e.sec === "DILR");
    expect(lrRows.length).toBeGreaterThan(0);
    expect(lrRows.every((e) => !e.why.startsWith("Skipped"))).toBe(true);
  });
});
