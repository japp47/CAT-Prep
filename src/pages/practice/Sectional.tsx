import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ContentGate } from "../../components/Content";
import { LinkButton, Meta, Page, PageHeader, Section, TextLink } from "../../components/kit";
import { benchmark } from "../../data/percentiles";
import { mediumDate, todayIso, uid } from "../../lib/date";
import { useStore } from "../../lib/store";
import type { Content } from "../../practice/content";
import { fmtSecs, LETTERS } from "../../practice/record";
import { resolveRedo } from "../../practice/redo";
import {
  buildPaper, byType, loadDraft, marksOf, newDraft, qStatus, recordSectional, saveDraft, scorePaper, secsLeft,
  SECTIONAL_RC, SECTIONAL_SECS, type Draft, type QStatus,
} from "../../practice/sectional";
import { VA_KIND } from "../../practice/va/build";
import NotFound from "../NotFound";
import { Choice, ChoiceGroup, Confirm, PaletteCell, PlayerBar, ScoreCard, Timer } from "./common";
import { Passage, PaneSwitch, ReviewQuestion, Split } from "./RcPlayer";
import { ItemInput, ItemReview } from "./VaPlayer";

const TR = "border-t align-top"; // taste-skill-ignore: rows of a real table

const MAX = 72;
const B99 = benchmark(99);
const STATUS_LABEL: Record<QStatus, string> = { unseen: "not visited", open: "not answered", done: "answered", marked: "marked for review", doneMarked: "answered and marked" };

export default function Sectional() {
  return <ContentGate>{(c) => <SectionalRoute c={c} />}</ContentGate>;
}

function SectionalRoute({ c }: { c: Content }) {
  const [draft, setDraft] = useState<Draft | null>(() => loadDraft());
  return draft ? <Exam key={draft.id} start={draft} c={c} onQuit={() => { saveDraft(null); setDraft(null); }} /> : <Start onStart={setDraft} />;
}

