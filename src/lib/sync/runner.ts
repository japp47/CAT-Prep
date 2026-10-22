import { describe, join, round, turnOff, turnOn, type Outcome, type SyncIO } from "./client";

/**
 * When sync runs (docs/architecture.md §6.2): on load, 30 s after the last change, when the connection returns,
 * when the tab is hidden (with keepalive), and on focus if the last round was over 5 minutes ago. No polling.
 * A failed round waits 1, 5, 15, then 60 minutes before the next automatic try, and never shows a popup.
 */

export type Phase = "off" | "idle" | "syncing" | "error";
export interface Status { phase: Phase; last?: number; message?: string; identityId?: string }

const BACKOFF = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000];
const AFTER_CHANGE = 30_000;
const FOCUS_AFTER = 5 * 60_000;

let io: SyncIO | null = null;
// The runner loads when the browser is idle; a tap on "Turn on sync" before that waits for it.
let arrived: (io: SyncIO) => void = () => {};
let ready = new Promise<SyncIO>((done) => { arrived = done; });
let status: Status = { phase: "off" };
const listeners = new Set<() => void>();
let running: Promise<Outcome> | null = null;
let again = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let failures = 0;
let retryAt = 0;

function set(next: Status) {
  status = next;
  listeners.forEach((f) => f());
}

function fromLedger(extra: Partial<Status> = {}): Status {
  const L = io!.load();
  return { phase: L.on ? "idle" : "off", last: L.last, identityId: L.who?.identityId, ...extra };
}

export const getStatus = () => status;
export function subscribe(f: () => void) {
  listeners.add(f);
  return () => { listeners.delete(f); };
}

function finish(out: Outcome) {
  if (out.ok) { failures = 0; retryAt = 0; set(fromLedger()); return; }
  failures++;
  retryAt = Date.now() + BACKOFF[Math.min(failures, BACKOFF.length) - 1];
  set(fromLedger({ phase: io!.load().on ? "error" : "off", message: out.message }));
}

/** Runs a round now, unless one is running (then one more follows it). `force` ignores the backoff (a tap). */
export function syncNow(force = false, keepalive = false): Promise<Outcome> | null {
  if (!io || !io.load().on) return null;
  if (!force && Date.now() < retryAt) return null;
  if (running) { again = true; return running; }
  clearTimeout(timer);
  set(fromLedger({ phase: "syncing" }));
  running = round(io, { keepalive }).then((out) => {
    running = null;
    finish(out);
    if (again) { again = false; void syncNow(); }
    return out;
  });
  return running;
}

/** Called after every saved change: a round 30 s after the last one. */
export function poke() {
  if (!io || !io.load().on) return;
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), AFTER_CHANGE);
}

/** Starts listening. Returns a function that stops. */
export function start(next: SyncIO): () => void {
  io = next;
  arrived(next);
  set(fromLedger());
  const online = () => void syncNow(true);
  const hidden = () => { if (document.visibilityState === "hidden") void syncNow(false, true); };
  const focus = () => { const last = io?.load().last ?? 0; if (Date.now() - last > FOCUS_AFTER) void syncNow(); };
  window.addEventListener("online", online);
  document.addEventListener("visibilitychange", hidden);
  window.addEventListener("focus", focus);
  void syncNow();
  return () => {
    window.removeEventListener("online", online);
    document.removeEventListener("visibilitychange", hidden);
    window.removeEventListener("focus", focus);
    clearTimeout(timer);
    io = null;
    ready = new Promise<SyncIO>((done) => { arrived = done; });
  };
}

const about = () => describe(navigator.userAgent, navigator.maxTouchPoints ?? 0);

async function begin(f: (io: SyncIO) => Promise<Outcome>): Promise<Outcome> {
  set({ ...status, phase: "syncing" });
  const x = io ?? await Promise.race([ready, new Promise<null>((done) => setTimeout(() => done(null), 15_000))]);
  if (!x) { set({ ...status, phase: "off" }); return { ok: false, status: 0, code: "not_ready", message: "Sync could not start. Reload the page and try again." }; }
  failures = 0; retryAt = 0;
  const out = await f(x);
  finish(out);
  return out;
}

export const enable = () => begin((x) => turnOn(x, about()));
export const joinIdentity = (identityId: string) => begin((x) => join(x, identityId, about()));
export function disable() {
  if (!io) return;
  turnOff(io);
  clearTimeout(timer);
  set(fromLedger());
}
