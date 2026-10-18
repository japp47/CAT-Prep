/** A daily study reminder as a calendar event, so phones remind students without a server or push messages. */

const pad = (n: number) => (n < 10 ? "0" : "") + n;
/** "2026-10-18" and "19:30" to the floating local time "20261018T193000". */
const stamp = (date: string, time: string) => date.replace(/-/g, "") + "T" + time.replace(":", "") + "00";

function addMinutes(time: string, m: number): string {
  const [h, mm] = time.split(":").map(Number);
  const t = (h * 60 + mm + m) % 1440;
  return pad(Math.floor(t / 60)) + ":" + pad(t % 60);
}

/** Folds long lines and escapes text as RFC 5545 requires. */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const fold = (line: string) => (line.length > 73 ? line.match(/.{1,73}/g)!.join("\r\n ") : line);
/** Now in UTC, as DTSTAMP must be: "20261017T170512Z". */
const utcNow = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

export interface Reminder { date: string; time: string; minutes: number; url: string }

export function reminderIcs({ date, time, minutes, url }: Reminder): string {
  const end = addMinutes(time, minutes);
  // An event that would cross midnight ends at 23:59 instead.
  const endTime = end > time ? end : "23:59";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//99ile//Study reminder//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:study-reminder-${stamp(date, time)}@99ile`,
    `DTSTAMP:${utcNow()}`,
    `DTSTART:${stamp(date, time)}`,
    `DTEND:${stamp(date, endTime)}`,
    "RRULE:FREQ=DAILY",
    "SUMMARY:CAT prep: today's timetable",
    `DESCRIPTION:${esc("Open your timetable: " + url)}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Time for CAT prep",
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].map(fold).join("\r\n");
}

/** The same reminder as a Google Calendar "add event" link. */
export function googleCalendarUrl({ date, time, minutes, url }: Reminder): string {
  const end = addMinutes(time, minutes);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: "CAT prep: today's timetable",
    dates: `${stamp(date, time)}/${stamp(date, end > time ? end : "23:59")}`,
    recur: "RRULE:FREQ=DAILY",
    details: "Open your timetable: " + url,
  });
  return "https://calendar.google.com/calendar/render?" + p.toString();
}
