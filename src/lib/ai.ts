import { useEffect, useState } from "react";
import { api, API_ENABLED, SIGNIN_ENABLED } from "./api";
import { loadLedger } from "./sync/ledger";

/**
 * The AI service from the site's side (F35, F36, D100, D101, docs/design/explain-mistake.md). The browser sends ids,
 * and for a summary its own words; the server builds the prompt from published content, checks the reply and caches
 * it. A new answer needs a Google account: the server caps answers per student and per day, and a free sync identity
 * would let one person bring many caps.
 */
export interface AiStatus { on: boolean; signedIn: boolean }
const OFF: AiStatus = { on: false, signedIn: false };

let status: { who: string; p: Promise<AiStatus> } | null = null;
/**
 * Asked once for each way this browser is signed in: signing out does not reload the page, so the answer is kept
 * against the synced identity and asked again when that changes.
 */
export function aiStatus(): Promise<AiStatus> {
  if (!API_ENABLED) return Promise.resolve(OFF);
  const L = loadLedger(), who = L.on ? `${L.who?.identityId ?? ""}:${L.who?.account ? "account" : ""}` : "off";
  if (status?.who !== who) status = { who, p: api<AiStatus>("/ai").then((r) => (r.ok ? { on: r.data.on === true, signedIn: r.data.signedIn === true } : OFF)) };
  return status.p;
}

/**
 * What a screen offers: "ask" when the student can ask, "signin" when AI is on but they need to sign in first (and
 * sign-in exists on this site), else "none".
 */
export function useAi(): "ask" | "signin" | "none" {
  const [s, setS] = useState<AiStatus>(OFF);
  useEffect(() => { let live = true; void aiStatus().then((v) => { if (live) setS(v); }); return () => { live = false; }; }, []);
  return !s.on ? "none" : s.signedIn ? "ask" : SIGNIN_ENABLED ? "signin" : "none";
}

export interface Explanation { tempting: string; settles: [number, number]; next: string; key: string; cached: boolean }

export const explainMistake = (m: { set: string; v: string; q: number; chosen: number; line: [number, number] | null }) =>
  api<Explanation>("/ai/explain", m);

/** One check's verdict on a summary: met or not, the student's own words that show it ("" when none), one line. */
export interface SummaryVerdict { id: string; ok: boolean; words: string; note: string }
export interface SummaryFeedback { checks: SummaryVerdict[]; key: string; cached: boolean }

/** The student's ticks are not sent: the second opinion is formed without them. */
export const checkSummary = (m: { set: string; v: string; text: string }) => api<SummaryFeedback>("/ai/summary", m);

/** The smallest edit of the student's own summary that meets all four checks, or tooFar when a small edit would not do (F36b). */
export interface SummaryFix { fixed?: string; tooFar: boolean; key: string; cached: boolean }
export const fixSummary = (m: { set: string; v: string; text: string }) => api<SummaryFix>("/ai/summary/fix", m);

/** Marks an explanation or summary verdict as wrong; three students' flags drop it from the cache. */
export const flagAi = (key: string) => api<null>("/ai/flag", { key });
