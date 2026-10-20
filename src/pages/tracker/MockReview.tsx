import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContentGate } from "../../components/Content";
import { Field, LinkButton, Meta, Page, PageHeader, Section, TextLink } from "../../components/kit";
import { NativeSelect } from "../../components/Select";
import { CAUSES } from "../../data/traps";
import { readDraft, writeDraft } from "../../lib/draft";
import { mediumDate, todayIso, uid } from "../../lib/date";
import { CAUSE_IDS, type AppState, type Cause, type MockQ, type MockReview, type Recommendation, type SectionalAttempt } from "../../lib/state";
import { useStore } from "../../lib/store";
import type { Content } from "../../practice/content";
import {
  DEFAULT_LAYOUT, findings, isTita, fromSectional, proposeActions, questionsFor, toErrors, toPractice, VA_ORDER, type ActionDraft, type Findings,
} from "../../practice/mockreview";
import { fmtSecs } from "../../practice/record";
import { scorePaper } from "../../practice/sectional";
import { VA_KIND, type VaKind } from "../../practice/va/build";
import NotFound from "../NotFound";
import { Confirm, PaletteCell, ScoreCard, type Cell } from "../practice/common";
import { KINDS } from "./Log";

const STEPS = ["Basics", "Questions", "Re-solve", "Where the marks went", "Actions"] as const;
const BACK = { to: "/progress", label: "Progress" };

/** Everything the wizard has so far. Kept as a draft, so a reload or a closed tab loses nothing. */
interface Wiz {
  step: number; name: string; d: string; kind: string; planned: string;
  layout: MockReview["layout"]; qs: MockQ[]; cur: number;
  actions: { a: ActionDraft; keep: boolean; text: string }[] | null; own: string; errors: boolean;
}

