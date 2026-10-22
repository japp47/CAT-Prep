import { describe, expect, it } from "vitest";
import { blankState } from "../lib/state";
import { promptKind } from "./SyncPrompt";

const att = (id: string) => ({ id, d: "2026-10-22", set: "s", mode: "library" as const, ans: [0], c: 1, w: 0, secs: 60, first: 0 });
const none = { invite: false, nudge: false };

describe("sync prompts", () => {
  it("an empty device is invited to link, once", () => {
    expect(promptKind(blankState(), false, none)).toBe("invite");
    expect(promptKind(blankState(), false, { ...none, invite: true })).toBeNull();
  });

  it("real practice brings the nudge; a first look does not", () => {
    const st = blankState();
    st.rcAttempts.push(att("1"));
    expect(promptKind(st, false, none)).toBeNull();
    for (const n of ["2", "3", "4", "5"]) st.rcAttempts.push(att(n));
    expect(promptKind(st, false, none)).toBe("nudge");
    expect(promptKind(st, false, { ...none, nudge: true })).toBeNull();
  });

  it("nothing at all once sync is on", () => {
    expect(promptKind(blankState(), true, none)).toBeNull();
  });
});
