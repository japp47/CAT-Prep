import type { LrAttempt } from "../lib/state";
import { fmtSecs } from "../practice/record";
import type { DiData, LrSet } from "../practice/types";
import { DiTable } from "./DiChart";

/**
 * What a DI set's review adds (F90, F95; docs/design/di-sets.md): each table with its blanks filled, where the minutes
 * went question by question, and the calculator's log, with a note where the options were far enough apart that an
 * estimate would have done. Each part shows only when there is something to show, so LR sets get the minutes and the
 * calculations too.
 */

/** A blank's value (or range) from the solution, by row and column. */
export function fillOf(d: DiData, set: LrSet) {
  const fill = set.solution.fills?.find((f) => f.data === d.id);
  return (row: string, col: string) => fill?.cells.find(([r, c]) => r === row && c === col)?.[2];
}

/**
 * How far apart a question's numeric options are, as the smallest step from one to the next in percent of the
 * smaller, or null when the options are not all numbers.
 */
export function optionSpread(options: string[] | undefined): number | null {
  // Only calculated answers (a percentage or a decimal): counts and labels are not estimated.
  if (!options || !options.some((o) => /[%.]/.test(o))) return null;
  const xs = options.map((o) => Number(o.replace(/[%,\s₹]/g, "")));
  if (xs.some((x) => !Number.isFinite(x) || x <= 0)) return null;
  const s = [...xs].sort((a, b) => a - b);
  return Math.min(...s.slice(1).map((x, i) => ((x - s[i]) / s[i]) * 100));
}

export function DiReview({ set, attempt }: { set: LrSet; attempt: LrAttempt }) {
  const blanks = (set.data ?? []).filter((d) => d.rows.some((r) => r.cells.some((v) => v === null)));
  const qs = attempt.qs?.length === set.questions.length ? attempt.qs : null;
  const calc = attempt.calc ?? [];
  if (!blanks.length && !qs && !calc.length) return null;
  const longest = qs ? qs.indexOf(Math.max(...qs)) : -1;
  const top = qs ? Math.max(...qs, 1) : 1;
  return (
    <section aria-label="Data and time" className="grid gap-4 lg:grid-cols-2">
      {blanks.map((d) => (
        <div key={d.id} className="flex flex-col gap-3 rounded-lg bg-card p-5 sm:p-6 lg:col-span-2">
          <h2 className="text-heading font-semibold">{d.caption}, filled</h2>
          <p className="measure text-base text-muted-foreground">{set.solution.fills?.some((f) => f.data === d.id && f.cells.some((c) => typeof c[2] === "string"))
            ? "The hidden entries are tinted. The rules pin some of them down only to a range, so the range is shown."
            : "The missing entries, worked out from the totals and the rules, are tinted."}</p>
          <DiTable data={d} fill={fillOf(d, set)} />
        </div>
      ))}
      {qs && (
        <div className="flex flex-col gap-3 rounded-lg bg-card p-5 sm:p-6">
          <h2 className="text-heading font-semibold">Where your minutes went</h2>
          <p className="text-base text-muted-foreground">Question {longest + 1} took longest, {fmtSecs(qs[longest])} of {fmtSecs(attempt.secs)}.</p>
          <ol className="flex flex-col gap-2">
            {qs.map((s, i) => {
              const spread = set.questions[i].kind === "mcq" ? optionSpread(set.questions[i].options) : null;
              return (
                <li key={i} className="flex flex-col gap-1">
                  <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem] items-center gap-2 text-base">
                    <span className="text-muted-foreground">Q{i + 1}</span>
                    <span className="h-2.5 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full bg-primary/70" style={{ width: `${Math.max(3, (s / top) * 100)}%` }} /></span>
                    <span className="text-right tabular-nums">{fmtSecs(s)}</span>
                  </div>
                  {spread !== null && spread >= 8 && <p className="pl-12 text-sm text-muted-foreground">Options at least {Math.floor(spread)}% apart: an estimate was enough here.</p>}
                </li>
              );
            })}
          </ol>
        </div>
      )}
      {(qs || calc.length > 0) && (
        <div className="flex flex-col gap-3 rounded-lg bg-card p-5 sm:p-6">
          <h2 className="text-heading font-semibold">Your calculations</h2>
          {calc.length ? <>
            <p className="text-base text-muted-foreground">{calc.length === 1 ? "One calculation" : `${calc.length} calculations`} on the calculator, in order. Look for the ones a rough estimate would have settled.</p>
            <ol className="flex max-h-72 flex-col gap-1 overflow-y-auto text-base tabular-nums">
              {calc.map((l, i) => <li key={i} className="rounded-md px-2 py-1 even:bg-muted/60">{l}</li>)}
            </ol>
          </> : <p className="text-base text-muted-foreground">You did not use the calculator. In CAT it is a click away; it pays for long divisions when the options are close.</p>}
        </div>
      )}
    </section>
  );
}
