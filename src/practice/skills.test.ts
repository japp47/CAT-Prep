import { describe, expect, it } from "vitest";
import { blankState } from "../lib/state";
import { CONTENT } from "./full";
import { recordCr, recordRc } from "./record";
import { skillMap, startHere, stateCounts, stateOf, weeklyAccuracy } from "./skills";

const today = "2026-10-30";

describe("skill states (F89, D63)", () => {
  it("gives no verdict under 8 answers", () => {
    expect(stateOf(0, 0, false)).toBe("new");
    expect(stateOf(7, 0, false)).toBe("learning");
    expect(stateOf(7, 7, false)).toBe("learning");
    expect(stateOf(8, 4, false)).toBe("weak");
  });
  it("draws the lines at 60% and 80%", () => {
    expect(stateOf(100, 59, false)).toBe("weak");
    expect(stateOf(100, 60, false)).toBe("steady");
    expect(stateOf(100, 79, false)).toBe("steady");
    expect(stateOf(100, 80, false)).toBe("strong");
  });
  it("is not strong while an old miss waits in the redo queue", () => {
    expect(stateOf(10, 9, true)).toBe("steady");
  });
});

describe("the skill map", () => {
  const cr = CONTENT.crItems.filter((c) => c.type === "assumption");

  it("counts critical reasoning by kind, leaving blanks out, and opens a drill of that kind", () => {
    const st = blankState();
    for (let i = 0; i < 4; i++) recordCr(st, "c" + i, cr.slice(0, 2), [cr[0].answer, i ? cr[1].answer : null], 60, "2026-10-20");
    const tile = skillMap(st, "VARC", today, null).find((f) => f.id === "cr")!.skills.find((s) => s.key === "cr:assumption")!;
    expect(tile).toMatchObject({ a: 7, c: 7, state: "learning", to: "/practice/cr?type=assumption&n=6" });
  });

  it("holds back strong while a miss of the skill added a week ago is still open, and not for a newer one", () => {
    const st = blankState();
    for (let i = 0; i < 5; i++) recordCr(st, "c" + i, cr.slice(0, 2), [cr[0].answer, cr[1].answer], 60, "2026-10-20");
    const tile = () => skillMap(st, "VARC", today, null).find((f) => f.id === "cr")!.skills.find((s) => s.key === "cr:assumption")!;
    expect(tile().state).toBe("strong");
    st.redo.push({ k: "cr:" + cr[0].id, added: "2026-10-28", due: today, box: 0, tries: 0 });
    expect(tile().state).toBe("strong");
    st.redo[0].added = "2026-10-23";
    expect(tile()).toMatchObject({ state: "steady", waiting: true });
    st.redo[0].cleared = "2026-10-29";
    expect(tile().state).toBe("strong");
  });

  it("reads RC question kinds from the passages, and leaves the RC family out until they load", () => {
    const st = blankState();
    const set = CONTENT.rcSets[0];
    recordRc(st, "r", set, set.questions.map((q) => q.answer), 400, 60, "library", "2026-10-20");
    expect(skillMap(st, "VARC", today, null).map((f) => f.id)).toEqual(["va", "cr"]);
    const rc = skillMap(st, "VARC", today, CONTENT.rcById).find((f) => f.id === "rc")!;
    expect(rc.skills.reduce((s, x) => s + x.a, 0)).toBe(set.questions.length);
    expect(rc.skills.every((x) => x.c === x.a)).toBe(true);
  });

  it("shows DILR set types with sets, counting answered questions, and the clue kinds", () => {
    const st = blankState();
    st.lrAttempts.push({ id: "l", d: "2026-10-20", set: "arr-six-colleagues", ans: [0, 1, null, "13", ""], c: 2, w: 1, secs: 600, updatedAt: 1 });
    const fams = skillMap(st, "DILR", today, null);
    expect(fams.map((f) => f.id)).toEqual(["lr", "clue"]);
    expect(fams[0].skills.find((s) => s.key === "lr:arrangement")).toMatchObject({ a: 3, c: 2, state: "learning", to: "/dilr?guide=arrangement" });
    expect(fams[1].skills.length).toBe(8);
  });

  it("starts with the weakest judged skill, weak before steady", () => {
    const sk = (key: string, a: number, c: number) => ({ key, label: key, a, c, pct: Math.round((c / a) * 100), state: stateOf(a, c, false), to: "" });
    const fams = [{ id: "x", title: "", skills: [sk("steady", 10, 6), sk("weakA", 10, 5), sk("weakB", 20, 10), sk("learning", 3, 0)] }];
    expect(startHere(fams)!.key).toBe("weakB");
    expect(stateCounts(fams)).toEqual({ new: 0, learning: 1, weak: 2, steady: 1, strong: 0 });
    expect(startHere([{ id: "x", title: "", skills: [sk("learning", 3, 0)] }])).toBeNull();
  });
});

describe("weekly accuracy", () => {
  it("gives six seven-day spans ending today, empty under 10 questions", () => {
    const rows = [
      { id: "1", d: "2026-10-30", sec: "VARC", t: "RC", a: 10, c: 8, src: "" },
      { id: "2", d: "2026-10-24", sec: "VARC", t: "RC", a: 4, c: 1, src: "" },
      { id: "3", d: "2026-10-23", sec: "VARC", t: "RC", a: 9, c: 3, src: "" },
      { id: "4", d: "2026-10-30", sec: "DILR", t: "LR", a: 50, c: 0, src: "" },
    ];
    const w = weeklyAccuracy(rows, "VARC", today);
    expect(w).toHaveLength(6);
    expect(w[5]).toMatchObject({ from: "2026-10-24", to: "2026-10-30", a: 14, c: 9, pct: 64 });
    expect(w[4]).toMatchObject({ a: 9, pct: null });
  });
});
