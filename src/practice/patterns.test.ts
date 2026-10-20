import { describe, expect, it } from "vitest";
import type { ErrorEntry, PracticeSet } from "../lib/state";
import { patterns, PATTERN_MIN } from "./report";

const T = "2026-10-21";
const err = (t: string, trap: string, d = "2026-10-15", cause?: ErrorEntry["cause"]): ErrorEntry => ({ id: Math.random().toString(36), d, sec: "VARC", t, trap, src: "", why: "", fix: "", ...(cause ? { cause } : {}) });
const practice: PracticeSet[] = [{ id: "p", d: "2026-10-10", sec: "VARC", t: "RC", a: 20, c: 12, src: "" }, { id: "q", d: "2026-10-10", sec: "VARC", t: "Para jumble", a: 4, c: 1, src: "" }];

describe("patterns", () => {
  it("need the same trap on the same kind of question four times", () => {
    const three = Array.from({ length: PATTERN_MIN - 1 }, () => err("RC: inference", "Extreme wording"));
    expect(patterns(three, practice, T)).toEqual([]);
    const four = [...three, err("RC: inference", "Extreme wording"), err("RC: inference", "Out of scope")];
    const p = patterns(four, practice, T);
    expect(p).toHaveLength(1);
    expect(p[0].text).toBe("4 of your last 5 inference misses fell for “extreme wording”.");
    expect(p[0].to).toBe("/practice/library");
  });
  it("need six questions of the type practised", () => {
    const four = Array.from({ length: 4 }, () => err("Para jumble", "Wrong direction"));
    expect(patterns(four, practice, T)).toEqual([]);
  });
  it("look only at the last 30 days", () => {
    const old = Array.from({ length: 4 }, () => err("RC: inference", "Extreme wording", "2026-09-01"));
    expect(patterns(old, practice, T)).toEqual([]);
  });
  it("put traps from the content before causes the student picked", () => {
    const xs = [...Array.from({ length: 5 }, () => err("RC: tone or purpose", "", T, "slip")), ...Array.from({ length: 4 }, () => err("RC: inference", "Distorts the passage"))];
    const p = patterns(xs, practice, T);
    expect(p.map((x) => x.key.split("|")[0])).toEqual(["trap", "cause"]);
    expect(p[1].text).toContain("you marked “careless slip”");
  });
  it("ignore student-side labels kept in the old trap field", () => {
    const xs = Array.from({ length: 5 }, () => err("RC: inference", "Ran out of time"));
    expect(patterns(xs, practice, T)).toEqual([]);
  });
});
