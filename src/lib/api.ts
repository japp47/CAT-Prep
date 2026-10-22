/**
 * The 99ile API, reached at /api on the site itself (docs/architecture.md §4): a Cloudflare Pages Function forwards
 * it to the Go server, so the device cookie stays first-party. Calls never throw: every outcome is a value, and a
 * failure leaves the page working on this device's own copy.
 */

/** Sync and the API are visible only in builds with VITE_API_ENABLED=1 (on for `npm run dev`, off in production until B5). */
export const API_ENABLED = import.meta.env.VITE_API_ENABLED === "1";

export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; code: string; message: string };

export interface CallOptions {
  method?: "GET" | "POST" | "DELETE";
  /** Lets a push finish after the tab is hidden or closed (the body must stay under 64 KB). */
  keepalive?: boolean;
  timeoutMs?: number;
}

const OFFLINE = "You seem to be offline. Your progress is safe on this device.";

export async function api<T>(path: string, body?: unknown, opts: CallOptions = {}): Promise<ApiResult<T>> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 15_000);
  try {
    const res = await fetch(import.meta.env.BASE_URL + "api/v1" + path, {
      method: opts.method ?? (body === undefined ? "GET" : "POST"),
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      keepalive: opts.keepalive,
      signal: ctl.signal,
    });
    const json = await res.json().catch(() => null);
    if (res.ok) return { ok: true, status: res.status, data: json as T };
    const err = (json as { error?: { code?: string; message?: string } } | null)?.error;
    return { ok: false, status: res.status, code: err?.code ?? "http_" + res.status, message: err?.message ?? "The server could not answer just now." };
  } catch {
    return { ok: false, status: 0, code: "offline", message: OFFLINE };
  } finally {
    clearTimeout(timer);
  }
}
