export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY = 86400000;

const pad = (n: number) => (n < 10 ? "0" + n : "" + n);

export function iso(d: Date): string {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
export function parseIso(s: string): Date {
  const p = String(s).split("-");
  return new Date(+p[0], +p[1] - 1, +p[2]);
}
export function addDays(s: string, n: number): string {
  const d = parseIso(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}
export function diffDays(a: string, b: string): number {
  return Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / DAY);
}
export function todayIso(): string {
  return iso(new Date());
}
export function dow(s: string): number {
  return parseIso(s).getDay();
}
export function isWeekend(s: string): boolean {
  const g = dow(s);
  return g === 0 || g === 6;
}
export function shortDate(s: string): string {
  const d = parseIso(s);
  return d.getDate() + " " + MON[d.getMonth()];
}
export function mediumDate(s: string): string {
  const d = parseIso(s);
  return d.getDate() + " " + MON[d.getMonth()] + " " + d.getFullYear();
}
export function longDate(s: string): string {
  const d = parseIso(s);
  return DOW[d.getDay()] + " " + d.getDate() + " " + MON[d.getMonth()] + " " + d.getFullYear();
}
/** Monday of the week containing s. */
export function weekStart(s: string): string {
  return addDays(s, -((dow(s) + 6) % 7));
}
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/**
 * A row id: the time first (so ids sort in the order rows were made), then 10 random characters. With sync, ids
 * from several devices share one space, so the random part comes from crypto (about 51 bits). Older ids had 4.
 */
export const uid = () => {
  const r = new Uint8Array(10);
  crypto.getRandomValues(r);
  return Date.now().toString(36) + Array.from(r, (b) => (b % 36).toString(36)).join("");
};
export const isIsoDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
