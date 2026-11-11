import { api, type ApiResult } from "./api";
import { DOW } from "./date";

/**
 * Study reminders from the site's side (docs/feature.md F65, docs/design/notifications.md §8): the student's choices,
 * kept on the server because the reminder job reads them, and this browser's push subscription.
 */

export type EmailMode = "off" | "missed" | "daily";

export interface ReminderPrefs {
  on: boolean;
  /** Minutes after midnight, in quarter hours. */
  at: number;
  /** Weekdays with reminders, Sunday = 0. */
  days: number[];
  timeZone: string;
  quietFrom: number;
  quietTo: number;
  email: EmailMode;
  weekly: boolean;
  pausedUntil: string | null;
  /** Read only: the verified Google address, "" without one. */
  emailAddress: string;
  emailState: "ok" | "bounced";
  pushDevices: number;
  /** Read only: the server can send notifications (it has its push key). */
  pushReady: boolean;
  thisDevice: boolean;
  lastSent: { at: string; kind: string; channel: "email" | "push" } | null;
}

export const loadReminders = () => api<ReminderPrefs>("/notify/prefs");

export function saveReminders(p: ReminderPrefs): Promise<ApiResult<ReminderPrefs>> {
  const { on, at, days, timeZone, quietFrom, quietTo, email, weekly, pausedUntil } = p;
  return api<ReminderPrefs>("/notify/prefs", { on, at, days, timeZone, quietFrom, quietTo, email, weekly, pausedUntil }, { method: "PUT" });
}

/** The browser's own time zone; reminders follow it. */
export const browserZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  } catch {
    return "Asia/Kolkata";
  }
};

export const toClock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
/** "19:37" → 1170 + 30: the nearest quarter hour, as the server keeps it. */
export function fromClock(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  return (Math.round((+m[1] * 60 + +m[2]) / 15) * 15) % 1440;
}
/** 1170 → "7:30 pm", for sentences. */
export function spokenTime(m: number): string {
  const h = Math.floor(m / 60), mm = m % 60;
  return `${h % 12 || 12}${mm ? ":" + String(mm).padStart(2, "0") : ""} ${h < 12 ? "am" : "pm"}`;
}

/** "Mon, Wed and Fri": plain words, never a bare list. */
const spoken = (parts: string[]) => (parts.length > 1 ? parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1] : parts[0] ?? "");

