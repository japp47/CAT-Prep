import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { todayIso, uid } from "../../lib/date";
import { useGsap } from "../../lib/motion";
import { useStore } from "../../lib/store";
import { ContentGate } from "../../components/Content";
import { DrillHow, HowSteps, SeatBoard, SolveFirst } from "../../components/DrillBoard";
import { LinkButton, Page, Segmented } from "../../components/kit";
import { LR_CATALOG } from "../../practice/catalog.gen";
import { backTo, binWhy, holdsIn, isGrid, keptBy, mccSolved, movers, namedBy, nextDrill, type AnyModel, type LrDrills, type MccDrill } from "../../practice/lrdrill";
import { seatRows, type Bin, type LrModel, type Seating } from "../../practice/lrlogic";
import { gridVars, labelOf, type Case, type GridModel } from "../../practice/solver";
import type { LrSet } from "../../practice/types";
import { PlayerBar } from "./common";

/**
 * Must, could, cannot (F84, D48): a set whose clues leave two or three seatings, shown with its story and clues, and
 * six statements to sort by whether they hold in every seating, in some or in none.
 */
export default function MustCould() {
  const [sp] = useSearchParams();
  return <ContentGate need={{ drills: true }}>{(c) => <Pick d={c.lrDrills!} asked={sp.get("d")} set={sp.get("set")} back={backTo(sp.get("back"))} />}</ContentGate>;
}

function Pick({ d, asked, set, back }: { d: LrDrills; asked: string | null; set: string | null; back: string | null }) {
  const { state } = useStore();
  const [skip, setSkip] = useState(0);
  // Sets the student said "show me anyway" to on this visit.
  const [allowed, setAllowed] = useState<string[]>([]);
  const solved = useMemo(() => new Set(state.lrAttempts.map((a) => a.set)), [state.lrAttempts]);
  // The drill named in the address (or the first on the set named), else one on a set already solved (D49).
  const first = useMemo(() => d.mcc.find((x) => x.id === asked) ?? d.mcc.find((x) => x.set === set) ?? nextDrill(d.mcc, (x) => x.id, (x) => x.set, state.lrDrills, "mcc", solved), []); // eslint-disable-line react-hooks/exhaustive-deps
  const drill = d.mcc[((first ? d.mcc.indexOf(first) : 0) + skip) % d.mcc.length];
  const model = drill && d.models.find((m) => m.set === drill.set);
  if (!drill || !model) return null;
  const from = skip ? null : back;
  const meta = LR_CATALOG.find((m) => m.id === drill.set);
  // Opened from the set's own review, or the set is solved: nothing to spoil.
  if (!from && !solved.has(drill.set) && !allowed.includes(drill.set) && meta) {
    return (
      <Page width="read" className="gap-6 lg:gap-8">
        <PlayerBar kicker="DILR drill" title="Must, could, cannot"><LinkButton to="/dilr/practice" variant="ghost" size="sm">Stop</LinkButton></PlayerBar>
        <SolveFirst title={meta.title} set={drill.set} minutes={meta.minutes} what="This drill shows every seating that fits the set and says which one is its answer."
          onGo={() => setAllowed((a) => [...a, drill.set])} />
      </Page>
    );
  }
  return (
    <ContentGate need={{ lr: [drill.set] }}>
      {(c) => <Drill key={drill.id} drill={drill} model={model} set={c.lrById(drill.set)!} back={from} another={() => setSkip((n) => n + 1)} />}
    </ContentGate>
  );
}

