import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContentGate } from "../../components/Content";
import { Field, LinkButton, Meta, Page, PageHeader, Section, Segmented } from "../../components/kit";
import { NativeSelect } from "../../components/Select";
import { CAUSES } from "../../data/traps";
import { readDraft, writeDraft } from "../../lib/draft";
import { usePref } from "../../lib/prefs";
import { mediumDate, todayIso, uid } from "../../lib/date";
import { CAUSE_IDS, type AppState, type Cause, type Mock, type MockQ, type MockReview, type Recommendation, type SectionalAttempt } from "../../lib/state";
import { useGsap } from "../../lib/motion";
import { useStore } from "../../lib/store";
import type { Content } from "../../practice/content";
import {
  DEFAULT_QUANT_LAYOUT, DILR_SET_LABEL, DILR_SET_TYPES, QUANT_LABEL,
  findings, gridResult, isTita, fromSectional, layoutFor, loggedAfter, proposeActions, questionsFor, toErrors, toPractice, VA_ORDER, type ActionDraft, type Findings,
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
  step: number; name: string; d: string; kind: string; sec: string; planned: string;
  layout: MockReview["layout"]; qs: MockQ[]; cur: number;
  actions: { a: ActionDraft; keep: boolean; text: string; sec?: string }[] | null; own: string; errors: boolean;
  version?: 2; migrated?: boolean;
  /** The student asked to update the logged result to match this analysis (D44). */
  sync?: boolean;
  /**
   * A whole mock analysed at once (D45): one part per section. The part on screen lives in sec, layout, qs and cur;
   * the others wait here. ownSec says which section the student's own action is for.
   */
  all?: { parts: Part[]; active: number };
  ownSec?: string;
}
interface Part { sec: string; layout: MockReview["layout"]; qs: MockQ[]; cur: number }
const SECS = ["VARC", "DILR", "Quant"];
/** Tests taken as a whole paper, which can be analysed one section at a time or all three together. */
const WHOLE = ["Past paper", "Full mock", "Official IIM mock"];
const newPart = (sec: string): Part => { const layout = layoutFor(sec); return { sec, layout, qs: questionsFor(layout, [], sec), cur: 0 }; };
/** Every part, with the one on screen as it is now. */
const partsNow = (w: Wiz): Part[] => (w.all ? w.all.parts.map((p, i) => (i === w.all!.active ? { sec: w.sec, layout: w.layout, qs: w.qs, cur: w.cur } : p)) : [{ sec: w.sec, layout: w.layout, qs: w.qs, cur: w.cur }]);
/** Puts another section's part on screen. */
const showPart = (w: Wiz, i: number): Partial<Wiz> => { const ps = partsNow(w); return { all: { parts: ps, active: i }, sec: ps[i].sec, layout: ps[i].layout, qs: ps[i].qs, cur: ps[i].cur }; };

/** The three sections of a whole mock, each with how many of its questions still need the student. */
function PartSwitch({ w, set }: { w: Wiz; set: (p: Partial<Wiz>) => void }) {
  if (!w.all) return null;
  const ps = partsNow(w);
  return (
    <Segmented label="Section" value={String(w.all.active)} onChange={(v) => set(showPart(w, +v))}
      options={ps.map((p, i) => { const n = p.qs.filter((x) => cellOf(x) === "marked").length; return [String(i), <span key={p.sec}>{p.sec}{n ? <span className="font-normal text-muted-foreground"> ({n})</span> : null}</span>] as [string, ReactNode]; })} />
  );
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
  if (q.st === "unmarked") return "marked";
  if (q.st === "right") return q.slow ? "doneMarked" : "done";
  if (q.st === "wrong") return q.cause ? "wrong" : "marked";
  if (q.st === "skip") return q.could === undefined ? "marked" : "blank";
  return "unseen";
}
const STATUS: Record<MockQ["st"], string> = { unmarked: "not entered, counted as skipped", right: "right", wrong: "wrong", skip: "skipped", unseen: "not reached" };

/** Where a question sits within the selected section. */
function placeOf(layout: MockReview["layout"], i: number, sec: string) {
  if (sec === "DILR") {
    let n = i;
    for (let s = 0; s < (layout.sets ?? []).length; s++) {
      const set = layout.sets![s];
      if (n < set.n) return `Set ${s + 1}, ${DILR_SET_LABEL[set.type as keyof typeof DILR_SET_LABEL] ?? set.type}`;
      n -= set.n;
    }
    return "DILR set";
  }
  if (sec === "Quant") {
    let n = i;
    for (const topic of layout.topics ?? []) { if (n < topic.n) return QUANT_LABEL[topic.type as keyof typeof QUANT_LABEL] ?? topic.type; n -= topic.n; }
    return "Quant topic";
  }
  let n = i;
  for (let p = 0; p < layout.rc.length; p++) { if (n < layout.rc[p]) return `passage ${p + 1}`; n -= layout.rc[p]; }
  const k = layout.va[n] as VaKind;
  return `${VA_KIND[k]?.label.toLowerCase() ?? k}${isTita(k) ? ", TITA" : ""}`;
}

