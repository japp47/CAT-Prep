import { describe, expect, it } from "vitest";
import { blankState, type ErrorEntry } from "../lib/state";
import { errorKey, errorLink, lastMistake } from "./errorlink";
import { CONTENT } from "./full";
import { crError, rcError, vaError } from "./record";
import { redoNow } from "./redo";
import { parseKey } from "./va/build";

const set = CONTENT.rcSets[0], cr = CONTENT.crItems[0];
const va = parseKey("pj:" + CONTENT.vaParas[0].id, CONTENT.vaParas)!;
const old = (e: ErrorEntry): ErrorEntry => { const { q: _q, att: _a, ...rest } = e; return rest; };
const rcAtt = (id: string, d: string) => ({ id, d, set: set.id, mode: "library" as const, ans: set.questions.map(() => null), c: 0, w: 0, secs: 60, first: 0 });

describe("from a mistake back to its question", () => {
  it("new entries name their question and attempt", () => {
    expect(rcError(set, 1, null, "2026-10-22", false, "a1")).toMatchObject({ q: `rc:${set.id}:1`, att: "a1" });
    expect(vaError(va, "", "2026-10-22", "v1")).toMatchObject({ q: va.key, att: "v1" });
    expect(crError(cr, null, "2026-10-22", "c1")).toMatchObject({ q: `cr:${cr.id}`, att: "c1" });
  });

  it("older entries are matched from their text", () => {
    expect(errorKey(old(rcError(set, 2, null, "2026-10-22")))).toBe(`rc:${set.id}:2`);
    expect(errorKey(old(vaError(va, "", "2026-10-22")))).toBe(va.key);
    expect(errorKey(old(crError(cr, null, "2026-10-22")))).toBe(`cr:${cr.id}`);
    expect(errorKey({ id: "x", d: "2026-10-22", sec: "VARC", t: "RC", trap: "", src: "CAT 2019 Slot 2, RC 3, Q14", why: "", fix: "" })).toBeNull();
    expect(errorKey({ id: "x", d: "2026-10-22", sec: "VARC", t: "RC", trap: "", src: "Mock: SimCAT 3, Q1", why: "", fix: "" })).toBeNull();
  });

  it("opens the attempt the entry names, else the latest one before it, at the question", () => {
    const st = blankState();
    st.rcAttempts.push(rcAtt("early", "2026-10-01"), rcAtt("mid", "2026-10-10"), rcAtt("late", "2026-10-20"));
    expect(errorLink(rcError(set, 1, null, "2026-10-12", false, "early"), st)?.review).toBe(`/practice/rc/${set.id}?review=early&q=2`);
    expect(errorLink(old(rcError(set, 1, null, "2026-10-12")), st)?.review).toBe(`/practice/rc/${set.id}?review=mid&q=2`);
    expect(errorLink(old(rcError(set, 1, null, "2026-09-01")), st)?.review).toBe(`/practice/rc/${set.id}?review=late&q=2`);
    expect(errorLink(rcError(set, 0, null, "2026-10-12"), blankState())).toMatchObject({ review: undefined, retry: true });
  });

  it("finds VA and CR questions inside their drills", () => {
    const st = blankState();
    st.crAttempts.push({ id: "c1", d: "2026-10-01", secs: 60, items: [{ k: "cr:other", a: null, ok: false }, { k: `cr:${cr.id}`, a: 1, ok: false }] });
    st.vaAttempts.push({ id: "v1", d: "2026-10-01", mode: "daily", secs: 60, items: [{ k: va.key, a: "", ok: false, pts: 0 }] });
    expect(errorLink(crError(cr, 1, "2026-10-02"), st)?.review).toBe("/practice/cr?review=c1&q=2");
    expect(errorLink(vaError(va, "", "2026-10-02"), st)?.review).toBe("/practice/va?review=v1&q=1");
  });

  it("try it again puts the question back in the queue, due today", () => {
    const st = blankState();
    redoNow(st, `rc:${set.id}:0`, "2026-10-22");
    expect(st.redo).toEqual([{ k: `rc:${set.id}:0`, added: "2026-10-22", due: "2026-10-22", box: 0, tries: 0 }]);
    st.redo[0] = { ...st.redo[0], box: 3, cleared: "2026-10-20", due: "2026-11-01" };
    redoNow(st, `rc:${set.id}:0`, "2026-10-22");
    expect(st.redo[0]).toMatchObject({ box: 0, due: "2026-10-22" });
    expect(st.redo[0].cleared).toBeUndefined();
  });

  it("finds the last mistake on a question, new or old style", () => {
    const st = blankState();
    st.errors.push(old(rcError(set, 1, 0, "2026-10-01")), rcError(set, 1, 2, "2026-10-15"));
    expect(lastMistake(st, `rc:${set.id}:1`)?.d).toBe("2026-10-15");
  });
});
