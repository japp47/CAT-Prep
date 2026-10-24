import { addDays, dow as weekday } from "../lib/date";
import type { AppState } from "../lib/state";
import { CR_CATALOG, RC_CATALOG, VA_CATALOG } from "./catalog.gen";
import { REDO_SRC } from "./record";
import { SECTIONAL_SRC } from "./sectional";
import { CR_TYPE } from "./types";
import { VA_KIND, type VaKind } from "./va/build";

/**
 * History (docs/feature.md F51): what the student did each day, built from what is already saved, so it works
 * offline and needs no server (D26). One item per attempt; mistakes logged and redo answers are one summary item a
 * day. Practice rows that an in-app attempt wrote are left out, since the attempt itself is shown.
 */

export type HistoryKind = "practice" | "tests" | "reviews" | "writing" | "mistakes";
export const KIND_LABEL: Record<HistoryKind, string> = { practice: "Practice", tests: "Tests", reviews: "Reviews", writing: "Writing", mistakes: "Mistakes" };
export const HISTORY_KINDS = Object.keys(KIND_LABEL) as HistoryKind[];

/** What the row shows as its icon; the page maps it to a picture. */
export type HistoryIcon = "rc" | "va" | "cr" | "speed" | "redo" | "own" | "sectional" | "mock" | "analysis" | "week" | "summary" | "mistake";

export interface HistoryItem {
  id: string;
  d: string;
  kind: HistoryKind;
  icon: HistoryIcon;
  title: string;
  detail: string;
  /** Where the row leads: the review when there is one. */
  href?: string;
  secs?: number;
  /** Lower-case text the title filter and site search match against. */
  search: string;
}

export interface HistoryDay { d: string; items: HistoryItem[]; minutes: number }

const rcTitle = new Map(RC_CATALOG.map((s) => [s.id, s.title]));
const vaTopic = new Map(VA_CATALOG.map((p) => [p.id, p.topic]));
const crMeta = new Map(CR_CATALOG.map((c) => [c.id, c]));
const AUTO_SRC = new Set([REDO_SRC, SECTIONAL_SRC, "Daily VA drill", "Custom VA drill", "Critical reasoning drill"]);
const isAuto = (src: string) => AUTO_SRC.has(src) || src.startsWith("Practice: ") || src.startsWith("Mock: ");

const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;
const mins = (secs: number) => (secs < 60 ? "under a minute" : `${Math.round(secs / 60)} min`);
const right = (c: number, n: number) => `${c} of ${n} right`;
const list = (xs: string[]) => [...new Set(xs)].join(", ");

/** Minutes ticked off on Today that day (blocks done), the same count the weekly review uses. */
export function tickedMinutes(st: AppState, d: string): number {
  return Object.values(st.days[d]?.done ?? {}).reduce((s, m) => s + (m > 0 ? m : 0), 0);
}

