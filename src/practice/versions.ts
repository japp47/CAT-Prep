import type { RcAttempt, SectionalAttempt } from "../lib/state";
import { CR_CATALOG, RC_CATALOG, VA_CATALOG } from "./catalog.gen";

/**
 * Content versions (docs/feature.md, F46). An attempt keeps the version of what it answered; when a set is rewritten
 * its version changes, and the old answers no longer line up with the new questions. Attempts from before versions
 * existed have none and count as current.
 */
let maps: { rc: Map<string, string>; va: Map<string, string>; cr: Map<string, string> } | null = null;
const current = () => (maps ??= {
  rc: new Map(RC_CATALOG.map((m) => [m.id, m.v])),
  va: new Map(VA_CATALOG.map((m) => [m.id, m.v])),
  cr: new Map(CR_CATALOG.map((m) => [m.id, m.v])),
});

const differs = (now: string | undefined, then: string | undefined) => !!then && !!now && now !== then;

/** True when the RC set was rewritten after this attempt. */
export const rcStale = (a: Pick<RcAttempt, "set" | "v">) => differs(current().rc.get(a.set), a.v);

/** The version a question key ("rc:<set>:<n>", "pj:<paragraph>", "cr:<id>") has now. */
export function versionOfKey(k: string): string | undefined {
  const [kind, id] = k.split(":");
  return kind === "rc" ? current().rc.get(id) : kind === "cr" ? current().cr.get(id) : current().va.get(id);
}

/** Positions in a sectional whose question was rewritten after it was taken. */
export const sectionalStale = (s: Pick<SectionalAttempt, "qs" | "v">) => s.qs.flatMap((k, i) => (differs(versionOfKey(k), s.v?.[i]) ? [i] : []));
