import { describe, expect, it } from "vitest";
import { blankState, normalize, type AppState } from "../lib/state";
import { CONTENT } from "./full";
import { RC_SETS } from "./rc";
import { CR_ITEMS } from "./cr";
import { crError, recordCr, recordRc, recordRedoAnswer, recordVa, REDO_SRC } from "./record";
import { answerRedo, dueRedo, queueMiss, rcRedoKey, redoKeyExists, redoPracticeType, resolveExam, resolveRedo, seedRedo, upcomingRedo } from "./redo";
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

describe("critical reasoning in the redo queue", () => {
  const items = CR_ITEMS.slice(0, 3);
  const key = (i: number) => "cr:" + items[i].id;
  const answers = [items[0].answer, (items[1].answer + 1) % 4, null];

  it("saves the attempt, logs one practice row and queues wrong and blank questions", () => {
    const st = fresh();
    recordCr(st, "a1", items, answers, 100, "2026-10-17");
    expect(st.crAttempts[0].items.map((i) => i.ok)).toEqual([true, false, false]);
    expect(st.practice).toEqual([expect.objectContaining({ t: "Critical reasoning", a: 2, c: 1, sec: "VARC" })]);
    expect(st.redo.map((r) => r.k)).toEqual([key(1), key(2)]);
  });
  it("logs nothing as practice when every question is blank", () => {
    const st = fresh();
    recordCr(st, "a2", items, [null, null, null], 5, "2026-10-17");
    expect(st.practice).toHaveLength(0);
    expect(st.redo).toHaveLength(3);
  });
  it("finds its keys in the catalog and in the content", () => {
    expect(redoKeyExists(key(0))).toBe(true);
    expect(redoKeyExists("cr:nope")).toBe(false);
    const ref = resolveRedo(key(0), CONTENT);
    expect(ref).toMatchObject({ kind: "cr", key: key(0) });
    expect(redoPracticeType(ref!)).toBe("Critical reasoning");
    expect(resolveRedo("cr:nope", CONTENT)).toBeNull();
    expect(resolveExam(key(0), CONTENT)).toBeNull();
  });
  it("builds the queue from old attempts and takes out a question answered right later", () => {
    const st = fresh();
    st.crAttempts.push({ id: "x", d: "2026-10-10", secs: 1, items: [{ k: key(0), a: 0, ok: false }, { k: key(1), a: 0, ok: false }] });
    st.crAttempts.push({ id: "y", d: "2026-10-12", secs: 1, items: [{ k: key(1), a: items[1].answer, ok: true }] });
    seedRedo(st, CONTENT);
    expect(st.redo.map((r) => r.k)).toEqual([key(0)]);
  });
  it("pre-fills an Error log entry with the pick, its trap and the rule", () => {
    const wrong = (items[1].answer + 1) % 4;
    const e = crError(items[1], wrong, "2026-10-17");
    expect(e).toMatchObject({ t: "Critical reasoning", trap: items[1].options[wrong].trap, sec: "VARC" });
    expect(e.fix).toContain(items[1].takeaway);
    expect(crError(items[1], null, "2026-10-17")).toMatchObject({ trap: "", why: "Left it blank." });
  });
});