const BINS: [Bin, string][] = [["must", "Must"], ["could", "Could"], ["cannot", "Cannot"]];
const SAYS: Record<Bin, string> = { must: "must be true", could: "could be true", cannot: "cannot be true" };
const listNums = (xs: number[]) => (xs.length < 2 ? String(xs[0]) : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

function Drill({ drill, model, set, back, another }: { drill: MccDrill; model: AnyModel; set: LrSet; back: string | null; another: () => void }) {
  const { state, update } = useStore();
  const { cases, bins } = useMemo(() => mccSolved(drill, model), [drill, model]);
  const moving = useMemo(() => movers(cases), [cases]);
  const kept = useMemo(() => keptBy(drill, model, cases), [drill, model, cases]);
  const [answers, setAnswers] = useState<(Bin | null)[]>(() => drill.statements.map(() => null));
  const [checked, setChecked] = useState(false);
  const [focus, setFocus] = useState<number | null>(null);
  const [startAt] = useState(Date.now);
  const right = answers.filter((a, i) => a === bins[i]).length;
  const lit = focus === null ? [] : namedBy(model, drill.statements[focus].expr);
  const dropped = drill.drop.length > 0;
  // A seating set's cases are seatings; anything else (a team, truth-tellers, a league) is just a case.
  const noun = isGrid(model) ? "case" : "seating";

  const check = () => {
    setChecked(true);
    update((st) => { st.lrDrills.push({ id: uid(), d: todayIso(), kind: "mcc", ref: drill.id, items: drill.statements.map((_, i) => ({ k: `${drill.id}:${i}`, ok: answers[i] === bins[i] })), secs: Math.round((Date.now() - startAt) / 1000) }); });
  };

  return (
    <Page className="gap-6 lg:gap-8">
      <PlayerBar kicker="DILR drill" title="Must, could, cannot">
        {!checked && <Button variant="ghost" size="sm" onClick={another}>Another drill</Button>}
        <LinkButton to={back ?? "/dilr/practice"} variant="ghost" size="sm">{back ? "Back to the set" : "Stop"}</LinkButton>
      </PlayerBar>

      <DrillHow id="mcc" done={state.lrDrills.some((r) => r.kind === "mcc")}>
        <p className="measure text-base">Some sets leave more than one seating that fits every clue. CAT then asks which statement <em>must</em> be true, <em>could</em> be true, or <em>cannot</em> be true. The trap is answering from the first seating you find.</p>
        <HowSteps steps={[
          "Read the set and its clues. Here a clue may be left out on purpose, so two or three seatings fit.",
          "Take each statement and check it in every seating.",
          <>True in every seating: <b>Must</b>. True in some: <b>Could</b>. True in none: <b>Cannot</b>.</>,
          "Start with what is marked: it is the only part that changes, so only statements about it can be Could.",
        ]} />
        <p className="measure rounded-xl bg-card px-4 py-3 text-base">Example: Asha is in seat 1 in both seatings; Dev is in seat 2 in one and seat 6 in the other. "Dev sits next to Asha": seats 2 and 6 are both beside seat 1, so it is true in both. <b>Must.</b></p>
      </DrillHow>

      <section aria-label="The set" className="flex flex-col gap-4 rounded-2xl bg-card p-5 sm:p-6">
        <h2 className="text-title font-extrabold">{set.title}</h2>
        {set.intro.map((p, i) => <p key={i} className="measure text-base text-muted-foreground">{p}</p>)}
        <ol className="flex flex-col gap-1.5">
          {set.clues.map((c, i) => {
            const out = drill.drop.includes(i + 1);
            return (
              <li key={i} className={cn("flex gap-3 text-base", out && "text-muted-foreground")}>
                <span className="w-6 shrink-0 font-semibold tabular-nums">{i + 1}</span>
                <span className={cn("measure", out && "line-through decoration-2")}>{c}</span>
                {out && <span className="shrink-0 self-start rounded-md bg-highlight-soft px-1.5 text-sm font-semibold text-foreground">Left out</span>}
              </li>
            );
          })}
        </ol>
        <p className="text-base font-semibold">
          {dropped ? `Without clue ${listNums(drill.drop)}, these ${cases.length} ${noun}s fit.` : `Even with every clue, ${cases.length} ${noun}s fit: the set leaves this open.`}
        </p>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-8">
        {isGrid(model)
          ? <GridCases model={model} cases={cases} lit={lit} kept={checked ? kept : -1} />
          : <Seatings model={model} cases={cases as Seating[]} moving={moving} lit={lit} kept={checked ? kept : -1} />}
        <div className="flex flex-col gap-2 lg:sticky lg:top-24">
          <p className="pb-1 text-base text-muted-foreground"><b className="text-foreground">Must</b>: true in every {noun}. <b className="text-foreground">Could</b>: in some. <b className="text-foreground">Cannot</b>: in none.</p>
          <ol className="flex flex-col gap-2">
            {drill.statements.map((s, i) => (
              <Statement key={i} n={i + 1} noun={noun} text={s.text} value={answers[i]} bin={checked ? bins[i] : undefined}
                per={checked ? cases.map((c) => holdsIn(model, s.expr, c)) : undefined}
                onFocus={() => setFocus(i)} onBlur={() => setFocus((f) => (f === i ? null : f))}
                onChange={(v) => setAnswers((a) => a.map((x, j) => (j === i ? v : x)))} />
            ))}
          </ol>
          {!checked ? (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button onClick={check} disabled={answers.some((a) => !a)}>Check</Button>
              <span className="text-sm text-muted-foreground">{answers.filter(Boolean).length} of {drill.statements.length} sorted</span>
            </div>
          ) : (
            <section aria-live="polite" className="mt-2 flex flex-col gap-3 rounded-2xl bg-card p-5">
              <p className="text-heading font-semibold">{right} of {drill.statements.length} right</p>
              {kept >= 0 && <p className="measure text-base">With clue {listNums(drill.drop)} back, only {noun} {kept + 1} fits. That is the set's answer: the left-out clue is what rules the other out.</p>}
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={another}>Another drill</Button>
                <LinkButton to={back ?? `/practice/lr/${drill.set}`} variant="secondary">{back ? "Back to the set" : "Solve the whole set"}</LinkButton>
              </div>
            </section>
          )}
        </div>
      </div>
    </Page>
  );
}

/**
 * The seatings side by side. A round table with only people is drawn round; anything with attributes is a table, one
 * row per seat. What changes between seatings is marked from the start; the statement in focus rings what it names;
 * once checked, the seating the left-out clue keeps is named.
 */
function Seatings({ model, cases, moving, lit, kept }: { model: LrModel; cases: Seating[]; moving: Set<string>; lit: string[]; kept: number }) {
  const root = useRef<HTMLDivElement>(null);
  useGsap(root, (gsap, el) => { gsap.from(el.querySelectorAll("[data-case]"), { y: 14, opacity: 0, duration: 0.45, stagger: 0.1, ease: "power3.out", clearProps: "all" }); }, []);
  const rows = cases.map((c) => seatRows(model, c));
  const circle = model.board.layout === "circle";
  const people = [...moving].filter((r) => model.groups[0].values.includes(r));
  const where = circle ? `Seat 1 is ${model.groups[0].values[0]}'s; the numbers go round to the left of someone facing the centre. ` : "Seats numbered from the left. ";
  const name = (i: number) => <>Seating {i + 1}{kept === i && <span className="ml-2 rounded-md bg-success-soft px-1.5 text-sm font-semibold text-success">The set's answer</span>}</>;
  if (circle && model.groups.length === 1) {
    return (
      <div ref={root} className="flex min-w-0 flex-col gap-3">
        <div className="grid gap-4 sm:grid-cols-2">
          {cases.map((_, ci) => (
            <figure key={ci} data-case className="flex flex-col gap-2 rounded-2xl bg-card p-4">
              <figcaption className="text-base font-semibold">{name(ci)}</figcaption>
              <SeatBoard board={model.board} small label={`Seating ${ci + 1}`} seat={(k) => {
                const who = rows[ci][k][0];
                return { lines: [who], hl: moving.has(who), lit: lit.includes(who) };
              }} />
            </figure>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{where}Marked: {people.length ? `${listNames(people)} sit differently from one seating to the other` : "nothing moves"}. Only statements about them can be Could.</p>
      </div>
    );
  }
  return (
    <div ref={root} className="flex min-w-0 flex-col gap-2">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1.5 text-left">
          <thead>
            <tr>
              <th scope="col" className="w-12 text-sm font-semibold text-muted-foreground">Seat</th>
              {cases.map((_, ci) => <th key={ci} scope="col" data-case className="text-base font-semibold whitespace-nowrap">{name(ci)}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: model.board.n }, (_, k) => (
              <tr key={k}>
                <th scope="row" className="text-sm font-semibold text-muted-foreground tabular-nums">{k + 1}</th>
                {rows.map((r, ci) => (
                  <td key={ci} data-case className="min-w-32 rounded-lg bg-card px-3 py-2 align-top">
                    {r[k].map((v, gi) => (
                      <span key={gi} className={cn("mr-1 inline-block rounded px-1 text-base", gi === 0 ? "font-semibold" : "text-muted-foreground",
                        rows.some((o) => o[k][gi] !== v) && "bg-highlight-soft text-foreground", lit.includes(v) && "bg-primary text-primary-foreground")}>{v}</span>
                    ))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">{where}Marked: the values that change from one seating to another. Only statements about them can be Could.</p>
    </div>
  );
}

/**
 * A grid set's cases side by side: one row per value (a person's type, a match's result), one column per case. A team
 * is one row listing who is in. Rows that differ between cases are marked from the start; the statement in focus marks
 * the rows it reads; once checked, the case the left-out clue keeps is named.
 */
function GridCases({ model, cases, lit, kept }: { model: GridModel; cases: Case[]; lit: string[]; kept: number }) {
  const root = useRef<HTMLDivElement>(null);
  useGsap(root, (gsap, el) => { gsap.from(el.querySelectorAll("[data-case]"), { y: 14, opacity: 0, duration: 0.45, stagger: 0.1, ease: "power3.out", clearProps: "all" }); }, []);
  const names = gridVars(model).map((v) => v.name);
  const members = model.show === "members";
  const rows: { head: string; cells: string[]; lit: boolean }[] = members
    ? [{ head: "Team", cells: cases.map((c) => names.filter((n) => c.get(n) === 1).join(", ")), lit: lit.length > 0 }]
    : names.map((n) => ({ head: n, cells: cases.map((c) => labelOf(model, n, c.get(n)!)), lit: lit.includes(n) }));
  const name = (i: number) => <>Case {i + 1}{kept === i && <span className="ml-2 rounded-md bg-success-soft px-1.5 text-sm font-semibold text-success">The set's answer</span>}</>;
  return (
    <div ref={root} className="flex min-w-0 flex-col gap-2">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1.5 text-left">
          <thead>
            <tr>
              <th scope="col" className="text-sm font-semibold text-muted-foreground"><span className="sr-only">Value</span></th>
              {cases.map((_, ci) => <th key={ci} scope="col" data-case className="text-base font-semibold whitespace-nowrap">{name(ci)}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const differs = r.cells.some((x) => x !== r.cells[0]);
              return (
                <tr key={r.head}>
                  <th scope="row" className={cn("pr-2 text-base font-semibold whitespace-nowrap", r.lit && "text-primary")}>{r.head}</th>
                  {r.cells.map((x, ci) => (
                    <td key={ci} data-case className={cn("min-w-28 rounded-lg px-3 py-2 align-top text-base", differs ? "bg-highlight-soft" : "bg-card", r.lit && "ring-2 ring-primary ring-inset")}>{x}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">Marked: what changes from one case to another. Only statements about it can be Could.</p>
    </div>
  );
}

const listNames = (xs: string[]) => (xs.length < 2 ? xs[0] : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

function Statement({ n, noun, text, value, bin, per, onChange, onFocus, onBlur }: { n: number; noun: string; text: string; value: Bin | null; bin?: Bin; per?: boolean[]; onChange: (v: Bin) => void; onFocus: () => void; onBlur: () => void }) {
  const ok = bin && value === bin;
  return (
    <li className={cn("flex flex-col gap-3 rounded-xl bg-card p-4 transition-colors duration-300", bin && (ok ? "bg-success-soft" : "bg-danger-soft"))}
      onMouseEnter={onFocus} onMouseLeave={onBlur} onFocus={onFocus} onBlur={onBlur}>
      <p className="text-base"><span className="mr-1.5 text-muted-foreground tabular-nums">{n}.</span>{text}</p>
      {!bin ? (
        <Segmented label={`Statement ${n}`} value={(value ?? "") as Bin} onChange={onChange} options={BINS} className="flex w-full [&>button]:flex-1" />
      ) : (
        <div className="flex flex-col gap-1.5">
          <p className="text-base font-semibold">{ok ? `Right: it ${SAYS[bin]}.` : `It ${SAYS[bin]}; you said it ${value ? SAYS[value] : "nothing"}.`}</p>
          <p className="text-base">{binWhy(per!, noun)}</p>
          {/* True or false in each seating: what decides the bin. */}
          <ul className="flex flex-wrap gap-1.5" aria-label={`In each ${noun}`}>
            {per!.map((t, i) => (
              <li key={i} className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-semibold", t ? "bg-success/15 text-success" : "bg-danger/15 text-danger")}>
                {t ? <Check className="size-3.5" aria-hidden /> : <X className="size-3.5" aria-hidden />}{noun === "case" ? "Case" : "Seating"} {i + 1}<span className="sr-only">: {t ? "true" : "false"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