/** Chips for one choice, at least 44px tall, in the style of the summary tone chips. */
function Chips<T extends string>({ label, value, onChange, options, className, itemClassName }: { label: string; value: T | ""; onChange: (v: T) => void; options: [T, ReactNode][]; className?: string; itemClassName?: string }) {
  return (
    <ToggleGroup type="single" value={value} onValueChange={(v) => v && onChange(v as T)} aria-label={label} className={cn("flex flex-wrap justify-start gap-2", className)}>
      {options.map(([v, l]) => (
        <ToggleGroupItem key={v} value={v} className={cn("min-h-11 flex-none rounded-md bg-secondary px-3.5 text-base data-[state=on]:bg-card data-[state=on]:font-semibold data-[state=on]:text-primary data-[state=on]:ring-1 data-[state=on]:ring-inset data-[state=on]:ring-primary/40", itemClassName)}>
          {l}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** How a question shows in the grid. Questions still waiting for an answer (a cause, or "could you have got it?") stand out. */
function cellOf(q: MockQ): Cell {
  if (q.st === "right") return q.slow ? "doneMarked" : "done";
  if (q.st === "wrong") return q.cause ? "wrong" : "marked";
  if (q.st === "skip") return q.could === undefined ? "marked" : "blank";
  return "unseen";
}
const STATUS: Record<MockQ["st"], string> = { right: "right", wrong: "wrong", skip: "skipped", unseen: "not reached" };

/** Where a question sits: its passage, or its VA type. */
function placeOf(layout: MockReview["layout"], i: number) {
  let n = i;
  for (let p = 0; p < layout.rc.length; p++) { if (n < layout.rc[p]) return `passage ${p + 1}`; n -= layout.rc[p]; }
  const k = layout.va[n] as VaKind;
  return `${VA_KIND[k]?.label.toLowerCase() ?? k}${isTita(k) ? ", TITA" : ""}`;
}

function grouped(layout: MockReview["layout"]) {
  const out: { title: string; from: number; n: number }[] = [];
  let i = 0;
  layout.rc.forEach((n, p) => { out.push({ title: `Passage ${p + 1}`, from: i, n }); i += n; });
  VA_ORDER.forEach((k) => {
    const n = layout.va.filter((x) => x === k).length;
    if (n) { out.push({ title: VA_KIND[k].label + (VA_KIND[k].tita ? ", TITA" : ""), from: i, n }); i += n; }
  });
  return out;
}

const vaCounts = (va: string[]) => Object.fromEntries(VA_ORDER.map((k) => [k, va.filter((x) => x === k).length])) as Record<VaKind, number>;
const vaFrom = (c: Record<VaKind, number>) => VA_ORDER.flatMap((k) => Array<string>(c[k]).fill(k));

// ---------------------------------------------------------------------------------------------
// Step 1: basics and layout

function Basics({ w, set, fixed }: { w: Wiz; set: (p: Partial<Wiz>) => void; fixed: boolean }) {
  const setLayout = (layout: MockReview["layout"]) => set({ layout, qs: questionsFor(layout, w.qs), cur: 0 });
  const counts = vaCounts(w.layout.va);
  return (
    <div className="flex flex-col gap-8">
      {!fixed && <p className="measure text-base text-muted-foreground">This review covers VARC. For a full mock, enter its VARC section; DILR and Quant reviews will follow when those sections launch.</p>}
      <div className="flex flex-col gap-7 rounded-lg bg-card p-4 sm:gap-8 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mock name" className="sm:col-span-2"><Input value={w.name} onChange={(e) => set({ name: e.target.value })} placeholder="SimCAT 4, or CAT 2023 Slot 2" /></Field>
          <Field label="Date taken"><Input type="date" value={w.d} max={todayIso()} onChange={(e) => set({ d: e.target.value })} /></Field>
          {!fixed && <Field label="Test type"><NativeSelect value={w.kind} onChange={(e) => set({ kind: e.target.value })}>{KINDS.map((k) => <option key={k}>{k}</option>)}</NativeSelect></Field>}
          <Field label="Planned attempts" hint="Optional. Compare your plan with what you attempted.">
            <Input type="number" inputMode="numeric" min={0} max={w.qs.length} value={w.planned} onChange={(e) => set({ planned: e.target.value })} placeholder="18" />
          </Field>
        </div>
        {fixed ? (
          <p className="text-sm text-muted-foreground">Questions are filled from your sectional: {w.layout.rc.length} passages and {w.layout.va.length} VA questions.</p>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-base font-semibold">Passages</h3>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="icon-sm" aria-label="One passage fewer" disabled={w.layout.rc.length <= 1} onClick={() => setLayout({ ...w.layout, rc: w.layout.rc.slice(0, -1) })}>−</Button>
                  <span className="min-w-6 text-center text-base font-semibold tabular-nums">{w.layout.rc.length}</span>
                  <Button variant="secondary" size="icon-sm" aria-label="One more passage" disabled={w.layout.rc.length >= 6} onClick={() => setLayout({ ...w.layout, rc: [...w.layout.rc, 4] })}>+</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {w.layout.rc.map((n, p) => (
                  <Field key={p} label={`Passage ${p + 1}`} className="min-w-0">
                    <NativeSelect value={n} onChange={(e) => setLayout({ ...w.layout, rc: w.layout.rc.map((x, i) => (i === p ? +e.target.value : x)) })}>
                      {[3, 4, 5, 6].map((k) => <option key={k} value={k}>{k} questions</option>)}
                    </NativeSelect>
                  </Field>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="text-base font-semibold">Verbal ability questions</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {VA_ORDER.map((k) => (
                  <Field key={k} label={VA_KIND[k].label} className="min-w-0">
                    <NativeSelect value={counts[k]} onChange={(e) => setLayout({ ...w.layout, va: vaFrom({ ...counts, [k]: +e.target.value }) })}>
                      {[0, 1, 2, 3, 4].map((c) => <option key={c} value={c}>{c} questions</option>)}
                    </NativeSelect>
                  </Field>
                ))}
              </div>
            </div>
            <Meta>{w.qs.length} questions total. The next step numbers passages first, then VA by type.</Meta>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Step 2: the question grid

function Grid({ w, set }: { w: Wiz; set: (p: Partial<Wiz>) => void }) {
  const q = w.qs[w.cur];
  const edit = (p: Partial<MockQ>) => set({ qs: w.qs.map((x, i) => (i === w.cur ? clean({ ...x, ...p }) : x)) });
  const open = w.qs.filter((x) => cellOf(x) === "marked").length;
  // Groups flow side by side like the CAT palette: a passage's questions stay on one row, and the whole paper fits in a few rows on a laptop.
  const navigator = (
    <div className="flex flex-col gap-5">
      <div className="hidden items-baseline justify-between gap-3 lg:flex">
        <h3 className="text-base font-semibold">All questions</h3>
        <Meta>{w.qs.length} in all</Meta>
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-4">
      {grouped(w.layout).map((g) => (
        <div key={g.title} className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted-foreground">{g.title}</span>
          <div className="flex gap-2" role="group" aria-label={g.title}>
            {w.qs.slice(g.from, g.from + g.n).map((x, k) => {
              const i = g.from + k;
              return <PaletteCell key={i} n={i + 1} state={cellOf(x)} current={i === w.cur} onClick={() => set({ cur: i })} label={`Question ${i + 1}, ${STATUS[x.st]}`} className="h-11 min-w-11" />;
            })}
          </div>
        </div>
      ))}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground" aria-label="Question status key">
        <li className="inline-flex items-center gap-2"><i className="size-3 rounded-sm bg-success-soft ring-1 ring-success/50" />Right (dot: slow)</li>
        <li className="inline-flex items-center gap-2"><i className="size-3 rounded-sm bg-danger" />Wrong</li>
        <li className="inline-flex items-center gap-2"><i className="size-3 rounded-sm bg-secondary" />Skipped</li>
        <li className="inline-flex items-center gap-2"><i className="size-3 rounded-sm bg-card ring-1 ring-border" />Not reached</li>
        <li className="inline-flex items-center gap-2"><i className="size-3 rounded-sm bg-mark/20 ring-1 ring-mark/60" />Needs follow-up</li>
      </ul>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-base">Mark answers, misses and skips before reading solutions.</p>
        <div className="text-sm text-muted-foreground" aria-live="polite">
          {open > 0
            ? <span><strong className="font-semibold text-mark">{open}</strong> {open === 1 ? "question needs" : "questions need"} a follow-up</span>
            : <span>No follow-ups yet</span>}
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <div className="hidden rounded-xl bg-muted/40 p-5 lg:order-1 lg:block">
          {navigator}
        </div>
        {q && (
          <div className="order-1 flex flex-col gap-5 rounded-xl bg-card p-5 sm:p-6 lg:order-2" aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h3 className="text-heading font-semibold">Question {w.cur + 1}</h3>
                <Meta className="first-letter:uppercase">{placeOf(w.layout, w.cur)}</Meta>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" aria-label="Previous question" disabled={w.cur === 0} onClick={() => set({ cur: w.cur - 1 })}><ChevronLeft aria-hidden /></Button>
                <span className="min-w-12 text-center text-sm font-medium tabular-nums">{w.cur + 1} / {w.qs.length}</span>
                <Button variant="ghost" size="icon" aria-label="Next question" disabled={w.cur >= w.qs.length - 1} onClick={() => set({ cur: w.cur + 1 })}><ChevronRight aria-hidden /></Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-base font-semibold">What happened?</span>
              <Chips label="What happened" value={q.st} onChange={(st) => edit({ st })} options={[["right", "Right"], ["wrong", "Wrong"], ["skip", "Skipped"], ["unseen", "Not reached"]]} className="grid w-full grid-cols-2 sm:grid-cols-4" itemClassName="w-full justify-center text-center" />
            </div>
            {q.st === "right" && (
              <label className="flex min-h-12 items-center gap-3 rounded-lg bg-muted/60 px-4 text-base">
                <Checkbox checked={!!q.slow} onCheckedChange={(v) => edit({ slow: v === true })} />
                Right, but it took too long
              </label>
            )}
            {q.st === "wrong" && (
              <div className="flex flex-col gap-2">
                <span className="text-base font-semibold">Why did it go wrong?</span>
                <Chips label="Why did it go wrong" value={q.cause ?? ""} onChange={(cause) => edit({ cause })} options={CAUSE_IDS.map((c) => [c, CAUSES[c]] as [Cause, string])} className="grid w-full grid-cols-2 sm:grid-cols-3" itemClassName="h-auto w-full justify-center py-2 text-center whitespace-normal" />
              </div>
            )}
            {q.st === "skip" && (
              <div className="flex flex-col gap-2">
                <span className="text-base font-semibold">Could you have got it?</span>
                <Chips label="Could you have got it" value={q.could === undefined ? "" : q.could ? "yes" : "no"} onChange={(v) => edit({ could: v === "yes" })} options={[["yes", "Yes, it was doable"], ["no", "No, a good skip"]]} className="grid w-full grid-cols-2 sm:max-w-md" itemClassName="w-full justify-center text-center" />
              </div>
            )}
            {q.st === "unseen" && <Meta>Questions you never reached count as time lost.</Meta>}
          </div>
        )}
        <details className="order-3 rounded-xl bg-muted/40 p-4 lg:hidden">
          <summary className="cursor-pointer list-inside text-base font-semibold">Jump to a question <span className="ml-1 text-sm font-normal text-muted-foreground">({w.qs.length} total)</span></summary>
          <div className="pt-5">{navigator}</div>
        </details>
      </div>
    </div>
  );
}

/** Drops the answers that no longer apply when a question's status changes. */
function clean(q: MockQ): MockQ {
  const o: MockQ = { st: q.st, type: q.type };
  if (q.secs != null) o.secs = q.secs;
  if (q.st === "right" && q.slow) o.slow = true;
  if (q.st === "wrong" && q.cause) o.cause = q.cause;
  if (q.st === "skip" && q.could !== undefined) { o.could = q.could; if (q.could && q.solved !== undefined) o.solved = q.solved; }
  return o;
}

// ---------------------------------------------------------------------------------------------
// Step 3: re-solve the doable skips

function Resolve({ w, set }: { w: Wiz; set: (p: Partial<Wiz>) => void }) {
  const doable = w.qs.map((q, i) => ({ q, i })).filter(({ q }) => q.st === "skip" && q.could);
  return (
    <div className="flex flex-col gap-5">
      <p className="measure text-base">Before you read the solutions, try these again with no timer. Tick the ones you solve. They are the marks you left on the table.</p>
      <ul className="flex flex-col gap-1 rounded-lg bg-card p-1.5">
        {doable.map(({ q, i }) => (
          <li key={i}>
            <label className="flex min-h-12 items-center gap-3 rounded-md px-3.5 py-2 text-base hover:bg-muted/60">
              <Checkbox checked={q.solved === true} onCheckedChange={(v) => set({ qs: w.qs.map((x, k) => (k === i ? { ...x, solved: v === true } : x)) })} />
              <span>Question {i + 1}<span className="text-muted-foreground">, {placeOf(w.layout, i)}</span></span>
            </label>
          </li>
        ))}
      </ul>
      <Meta>Not now? Go on: unticked questions still count as doable.</Meta>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Step 4 (and the saved view): where the marks went

export function Findings({ f, layout, planned, before }: { f: Findings; layout: MockReview["layout"]; planned?: number; before?: number | null }) {
  const lostAll = f.groups.reduce((s, g) => s + g.marks, 0) || 1;
  const acc = f.attempted ? Math.round((f.right / f.attempted) * 100) : 0;
  return (
    <div className="flex flex-col gap-8">
      <ScoreCard score={(f.score > 0 ? "+" : "") + f.score} of={f.max} parts={[["Right", f.right], ["Wrong", f.wrong], ["Skipped or not reached", f.skipped], ["Accuracy", `${acc}%`]]}>
        {f.potential > f.score && (
          <p className="text-base">With no careless slips{f.doable ? " and your doable skips solved" : ""}, you would have scored <b className="hl font-semibold">{f.potential}</b>.</p>
        )}
        {planned != null && <p className="text-base">You planned {planned} attempts and made {f.attempted}.{f.attempted < planned ? " Attempting less than you planned usually means time went into a few hard questions." : ""}</p>}
        {before != null && <p className="text-base text-muted-foreground">Your last three logged results averaged {before.toFixed(0)}.</p>}
      </ScoreCard>

      {f.groups.length > 0 && (
        <Section title="Marks lost, by cause">
          <ul className="flex flex-col gap-3 rounded-lg bg-card p-5 sm:p-6">
            {[...f.groups].sort((a, b) => b.marks - a.marks).map((g) => (
              <li key={g.key} className="grid gap-1.5 sm:grid-cols-[14rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                <span className="text-base font-semibold">{g.label}<span className="font-normal text-muted-foreground">, {g.n === 1 ? "1 question" : `${g.n} questions`}</span></span>
                <span className="flex items-center gap-3">
                  <span className="h-2.5 rounded-full bg-danger/60" style={{ width: `${Math.max(4, (g.marks / lostAll) * 100)}%` }} aria-hidden />
                  <span className="shrink-0 text-base tabular-nums">{g.marks} marks</span>
                </span>
              </li>
            ))}
          </ul>
          {(f.goodSkips > 0 || f.slow > 0) && (
            <p className="text-base">
              {f.goodSkips > 0 && <>{f.goodSkips === 1 ? "1 good skip" : `${f.goodSkips} good skips`}: leaving a question you could not do is part of the score. </>}
              {f.slow > 0 && <>{f.slow === 1 ? "1 right answer was slow" : `${f.slow} right answers were slow`}.</>}
            </p>
          )}
        </Section>
      )}

      <Section title="By question type">
        <div className="overflow-x-auto rounded-lg bg-card px-5 py-3 sm:px-6">
          <table className="w-full text-left text-base">
            <thead className="text-sm text-muted-foreground">
              <tr><th className="py-2 pr-4 font-medium">Type</th><th className="py-2 pr-4 text-right font-medium">Right</th><th className="py-2 pr-4 text-right font-medium">Wrong</th><th className="py-2 pr-4 text-right font-medium">Skip</th><th className="py-2 text-right font-medium">Marks</th></tr>
            </thead>
            <tbody>
              {f.byType.map((t) => (
                <tr key={t.type} className="border-t align-top">{/* taste-skill-ignore: rows of a real table */}
                  <td className="py-2.5 pr-4">{t.label}{isTita(t.type) ? <span className="text-muted-foreground">, TITA</span> : null}</td>
                  <td className="whitespace-nowrap py-2.5 pr-4 text-right">{t.right} of {t.n}</td><td className="py-2.5 pr-4 text-right">{t.wrong}</td><td className="py-2.5 pr-4 text-right">{t.skipped}</td>
                  <td className="py-2.5 text-right font-semibold">{t.marks > 0 ? "+" : ""}{t.marks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {layout.rc.length > 0 && <Meta>{layout.rc.length} passages, {layout.va.length} VA questions.</Meta>}
      </Section>

      {f.time && (
        <Section title="Where the time went" description="Time on questions you gave up or got wrong is time that earned nothing. Keep it low.">
          <div className="flex flex-wrap gap-x-10 gap-y-3 rounded-lg bg-card p-5 sm:p-6">
            {([["On right answers", f.time.right], ["On wrong answers", f.time.wrong], ["On questions given up", f.time.gaveUp]] as const).map(([k, v]) => (
              <div key={k} className="flex flex-col"><span className="text-sm text-muted-foreground">{k}</span><span className="text-heading font-semibold tabular-nums">{fmtSecs(v)}</span></div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Step 5: actions

function Actions({ w, set, wrong }: { w: Wiz; set: (p: Partial<Wiz>) => void; wrong: number }) {
  const acts = w.actions ?? [];
  const edit = (i: number, p: Partial<{ keep: boolean; text: string }>) => set({ actions: acts.map((x, k) => (k === i ? { ...x, ...p } : x)) });
  return (
    <div className="flex flex-col gap-6">
      <p className="measure text-base">Work on the two or three things that cost you most before your next mock. Keep, change or drop each one.</p>
      {acts.length === 0 && <Meta>No single cause cost you two or more questions, so there is nothing to suggest. Write your own below if you have one.</Meta>}
      <ul className="flex flex-col gap-3">
        {acts.map((x, i) => (
          <li key={x.a.skill.kind + x.a.skill.key} className={cn("flex flex-col gap-3 rounded-lg bg-card p-5 sm:p-6", !x.keep && "opacity-60")}>
            <label className="flex items-start gap-3 text-base font-semibold">
              <Checkbox className="mt-1" checked={x.keep} onCheckedChange={(v) => edit(i, { keep: v === true })} />
              <span>Keep this one</span>
            </label>
            <Textarea aria-label={`Action ${i + 1}`} value={x.text} onChange={(e) => edit(i, { text: e.target.value })} className="min-h-20 text-base" />
            <p className="text-sm text-muted-foreground">Why: {x.a.why}</p>
          </li>
        ))}
      </ul>
      <Field label="Your own action" hint="Optional, one line.">
        <Input value={w.own} onChange={(e) => set({ own: e.target.value })} placeholder="Read the questions before each passage" />
      </Field>
      {wrong > 0 && (
        <label className="flex min-h-11 items-center gap-3 text-base">
          <Checkbox checked={w.errors} onCheckedChange={(v) => set({ errors: v === true })} />
          Add the {wrong === 1 ? "wrong answer" : `${wrong} wrong answers`} to my Error log
        </label>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

type Source = { from: "manual"; mock?: string } | { from: "sectional"; att: SectionalAttempt; c: Content };

function avgBefore(state: AppState, sec: string, skip?: string) {
  const ms = state.mocks.filter((m) => m.sec === sec && m.id !== skip).sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0)).slice(-3);
  return ms.length ? ms.reduce((s, m) => s + 3 * m.c - m.w, 0) / ms.length : null;
}

function StepProgress({ steps, at }: { steps: { s: string; i: number }[]; at: number }) {
  return (
    <div className="flex flex-col gap-2" role="progressbar" aria-label="Mock review progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={at + 1} aria-valuetext={`Step ${at + 1} of ${steps.length}: ${steps[at].s}`}>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Step {at + 1} of {steps.length}</span>
        <span className="font-medium text-foreground">{steps[at].s}</span>
      </div>
      <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-hidden="true">
        {steps.map((step, i) => <li key={step.i} className={cn("h-1.5 rounded-full", i <= at ? "bg-primary" : "bg-secondary")} />)}
      </ol>
    </div>
  );
}

function Wizard({ src }: { src: Source }) {
  const { state, update } = useStore();
  const nav = useNavigate();
  const mockRow = src.from === "manual" && src.mock ? state.mocks.find((m) => m.id === src.mock) : undefined;
  const key = "mockreview:" + (src.from === "sectional" ? src.att.id : src.mock ?? "new");
  const [w, setW] = useState<Wiz>(() => {
    const saved = readDraft<Wiz>(key);
    if (saved && Array.isArray(saved.qs)) return saved;
    if (src.from === "sectional") {
      const { layout, qs } = fromSectional(src.att, scorePaper(src.att.qs, src.att.a, src.c));
      return { step: 1, name: "VARC sectional on this site", d: src.att.d, kind: "Sectional", planned: "", layout, qs, cur: Math.max(0, qs.findIndex((q) => q.st === "wrong")), actions: null, own: "", errors: false };
    }
    return { step: 0, name: mockRow?.n ?? "", d: mockRow?.d ?? todayIso(), kind: mockRow?.k ?? "Full mock", planned: "", layout: DEFAULT_LAYOUT, qs: questionsFor(DEFAULT_LAYOUT), cur: 0, actions: null, own: "", errors: false };
  });
  const set = (p: Partial<Wiz>) => setW((o) => ({ ...o, ...p }));
  useEffect(() => { writeDraft(key, w); }, [key, w]);
  useEffect(() => { window.scrollTo(0, 0); }, [w.step]);

  const sec = "VARC";
  const f = useMemo(() => findings({ qs: w.qs }), [w.qs]);
  const hasDoable = w.qs.some((q) => q.st === "skip" && q.could);
  const steps = STEPS.map((s, i) => ({ s, i })).filter((x) => x.s !== "Re-solve" || hasDoable);
  const at = steps.findIndex((x) => x.i === w.step);
  const planned = w.planned.trim() === "" ? undefined : Math.max(0, Math.round(+w.planned));

  const go = (dir: 1 | -1) => {
    const next = steps[at + dir]?.i;
    if (next === undefined) return;
    if (STEPS[next] === "Actions") {
      // Proposed afresh each time the grid may have changed; choices already made for the same action are kept.
      const prev = new Map((w.actions ?? []).map((x) => [x.a.skill.kind + x.a.skill.key, x]));
      const actions = proposeActions({ qs: w.qs, sec }, state.practice).map((a) => {
        const p = prev.get(a.skill.kind + a.skill.key);
        return { a, keep: p?.keep ?? true, text: p && p.text !== p.a.text ? p.text : a.text };
      });
      set({ step: next, actions });
    } else set({ step: next });
  };

  const save = () => {
    const id = uid(), now = Date.now(), d = w.d || todayIso();
    const right = f.right, penalty = w.qs.filter((q) => q.st === "wrong" && !isTita(q.type)).length;
    const mockId = src.from === "sectional" ? src.att.id + "m" : src.mock ?? id + "m";
    const kept = (w.actions ?? []).filter((x) => x.keep && x.text.trim());
    const recs: Recommendation[] = kept.map((x) => ({
      id: uid(), d, updatedAt: now, from: "mock", src: id, sec, skill: x.a.skill, text: x.text.trim(), why: x.a.why, status: "open",
      ...(x.a.to ? { to: x.a.to } : {}), ...(x.a.before ? { before: x.a.before } : {}),
    }));
    if (w.own.trim()) recs.push({ id: uid(), d, updatedAt: now, from: "mock", src: id, sec, skill: { kind: "cause", key: "own" }, text: w.own.trim(), why: "Your own action.", status: "open" });
    const review: MockReview = {
      id, d, updatedAt: now, mock: mockId, sec, from: src.from, name: w.name.trim(), layout: w.layout, qs: w.qs, recs: recs.map((r) => r.id),
      ...(src.from === "sectional" ? { att: src.att.id } : {}), ...(planned != null ? { planned } : {}),
    };
    update((st) => {
      if (st.mockReviews.some((r) => r.mock === mockId)) return;
      if (src.from === "manual") {
        const m = st.mocks.find((x) => x.id === mockId);
        if (m) { m.c = right; m.w = penalty; m.n = review.name || m.n; m.d = d; }
        else st.mocks.push({ id: mockId, d, sec, n: review.name, k: w.kind, c: right, w: penalty });
        st.practice.push(...toPractice(review));
      }
      if (w.errors) st.errors.push(...toErrors(review));
      st.recs.push(...recs);
      st.mockReviews.push(review);
    });
    writeDraft(key, null);
    nav("/progress/mock-review/" + id, { replace: true });
  };

  const stepName = STEPS[w.step];
  const last = at === steps.length - 1;
  return (
    <Page className="gap-6 pb-24 sm:gap-8 sm:pb-0">
      <PageHeader title="Analyse a mock" back={BACK}>
        Review your VARC, see where marks went, and choose what to work on next.
      </PageHeader>
      <StepProgress steps={steps} at={at} />
      <div className="flex flex-col gap-4">
        <h2 className="text-heading font-semibold">{stepName}</h2>
        {mockRow && w.step === 0 && <Meta>Analysing {mockRow.n || mockRow.k} from {mediumDate(mockRow.d)}. Saving updates its logged result to match the questions you mark.</Meta>}

        {stepName === "Basics" && <Basics w={w} set={set} fixed={src.from === "sectional"} />}
        {stepName === "Questions" && <Grid w={w} set={set} />}
        {stepName === "Re-solve" && <Resolve w={w} set={set} />}
        {stepName === "Where the marks went" && <Findings f={f} layout={w.layout} planned={planned} before={avgBefore(state, sec, src.from === "sectional" ? src.att.id + "m" : src.mock)} />}
        {stepName === "Actions" && <Actions w={w} set={set} wrong={f.wrong} />}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 bg-background/95 px-gutter py-3 backdrop-blur-sm sm:static sm:z-auto sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="flex w-full items-center justify-between gap-3">
          {at > 0 ? <Button variant="secondary" onClick={() => go(-1)}>Back</Button> : <span />}
          {last ? <Button onClick={save}>Save the review</Button> : <Button onClick={() => go(1)}>Continue</Button>}
        </div>
      </div>
    </Page>
  );
}

/** A saved review: the findings and its actions, which the student can mark done or drop. */
function Saved({ id }: { id: string }) {
  const { state, update } = useStore();
  const nav = useNavigate();
  const [asking, setAsking] = useState(false);
  const r = state.mockReviews.find((x) => x.id === id);
  if (!r) return <NotFound />;
  const f = findings(r);
  const recs = r.recs.map((rid) => state.recs.find((x) => x.id === rid)).filter((x): x is Recommendation => !!x);
  const setStatus = (rid: string, status: Recommendation["status"]) => update((st) => { const x = st.recs.find((y) => y.id === rid); if (x) { x.status = status; x.updatedAt = Date.now(); } });
  const remove = () => {
    update((st) => {
      st.mockReviews = st.mockReviews.filter((x) => x.id !== r.id);
      st.practice = st.practice.filter((p) => !p.id.startsWith(r.id + ":"));
      st.recs = st.recs.filter((x) => x.src !== r.id);
    });
    nav("/progress", { replace: true });
  };
  return (
    <Page>
      <PageHeader title={r.name || "Mock review"} back={BACK}>Reviewed on {mediumDate(r.d)}{r.from === "sectional" && r.att ? <>, from your <TextLink to={`/practice/sectional/${r.att}`}>sectional</TextLink></> : null}.</PageHeader>
      <Section title="Your actions" description={recs.length ? "Tick one off when you have worked on it. The weekly review checks whether it helped." : undefined}>
        {recs.length ? (
          <ul className="flex flex-col gap-3">
            {recs.map((x) => (
              <li key={x.id} className={cn("flex flex-col gap-3 rounded-lg bg-card p-5 sm:p-6", x.status !== "open" && "opacity-70")}>
                <p className="text-base font-semibold">{x.text}</p>
                <p className="text-sm text-muted-foreground">Why: {x.why}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {x.status === "open" ? (
                    <>
                      {x.to && <LinkButton to={x.to} variant="secondary" size="sm">Practise now</LinkButton>}
                      <Button variant="ghost" size="sm" onClick={() => setStatus(x.id, "done")}>Mark as done</Button>
                      <Button variant="ghost" size="sm" onClick={() => setStatus(x.id, "dismissed")}>Not for me</Button>
                    </>
                  ) : (
                    <>
                      <span className={cn("text-base", x.status === "done" ? "text-success" : "text-muted-foreground")}>{x.status === "done" ? "Done" : "Dropped"}</span>
                      <Button variant="ghost" size="sm" onClick={() => setStatus(x.id, "open")}>Undo</Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : <Meta>No actions were kept for this mock.</Meta>}
      </Section>
      <Findings f={f} layout={r.layout} planned={r.planned} />
      <div className="flex flex-wrap gap-3">
        <LinkButton to="/progress" variant="secondary">Back to Progress</LinkButton>
        <Button variant="ghost" className="text-muted-foreground hover:text-danger" onClick={() => setAsking(true)}>Delete this review</Button>
      </div>
      <Confirm open={asking} onOpenChange={setAsking} title="Delete this review?" action="Delete" onAction={remove} cancel="Keep it" danger>
        Its actions go too. The logged mock result stays in Progress.
      </Confirm>
    </Page>
  );
}

function FromSectional({ id }: { id: string }) {
  const { state } = useStore();
  const att = state.sectionals.find((s) => s.id === id);
  if (!att) return <NotFound />;
  const sets = [...new Set(att.qs.filter((k) => k.startsWith("rc:")).map((k) => k.split(":")[1]))];
  return <ContentGate need={{ rc: sets, va: true }}>{(c) => <Wizard src={{ from: "sectional", att, c }} />}</ContentGate>;
}

export default function MockReviewPage() {
  const { id } = useParams();
  const [q] = useSearchParams();
  const { state } = useStore();
  if (id) return <Saved id={id} />;
  const sectional = q.get("sectional"), mock = q.get("mock") ?? undefined;
  const done = state.mockReviews.find((r) => r.mock === (sectional ? sectional + "m" : mock));
  if (done) return (
    <Page>
      <PageHeader title="Analyse a mock" back={BACK}>You have already analysed this one.</PageHeader>
      <div><LinkButton to={`/progress/mock-review/${done.id}`}>Open the review</LinkButton></div>
      <Meta>Or <Link className="underline underline-offset-4" to="/progress/mock-review">analyse another mock</Link>.</Meta>
    </Page>
  );
  if (sectional) return <FromSectional id={sectional} />;
  return <Wizard key={mock ?? "new"} src={{ from: "manual", mock }} />;
}