export function historyItems(st: AppState): HistoryItem[] {
  const out: HistoryItem[] = [];
  const add = (x: Omit<HistoryItem, "search">) => out.push({ ...x, search: (x.title + " " + x.detail).toLocaleLowerCase() });

  st.rcAttempts.forEach((a) => {
    const title = rcTitle.get(a.set) ?? "RC set";
    const n = a.ans.length, skipped = a.ans.filter((x) => x == null).length;
    add({ id: "rc-" + a.id, d: a.d, kind: "practice", icon: "rc", title, secs: a.secs,
      detail: `RC${a.mode === "daily" ? " of the day" : ""}, ${right(a.c, n)}${skipped ? `, ${skipped} skipped` : ""}, ${mins(a.secs)}`,
      href: `/practice/rc/${a.set}?review=${a.id}` });
  });
  st.vaAttempts.forEach((a) => {
    const kinds = list(a.items.map((i) => VA_KIND[i.k.split(":")[0] as VaKind]?.label ?? "VA"));
    const topics = list(a.items.map((i) => vaTopic.get(i.k.split(":")[1]) ?? "")).trim();
    add({ id: "va-" + a.id, d: a.d, kind: "practice", icon: "va", title: (a.mode === "daily" ? "Daily VA drill" : "VA drill") + ": " + kinds, secs: a.secs,
      detail: `${right(a.items.filter((i) => i.ok).length, a.items.length)}, ${mins(a.secs)}${topics ? `. ${topics}` : ""}`,
      href: `/practice/va?review=${a.id}` });
  });
  st.crAttempts.forEach((a) => {
    const kinds = list(a.items.map((i) => { const m = crMeta.get(i.k.replace(/^cr:/, "")); return m ? CR_TYPE[m.type].label : ""; }).filter(Boolean));
    add({ id: "cr-" + a.id, d: a.d, kind: "practice", icon: "cr", title: "Critical reasoning" + (kinds ? ": " + kinds : ""), secs: a.secs,
      detail: `${right(a.items.filter((i) => i.ok).length, a.items.length)}, ${mins(a.secs)}`, href: `/practice/cr?review=${a.id}` });
  });
  st.speedRuns.forEach((r) => add({ id: "speed-" + r.id, d: r.d, kind: "practice", icon: "speed", title: "Reading speed: " + (rcTitle.get(r.set) ?? "a passage"), secs: r.secs,
    detail: `${r.wpm} words a minute, recall ${r.recall} of 2`, href: "/practice/speed" }));

  // Redo answers and outside practice: redo is one row a day; outside sets are one row each.
  const redo = new Map<string, { n: number; c: number }>();
  st.practice.forEach((p) => {
    if (p.src === REDO_SRC) { const r = redo.get(p.d) ?? { n: 0, c: 0 }; r.n += p.a; r.c += p.c; redo.set(p.d, r); return; }
    if (isAuto(p.src)) return;
    add({ id: "own-" + p.id, d: p.d, kind: "practice", icon: "own", title: `${p.sec} ${p.t}` + (p.src ? `: ${p.src}` : ""),
      detail: `${right(p.c, p.a)}, logged by you`, href: "/progress?tab=log" });
  });
  redo.forEach((r, d) => add({ id: "redo-" + d, d, kind: "practice", icon: "redo", title: "Redo queue", detail: `${plural(r.n, "question")}, ${r.c} right`, href: "/practice/redo" }));

  st.sectionals.forEach((s) => add({ id: "sec-" + s.id, d: s.d, kind: "tests", icon: "sectional", title: "VARC sectional", secs: s.secs,
    detail: `Score ${3 * s.c - s.w} of ${3 * s.qs.length}, ${s.c} right, ${s.w} wrong, ${mins(s.secs)}`, href: `/practice/sectional/${s.id}` }));
  st.mocks.forEach((m) => {
    const review = st.mockReviews.find((r) => r.mock === m.id);
    add({ id: "mock-" + m.id, d: m.d, kind: "tests", icon: "mock", title: `${m.sec} ${m.k}${m.n ? ": " + m.n : ""}`,
      detail: `Raw score ${3 * m.c - m.w}, ${m.c} right, ${m.w} wrong`, href: review ? `/progress/mock-review/${review.id}` : "/progress?tab=log" });
  });
  st.mockReviews.forEach((r) => add({ id: "analysis-" + r.id, d: r.d, kind: "reviews", icon: "analysis", title: "Analysed: " + (r.name || "a mock"),
    detail: r.recs.length ? `${plural(r.recs.length, "action")} picked` : "Mock analysis", href: `/progress/mock-review/${r.id}` }));
  st.weekReviews.forEach((w) => { if (w.closed && !w.skipped) add({ id: "week-" + w.id, d: w.d, kind: "reviews", icon: "week", title: "Weekly review", detail: w.focus ? "A focus picked for the week" : "Week looked back on", href: `/review/${w.id}` }); });

  st.summaries.forEach((s) => add({ id: "sum-" + s.id, d: s.d, kind: "writing", icon: "summary",
    title: "Summary: " + (s.title || (s.set ? rcTitle.get(s.set) : "") || s.from || "an article"),
    detail: `${s.words} words, ${s.checks.filter(Boolean).length} of ${s.checks.length} checks`, href: "/journal" }));

  const mistakes = new Map<string, number>();
  st.errors.forEach((e) => mistakes.set(e.d, (mistakes.get(e.d) ?? 0) + 1));
  mistakes.forEach((n, d) => add({ id: "err-" + d, d, kind: "mistakes", icon: "mistake", title: plural(n, "mistake") + " logged", detail: "In your Error log", href: "/errors" }));

  return out.filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.d));
}

