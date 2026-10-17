import { describe, expect, it } from "vitest";
import { googleCalendarUrl, reminderIcs } from "./ics";

const r = { date: "2026-10-18", time: "19:30", minutes: 60, url: "https://example.org/today" };

describe("study reminder", () => {
  it("repeats daily at the chosen local time with an alarm", () => {
    const ics = reminderIcs(r);
    expect(ics).toContain("DTSTART:20261018T193000\r\n");
    expect(ics).toContain("DTEND:20261018T203000\r\n");
    expect(ics).toContain("RRULE:FREQ=DAILY");
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics.split("\r\n").every((l) => l.length <= 75)).toBe(true);
    expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
  });
  it("does not run past midnight", () => {
    expect(reminderIcs({ ...r, time: "23:30" })).toContain("DTEND:20261018T235900");
  });
  it("builds a Google Calendar link with the same rule", () => {
    const u = new URL(googleCalendarUrl(r));
    expect(u.searchParams.get("recur")).toBe("RRULE:FREQ=DAILY");
    expect(u.searchParams.get("dates")).toBe("20261018T193000/20261018T203000");
  });
});
