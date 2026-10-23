import { describe, expect, it } from "vitest";
import { blankState, type ErrorEntry } from "../lib/state";
import { filterErrors, filterHref, isEmpty, matches, parseFilter, typeMatches } from "./errorfilter";
import { statuses } from "./errorlink";
import { CONTENT } from "./full";
import { patterns } from "./report";
import { answerRedo, queueMiss } from "./redo";
import { rcError } from "./record";

const set = CONTENT.rcSets[0];
const entry = (id: string, d: string, x: Partial<ErrorEntry> = {}): ErrorEntry => ({ id, d, sec: "VARC", t: "RC: inference", trap: "Extreme wording", src: "", why: "", fix: "", ...x });
const parse = (href: string) => parseFilter(new URLSearchParams(href.split("?")[1] ?? ""));

describe("Error log filters", () => {
  it("round-trip through the URL, and ignore values that are not real", () => {
    const f = { sec: "VARC", t: "RC: inference", trap: "Out of scope", cause: "qualifier" as const, status: "open" as const };
    expect(parse(filterHref(f))).toEqual(f);
    expect(filterHref({})).toBe("/errors");
    expect(parse("/errors?cause=nonsense&status=maybe")).toEqual({});
    expect(isEmpty({ sec: "VARC" })).toBe(true);
  });

  it("treat RC as every RC kind", () => {
    expect(typeMatches("RC: inference", "RC")).toBe(true);
    expect(typeMatches("RC: inference", "RC: inference")).toBe(true);
    expect(typeMatches("Para jumble", "RC")).toBe(false);
  });

  it("match on every field given", () => {
    const e = entry("a", "2026-10-20", { cause: "qualifier" });
    expect(matches(e, { sec: "VARC", t: "RC", trap: "Extreme wording", cause: "qualifier" }, null)).toBe(true);
    expect(matches(e, { trap: "Out of scope" }, null)).toBe(false);
    expect(matches(e, { cause: "slip" }, null)).toBe(false);
    expect(matches(e, { status: "fixed" }, "open")).toBe(false);
    expect(matches(e, { status: "open" }, "open")).toBe(true);
  });
});

describe("still happening or fixed", () => {
  const today = "2026-10-23";

  it("fixed once the question is answered right after the mistake", () => {
    const st = blankState();
    const e = rcError(set, 0, null, "2026-10-10", false, "a1");
    st.errors.push(e);
    queueMiss(st, e.q!, e.d);
    expect(statuses(st.errors, st.redo, today).get(e.id)).toBe("open");
    answerRedo(st, e.q!, true, "2026-10-11");
    expect(statuses(st.errors, st.redo, today).get(e.id)).toBe("fixed");
    // A later miss on the same question starts it over; a month on, nothing like it was logged, so it is neither.
    answerRedo(st, e.q!, false, "2026-10-14");
    expect(statuses(st.errors, st.redo, today).get(e.id)).toBe("open");
    expect(statuses(st.errors, st.redo, "2026-11-30").get(e.id)).toBeNull();
  });

  it("still happening when the same kind of mistake was logged in the last two weeks", () => {
    const old = entry("old", "2026-09-01"), recent = entry("new", "2026-10-20"), other = entry("other", "2026-09-02", { trap: "Out of scope" });
    const s = statuses([old, recent, other], [], today);
    expect(s.get("old")).toBe("open");
    expect(s.get("new")).toBe("open");
    expect(s.get("other")).toBeNull();
    expect(filterErrors([old, recent, other], { status: "open" }, s).map((e) => e.id)).toEqual(["new", "old"]);
  });

  it("matches on the cause too, and on the type alone when neither is set", () => {
    const a = entry("a", "2026-09-01", { trap: "", cause: "slip" }), b = entry("b", "2026-10-21", { trap: "", cause: "slip" });
    const c = entry("c", "2026-09-01", { t: "Para jumble", trap: "" }), d = entry("d", "2026-10-22", { t: "Para jumble", trap: "" });
    const s = statuses([a, b, c, d], [], today);
    expect(s.get("a")).toBe("open");
    expect(s.get("c")).toBe("open");
  });
});

describe("patterns link to their entries", () => {
  it("each pattern opens the Error log filtered to it", () => {
    const st = blankState();
    for (let i = 0; i < 5; i++) st.errors.push(entry("e" + i, "2026-10-2" + i));
    st.practice.push({ id: "p", d: "2026-10-20", sec: "VARC", t: "RC", a: 20, c: 10, src: "" });
    const [p] = patterns(st.errors, st.practice, "2026-10-25");
    expect(parse(p.list)).toEqual({ sec: "VARC", t: "RC: inference", trap: "Extreme wording" });
  });
});
