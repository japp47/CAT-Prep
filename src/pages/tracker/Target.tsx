import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ErrorText, Field, Segmented } from "../../components/kit";
import { joinAnd, TARGET_CHOICES, VARC_TABLES } from "../../data/percentiles";
import { useStore } from "../../lib/store";
import { describe, estimate, grid, GRID_ACCURACY, marks, needs, ordinal, pctText, VARC_QS } from "../../practice/percentile";

/** The percentile the student is aiming for in VARC. Progress draws it on the mock chart; Plan shows what it takes. */
export function TargetPicker() {
  const { state, update } = useStore();
  return (
    <Segmented label="Target percentile in VARC" value={String(state.targets.varc)} onChange={(v) => update((st) => { st.targets.varc = Number(v); })}
      options={TARGET_CHOICES.map((p) => [String(p), ordinal(String(p))] as [string, string])} />
  );
}

/** What the target means in marks and in questions, in plain words. */
export function TargetNeeds({ pct }: { pct: number }) {
  const n = needs(pct);
  const years = joinAnd(VARC_TABLES.map((t) => t.year));
  return (
    <div className="measure flex flex-col gap-2 text-base">
      <p>The {ordinal(String(pct))} percentile in VARC took about <b className="font-semibold">{n.low} to {n.high} marks</b> in CAT {years}. Aim for {n.mid}. Each year's figure is the average of three published tables.</p>
      {n.ways.length > 0 && (
        <p className="text-muted-foreground">
          For {n.mid} marks: {n.ways.map((w, i) => <span key={w.attempted}>{i > 0 && (i === n.ways.length - 1 ? "; or " : "; ")}attempt {w.attempted} and get {w.right} right</span>)}. Each wrong answer costs a mark in these counts.
        </p>
      )}
    </div>
  );
}

const asInt = (v: string) => (/^\d{1,2}$/.test(v.trim()) ? parseInt(v, 10) : NaN);

/** Turns a score into a percentile range, and shows what each number attempted and accuracy is worth. */
export function Estimator({ last }: { last?: { c: number; w: number } }) {
  const { state } = useStore();
  const [c, setC] = useState(last ? String(last.c) : "");
  const [w, setW] = useState(last ? String(last.w) : "");
  const [err, setErr] = useState("");
  const [shown, setShown] = useState<{ c: number; w: number } | null>(last ?? null);
  const target = state.targets.varc;
  const goal = needs(target).mid;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const rc = asInt(c), rw = asInt(w);
    if (isNaN(rc) || isNaN(rw)) { setErr("Enter how many were right and how many were wrong, as whole numbers. Use 0 if there are none."); return; }
    if (rc + rw > VARC_QS) { setErr(`VARC has ${VARC_QS} questions, so right plus wrong cannot be more than ${VARC_QS}.`); return; }
    setErr("");
    setShown({ c: rc, w: rw });
  };

  const score = shown ? marks(shown.c, shown.w) : null;
  const est = score === null ? null : estimate(score);
  const cells = grid();

  return (
    <div className="flex flex-col gap-8">
      <form className="flex flex-col gap-4 rounded-lg bg-card p-5 sm:p-6" onSubmit={submit} autoComplete="off">
        <div className="grid grid-cols-2 items-end gap-4 sm:grid-cols-[8rem_8rem_auto]">
          <Field label="Right"><Input value={c} onChange={(e) => setC(e.target.value)} inputMode="numeric" placeholder="14" /></Field>
          <Field label="Wrong MCQ"><Input value={w} onChange={(e) => setW(e.target.value)} inputMode="numeric" placeholder="3" /></Field>
          <Button type="submit" className="col-span-2 sm:col-span-1 sm:justify-self-start">Find my percentile</Button>
        </div>
        <ErrorText>{err}</ErrorText>
        {est && score !== null && shown && (
          <div className="flex flex-col gap-2 border-t pt-4" role="status">{/* taste-skill-ignore: the result is set apart from the form it answers */}
            <p className="text-heading font-semibold">{shown.c} right and {shown.w} wrong is {score} marks, {describe(est)}.</p>
            <p className="text-base text-muted-foreground">
              {est.each.map((x, i) => <span key={x.year}>{i > 0 && " "}CAT {x.year} table: {x.edge === "below" ? `below the ${ordinal(pctText(x.pct))}.` : x.edge === "above" ? "the 99.9th or better." : `${ordinal(pctText(x.pct))}.`}</span>)}
            </p>
            <p className="text-base">{score >= goal ? `That reaches your target, the ${ordinal(String(target))} percentile.` : `Your target, the ${ordinal(String(target))} percentile, needs about ${goal} marks: ${goal - score} more.`}</p>
          </div>
        )}
      </form>

      <section className="flex flex-col gap-3" aria-labelledby="grid-h">
        <h3 id="grid-h" className="text-heading font-semibold">What attempts and accuracy are worth</h3>
        <p className="measure text-base text-muted-foreground">Rows are how many questions you attempt, columns how many of those you get right. Each cell shows the percentile, from the lowest of the three years, and the marks under it. Green cells reach your target.</p>
        <div className="overflow-x-auto rounded-lg bg-card">
          <table className="w-full min-w-[19rem] text-center text-base">
            <caption className="sr-only">Percentile and marks for each number attempted and share right</caption>
            <thead>
              <tr>
                <th scope="col" className="px-2 pt-4 pb-2 text-left text-sm font-medium text-muted-foreground sm:px-3"><span aria-hidden className="sm:hidden">Tried</span><span className="max-sm:sr-only">Attempted</span></th>
                {GRID_ACCURACY.map((a) => <th key={a} scope="col" className="px-1 pt-4 pb-2 text-sm font-medium text-muted-foreground sm:px-2">{a}%<span className="sr-only"> right</span></th>)}
              </tr>
            </thead>
            <tbody>
              {cells.map((row) => (
                <tr key={row[0].attempted} className="border-t">{/* taste-skill-ignore: rows of a real table */}
                  <th scope="row" className="px-2 py-2.5 text-left font-semibold whitespace-nowrap sm:px-3">{row[0].attempted}<span className="max-sm:sr-only"> of {VARC_QS}</span></th>
                  {row.map((cell) => (
                    <td key={cell.accuracy} className="p-px sm:p-1">
                      <div className={cn("flex flex-col rounded-md px-0 py-1.5 sm:px-1", cell.score >= goal && "bg-success-soft text-success")}>
                        <span className="font-semibold">{cell.est.below ? "under " + pctText(cell.est.high) : pctText(cell.est.low)}</span>
                        <span className={cn("text-sm", cell.score >= goal ? "text-success" : "text-muted-foreground")}>{cell.score}<span className="max-sm:sr-only"> marks</span></span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="measure text-sm text-muted-foreground">
          These counts treat every wrong answer as an MCQ that costs 1 mark. A wrong TITA answer costs nothing, so real scores can be slightly higher.
          The IIMs publish no official table. Each year's table here is the average of the tables that coaching institutes built from the results; scores are scaled across slots. Sources:{" "}
          {VARC_TABLES.map((t, i) => (
            <span key={t.year}>{i > 0 && " "}CAT {t.year}: {t.sources.map((s, j) => <span key={s.name}>{j > 0 && ", "}<a className="underline underline-offset-4 hover:text-foreground" href={s.url} target="_blank" rel="noopener noreferrer">{s.name}<span className="sr-only"> (opens in a new tab)</span></a></span>)}.</span>
          ))}
        </p>
      </section>
    </div>
  );
}