function Start({ onStart }: { onStart: (d: Draft) => void }) {
  const { state } = useStore();
  const begin = () => {
    const d = newDraft(uid(), buildPaper(state, uid()), Date.now());
    saveDraft(d);
    onStart(d);
  };
  const past = [...state.sectionals].reverse();
  const rules: [string, string][] = [
    [`${SECTIONAL_RC} reading passages`, "16 questions. MCQ: +3 right, −1 wrong."],
    ["8 verbal ability questions", "2 each of para summary and sentence insertion (MCQ, −1 wrong), and of odd sentence out and para jumbles (TITA, no negative marks)."],
    [`Out of ${MAX}`, `The 99 percentile was a scaled ${B99.values} in CAT ${B99.years}: roughly 15 to 17 right with at most 3 wrong.`],
  ];
  return (
    <Page>
      <PageHeader title="Timed VARC sectional" back={{ to: "/practice", label: "Practice" }}>
        The VARC section as CAT sets it: 40 minutes, 24 questions, with passages and paragraphs written for this site. Questions you have not seen yet come first.
      </PageHeader>
      <div className="flex flex-col gap-6 rounded-lg bg-card p-5 sm:p-7">
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-[14rem_minmax(0,1fr)]">
          {rules.map(([k, v]) => <div key={k} className="contents"><dt className="text-base font-semibold">{k}</dt><dd className="text-base text-foreground/85">{v}</dd></div>)}
        </dl>
        <p className="measure text-base text-muted-foreground">The clock starts when you press Start and keeps running if you leave the page, as in the real exam. Your answers are saved as you go, and the section submits itself at 0:00.</p>
        <div><Button size="lg" onClick={begin}>Start the sectional</Button></div>
      </div>
      {past.length > 0 && (
        <Section title="Your sectionals">
          <ul className="flex flex-col gap-1">
            {past.map((s) => (
              <li key={s.id}>
                <Link to={`/practice/sectional/${s.id}`} className="flex items-center justify-between gap-4 rounded-md bg-card px-4 py-3 hover:bg-card/70">
                  <span className="flex flex-col">
                    <b className="text-base font-semibold tabular-nums">{3 * s.c - s.w > 0 ? "+" : ""}{3 * s.c - s.w} of {MAX}</b>
                    <Meta>{mediumDate(s.d)}, {s.c} correct, {fmtSecs(s.secs)} used</Meta>
                  </span>
                  <span className="text-base font-medium text-primary">Review</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </Page>
  );
}

/** The section clock. It ticks on its own, so the passage and the palette do not redraw every second. */
function Clock({ d, onEnd }: { d: Draft; onEnd: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = secsLeft(d, now);
  useEffect(() => { if (left === 0) onEnd(); });
  return <Timer over={left <= 300}>{fmtSecs(left)} left</Timer>;
}

function Exam({ start, c, onQuit }: { start: Draft; c: Content; onQuit: () => void }) {
  const { update } = useStore();
  const navigate = useNavigate();
  const [d, setD] = useState(start);
  const [pane, setPane] = useState<"p" | "q">("p");
  const [confirm, setConfirm] = useState<"submit" | "quit" | null>(null);
  // The palette starts folded on phones, so the question stays near the top of the screen.
  const [palette, setPalette] = useState(() => typeof matchMedia === "function" && matchMedia("(min-width: 960px)").matches);
  const enteredAt = useRef(Date.now());
  const done = useRef(false);

  /** Adds the time since the last call to the question on screen. */
  const spent = () => { const t = Date.now(), dt = (t - enteredAt.current) / 1000; enteredAt.current = t; return dt; };
  const withTime = (p: Draft, dt: number) => ({ ...p, t: p.t.map((x, k) => (k === p.cur ? x + dt : x)) });
  const go = (i: number) => {
    const dt = spent();
    setD((p) => ({ ...withTime(p, dt), cur: i, seen: p.seen.map((s, k) => s || k === i) }));
    // On a phone, stay on the question when the next one is about the same passage.
    const passage = (k: string) => (k.startsWith("rc:") ? k.split(":")[1] : null);
    setPane(passage(d.qs[i]) && passage(d.qs[i]) === passage(d.qs[d.cur]) ? "q" : "p");
    window.scrollTo(0, 0);
  };
  const setAnswer = (v: string) => setD((p) => ({ ...p, a: p.a.map((x, k) => (k === p.cur ? v : x)) }));
  const toggleMark = () => setD((p) => ({ ...p, marked: p.marked.map((x, k) => (k === p.cur ? !x : x)) }));

  const submit = () => {
    if (done.current) return;
    done.current = true;
    const final = withTime(d, spent());
    const at = Date.now(), secs = Math.min(SECTIONAL_SECS, (at - d.startedAt) / 1000);
    update((st) => recordSectional(st, d.id, final.qs, final.a, final.t, secs, todayIso(), c, at));
    saveDraft(null);
    navigate(`/practice/sectional/${d.id}`, { replace: true });
  };

  useEffect(() => { saveDraft(d); }, [d]);
  useEffect(() => {
    const flush = setInterval(() => { const dt = spent(); setD((p) => withTime(p, dt)); }, 5000);
    return () => clearInterval(flush);
  }, []);

  const ref = useMemo(() => resolveRedo(d.qs[d.cur], c), [d.qs, d.cur, c]);
  const n = d.qs.length;
  const counts = d.qs.map((_, i) => qStatus(d, i)).reduce((m, s) => ({ ...m, [s]: (m[s] ?? 0) + 1 }), {} as Partial<Record<QStatus, number>>);
  const blank = d.a.filter((x) => x === "").length;
  const rcCount = d.qs.filter((k) => k.startsWith("rc:")).length;
  const passageNo = ref?.kind === "rc" ? d.qs.slice(0, d.cur + 1).map((k) => k.split(":")[1]).filter((s, i, a) => a.indexOf(s) === i).length : 0;
  const last = d.cur === n - 1;

  const actions = (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => setAnswer("")} disabled={d.a[d.cur] === ""}>Clear response</Button>
        <Button variant="ghost" size="sm" aria-pressed={d.marked[d.cur]} onClick={() => { toggleMark(); if (!d.marked[d.cur] && !last) go(d.cur + 1); }}>
          {d.marked[d.cur] ? "Unmark" : last ? "Mark for review" : "Mark for review and next"}
        </Button>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={d.cur === 0} onClick={() => go(d.cur - 1)}>Previous</Button>
        <Button size="sm" disabled={last} onClick={() => go(d.cur + 1)}>Save and next</Button>
      </div>
    </div>
  );

  return (
    <Page className="gap-6 lg:gap-8">
      <PlayerBar kicker={`VARC sectional, question ${d.cur + 1} of ${n}`} title={ref?.kind === "rc" ? `Passage ${passageNo} of ${SECTIONAL_RC}` : ref ? VA_KIND[ref.item.kind].label : "Question"}>
        <Clock d={d} onEnd={submit} />
        <Button size="sm" onClick={() => setConfirm("submit")}>Submit section</Button>
      </PlayerBar>

      <Collapsible open={palette} onOpenChange={setPalette} className="rounded-lg bg-card">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
          <span className="text-base font-semibold">Question palette <span className="font-normal text-muted-foreground">, {counts.done ?? 0} answered, {(counts.marked ?? 0) + (counts.doneMarked ?? 0)} marked</span></span>
          <ChevronDown className={cn("size-5 shrink-0 transition-transform", palette && "rotate-180")} aria-hidden />
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-5 px-5 pb-5">
          <div className="flex flex-wrap gap-x-10 gap-y-4">
            {([["Reading comprehension", 0, rcCount], ["Verbal ability", rcCount, n]] as const).map(([label, from, to]) => (
              <div key={label} className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted-foreground">{label}</span>
                <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
                  {d.qs.slice(from, to).map((_, j) => {
                    const i = from + j, s = qStatus(d, i);
                    return <PaletteCell key={i} n={i + 1} state={s} current={i === d.cur} onClick={() => go(i)} label={`Question ${i + 1}, ${STATUS_LABEL[s]}`} />;
                  })}
                </div>
              </div>
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground" aria-label="Palette key">
            {([["done", "Answered"], ["open", "Not answered"], ["marked", "Marked"], ["doneMarked", "Answered and marked"], ["unseen", "Not visited"]] as const).map(([k, l]) => (
              <li key={k} className="inline-flex items-center gap-2">
                <span className={cn("size-4 rounded ring-1 ring-inset ring-border bg-card", k === "open" && "ring-danger/60", (k === "done" || k === "doneMarked") && "bg-success-soft ring-success/50", k === "marked" && "bg-mark/10 ring-mark/60")} />
                {l} <b className="font-semibold text-foreground tabular-nums">{counts[k] ?? 0}</b>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>

      {ref?.kind === "rc" && (
        <>
          <PaneSwitch pane={pane} setPane={setPane} q={`Question ${d.cur + 1}`} />
          <Split pane={pane}>
            <Passage set={ref.set} highlight={[]} wordMode={false} />
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">Question {d.cur + 1}, MCQ, −1 if wrong</p>
              <p className="text-lg leading-snug font-semibold">{ref.set.questions[ref.qi].stem}</p>
              <ChoiceGroup label={"Options for question " + (d.cur + 1)}>
                {ref.set.questions[ref.qi].options.map((o, i) => <Choice key={i} mark={LETTERS[i]} checked={d.a[d.cur] === String(i)} onClick={() => setAnswer(String(i))}>{o.t}</Choice>)}
              </ChoiceGroup>
              {actions}
            </div>
          </Split>
        </>
      )}
      {ref?.kind === "va" && (
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5">
          <p className="text-sm text-muted-foreground">Question {d.cur + 1}, {VA_KIND[ref.item.kind].tita ? "TITA, no negative marks" : "MCQ, −1 if wrong"}</p>
          <ItemInput key={d.cur} item={ref.item} answer={d.a[d.cur]} setAnswer={setAnswer} />
          {actions}
        </div>
      )}
      {!ref && (
        <div className="flex flex-col items-start gap-3 rounded-lg bg-muted p-6 text-base">
          This question is no longer in the library. Move on to the next one.
          <Button size="sm" disabled={last} onClick={() => go(d.cur + 1)}>Next</Button>
        </div>
      )}

      <Button variant="link" size="sm" className="self-start text-muted-foreground" onClick={() => setConfirm("quit")}>Discard this sectional</Button>

      <Confirm open={confirm === "submit"} onOpenChange={(o) => setConfirm(o ? "submit" : null)} title="Submit the section?" action="Submit section" onAction={submit}>
        {blank ? `${blank} question${blank > 1 ? "s are" : " is"} unanswered.` : "Every question has an answer."} {fmtSecs(secsLeft(d, Date.now()))} is left. You cannot change answers after this.
      </Confirm>
      <Confirm open={confirm === "quit"} onOpenChange={(o) => setConfirm(o ? "quit" : null)} title="Discard this sectional?" action="Discard" onAction={onQuit} danger>
        Nothing is saved to Progress. You can start a new one any time.
      </Confirm>
    </Page>
  );
}

export function SectionalReview() {
  return <ContentGate>{(c) => <Review c={c} />}</ContentGate>;
}

function Review({ c }: { c: Content }) {
  const { id } = useParams();
  const { state } = useStore();
  const [cur, setCur] = useState(0);
  const [pane, setPane] = useState<"p" | "q">("q");
  const s = state.sectionals.find((x) => x.id === id);
  const rows = useMemo(() => (s ? scorePaper(s.qs, s.a, c) : []), [s, c]);
  useEffect(() => { window.scrollTo(0, 0); }, [cur]);
  if (!s) return <NotFound />;

  const marks = marksOf(rows);
  const types = byType(rows, s.t);
  const attempted = rows.filter((r) => !r.blank).length;
  const correct = rows.filter((r) => r.ok).length;
  const row = rows[cur];
  const slow = [...rows].sort((a, b) => (s.t[b.i] ?? 0) - (s.t[a.i] ?? 0)).slice(0, 3).filter((r) => (s.t[r.i] ?? 0) >= 120);

  return (
    <Page className="gap-6 lg:gap-8">
      <PlayerBar kicker={`Sectional review, ${mediumDate(s.d)}`} title={`Score ${marks > 0 ? "+" : ""}${marks} of ${MAX}`}>
        <LinkButton to="/practice/sectional" variant="secondary" size="sm">All sectionals</LinkButton>
      </PlayerBar>

      <ScoreCard score={(marks > 0 ? "+" : "") + marks} of={MAX} parts={[["Correct", correct], ["Wrong", attempted - correct], ["Blank", rows.length - attempted], ["Accuracy", `${attempted ? Math.round((correct / attempted) * 100) : 0}%`], ["Time", fmtSecs(s.secs)]]}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-base">
            <thead className="text-sm text-muted-foreground">
              <tr><th className="py-2 pr-4 font-medium">Type</th><th className="py-2 pr-4 text-right font-medium">Attempted</th><th className="py-2 pr-4 text-right font-medium">Correct</th><th className="py-2 pr-4 text-right font-medium">Marks</th><th className="py-2 pr-4 text-right font-medium">Time</th><th className="py-2 text-right font-medium">Each</th></tr>
            </thead>
            <tbody className="tabular-nums">
              {types.map((x) => (
                <tr key={x.type} className={TR}>
                  <td className="py-2.5 pr-4">{x.type}</td><td className="py-2.5 pr-4 text-right">{x.attempted} of {x.n}</td><td className="py-2.5 pr-4 text-right">{x.correct}</td>
                  <td className="py-2.5 pr-4 text-right font-semibold">{x.marks > 0 ? "+" : ""}{x.marks}</td><td className="py-2.5 pr-4 text-right">{fmtSecs(x.secs)}</td><td className="py-2.5 text-right">{fmtSecs(x.secs / x.n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {slow.length > 0 && <p className="text-base">Longest on {slow.map((r) => `Q${r.i + 1} (${fmtSecs(s.t[r.i])}${r.ok ? ", right" : r.blank ? ", blank" : ", wrong"})`).join(", ")}. Over 2 minutes on one question is usually time better spent elsewhere.</p>}
        <p className="text-base text-muted-foreground">Saved in Progress as a sectional and by question type. Wrong and blank questions join your <TextLink to="/practice/redo">redo queue</TextLink>.</p>
        <div><LinkButton to="/practice/sectional">Take another sectional</LinkButton></div>
      </ScoreCard>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Questions">
        {rows.map((r, k) => <PaletteCell key={r.i} n={r.i + 1} state={r.blank ? "blank" : r.ok ? "right" : "wrong"} current={k === cur} onClick={() => setCur(k)} label={`Question ${r.i + 1}, ${r.blank ? "blank" : r.ok ? "correct" : "wrong"}`} />)}
      </div>

      {row && <p className="text-sm text-muted-foreground">Question {row.i + 1}, {row.type}, {fmtSecs(s.t[row.i] ?? 0)} spent on it</p>}
      {row?.ref.kind === "rc" && (
        <>
          <PaneSwitch pane={pane} setPane={setPane} q={`Question ${row.i + 1}`} />
          <Split pane={pane}>
            <Passage set={row.ref.set} highlight={row.ref.set.questions[row.ref.qi].proof} wordMode />
            <ReviewQuestion set={row.ref.set} qi={row.ref.qi} chosen={s.a[row.i] === "" ? null : Number(s.a[row.i])} />
          </Split>
        </>
      )}
      {row?.ref.kind === "va" && <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5"><ItemReview item={row.ref.item} answer={s.a[row.i]} /></div>}
      <div className="flex justify-between gap-2">
        <Button variant="secondary" size="sm" disabled={cur === 0} onClick={() => setCur(cur - 1)}>Previous question</Button>
        <Button variant="secondary" size="sm" disabled={cur >= rows.length - 1} onClick={() => setCur(cur + 1)}>Next question</Button>
      </div>
    </Page>
  );
}