function grouped(layout: MockReview["layout"], sec: string) {
  const out: { title: string; from: number; n: number }[] = [];
  if (sec === "DILR") {
    let from = 0;
    (layout.sets ?? []).forEach((s, i) => { out.push({ title: `Set ${i + 1} · ${DILR_SET_LABEL[s.type as keyof typeof DILR_SET_LABEL] ?? s.type}`, from, n: s.n }); from += s.n; });
    return out;
  }
  if (sec === "Quant") {
    let from = 0;
    (layout.topics ?? []).forEach((t) => { if (t.n) { out.push({ title: QUANT_LABEL[t.type as keyof typeof QUANT_LABEL] ?? t.type, from, n: t.n }); from += t.n; } });
    return out;
  }
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

function Basics({ w, set, fixed, allowAll }: { w: Wiz; set: (p: Partial<Wiz>) => void; fixed: boolean; allowAll: boolean }) {
  const setLayout = (layout: MockReview["layout"]) => set({ layout, qs: questionsFor(layout, w.qs, w.sec), cur: 0 });
  const counts = vaCounts(w.layout.va);
  const changeKind = (kind: string) => {
    const sec = kind === "DILR sectional" ? "DILR" : kind === "Quant sectional" ? "Quant" : kind === "VARC sectional" ? "VARC" : w.sec;
    // Only a whole paper can be analysed across all three sections.
    if (w.all && !WHOLE.includes(kind)) { const p = newPart(sec); set({ kind, all: undefined, ...p }); return; }
    const layout = sec === w.sec ? w.layout : layoutFor(sec);
    set({ kind, sec, layout, qs: questionsFor(layout, w.qs, sec), cur: 0 });
  };
  const changeSec = (v: string) => {
    if (v === "All") { const parts = SECS.map(newPart); set({ all: { parts, active: 0 }, ...parts[0] }); return; }
    const layout = layoutFor(v);
    set({ all: undefined, sec: v, layout, qs: questionsFor(layout, w.qs, v), cur: 0 });
  };
  return (
    <div className="flex flex-col gap-8">
      {!fixed && <p className="measure text-base text-muted-foreground">Choose one section to analyse. The starting counts follow CAT 2025; DILR set styles and Quant topic counts vary, so change them to match your paper.</p>}
      <div className="flex flex-col gap-7 rounded-lg bg-card p-4 sm:gap-8 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mock name" className="sm:col-span-2"><Input value={w.name} onChange={(e) => set({ name: e.target.value })} placeholder="SimCAT 4, or CAT 2023 Slot 2" /></Field>
          <Field label="Date taken"><Input type="date" value={w.d} max={todayIso()} onChange={(e) => set({ d: e.target.value })} /></Field>
          {!fixed && <Field label="Test type"><NativeSelect value={w.kind} onChange={(e) => changeKind(e.target.value)}>{KINDS.map((k) => <option key={k}>{k}</option>)}</NativeSelect></Field>}
          {!fixed && !w.kind.endsWith("sectional") && (
            <Field label="Section" hint={allowAll && WHOLE.includes(w.kind) ? "A whole paper can be analysed one section at a time or all three together." : undefined}>
              <NativeSelect value={w.all ? "All" : w.sec} onChange={(e) => changeSec(e.target.value)}>
                {allowAll && WHOLE.includes(w.kind) && <option value="All">All three sections</option>}
                <option>VARC</option><option>DILR</option><option>Quant</option>
              </NativeSelect>
            </Field>
          )}
          <Field label="Planned attempts" hint="Optional. Compare your plan with what you attempted.">
            <Input type="number" inputMode="numeric" min={0} max={w.qs.length} value={w.planned} onChange={(e) => set({ planned: e.target.value })} placeholder="18" />
          </Field>
        </div>
        {w.all && <div className="flex flex-col gap-2"><span className="text-base font-semibold">Questions in each section</span><PartSwitch w={w} set={set} /></div>}
        {fixed ? (
          <p className="text-sm text-muted-foreground">Questions are filled from your sectional: {w.layout.rc.length} passages and {w.layout.va.length} VA questions.</p>
        ) : w.sec === "VARC" ? (
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
        ) : w.sec === "DILR" ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold">DILR sets</h3>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="icon-sm" aria-label="Remove a set" disabled={(w.layout.sets?.length ?? 0) <= 1} onClick={() => setLayout({ ...w.layout, sets: w.layout.sets?.slice(0, -1) })}>−</Button>
                <span className="min-w-6 text-center text-base font-semibold tabular-nums">{w.layout.sets?.length ?? 0}</span>
                <Button variant="secondary" size="icon-sm" aria-label="Add a set" disabled={(w.layout.sets?.length ?? 0) >= 8} onClick={() => setLayout({ ...w.layout, sets: [...(w.layout.sets ?? []), { type: "unsorted", n: 4 }] })}>+</Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(w.layout.sets ?? []).map((s, i) => <div key={i} className="grid grid-cols-2 gap-3 rounded-lg bg-background p-3">
                <Field label={`Set ${i + 1} type`}><NativeSelect value={s.type} onChange={(e) => setLayout({ ...w.layout, sets: w.layout.sets?.map((x, j) => j === i ? { ...x, type: e.target.value } : x) })}>{DILR_SET_TYPES.map((type) => <option key={type} value={type}>{DILR_SET_LABEL[type]}</option>)}</NativeSelect></Field>
                <Field label="Questions"><NativeSelect value={s.n} onChange={(e) => setLayout({ ...w.layout, sets: w.layout.sets?.map((x, j) => j === i ? { ...x, n: +e.target.value } : x) })}>{[3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}</NativeSelect></Field>
              </div>)}
            </div>
            <Meta>{w.qs.length} questions across {w.layout.sets?.length ?? 0} sets. CAT set styles vary; tag each one to match your paper.</Meta>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <h3 className="text-base font-semibold">Quant topics</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(w.layout.topics ?? DEFAULT_QUANT_LAYOUT.topics ?? []).map((t) => <Field key={t.type} label={QUANT_LABEL[t.type as keyof typeof QUANT_LABEL] ?? t.type}>
                <NativeSelect value={t.n} onChange={(e) => setLayout({ ...w.layout, topics: w.layout.topics?.map((x) => x.type === t.type ? { ...x, n: +e.target.value } : x) })}>{Array.from({ length: 23 }, (_, n) => <option key={n} value={n}>{n} questions</option>)}</NativeSelect>
              </Field>)}
            </div>
            <Meta>{w.qs.length} questions total. The CAT 2025 topic counts are a starting estimate; edit them to match your paper.</Meta>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Step 2: the question grid

const RESULTS: [string, string, string][] = [["right", "Right", "R"], ["slow", "Right but slow", "T"], ["wrong", "Wrong", "W"], ["skip", "Skipped", "S"], ["unseen", "Not reached", "N"]];

/** A key hint beside a choice, on a screen with a keyboard. */
const Key = ({ k }: { k: string }) => <kbd className="ml-2 hidden rounded bg-background/70 px-1.5 font-sans text-sm text-muted-foreground lg:inline">{k}</kbd>;

/**
 * The marking desk (D45): the question on the left, the paper's palette on the right and kept in view, like CAT's own
 * screen. Each result is one tap or one key (R, T, W, S, N; 1 to 9 for the cause; Y or G for a skip; arrows to move),
 * and after a complete answer it moves on to the next question by itself, unless the student turns that off.
 */
function Grid({ w, set, sectionalId }: { w: Wiz; set: (p: Partial<Wiz>) => void; sectionalId?: string }) {
  const q = w.qs[w.cur];
  const [auto, setAuto] = usePref("mockAuto", true);
  const [asking, setAsking] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const open = w.qs.filter((x) => cellOf(x) === "marked").length;
  const unmarked = w.qs.filter((x) => x.st === "unmarked").length;
  const done = w.qs.length - open;
  // A sectional is already marked, so it opens on the questions that still need the student (D44).
  const [only, setOnly] = useState<"needs" | "all">(sectionalId && open > 0 ? "needs" : "all");
  const shown = (x: MockQ, i: number) => only === "all" || cellOf(x) === "marked" || i === w.cur;
  const go = (i: number) => set({ cur: Math.max(0, Math.min(w.qs.length - 1, i)) });
  const edit = (p: Partial<MockQ>, advance = true) => {
    const nq = clean({ ...q, ...p });
    const next = auto && advance && cellOf(nq) !== "marked" && w.cur < w.qs.length - 1;
    set({ qs: w.qs.map((x, i) => (i === w.cur ? nq : x)), ...(next ? { cur: w.cur + 1 } : {}) });
  };
  const result = (v: string) => edit(v === "slow" ? { st: "right", slow: true } : v === "right" ? { st: "right", slow: false } : { st: v as MockQ["st"] });
  const value = q ? (q.st === "unmarked" ? "" : q.st === "right" && q.slow ? "slow" : q.st) : "";

  useGsap(card, (gsap, el) => { gsap.from(el, { opacity: 0.4, y: 8, duration: 0.25, ease: "power2.out", clearProps: "all" }); }, [w.cur]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable || !q) return;
      // Inside a group of choices the arrows move between the choices, as the group expects.
      if (e.key.startsWith("Arrow") && t.closest("[role=group],[role=radiogroup]")) return;
      const k = e.key.toLowerCase();
      const pick = RESULTS.find((r) => r[2].toLowerCase() === k);
      if (pick) { e.preventDefault(); result(pick[0]); }
      else if (e.key === "ArrowRight") { e.preventDefault(); go(w.cur + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(w.cur - 1); }
      else if (q.st === "wrong" && /^[1-9]$/.test(k) && CAUSE_IDS[+k - 1]) { e.preventDefault(); edit({ cause: CAUSE_IDS[+k - 1] }); }
      else if (q.st === "skip" && (k === "y" || k === "g")) { e.preventDefault(); edit({ could: k === "y" }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Groups flow like the CAT palette: a passage's questions stay together.
  const navigator = (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-base font-semibold">{done} of {w.qs.length} done</span>
          {open > 0 && <span className="text-sm text-muted-foreground">{open} to go</span>}
        </div>
        <span className="h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden><span className="block h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${(100 * done) / Math.max(1, w.qs.length)}%` }} /></span>
      </div>
      <Segmented label="Which questions" value={only} onChange={setOnly} options={[["needs", `Need you (${open})`], ["all", `All ${w.qs.length}`]]} />
      <div className="flex flex-col gap-4">
        {only === "needs" && open === 0 && <p className="text-base text-success">Every question has its details. Continue when you are ready.</p>}
        {grouped(w.layout, w.sec).filter((g) => w.qs.slice(g.from, g.from + g.n).some((x, k) => shown(x, g.from + k))).map((g) => (
          <div key={g.title} className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted-foreground">{g.title}</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={g.title}>
              {w.qs.slice(g.from, g.from + g.n).map((x, k) => {
                const i = g.from + k;
                if (!shown(x, i)) return null;
                return <PaletteCell key={i} n={i + 1} state={cellOf(x)} current={i === w.cur} onClick={() => go(i)} label={`Question ${i + 1}, ${STATUS[x.st]}`} className="h-10 min-w-10" />;
              })}
            </div>
          </div>
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground" aria-label="Question status key">
        <li className="inline-flex items-center gap-2"><i className="size-3 rounded-sm bg-success-soft ring-1 ring-success/50" />Right (dot: slow)</li>
        <li className="inline-flex items-center gap-2"><i className="size-3 rounded-sm bg-danger" />Wrong</li>
        <li className="inline-flex items-center gap-2"><i className="size-3 rounded-sm bg-secondary" />Skipped</li>
        <li className="inline-flex items-center gap-2"><i className="size-3 rounded-sm bg-card ring-1 ring-border" />Not reached</li>
        <li className="inline-flex items-center gap-2"><i className="size-3 rounded-sm bg-mark/20 ring-1 ring-mark/60" />Needs you</li>
      </ul>
      <label className="flex min-h-11 items-center gap-3 text-base">
        <Checkbox checked={auto} onCheckedChange={(v) => setAuto(v === true)} />
        Move on after each answer
      </label>
      {!sectionalId && unmarked > 0 && <Button variant="secondary" className="w-fit" onClick={() => setAsking(true)}>Mark the other {unmarked} right</Button>}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <p className="measure text-base">{sectionalId ? "Your results are filled in from the sectional. Only the wrong and skipped questions need you: say why each went wrong, and whether a skip was doable. Open a question to see it and your answer." : "Mark each question from the mock's own solutions; 99ile does not have this paper's questions. Mark the wrong and skipped ones first, then mark the rest right in one go."}</p>
      {w.migrated && <Meta>Any questions that were previously marked right by default are now unmarked. They count as skipped until you choose a result.</Meta>}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)]">
        {q && (
          <div id="mock-review-question" ref={card} className="scroll-mt-4 flex flex-col gap-6 rounded-2xl bg-card p-5 sm:p-7" aria-live="polite">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h3 className="text-[clamp(1.5rem,1.2rem+0.8vw,2rem)] leading-none font-extrabold tracking-[-0.03em] tabular-nums">Question {w.cur + 1}</h3>
                <Meta className="first-letter:uppercase">{placeOf(w.layout, w.cur, w.sec)}</Meta>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="secondary" size="icon" aria-label="Previous question" disabled={w.cur === 0} onClick={() => go(w.cur - 1)}><ChevronLeft aria-hidden /></Button>
                <span className="min-w-14 text-center text-sm font-medium tabular-nums">{w.cur + 1} / {w.qs.length}</span>
                <Button variant="secondary" size="icon" aria-label="Next question" disabled={w.cur >= w.qs.length - 1} onClick={() => go(w.cur + 1)}><ChevronRight aria-hidden /></Button>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-base font-semibold">What happened?</span>
              <Chips label="What happened" value={value} onChange={result}
                options={RESULTS.map(([v, l, k]) => [v, <span key={v} className="inline-flex items-center">{l}<Key k={k} /></span>] as [string, ReactNode])}
                className="grid w-full grid-cols-2 sm:grid-cols-3" itemClassName="w-full justify-center text-center" />
            </div>
            {w.sec !== "VARC" && <Field label="Answer format"><NativeSelect value={q.format ?? "mcq"} onChange={(e) => edit({ format: e.target.value as "mcq" | "tita" }, false)}><option value="mcq">MCQ</option><option value="tita">TITA (no negative mark)</option></NativeSelect></Field>}
            {q.st === "wrong" && (
              <div className="flex flex-col gap-2.5">
                <span className="text-base font-semibold">Why did it go wrong?</span>
                <Chips label="Why did it go wrong" value={q.cause ?? ""} onChange={(cause) => edit({ cause })}
                  options={CAUSE_IDS.map((c, i) => [c, <span key={c} className="inline-flex items-center">{CAUSES[c]}<Key k={String(i + 1)} /></span>] as [Cause, ReactNode])}
                  className="grid w-full grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" itemClassName="h-auto w-full justify-center py-2.5 text-center whitespace-normal" />
              </div>
            )}
            {q.st === "skip" && (
              <div className="flex flex-col gap-2.5">
                <span className="text-base font-semibold">Could you have got it?</span>
                <Chips label="Could you have got it" value={q.could === undefined ? "" : q.could ? "yes" : "no"} onChange={(v) => edit({ could: v === "yes" })}
                  options={[["yes", <span key="y" className="inline-flex items-center">Yes, it was doable<Key k="Y" /></span>], ["no", <span key="g" className="inline-flex items-center">No, a good skip<Key k="G" /></span>]]}
                  className="grid w-full grid-cols-1 sm:max-w-xl sm:grid-cols-2" itemClassName="w-full justify-center text-center" />
              </div>
            )}
            {q.st === "unmarked" && <Meta>No result yet. Until you choose one, this question counts as skipped.</Meta>}
            {q.st === "unseen" && <Meta>Questions you never reached count as time lost.</Meta>}
            {sectionalId && (
              <LinkButton to={`/practice/sectional/${sectionalId}?q=${w.cur + 1}&from=mock-review`} variant="secondary" className="w-fit">
                See this question and your answer
              </LinkButton>
            )}
            <p className="hidden text-sm text-muted-foreground lg:block">Keys: R right, T right but slow, W wrong, S skipped, N not reached; 1 to 9 for the cause; Y or G for a skip; arrows to move.</p>
          </div>
        )}
        <div className="hidden rounded-2xl bg-muted/40 p-5 lg:sticky lg:top-24 lg:block">{navigator}</div>
        <details className="rounded-2xl bg-muted/40 p-4 lg:hidden" open={only === "needs"}>
          <summary className="cursor-pointer list-inside text-base font-semibold">All questions <span className="ml-1 text-sm font-normal text-muted-foreground">({done} of {w.qs.length} done)</span></summary>
          <div className="pt-5">{navigator}</div>
        </details>
      </div>
      <Confirm open={asking} onOpenChange={setAsking} title={`Mark the other ${unmarked} right?`} action="Mark them right" onAction={() => { set({ qs: w.qs.map((x) => (x.st === "unmarked" ? { ...x, st: "right" } : x)) }); setAsking(false); }} cancel="Not yet">
        Every question you have not entered becomes right. Do it once the wrong and skipped questions are marked.
      </Confirm>
    </div>
  );
}

/** Drops the answers that no longer apply when a question's status changes. */
function clean(q: MockQ): MockQ {
  const o: MockQ = { st: q.st, type: q.type };
  if (q.format) o.format = q.format;
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
              <span>Question {i + 1}<span className="text-muted-foreground">, {placeOf(w.layout, i, w.sec)}</span></span>
            </label>
          </li>
        ))}
      </ul>
      <Meta>Not now? Go on: unticked questions still count as doable.</Meta>
    </div>
  );
}

/**
 * The score on one bar out of the paper's marks (D44): what was scored, then what was within reach (careless slips and
 * doable skips), then the rest. The bars grow in once on arrival.
 */
function ScoreStrip({ f }: { f: Findings }) {
  const box = useRef<HTMLDivElement>(null);
  const got = Math.max(0, f.score), reach = Math.max(0, Math.min(f.max, f.potential) - got);
  useGsap(box, (gsap, el) => { gsap.from(el.querySelectorAll("[data-bar]"), { scaleX: 0, transformOrigin: "0% 50%", duration: 0.7, stagger: 0.15, ease: "power3.out" }); }, [f.score, f.potential]);
  return (
    <div ref={box} className="flex flex-col gap-2">
      <div className="flex h-3.5 w-full gap-1 overflow-hidden rounded-full bg-secondary" aria-hidden>
        {got > 0 && <span data-bar className="h-full rounded-full bg-primary" style={{ width: `${(100 * got) / f.max}%` }} />}
        {reach > 0 && <span data-bar className="h-full rounded-full bg-highlight" style={{ width: `${(100 * reach) / f.max}%` }} />}
      </div>
      <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-full bg-primary" aria-hidden />Scored {f.score}</span>
        {reach > 0 && <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-full bg-highlight" aria-hidden />Within reach, {reach} more</span>}
        <span>Out of {f.max}</span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Step 4 (and the saved view): where the marks went

export function Findings({ f, layout, sec, planned, before }: { f: Findings; layout: MockReview["layout"]; sec: string; planned?: number; before?: number | null }) {
  const lostAll = f.groups.reduce((s, g) => s + g.marks, 0) || 1;
  const acc = f.attempted ? Math.round((f.right / f.attempted) * 100) : 0;
  return (
    <div className="flex flex-col gap-8">
      <ScoreCard score={(f.score > 0 ? "+" : "") + f.score} of={f.max} parts={[["Right", f.right], ["Wrong", f.wrong], ["Skipped or not reached", f.skipped], ["Accuracy", `${acc}%`]]}>
        <ScoreStrip f={f} />
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
                  <td className="py-2.5 pr-4">{t.label}{t.tita > 0 ? <span className="text-muted-foreground">, {t.tita} TITA</span> : null}</td>
                  <td className="whitespace-nowrap py-2.5 pr-4 text-right">{t.right} of {t.n}</td><td className="py-2.5 pr-4 text-right">{t.wrong}</td><td className="py-2.5 pr-4 text-right">{t.skipped}</td>
                  <td className="py-2.5 text-right font-semibold">{t.marks > 0 ? "+" : ""}{t.marks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sec === "VARC" && <Meta>{layout.rc.length} passages, {layout.va.length} VA questions.</Meta>}
        {sec === "DILR" && <Meta>{layout.sets?.length ?? 0} sets, {f.n} questions.</Meta>}
        {sec === "Quant" && <Meta>{f.n} questions across {(layout.topics ?? []).filter((t) => t.n > 0).length} topics.</Meta>}
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
  const whole = !!w.all;
  const edit = (i: number, p: Partial<{ keep: boolean; text: string }>) => set({ actions: acts.map((x, k) => (k === i ? { ...x, ...p } : x)) });
  return (
    <div className="flex flex-col gap-6">
      <p className="measure text-base">Work on the two or three things that cost you most before your next mock. Keep, change or drop each one.</p>
      {acts.length === 0 && <Meta>No single cause cost you two or more questions, so there is nothing to suggest. Write your own below if you have one.</Meta>}
      <ul className="flex flex-col gap-3">
        {acts.map((x, i) => (
          <li key={(x.sec ?? "") + x.a.skill.kind + x.a.skill.key} className={cn("flex flex-col gap-3 rounded-xl bg-card p-5 transition-opacity sm:p-6", x.keep ? "ring-1 ring-primary/30" : "opacity-60")}>
            {whole && x.sec && <span className="text-sm font-semibold text-muted-foreground">{x.sec}</span>}
            <label className="flex items-start gap-3 text-base font-semibold">
              <Checkbox className="mt-1" checked={x.keep} onCheckedChange={(v) => edit(i, { keep: v === true })} />
              <span>Keep this one</span>
            </label>
            <Textarea aria-label={`Action ${i + 1}`} value={x.text} onChange={(e) => edit(i, { text: e.target.value })} className="min-h-20 text-base" />
            <p className="text-sm text-muted-foreground">Why: {x.a.why}</p>
          </li>
        ))}
      </ul>
      {whole && <Field label="Your own action is for"><NativeSelect value={w.ownSec ?? "VARC"} onChange={(e) => set({ ownSec: e.target.value })} className="w-fit">{SECS.map((x) => <option key={x}>{x}</option>)}</NativeSelect></Field>}
      <Field label="Your own action" hint="Optional, one line.">
        <Input value={w.own} onChange={(e) => set({ own: e.target.value })} placeholder={w.sec === "VARC" ? "Read the questions before each passage" : w.sec === "DILR" ? "Choose a set by its easiest first deduction" : "Check the calculation before moving on"} />
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

/** The steps as a rail: names on a wide screen, the current one spelled out on a phone. */
function StepProgress({ steps, at, label }: { steps: { s: string; i: number }[]; at: number; label: (s: string) => string }) {
  return (
    <div className="flex flex-col gap-2" role="progressbar" aria-label="Analysis progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={at + 1} aria-valuetext={`Step ${at + 1} of ${steps.length}: ${label(steps[at].s)}`}>
      <p className="text-sm text-muted-foreground sm:hidden">Step {at + 1} of {steps.length}, <span className="font-semibold text-foreground">{label(steps[at].s)}</span></p>
      <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-hidden="true">
        {steps.map((step, i) => (
          <li key={step.i} className="flex flex-col gap-2">
            <span className={cn("h-1.5 rounded-full transition-colors duration-500", i <= at ? "bg-primary" : "bg-secondary")} />
            <span className={cn("hidden items-center gap-1.5 text-sm sm:flex", i === at ? "font-semibold text-foreground" : i < at ? "text-foreground/70" : "text-muted-foreground")}>
              {i < at && <Check className="size-3.5" />}{label(step.s)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * The logged result next to what this analysis adds up to (D44). The logged score stays unless the student asks to
 * update it, and that is offered only when every question has a result.
 */
function LoggedNote({ m, qs, sync, onSync }: { m: Mock; qs: MockQ[]; sync: boolean; onSync: (v: boolean) => void }) {
  const g = gridResult(qs), logged = 3 * m.c - m.w, here = 3 * g.c - g.w;
  if (logged === here && m.c === g.c && m.w === g.w) return <Meta>Your logged score of {logged} matches this analysis.</Meta>;
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card p-5 sm:p-6">
      <p className="text-base"><b className="font-semibold">Your logged score is {logged}; this analysis adds up to {here}.</b> The logged score stays as it is: it is usually the one the mock's own result page gave you.</p>
      {g.complete ? (
        <label className="flex min-h-11 items-center gap-3 text-base">
          <Checkbox checked={sync} onCheckedChange={(v) => onSync(v === true)} />
          Update my logged score to {here} to match this analysis
        </label>
      ) : <Meta>{g.unmarked === 1 ? "1 question has" : `${g.unmarked} questions have`} no result yet, so the logged score cannot be updated from this analysis.</Meta>}
    </div>
  );
}

/** A whole mock's score: the total out of every section's marks, and each section's share of it (D45). */
function WholeScore({ parts }: { parts: Part[] }) {
  const fs = parts.map((pt) => ({ sec: pt.sec, f: findings({ qs: pt.qs, sec: pt.sec }) }));
  const total = fs.reduce((n, x) => n + x.f.score, 0), max = fs.reduce((n, x) => n + x.f.max, 0);
  return (
    <ScoreCard score={(total > 0 ? "+" : "") + total} of={max} parts={fs.map((x) => [x.sec, `${x.f.score > 0 ? "+" : ""}${x.f.score} of ${x.f.max}`] as [string, ReactNode])}>
      <p className="text-base text-muted-foreground">The whole paper. Below, the section picked above, where its marks went; switch section to see the others.</p>
    </ScoreCard>
  );
}

function Wizard({ src }: { src: Source }) {
  const { state, update } = useStore();
  const nav = useNavigate();
  const [search] = useSearchParams();
  const queryQuestion = Number(search.get("q"));
  const requestedQuestion = Number.isSafeInteger(queryQuestion) && queryQuestion >= 1 ? queryQuestion - 1 : undefined;
  const mockRow = src.from === "manual" && src.mock ? state.mocks.find((m) => m.id === src.mock) : undefined;
  const key = "mockreview:" + (src.from === "sectional" ? src.att.id : src.mock ?? "new");
  const [w, setW] = useState<Wiz>(() => {
    const saved = readDraft<Wiz>(key);
    if (saved && Array.isArray(saved.qs)) {
      if (src.from === "manual" && saved.version !== 2) {
        const sec = saved.sec ?? mockRow?.sec ?? "VARC";
        return {
          ...saved,
          version: 2,
          sec,
          kind: saved.kind === "Sectional" ? `${sec} sectional` : saved.kind,
          cur: requestedQuestion === undefined ? saved.cur : Math.min(requestedQuestion, Math.max(0, saved.qs.length - 1)),
          migrated: true,
          qs: saved.qs.map((q) => clean(q.st === "right" ? { ...q, st: "unmarked" } : q)),
        };
      }
      const sec = saved.sec ?? (src.from === "manual" ? mockRow?.sec : undefined) ?? "VARC";
      return { ...saved, sec, version: 2, cur: requestedQuestion === undefined ? saved.cur : Math.min(requestedQuestion, Math.max(0, saved.qs.length - 1)) };
    }
    if (src.from === "sectional") {
      const { layout, qs } = fromSectional(src.att, scorePaper(src.att.qs, src.att.a, src.c));
      const firstWrong = Math.max(0, qs.findIndex((q) => q.st === "wrong"));
      const cur = requestedQuestion === undefined ? firstWrong : Math.min(requestedQuestion, Math.max(0, qs.length - 1));
      return { version: 2, step: 1, name: "VARC sectional on this site", d: src.att.d, kind: "VARC sectional", sec: "VARC", planned: "", layout, qs, cur, actions: null, own: "", errors: false };
    }
    const sec = mockRow?.sec ?? "VARC";
    const kind = mockRow?.k === "Sectional" ? `${sec} sectional` : mockRow?.k ?? "Full mock";
    const layout = layoutFor(sec);
    return { version: 2, step: 0, name: mockRow?.n ?? "", d: mockRow?.d ?? todayIso(), kind, sec, planned: "", layout, qs: questionsFor(layout, [], sec), cur: 0, actions: null, own: "", errors: false };
  });
  const set = (p: Partial<Wiz>) => setW((o) => ({ ...o, ...p }));
  useEffect(() => { writeDraft(key, w); }, [key, w]);
  useEffect(() => { window.scrollTo(0, 0); }, [w.step]);
  useEffect(() => {
    if (requestedQuestion === undefined || w.step !== 1) return;
    const timer = window.setTimeout(() => document.getElementById("mock-review-question")?.scrollIntoView({ block: "start", behavior: "smooth" }), 80);
    return () => window.clearTimeout(timer);
  }, [requestedQuestion, w.step]);

  const sec = w.sec;
  const f = useMemo(() => findings({ qs: w.qs, sec }), [w.qs, sec]);
  const parts = partsNow(w);
  const hasDoable = parts.some((pt) => pt.qs.some((q) => q.st === "skip" && q.could));
  const wrongAll = parts.reduce((n, pt) => n + pt.qs.filter((q) => q.st === "wrong").length, 0);
  // A sectional on this site has its basics already: the analysis starts on its questions (D44).
  const steps = STEPS.map((s, i) => ({ s, i })).filter((x) => (x.s !== "Re-solve" || hasDoable) && !(src.from === "sectional" && x.s === "Basics"));
  const label = (s: string) => (src.from === "sectional" && s === "Questions" ? "Tag your mistakes" : s);
  const body = useRef<HTMLDivElement>(null);
  useGsap(body, (gsap, el) => { gsap.from(el, { opacity: 0, x: 24, duration: 0.35, ease: "power2.out", clearProps: "all" }); }, [w.step]);
  const at = steps.findIndex((x) => x.i === w.step);
  const planned = w.planned.trim() === "" ? undefined : Math.max(0, Math.round(+w.planned));

  const go = (dir: 1 | -1) => {
    const next = steps[at + dir]?.i;
    if (next === undefined) return;
    if (STEPS[next] === "Actions") {
      // Proposed afresh each time the grid may have changed; choices already made for the same action are kept.
      // A whole mock gets each section's own proposals, labelled by section (D45).
      const prev = new Map((w.actions ?? []).map((x) => [(x.sec ?? "") + x.a.skill.kind + x.a.skill.key, x]));
      const actions = parts.flatMap((pt) => proposeActions({ qs: pt.qs, sec: pt.sec }, state.practice).map((a) => {
        const tag = w.all ? pt.sec : undefined, p = prev.get((tag ?? "") + a.skill.kind + a.skill.key);
        return { a, keep: p?.keep ?? true, text: p && p.text !== p.a.text ? p.text : a.text, ...(tag ? { sec: tag } : {}) };
      }));
      set({ step: next, actions });
    } else set({ step: next });
  };

  /** A whole mock: one analysis per section, linked by a group, each logged as that section's result (D45). */
  const saveWhole = () => {
    const group = uid(), now = Date.now(), d = w.d || todayIso(), name = w.name.trim();
    const kept = (w.actions ?? []).filter((x) => x.keep && x.text.trim());
    const made = parts.map((pt) => {
      const id = uid(), mock = `${group}-${pt.sec}m`;
      const recs: Recommendation[] = kept.filter((x) => x.sec === pt.sec).map((x) => ({
        id: uid(), d, updatedAt: now, from: "mock", src: id, sec: pt.sec, skill: x.a.skill, text: x.text.trim(), why: x.a.why, status: "open",
        ...(x.a.to ? { to: x.a.to } : {}), ...(x.a.before ? { before: x.a.before } : {}),
      }));
      if (w.own.trim() && (w.ownSec ?? "VARC") === pt.sec) recs.push({ id: uid(), d, updatedAt: now, from: "mock", src: id, sec: pt.sec, skill: { kind: "cause", key: "own" }, text: w.own.trim(), why: "Your own action.", status: "open" });
      const review: MockReview = { id, d, updatedAt: now, mock, sec: pt.sec, from: "manual", name, layout: pt.layout, qs: pt.qs, recs: recs.map((r) => r.id), group };
      return { review, recs, logged: loggedAfter(undefined, pt.qs, { id: mock, d, sec: pt.sec, n: name, k: w.kind }) };
    });
    update((st) => {
      made.forEach(({ review, recs, logged }) => {
        st.mocks.push(logged);
        st.practice.push(...toPractice(review));
        if (w.errors) st.errors.push(...toErrors(review));
        st.recs.push(...recs);
        st.mockReviews.push(review);
      });
    });
    writeDraft(key, null);
    nav("/progress/mock-review/" + made[0].review.id, { replace: true });
  };

  const save = () => {
    if (w.all) { saveWhole(); return; }
    const id = uid(), now = Date.now(), d = w.d || todayIso();
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
        // The logged result is the record; the analysis attaches to it and rewrites it only on request (D44).
        const m = st.mocks.find((x) => x.id === mockId);
        const next = loggedAfter(m, w.qs, { id: mockId, d, sec, n: review.name, k: w.kind }, !!w.sync);
        if (m) Object.assign(m, next); else st.mocks.push(next);
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
  const unmarked = parts.reduce((n, pt) => n + gridResult(pt.qs).unmarked, 0);
  return (
    <Page className="gap-6 pb-24 sm:gap-8 sm:pb-0">
      {src.from === "sectional" ? (
        <PageHeader title="Your sectional analysis" back={{ to: `/practice/sectional/${src.att.id}?q=${w.cur + 1}`, label: "Back to the sectional review" }}>
          It carries on from your review: say why each wrong answer went wrong, see where the marks went, and choose up to three things to fix.
        </PageHeader>
      ) : (
        <PageHeader title={mockRow ? "Analyse a logged mock" : "Analyse a mock"} back={BACK}>
          {mockRow
            ? <>Analysing {mockRow.n || mockRow.k} from {mediumDate(mockRow.d)}, logged at {3 * mockRow.c - mockRow.w}. Your logged score stays as it is unless you choose to update it at the end.</>
            : <>Mark each question of your {w.all ? "three sections" : `${sec} section`} from the mock's own solutions, see where the marks went, and choose what to fix. Saving also logs the result in Progress{w.all ? ", one score per section" : ""}.</>}
        </PageHeader>
      )}
      <StepProgress steps={steps} at={at} label={label} />
      <div ref={body} className="flex flex-col gap-4">
        <h2 className="text-heading font-semibold">{label(stepName)}</h2>

        {w.all && stepName !== "Basics" && stepName !== "Actions" && <PartSwitch w={w} set={set} />}
        {stepName === "Basics" && <Basics w={w} set={set} fixed={src.from === "sectional"} allowAll={src.from === "manual" && !mockRow} />}
        {stepName === "Questions" && <Grid key={w.sec} w={w} set={set} sectionalId={src.from === "sectional" ? src.att.id : undefined} />}
        {stepName === "Re-solve" && (w.qs.some((q) => q.st === "skip" && q.could) ? <Resolve w={w} set={set} /> : <Meta>No doable skips in {sec}. Switch section above.</Meta>)}
        {stepName === "Where the marks went" && w.all && <WholeScore parts={parts} />}
        {stepName === "Where the marks went" && <Findings f={f} layout={w.layout} sec={sec} planned={w.all ? undefined : planned} before={w.all ? null : avgBefore(state, sec, src.from === "sectional" ? src.att.id + "m" : src.mock)} />}
        {stepName === "Actions" && <Actions w={w} set={set} wrong={wrongAll} />}
        {last && mockRow && <LoggedNote m={mockRow} qs={w.qs} sync={!!w.sync} onSync={(sync) => set({ sync })} />}
        {last && src.from === "manual" && !mockRow && unmarked > 0 && <Meta>{unmarked === 1 ? "1 question has" : `${unmarked} questions have`} no result; saving logs them as skipped.</Meta>}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 bg-background/95 px-gutter py-3 backdrop-blur-sm sm:static sm:z-auto sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="flex w-full items-center justify-between gap-3">
          {at > 0 ? <Button variant="secondary" onClick={() => go(-1)}>Back</Button> : <span />}
          {last ? <Button onClick={save}>Save the analysis</Button> : <Button onClick={() => go(1)}>Continue</Button>}
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
  // The other sections of a whole mock analysed at once (D45).
  const sibs = r.group ? state.mockReviews.filter((x) => x.group === r.group).sort((a, b) => SECS.indexOf(a.sec) - SECS.indexOf(b.sec)) : [];
  const total = sibs.reduce((n, x) => n + findings(x).score, 0), totalMax = sibs.reduce((n, x) => n + findings(x).max, 0);
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
      {r.from === "sectional" && r.att
        ? <PageHeader title="Your sectional analysis" back={{ to: `/practice/sectional/${r.att}`, label: "Back to the sectional review" }}>Analysed on {mediumDate(r.d)}. Every question and your answer is one tap away in the review.</PageHeader>
        : <PageHeader title={r.name || "Mock analysis"} back={BACK}>Analysed on {mediumDate(r.d)}{sibs.length > 1 ? `, all three sections: ${total} of ${totalMax} in all` : ""}. The logged result stays in Progress.</PageHeader>}
      {sibs.length > 1 && (
        <nav aria-label="Sections of this mock" className="inline-flex w-fit flex-wrap gap-1 rounded-lg bg-secondary p-1">
          {sibs.map((x) => {
            const sc = findings(x).score;
            return (
              <Link key={x.id} to={`/progress/mock-review/${x.id}`} aria-current={x.id === r.id ? "page" : undefined}
                className={cn("flex h-10 items-center gap-2 rounded-md px-4 text-base transition-colors", x.id === r.id ? "bg-card font-semibold text-primary ring-1 ring-inset ring-primary/40" : "text-muted-foreground hover:text-foreground")}>
                {x.sec}<span className="tabular-nums">{sc > 0 ? "+" : ""}{sc}</span>
              </Link>
            );
          })}
        </nav>
      )}
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
      <Findings f={f} layout={r.layout} sec={r.sec} planned={r.planned} />
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
      <PageHeader title={sectional ? "Your sectional analysis" : "Analyse a mock"} back={BACK}>You have already analysed this one.</PageHeader>
      <div><LinkButton to={`/progress/mock-review/${done.id}`}>Open the review</LinkButton></div>
      <Meta>Or <Link className="underline underline-offset-4" to="/progress/mock-review">analyse another mock</Link>.</Meta>
    </Page>
  );
  if (sectional) return <FromSectional id={sectional} />;
  return <Wizard key={mock ?? "new"} src={{ from: "manual", mock }} />;
}