/** The reminder days as a student would say them: "every day", "on weekdays", "on Mon, Wed and Fri". */
export function daysLine(days: number[]): string {
  const d = [...new Set(days.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort((a, b) => a - b);
  if (!d.length) return "on no days";
  if (d.length === 7) return "every day";
  if (d.length === 5 && [1, 2, 3, 4, 5].every((x) => d.includes(x))) return "on weekdays";
  if (d.length === 2 && d.includes(0) && d.includes(6)) return "at the weekend";
  if (d.length === 6) return `every day except ${DOW[[0, 1, 2, 3, 4, 5, 6].find((x) => !d.includes(x)) as number]}`;
  return "on " + spoken(d.map((x) => DOW[x].slice(0, 3)));
}

/**
 * The days after tapping one, in week order, or null when the tap would leave no day: reminders on "on no days"
 * would look healthy and never arrive, so turning reminders off stays the main switch's job.
 */
export function toggleDay(days: number[], day: number): number[] | null {
  const next = days.includes(day) ? days.filter((x) => x !== day) : [...days, day].sort((a, b) => a - b);
  return next.length ? next : null;
}

/** What a reminder promises, in one sentence: when it comes and the one condition. */
export const whenLine = (p: ReminderPrefs) => `Around ${spokenTime(p.at)}, ${daysLine(p.days)}, if you haven't practised yet.`;

/**
 * Where reminders actually go right now, or "" when nothing is switched on. Reminders can be on with no channel —
 * push refused, email never chosen — and then nothing arrives, so the card and the panel say so instead of looking fine.
 */
export function whereLine(p: ReminderPrefs): string {
  const others = Math.max(0, p.pushDevices - (p.thisDevice ? 1 : 0));
  const parts: string[] = [];
  if (p.thisDevice) parts.push("this device");
  if (others) parts.push(`${others} other ${others === 1 ? "device" : "devices"}`);
  if (p.email !== "off" && p.emailAddress) parts.push(p.emailAddress);
  return spoken(parts);
}

/** Whether reminders are on hold, and until when. */
export const pausedUntil = (p: ReminderPrefs) => (p.pausedUntil && new Date(p.pausedUntil) > new Date() ? p.pausedUntil : null);

export type PushSupport = "yes" | "install" | "no";

/** Notifications work only when this browser can show them and the server can send them. */
export const pushHere = (p: ReminderPrefs): PushSupport => (p.pushReady ? pushSupport() : "no");

/** Whether this browser can show reminders: on iPhone and iPad only once 99ile is on the Home Screen (iOS 16.4+). */
export function pushSupport(): PushSupport {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return "no";
  const apple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (apple && !standalone) return "install";
  return "PushManager" in window && "Notification" in window ? "yes" : "no";
}

function keyBytes(b64url: string): Uint8Array {
  const s = atob(b64url.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (b64url.length % 4)) % 4));
  const out = new Uint8Array(new ArrayBuffer(s.length));
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export type PushOutcome = { ok: true } | { ok: false; why: "denied" | "unsupported" | "failed"; message: string };

/**
 * Turns push on in this browser. Call it straight from a tap: browsers only show the permission prompt then.
 * The subscription goes to the server, which sends to it; a refusal is final until the student changes it in the
 * browser's site settings, so the message says where.
 */
export async function turnOnPush(): Promise<PushOutcome> {
  if (pushSupport() !== "yes") return { ok: false, why: "unsupported", message: "This browser cannot show reminders." };
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, why: "denied", message: "Notifications are blocked for 99ile in this browser. Allow them in the site settings (the icon left of the address), then try again." };
  }
  try {
    // The offline service worker shows the notifications; without it (a development build) there is nothing to ask.
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return { ok: false, why: "unsupported", message: "Notifications need this page to finish loading. Reload it and try again." };
    const key = await api<{ key: string }>("/notify/push-key");
    if (!key.ok) return { ok: false, why: "failed", message: key.message };
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key.data.key) }));
    const saved = await api("/notify/push", sub.toJSON());
    return saved.ok ? { ok: true } : { ok: false, why: "failed", message: saved.message };
  } catch {
    return { ok: false, why: "failed", message: "Reminders could not be turned on in this browser. Please try again." };
  }
}

/** Turns push off in this browser, here and on the server. */
export async function turnOffPush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    await (await reg?.pushManager.getSubscription())?.unsubscribe();
  } catch { /* the server copy is removed below either way */ }
  await api("/notify/push", undefined, { method: "DELETE" });
}

const VISIT = "cat-prep-reminder-visit";

/**
 * A page opened from a reminder carries ?from=reminder-…&m=<message>. At start the message id is kept and the two
 * parameters leave the address, so a shared or bookmarked link never counts twice; the sync runner reports it.
 */
export function takeReminderVisit() {
  try {
    const u = new URL(location.href);
    const from = u.searchParams.get("from"), m = u.searchParams.get("m");
    if (!from?.startsWith("reminder-")) return;
    if (m && /^\d{1,18}$/.test(m)) sessionStorage.setItem(VISIT, m);
    u.searchParams.delete("from");
    u.searchParams.delete("m");
    history.replaceState(history.state, "", u.pathname + u.search + u.hash);
  } catch { /* storage blocked: the visit is simply not counted */ }
}

export async function reportReminderVisit() {
  try {
    const m = sessionStorage.getItem(VISIT);
    if (!m) return;
    sessionStorage.removeItem(VISIT);
    await api("/notify/opened", { m: Number(m) });
  } catch { /* not counted */ }
}
