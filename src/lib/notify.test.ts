import { describe, expect, it } from "vitest";
import { daysLine, fromClock, spokenTime, toClock, whenLine, whereLine, type ReminderPrefs } from "./notify";

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

const PREFS: ReminderPrefs = {
  on: true, at: 1170, days: [0, 1, 2, 3, 4, 5, 6], timeZone: "Asia/Kolkata", quietFrom: 1380, quietTo: 420,
  email: "off", weekly: false, pausedUntil: null, emailAddress: "", emailState: "ok", pushDevices: 0,
  pushReady: true, thisDevice: false, lastSent: null,
};

describe("the reminder days in plain words", () => {
  it("names a pattern rather than listing it", () => {
    expect(daysLine([0, 1, 2, 3, 4, 5, 6])).toBe("every day");
    expect(daysLine([1, 2, 3, 4, 5])).toBe("on weekdays");
    expect(daysLine([0, 6])).toBe("at the weekend");
    expect(daysLine([1, 2, 3, 4, 5, 6])).toBe("every day except Sunday");
    expect(daysLine([0, 1, 2, 3, 4, 6])).toBe("every day except Friday");
  });
  it("lists the days when there is no pattern, in week order", () => {
    expect(daysLine([5, 1, 3])).toBe("on Mon, Wed and Fri");
    expect(daysLine([2])).toBe("on Tue");
    expect(daysLine([1, 2])).toBe("on Mon and Tue");
  });
  it("says so when no day is left, and ignores days that are not days", () => {
    expect(daysLine([])).toBe("on no days");
    expect(daysLine([1, 1, 9, -2, 1.5])).toBe("on Mon");
  });
});

describe("what reminders promise", () => {
  it("is one sentence: when, and the one condition", () => {
    expect(whenLine(PREFS)).toBe("Around 7:30 pm, every day, if you haven't practised yet.");
    expect(whenLine({ ...PREFS, at: 420, days: [1, 2, 3, 4, 5] })).toBe("Around 7 am, on weekdays, if you haven't practised yet.");
  });
});

describe("where reminders go", () => {
  it("counts this device, the others and the address", () => {
    expect(whereLine({ ...PREFS, thisDevice: true, pushDevices: 1 })).toBe("this device");
    expect(whereLine({ ...PREFS, thisDevice: true, pushDevices: 3 })).toBe("this device and 2 other devices");
    expect(whereLine({ ...PREFS, thisDevice: false, pushDevices: 1 })).toBe("1 other device");
    expect(whereLine({ ...PREFS, thisDevice: true, pushDevices: 2, email: "missed", emailAddress: "a@b.com" }))
      .toBe("this device, 1 other device and a@b.com");
  });
  it("is empty when nothing is switched on, so the card can say nothing will arrive", () => {
    expect(whereLine(PREFS)).toBe("");
    expect(whereLine({ ...PREFS, email: "daily", emailAddress: "" })).toBe("");
    expect(whereLine({ ...PREFS, email: "off", emailAddress: "a@b.com" })).toBe("");
  });
});
