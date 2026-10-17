import { describe, expect, it } from "vitest";
import { blankState, normalize, type AppState } from "../lib/state";
import { CONTENT } from "./bank";
import { RC_SETS } from "./rc";
import { recordRc, recordRedoAnswer, recordVa, REDO_SRC } from "./record";
import { answerRedo, dueRedo, queueMiss, rcRedoKey, redoKeyExists, resolveRedo, seedRedo, upcomingRedo } from "./redo";
import { buildItem } from "./va/build";
import { VA_PARAS } from "./va/paragraphs";

const fresh = (): AppState => blankState();
const set = RC_SETS[0];
const right = set.questions.map((q) => q.answer);
const wrongAt = (qi: number) => right.map((a, i) => (i === qi ? (a + 1) % 4 : a));

describe("redo queue", () => {
  it("brings a miss back after 1 day, then 3, then 7, and clears it after three right answers", () => {
    const st = fresh();
    queueMiss(st, "k", "2026-10-17");
    expect(st.redo[0]).toMatchObject({ box: 0, due: "2026-10-18" });
    expect(answerRedo(st, "k", true, "2026-10-18")).toBe(false);
    expect(st.redo[0]).toMatchObject({ box: 1, due: "2026-10-21" });
    answerRedo(st, "k", true, "2026-10-21");
    expect(st.redo[0]).toMatchObject({ box: 2, due: "2026-10-28" });
    expect(answerRedo(st, "k", true, "2026-10-28")).toBe(true);
    expect(st.redo[0].cleared).toBe("2026-10-28");
    expect(st.redo[0].tries).toBe(3);
  });
  it("starts again from tomorrow after a miss", () => {
    const st = fresh();
    queueMiss(st, "k", "2026-10-17");
    answerRedo(st, "k", true, "2026-10-18");
    answerRedo(st, "k", false, "2026-10-21");
    expect(st.redo[0]).toMatchObject({ box: 0, due: "2026-10-22" });
  });
  it("puts a cleared question back when it is missed again", () => {
    const st = fresh();
    queueMiss(st, "k", "2026-10-01");
    st.redo[0].cleared = "2026-10-10";
    queueMiss(st, "k", "2026-10-17");
    expect(st.redo).toHaveLength(1);
    expect(st.redo[0].cleared).toBeUndefined();
    expect(st.redo[0].due).toBe("2026-10-18");
  });
  it("lists due questions oldest first and skips cleared or unknown ones", () => {
    const st = fresh();
    queueMiss(st, rcRedoKey(set.id, 1), "2026-10-15");
    queueMiss(st, rcRedoKey(set.id, 0), "2026-10-10");
    queueMiss(st, "rc:no-such-set:0", "2026-10-10");
    queueMiss(st, rcRedoKey(set.id, 2), "2026-10-10");
    st.redo[3].cleared = "2026-10-12";
    expect(dueRedo(st.redo, "2026-10-17").map((r) => r.k)).toEqual([rcRedoKey(set.id, 0), rcRedoKey(set.id, 1)]);
    expect(upcomingRedo(st.redo, "2026-10-12")).toEqual([["2026-10-16", 1]]);
  });
  it("resolves RC and VA keys", () => {
    const rc = resolveRedo(rcRedoKey(set.id, 3), CONTENT);
    expect(rc?.kind === "rc" && rc.qi).toBe(3);
    const va = resolveRedo("ps:" + VA_PARAS[0].id, CONTENT);
    expect(va?.kind === "va" && va.item.kind).toBe("ps");
    expect(resolveRedo("zz:nothing", CONTENT)).toBeNull();
    expect(redoKeyExists(rcRedoKey(set.id, 3))).toBe(true);
    expect(redoKeyExists(rcRedoKey(set.id, 9))).toBe(false);
    expect(redoKeyExists("ps:" + VA_PARAS[0].id)).toBe(true);
  });
});

describe("recording practice fills the queue", () => {
  it("queues wrong and skipped RC questions only", () => {
    const st = fresh();
    const ans: (number | null)[] = wrongAt(1);
    ans[2] = null;
    recordRc(st, "a1", set, ans, 400, 120, "library", "2026-10-17");
    expect(st.redo.map((r) => r.k).sort()).toEqual([rcRedoKey(set.id, 1), rcRedoKey(set.id, 2)]);
  });
  it("queues wrong and blank VA items", () => {
    const st = fresh();
    const items = VA_PARAS.slice(0, 3).map((p) => buildItem("ps", p));
    recordVa(st, "v1", items, [items[0].answer, "", "9"], 300, "custom", "2026-10-17");
    expect(st.redo.map((r) => r.k)).toEqual([items[1].key, items[2].key]);
  });
  it("adds redo answers to one practice row per type and day", () => {
    const st = fresh();
    recordRedoAnswer(st, "RC", true, "2026-10-17");
    recordRedoAnswer(st, "RC", false, "2026-10-17");
    recordRedoAnswer(st, "Para summary", true, "2026-10-17");
    const rows = st.practice.filter((p) => p.src === REDO_SRC);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.t === "RC")).toMatchObject({ a: 2, c: 1 });
  });
});

describe("saves from before the queue", () => {
  it("builds the queue from past attempts, leaving out questions later answered right", () => {
    const st = fresh();
    st.rcAttempts.push({ id: "1", d: "2026-10-12", set: set.id, mode: "library", ans: wrongAt(0), c: 3, w: 1, secs: 1, first: 1 });
    st.rcAttempts.push({ id: "2", d: "2026-10-13", set: set.id, mode: "library", ans: wrongAt(1), c: 3, w: 1, secs: 1, first: 1 });
    seedRedo(st, CONTENT);
    expect(st.redo.map((r) => r.k)).toEqual([rcRedoKey(set.id, 1)]);
    expect(st.redo[0].due).toBe("2026-10-14");
  });
  it("marks saves without a queue for seeding, and keeps a saved queue as it is", () => {
    const old = { rcAttempts: [{ id: "1", d: "2026-10-12", set: set.id, mode: "library", ans: wrongAt(2), c: 3, w: 1, secs: 1, first: 1 }] };
    expect(normalize(old).redoSeeded).toBe(false);
    const saved = normalize({ ...old, redo: [{ k: rcRedoKey(set.id, 0), added: "2026-10-12", due: "2026-10-13", box: 0, tries: 0 }] });
    expect(saved.redoSeeded).toBe(true);
    expect(saved.redo.map((r) => r.k)).toEqual([rcRedoKey(set.id, 0)]);
    expect(blankState().redoSeeded).toBe(true);
  });
});
