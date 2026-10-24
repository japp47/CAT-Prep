import type { Account } from "./client";
import { completeSignIn, deleteEverywhere, describe, leave, link, listDevices, newLinkCode, newRecoveryCode, removeDevice, round, serverExport, ticketInfo, turnOn, whoAmI, type Outcome, type SyncIO } from "./client";

/**
 * When sync runs (docs/architecture.md §6.2): on load, 30 s after the last change, when the connection returns,
 * when the tab is hidden (with keepalive), and on focus if the last round was over 5 minutes ago. No polling.
 * A failed round waits 1, 5, 15, then 60 minutes before the next automatic try, and never shows a popup.
 */

import { getStatus, setStatus, type Status } from "./status";
export { getStatus, subscribe, type Phase, type Status } from "./status";

const BACKOFF = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000];
const AFTER_CHANGE = 30_000;
const FOCUS_AFTER = 5 * 60_000;

let io: SyncIO | null = null;
// The runner loads when the browser is idle; a tap on "Turn on sync" before that waits for it.
let arrived: (io: SyncIO) => void = () => {};
let ready = new Promise<SyncIO>((done) => { arrived = done; });
let running: Promise<Outcome> | null = null;
let again = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let failures = 0;
let retryAt = 0;

const set = (next: Status) => setStatus(next);

function fromLedger(extra: Partial<Status> = {}): Status {
  const L = io!.load();
  return { phase: L.on ? "idle" : "off", last: L.last, identityId: L.who?.identityId, account: L.who?.account, ...extra };
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
  // Never left hanging: whatever happens inside, the round ends, the status is set and the next one can run.
  const x = io;
  const work = oneTab(() => round(x, { keepalive })).catch((): Outcome => ({ ok: false, status: 0, code: "client_error", message: "Sync stopped on an error. It will try again later." }));
  running = work.then((out) => {
    running = null;
    finish(out);
    if (again) { again = false; void syncNow(); }
    return out;
  });
  return running;
}

/**
 * Two tabs of one browser share the ledger, so only one may run a round at a time: the Web Locks API queues the
 * other. Browsers without it (very old ones) run unguarded, as before.
 */
function oneTab<T>(f: () => Promise<T>): Promise<T> {
  const locks = (globalThis.navigator as Navigator | undefined)?.locks;
  return locks ? locks.request("99ile-sync", f) as Promise<T> : f();
}

/** Called after every saved change: a round 30 s after the last one. */
export function poke() {
  if (!io || !io.load().on) return;
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), AFTER_CHANGE);
}

/** Starts listening. Returns a function that stops. */
export function start(next: SyncIO): () => void {
  const n = new Intl.NumberFormat("en-IN");
  io = { ...next, progress: (done, total) => set({ ...getStatus(), phase: "syncing", message: `Copying your progress… ${n.format(done)} of ${n.format(total)}` }) };
  arrived(io);
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

/** The runner once it has loaded (it loads when the browser is idle); null after 15 s. */
async function whenReady(): Promise<SyncIO | null> {
  return io ?? Promise.race([ready, new Promise<null>((done) => setTimeout(() => done(null), 15_000))]);
}
const NOT_READY: Outcome = { ok: false, status: 0, code: "not_ready", message: "Sync could not start. Reload the page and try again." };

async function begin<T extends Outcome>(f: (io: SyncIO) => Promise<T>): Promise<T | Outcome> {
  set({ ...getStatus(), phase: "syncing" });
  const x = await whenReady();
  if (!x) { set({ ...getStatus(), phase: "off" }); return NOT_READY; }
  failures = 0; retryAt = 0;
  const out = await oneTab(() => f(x)).catch((): Outcome => ({ ok: false, status: 0, code: "client_error", message: "Sync stopped on an error. Try again." }));
  finish(out);
  return out;
}

/** Turns sync on. The answer carries the recovery code, which is shown once. */
export const enable = (turnstileToken = "") => begin((x) => turnOn(x, about(), turnstileToken)) as Promise<Outcome & { recoveryCode?: string }>;
/** Joins this device to other progress with a link or recovery code; `keep` adds this device's progress to it. */
export const joinWith = (kind: "link" | "recover", code: string, keep: boolean) => begin((x) => link(x, kind, code, about(), keep));

/** Finishes Google sign-in for a ticket; `keep` adds this device's progress to the account's. */
export const signInComplete = (ticket: string, keep: boolean) => begin((x) => completeSignIn(x, ticket, about(), keep));

/** Calls that need the runner but are not sync rounds: link codes, recovery codes, the device list. */
async function call<T>(f: (io: SyncIO) => Promise<T>): Promise<T | Outcome> {
  const x = await whenReady();
  return x ? f(x) : NOT_READY;
}
export const makeLinkCode = () => call(newLinkCode);
export const makeRecoveryCode = () => call(newRecoveryCode);
export const devices = () => call(listDevices);
export const removeOne = (id: string) => call((x) => removeDevice(x, id));
export const exportServer = () => call(serverExport);
/** Asks the server which account owns this progress and keeps the answer with the ledger, for the header. */
export async function refreshAccount(): Promise<Account | null> {
  const x = await whenReady();
  if (!x) return getStatus().account ?? null;
  const res = await whoAmI(x);
  if (!res.ok) return getStatus().account ?? null;
  const L = x.load();
  if (L.who) {
    const a = res.data.account ?? undefined;
    x.save({ ...L, who: { identityId: L.who.identityId, deviceId: L.who.deviceId, ...(a ? { account: { email: a.email, name: a.name } } : {}) } });
    set(fromLedger());
  }
  return res.data.account;
}
export const signInTicket = (ticket: string) => call((x) => ticketInfo(x, ticket));

/**
 * Sends the browser to Google. It comes back to `back` (this page by default) with ?signin= (docs/architecture.md
 * §5.2); the /signin page passes itself, with the page to return to after.
 */
export function startSignIn(back = location.pathname) {
  location.assign(import.meta.env.BASE_URL + "api/v1/auth/google/start?next=" + encodeURIComponent(back));
}

/** Deletes this progress from the server and clears this device; on success sync is off here. */
export async function deleteAll(): Promise<Outcome> {
  const x = await whenReady();
  if (!x) return NOT_READY;
  clearTimeout(timer);
  const out = await oneTab(() => deleteEverywhere(x));
  set(fromLedger());
  return out;
}

/** Turns sync off on this device (the server is told, so it leaves the device list); `clear` empties this device. */
export async function disable(clear = false) {
  const x = await whenReady();
  if (!x) return;
  clearTimeout(timer);
  await leave(x, clear);
  set(fromLedger());
}
