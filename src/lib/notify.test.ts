import { describe, expect, it } from "vitest";
import { fromClock, spokenTime, toClock } from "./notify";

describe("reminder times", () => {
  it("round to the quarter hour the server keeps", () => {
    expect(fromClock("19:30")).toBe(1170);
    expect(fromClock("19:37")).toBe(1170);
    expect(fromClock("19:38")).toBe(1185);
    expect(fromClock("23:55")).toBe(0); // rounds past midnight to 00:00
    expect(fromClock("7:05")).toBe(420);
    expect(fromClock("24:00")).toBeNull();
    expect(fromClock("")).toBeNull();
  });
  it("show as a time input and in sentences", () => {
    expect(toClock(1170)).toBe("19:30");
    expect(toClock(0)).toBe("00:00");
    expect(spokenTime(1170)).toBe("7:30 pm");
    expect(spokenTime(720)).toBe("12 pm");
    expect(spokenTime(0)).toBe("12 am");
    expect(spokenTime(420)).toBe("7 am");
  });
});
