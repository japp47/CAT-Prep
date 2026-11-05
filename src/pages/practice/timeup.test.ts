import { describe, expect, it } from "vitest";
import { awayText, GRACE_SECS, HARD_STOP, timeUpState } from "./common";

describe("practice clock", () => {
  const T = 420; // an RC set: 7 minutes

  it("warns at the target and submits a minute later", () => {
    expect(timeUpState(T - 1, T, false)).toMatchObject({ warn: false, over: false });
    expect(timeUpState(T, T, false)).toMatchObject({ warn: true, over: false, left: GRACE_SECS });
    expect(timeUpState(T + GRACE_SECS - 1, T, false)).toMatchObject({ warn: true, left: 1 });
    expect(timeUpState(T + GRACE_SECS, T, false)).toMatchObject({ over: true, left: 0 });
  });

  it("after Keep going, stops at three times the target with the same warning", () => {
    expect(timeUpState(T + GRACE_SECS, T, true)).toMatchObject({ warn: false, over: false });
    expect(timeUpState(HARD_STOP * T - GRACE_SECS, T, true)).toMatchObject({ warn: true, left: GRACE_SECS });
    expect(timeUpState(HARD_STOP * T, T, true).over).toBe(true);
  });

  it("a page left open for hours is long over", () => {
    expect(timeUpState(5 * 3600, T, false).over).toBe(true);
    expect(timeUpState(5 * 3600, T, true).over).toBe(true);
  });
});

describe("how long the student was away (D83)", () => {
  it("says it in minutes, then hours, then days", () => {
    expect([20, 60, 6 * 60, 59 * 60, 3 * 3600 + 600, 3600, 50 * 3600].map(awayText)).toEqual(["less than a minute", "1 minute", "6 minutes", "59 minutes", "3 hours", "1 hour", "2 days"]);
  });
});