/** Days with at least one item, newest first; items within a day keep a stable order (tests, practice, then the rest). */
export function historyDays(st: AppState, items = historyItems(st)): HistoryDay[] {
  const by = new Map<string, HistoryItem[]>();
  items.forEach((x) => { const l = by.get(x.d); if (l) l.push(x); else by.set(x.d, [x]); });
  Object.keys(st.days).forEach((d) => { if (tickedMinutes(st, d) > 0 && !by.has(d)) by.set(d, []); });
  const order: Record<HistoryKind, number> = { tests: 0, practice: 1, reviews: 2, writing: 3, mistakes: 4 };
  return [...by.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([d, xs]) => ({
      d,
      items: xs.sort((a, b) => order[a.kind] - order[b.kind]),
      minutes: dayMinutes(st, d, xs),
    }));
}

/** Minutes for a day: what was ticked off on Today, else the time measured in practice. */
export function dayMinutes(st: AppState, d: string, items: HistoryItem[]): number {
  const ticked = tickedMinutes(st, d);
  return ticked > 0 ? ticked : Math.round(items.reduce((s, x) => s + (x.secs ?? 0), 0) / 60);
}

export interface HistoryFilter { kind?: HistoryKind; q?: string }

export function filterDays(days: HistoryDay[], f: HistoryFilter): HistoryDay[] {
  const q = f.q?.trim().toLocaleLowerCase();
  if (!f.kind && !q) return days;
  return days
    .map((day) => ({ ...day, items: day.items.filter((x) => (!f.kind || x.kind === f.kind) && (!q || q.split(/\s+/).every((t) => x.search.includes(t)))) }))
    .filter((day) => day.items.length > 0);
}

/** Shade for one day in the strip, 0 (nothing) to 4. Items with no minutes still count as a light day. */
export function level(minutes: number, items: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes >= 90) return 4;
  if (minutes >= 45) return 3;
  if (minutes >= 20) return 2;
  return minutes > 0 || items > 0 ? 1 : 0;
}

/** The strip: 12 weeks, Monday first, ending with the week of today. Days after today are null. */
export function stripWeeks(today: string, weeks = 12): (string | null)[][] {
  const dow = (weekday(today) + 6) % 7;
  const start = addDays(today, -dow - 7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, w * 7 + i);
    return d <= today ? d : null;
  }));
}

const NOUN: Partial<Record<HistoryIcon, [string, string]>> = {
  rc: ["RC set", "RC sets"], va: ["VA drill", "VA drills"], cr: ["critical reasoning drill", "critical reasoning drills"], speed: ["speed test", "speed tests"],
  sectional: ["sectional", "sectionals"], mock: ["mock", "mocks"], own: ["logged set", "logged sets"], summary: ["summary", "summaries"],
  analysis: ["mock analysis", "mock analyses"], week: ["weekly review", "weekly reviews"],
};

/** "2 RC sets, 1 VA drill, 54 min": one day in a line, for Today. Empty when nothing was done. */
export function daySummary(day: HistoryDay | undefined): string {
  if (!day) return "";
  const counts = new Map<HistoryIcon, number>();
  day.items.forEach((x) => { if (NOUN[x.icon]) counts.set(x.icon, (counts.get(x.icon) ?? 0) + 1); });
  const parts = [...counts.entries()].map(([icon, n]) => `${n} ${NOUN[icon]![n === 1 ? 0 : 1]}`);
  const shown = parts.length > 3 ? [...parts.slice(0, 3), "more"] : parts;
  if (day.minutes) shown.push(day.minutes < 60 ? `${day.minutes} min` : `${Math.floor(day.minutes / 60)} h ${day.minutes % 60} min`.replace(" 0 min", ""));
  return shown.join(", ");
}

/** The You page's numbers (F81): days with any study, questions answered in 99ile's practice, and minutes. */
export interface StudySoFar { days: number; questions: number; minutes: number }

export function studySoFar(st: AppState, days = historyDays(st)): StudySoFar {
  const questions =
    st.rcAttempts.reduce((s, a) => s + a.ans.filter((x) => x !== null).length, 0) +
    st.vaAttempts.reduce((s, a) => s + a.items.filter((x) => x.a !== "").length, 0) +
    st.crAttempts.reduce((s, a) => s + a.items.filter((x) => x.a !== null).length, 0) +
    st.sectionals.reduce((s, a) => s + a.a.filter((x) => x !== "").length, 0);
  return { days: days.length, questions, minutes: days.reduce((s, d) => s + d.minutes, 0) };
}
