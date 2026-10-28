import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { mediumDate, todayIso, uid } from "../../lib/date";
import { readDraft, writeDraft } from "../../lib/draft";
import { usePref } from "../../lib/prefs";
import { LR_SLIPS, LR_TIME_SINKS, type LrAttempt, type LrPostMortem } from "../../lib/state";
import { useStore } from "../../lib/store";
import { ContentGate } from "../../components/Content";
import { ArrowLink, LinkButton, Page } from "../../components/kit";
import { LR_GUIDE_BY_TYPE } from "../../sections/dilr/guides";
import { LrNextDrill } from "../../components/LrNextDrill";
import { blankScratch, LrScratch, LrWalkthrough } from "../../components/LrDiagram";
import { LR_CATALOG } from "../../practice/catalog.gen";
import { lrRight } from "../../practice/lrcheck";
import { LR_SLIP_LABEL, LR_TIME_LABEL, lrError, lrErrorSrc, recordLr, saveLrPostMortem, scoreLr } from "../../practice/lrattempt";
import { fmtSecs, LETTERS } from "../../practice/record";
import { LR_TYPE, lrVersion, type LrDiagram, type LrSet, type LrTable } from "../../practice/types";
import NotFound from "../NotFound";
import { Choice, ChoiceGroup, QuestionNav, Confirm, ElapsedTimer, ErrorCause, NotSure, PaletteCell, PlayerBar, ReportLink, ReviewChoice, ScoreCard, TimeUp, useLeaveConfirmation, useShownAttempt, useStartQuestion } from "./common";
import { PaneJump, PaneSwitch, showQuestion, Split } from "./RcPlayer";

/**
 * One logical reasoning set (F23): the story and clues on one side; the scratch pad, then the question, on the other
 * (D40), so a student writes in the pad while reading the clues and reads the pad while answering. Then the review
 * with the walkthrough and post-mortem (F86).
 */
export default function LrPlayer() {
  const { id = "" } = useParams();
  // Only the file of this set's type loads.
  return <ContentGate need={{ lr: [id] }}>{(c) => <LrRoute set={c.lrById(id)} />}</ContentGate>;
}

function LrRoute({ set }: { set: LrSet | undefined }) {
  const [sp] = useSearchParams();
  if (!set) return <NotFound />;
  const review = sp.get("review");
  return <Player key={set.id + ":" + (review ?? "") + ":" + (sp.get("n") ?? "")} set={set} reviewId={review} />;
}

function Player({ set, reviewId }: { set: LrSet; reviewId: string | null }) {
  const { state } = useStore();
  const { attempt: shown, waiting, finish } = useShownAttempt(state.lrAttempts, reviewId);
  const attempt = shown && shown.set === set.id ? shown : undefined;
  if (waiting) return null;
  return attempt ? <Review set={set} attempt={attempt} /> : <Attempt set={set} onDone={(id) => finish(id, ["n"])} />;
}

/** What to type in the scratch pad, by layout. */
function padHint(g: LrDiagram | undefined): string {
  if (!g) return "Write down your working as you go.";
  if (g.layout === "grid") return g.mirror ? "Type W, D or L for the team on the left; the other team's result fills itself in." : "Type into any cell.";
  if (g.layout === "bracket") return "Type each match as you work it out, such as 4 v 13.";
  if (g.layout === "venn") return g.padSets ? "Name the circles A, B and C for the question, then type a count, 'some' or an x into any region." : "Type a count into any region, or x for an empty one.";
  if (g.layout === "network") return "Write each town's best distance as you find it.";
  return "Type a name or a note into any seat.";
}

const kicker = (set: LrSet, what: string) => `${what}, ${LR_TYPE[set.type].label.charAt(0).toLowerCase() + LR_TYPE[set.type].label.slice(1)}, ${set.difficulty}`;

function DataTable({ t }: { t: LrTable }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-separate border-spacing-0 text-left text-base">
        {t.caption && <caption className="pb-2 text-left text-sm text-muted-foreground">{t.caption}</caption>}
        <thead><tr>{t.head.map((h, i) => <th key={i} scope="col" className="border-b border-border px-3 py-2 text-sm font-semibold">{h}</th>)}</tr></thead>
        <tbody>{t.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="border-b border-border/60 px-3 py-2 tabular-nums">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/** The story and numbered clues. In review the clues a question used are highlighted. */
export function SetText({ set, lit = [] }: { set: LrSet; lit?: number[] }) {
  return (
    <article className="flex flex-col gap-4 rounded-lg bg-card px-5 py-5 sm:px-7 sm:py-6" aria-label="The set">
      {set.intro.map((p, i) => <p key={i} className="text-reading">{p}</p>)}
      {set.clues.length > 0 && (
        <ol className="flex flex-col gap-1.5">
          {set.clues.map((c, i) => (
            <li key={i} className={cn("grid grid-cols-[2rem_1fr] gap-1 rounded-md py-1 text-base", lit.includes(i + 1) && "-mx-2 bg-highlight-soft px-2")}>
              <span className="text-muted-foreground tabular-nums">{i + 1}.</span><span>{c}</span>
            </li>
          ))}
        </ol>
      )}
      {set.tables?.map((t, i) => <DataTable key={i} t={t} />)}
    </article>
  );
}

/** A folding block, for the scratch pad and the post-mortem. */
function Fold({ title, open, onOpenChange, children }: { title: string; open: boolean; onOpenChange: (o: boolean) => void; children: ReactNode }) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="group rounded-lg bg-card">
      <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-5 py-4 text-left">
        <span className="text-base font-semibold">{title}</span>
        <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none" aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-5 pb-5">{children}</CollapsibleContent>
    </Collapsible>
  );
}

interface LrDraft { ans: (number | string | null)[]; marked: boolean[]; unsure: boolean[]; cur: number; secs: number; scratch?: string[][]; notes?: string }

function Attempt({ set, onDone }: { set: LrSet; onDone: (id: string) => void }) {
  const { update } = useStore();
  const leave = useLeaveConfirmation(true);
  const n = set.questions.length;
  const g = set.solution.diagram;
  const target = set.minutes * 60;
  const draftKey = "lr:" + set.id;
  const [saved] = useState(() => { const d = readDraft<LrDraft>(draftKey); return d && d.ans?.length === n ? d : null; });
  const [ans, setAns] = useState<(number | string | null)[]>(saved?.ans ?? Array(n).fill(null));
  const [marked, setMarked] = useState<boolean[]>(saved?.marked ?? Array(n).fill(false));
  const [unsure, setUnsure] = useState<boolean[]>(saved?.unsure?.length === n ? saved.unsure : Array(n).fill(false));
  const [scratch, setScratch] = useState<string[][]>(() => saved?.scratch ?? (g ? blankScratch(g) : []));
  const [notes, setNotes] = useState(saved?.notes ?? "");
  const [cur, setCur] = useState(saved?.cur ?? 0);
  const [pane, setPane] = useState<"p" | "q">("p");
  const [confirming, setConfirming] = useState(false);
  const [padOpen, setPadOpen] = usePref("lrPad", true);
  const [hideTimer, setHideTimer] = usePref("rcHideTimer", false);
  const [startAt] = useState(() => Date.now() - (saved?.secs ?? 0) * 1000);
  const submitted = useRef(false);
  const draftRef = useRef<LrDraft>({ ans, marked, unsure, cur, secs: 0, scratch, notes });
  draftRef.current = { ans, marked, unsure, cur, secs: 0, scratch, notes };

  // Kept on every change, and on leaving the page, so a reload or a phone switching apps comes back to the same place.
  useEffect(() => {
    if (!submitted.current) writeDraft(draftKey, { ans, marked, unsure, cur, scratch, notes, secs: (Date.now() - startAt) / 1000 } satisfies LrDraft);
  }, [draftKey, ans, marked, unsure, cur, scratch, notes, startAt]);
  useEffect(() => {
    const keep = () => { if (!submitted.current) writeDraft(draftKey, { ...draftRef.current, secs: (Date.now() - startAt) / 1000 }); };
    window.addEventListener("pagehide", keep);
    return () => { window.removeEventListener("pagehide", keep); keep(); };
  }, [draftKey, startAt]);

  const q = set.questions[cur];
  const setAt = <T,>(f: (fn: (xs: T[]) => T[]) => void, v: T) => f((xs) => xs.map((x, i) => (i === cur ? v : x)));
  const submit = () => {
    const id = uid();
    submitted.current = true;
    writeDraft(draftKey, null);
    update((st) => recordLr(st, id, set, ans, (Date.now() - startAt) / 1000, todayIso(), unsure.flatMap((u, i) => (u ? [i] : [])), Date.now()));
    setConfirming(false);
    leave.allowNextNavigation();
    onDone(id);
  };
  const blank = (a: number | string | null) => a === null || a === "";
  const blanks = ans.filter(blank).length;
  const numeric = q.kind === "tita" && /^-?\d+(\.\d+)?$/.test(String(q.answer));

  return (
    <Page className="gap-6 lg:gap-8">
      <PlayerBar kicker={kicker(set, "LR practice")} title={set.title}>
        {hideTimer
          ? <Button variant="link" size="sm" onClick={() => setHideTimer(false)}>Show timer</Button>
          : <ElapsedTimer startAt={startAt} target={target} onClick={() => setHideTimer(true)} title={`Target ${set.minutes} minutes. Tap to hide.`} />}
        <Button size="sm" variant="secondary" onClick={() => setConfirming(true)}>Submit set</Button>
      </PlayerBar>
      <TimeUp startAt={startAt} target={target} onSubmit={submit} />
      {saved && <p className="text-sm text-muted-foreground">Your saved answers and notes are back. The timer paused while you were away ({fmtSecs(saved.secs)} elapsed).</p>}

      <PaneSwitch pane={pane} setPane={setPane} q={`Question ${cur + 1} of ${n}`} p="Set" />

      <Split pane={pane}>
        <SetText set={set} />
        <>
          <Fold title={g ? "Scratch pad" : "Notes"} open={padOpen} onOpenChange={setPadOpen}>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">{padHint(g)} Only you see it, and it is kept with your answers.</p>
              {g && <LrScratch g={g} value={scratch} onChange={setScratch} />}
              <Textarea aria-label="Your notes" value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 2000))} rows={g ? 2 : 4}
                placeholder={g ? "Cases, totals, anything else" : "Your working: fields, pairings, totals"} className="bg-secondary text-base" />
              <Button variant="ghost" size="sm" className="self-start" disabled={!notes && scratch.every((r) => r.every((x) => !x))}
                onClick={() => { if (g) setScratch(blankScratch(g)); setNotes(""); }}>Clear the pad</Button>
            </div>
          </Fold>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Questions">
            {set.questions.map((_, i) => {
              const s = marked[i] ? (!blank(ans[i]) ? "doneMarked" : "marked") : !blank(ans[i]) ? "done" : "unseen";
              return <PaletteCell key={i} n={i + 1} state={s} current={i === cur} onClick={() => { setCur(i); setPane("q"); }} label={`Question ${i + 1}, ${blank(ans[i]) ? "not answered" : "answered"}${marked[i] ? ", marked" : ""}`} />;
            })}
          </div>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Question {cur + 1} of {n}, {q.kind === "mcq" ? "choose one" : "type your answer (no negative marking)"}</p>
            <p className="text-lg leading-snug font-semibold whitespace-pre-line">{q.stem}</p>
            {q.kind === "mcq" ? (
              <ChoiceGroup label={"Options for question " + (cur + 1)}>
                {q.options!.map((o, i) => <Choice key={i} mark={LETTERS[i]} checked={ans[cur] === i} onClick={() => setAt(setAns, i)}>{o}</Choice>)}
              </ChoiceGroup>
            ) : (
              <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (cur < n - 1) setCur(cur + 1); }}>
                <Input
                  key={cur} aria-label={`Your answer to question ${cur + 1}`} autoComplete="off" spellCheck={false}
                  inputMode={numeric ? "decimal" : "text"} className="w-44 bg-card text-lg font-semibold"
                  value={typeof ans[cur] === "string" ? (ans[cur] as string) : ""} onChange={(e) => setAt(setAns, e.target.value.slice(0, 20))} placeholder="Answer"
                />
              </form>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" onClick={() => setAt(setAns, null)} disabled={blank(ans[cur])}>Clear</Button>
                <Button variant="ghost" size="sm" aria-pressed={marked[cur]} onClick={() => setAt(setMarked, !marked[cur])}>{marked[cur] ? "Unmark" : "Mark for review"}</Button>
                <NotSure on={unsure[cur]} onChange={(v) => setAt(setUnsure, v)} />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={cur === 0} onClick={() => setCur(cur - 1)}>Previous</Button>
                {cur < n - 1 ? <Button size="sm" onClick={() => setCur(cur + 1)}>Next</Button> : <Button size="sm" onClick={() => setConfirming(true)}>Submit set</Button>}
              </div>
            </div>
          </div>
        </>
      </Split>
      {pane === "p" && <PaneJump onClick={() => setPane("q")}>Question {cur + 1} of {n}</PaneJump>}

      <Confirm open={confirming} onOpenChange={setConfirming} title="Submit this set?" action="Submit set" onAction={submit}>
        {blanks ? `${blanks} question${blanks > 1 ? "s are" : " is"} unanswered. Blanks score 0, a wrong MCQ costs 1 mark and a wrong typed answer costs nothing.` : "All questions answered."}
      </Confirm>
      <Confirm open={leave.open} onOpenChange={leave.onOpenChange} title="Leave this set?" action="Leave the set" onAction={leave.onLeave} cancel="Keep solving" danger actionClassName="!text-white dark:!text-black">
        Your answers, scratch pad and time are saved. The timer pauses while you are away. Come back within 24 hours to carry on.
      </Confirm>
    </Page>
  );
}

function Review({ set, attempt }: { set: LrSet; attempt: LrAttempt }) {
  if (attempt.v && attempt.v !== lrVersion(set)) {
    return (
      <Page className="gap-6">
        <PlayerBar kicker={kicker(set, "Review")} title={set.title}><LinkButton to="/dilr/practice" variant="secondary" size="sm">Back to practice</LinkButton></PlayerBar>
        <ScoreCard score={3 * attempt.c - attempt.w} of={3 * attempt.ans.length} parts={[["Correct", attempt.c], ["Time", fmtSecs(attempt.secs)]]}>
          <p className="measure text-base">This set was changed after you took it on {mediumDate(attempt.d)}, so your old answers no longer match its questions. Your score stays in Progress.</p>
          <div><LinkButton to={`/practice/lr/${set.id}?n=${uid()}`}>Take the new version</LinkButton></div>
        </ScoreCard>
      </Page>
    );
  }
  return <FullReview set={set} attempt={attempt} />;
}

function FullReview({ set, attempt }: { set: LrSet; attempt: LrAttempt }) {
  const n = set.questions.length;
  const { start, el } = useStartQuestion(n);
  const [cur, setCur] = useState(start);
  const [pane, setPane] = useState<"p" | "q">("q");
  const q = set.questions[cur];
  const whole = q.uses.length >= set.clues.length;
  return (
    <Page className="gap-6 lg:gap-8">
      <PlayerBar kicker={kicker(set, "Review")} title={set.title}>
        <LinkButton to="/dilr/practice" variant="secondary" size="sm">Back to practice</LinkButton>
      </PlayerBar>
      <Score set={set} attempt={attempt} />
      <PostMortem set={set} attempt={attempt} />
      <LrNextDrill set={set} attempt={attempt} />
      <LrWalkthrough steps={set.solution.steps} g={set.solution.diagram} />
      {LR_GUIDE_BY_TYPE.has(set.type) && <ArrowLink to={`/dilr?guide=${set.type}`}>Read the {LR_TYPE[set.type].label.charAt(0).toLowerCase() + LR_TYPE[set.type].label.slice(1)} guide: what to draw, where to start, the traps</ArrowLink>}
      {set.solution.grid && (
        <section className="flex flex-col gap-3 rounded-lg bg-card p-5 sm:p-6" aria-label="Final table">
          <h2 className="text-heading font-semibold">The final table</h2>
          <DataTable t={set.solution.grid} />
          {set.solution.cases != null && set.solution.cases > 0 && (
            <p className="text-sm text-muted-foreground">{set.solution.cases === 1 ? "Exactly one solution fits every clue." : `${set.solution.cases} solutions fit every clue; the questions say which details they need.`}</p>
          )}
        </section>
      )}

      <div ref={el} className="scroll-mt-24"><PaneSwitch pane={pane} setPane={setPane} q={`Question ${cur + 1} of ${n}`} p="Set" /></div>
      <Split pane={pane}>
        <SetText set={set} lit={whole ? [] : q.uses} />
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Questions">
            {set.questions.map((qq, i) => {
              const a = attempt.ans[i];
              const s = a === null || a === "" ? "blank" : lrRight(qq, a) ? "right" : "wrong";
              return <PaletteCell key={i} n={i + 1} state={s} current={i === cur} onClick={() => { setCur(i); setPane("q"); }} label={`Question ${i + 1}, ${s === "right" ? "correct" : s === "wrong" ? "wrong" : "skipped"}`} />;
            })}
          </div>
          <ReviewQuestion set={set} qi={cur} given={attempt.ans[cur]} att={attempt.id} whole={whole} />
          <QuestionNav cur={cur} n={n} onGo={setCur} />
        </>
      </Split>
      {pane === "p" && <PaneJump onClick={() => showQuestion(setPane)}>Question {cur + 1} of {n}</PaneJump>}
      <p className="text-sm text-muted-foreground">Sets are original practice material written for this site; every answer was checked by solving the set in code.</p>
    </Page>
  );
}

export function ReviewQuestion({ set, qi, given, att, whole }: { set: LrSet; qi: number; given: number | string | null; att: string; whole: boolean }) {
  const { state, update } = useStore();
  const q = set.questions[qi];
  const blank = given === null || given === "";
  const ok = !blank && lrRight(q, given);
  const src = lrErrorSrc(set, qi);
  const inLog = state.errors.some((e) => e.src === src);
  const badge = ok ? "Correct, +3" : blank ? "Skipped, 0" : q.kind === "mcq" ? "Wrong, −1" : "Wrong, 0";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Question {qi + 1}, {q.kind === "mcq" ? "multiple choice" : "typed answer"}</span>
        <Badge variant={ok ? "success" : blank ? "secondary" : "danger"}>{badge}</Badge>
      </div>
      <p className="text-lg leading-snug font-semibold whitespace-pre-line">{q.stem}</p>
      {q.kind === "mcq" ? (
        <ul className="flex flex-col gap-2.5">
          {q.options!.map((o, i) => (
            <ReviewChoice key={i} mark={LETTERS[i]} state={i === q.answer ? "right" : i === given ? "wrong" : "plain"}
              tags={<>{i === q.answer && <Badge variant="success">Answer</Badge>}{i === given && i !== q.answer && <Badge variant="danger">Your pick</Badge>}</>}>
              {o}
            </ReviewChoice>
          ))}
        </ul>
      ) : (
        <dl className="flex flex-wrap gap-x-10 gap-y-2">
          <div className="flex flex-col"><dt className="text-sm text-muted-foreground">Your answer</dt><dd className={cn("text-heading font-semibold", !ok && !blank && "text-danger")}>{blank ? "Skipped" : String(given)}</dd></div>
          <div className="flex flex-col"><dt className="text-sm text-muted-foreground">Answer</dt><dd className="text-heading font-semibold text-success">{String(q.answer)}</dd></div>
        </dl>
      )}
      <div className="flex flex-col gap-2 rounded-lg bg-card p-4">
        {q.why.map((w, i) => <p key={i} className="text-base">{w}</p>)}
      </div>
      <p className="text-sm text-muted-foreground">{q.uses.length === 0 ? (set.clues.length === 0 ? "The question's own statements settle it." : set.tables ? "The table alone settles it; no clue is needed." : "The rules in the story settle it; no clue is needed.") : whole ? "This question needs the whole set solved." : `The highlighted clue${q.uses.length > 1 ? "s settle" : " settles"} it.`}</p>
      {!ok && (inLog
        ? <ErrorCause src={src} />
        : <Button variant="secondary" size="sm" className="self-start" onClick={() => { update((st) => { st.errors.push(lrError(set, qi, given, todayIso(), false, att)); }); toast("Added to your Error log."); }}>Add to Error log</Button>)}
      <ReportLink what={`${set.title}, Q${qi + 1} (${set.id})`} item={`lr:${set.id}:${qi}`} />
    </div>
  );
}

function Score({ set, attempt }: { set: LrSet; attempt: LrAttempt }) {
  const { state, update } = useStore();
  const s = scoreLr(set, attempt.ans);
  const wrong = set.questions.map((_, i) => i).filter((i) => !lrRight(set.questions[i], attempt.ans[i]));
  const missing = wrong.filter((i) => !state.errors.some((e) => e.src === lrErrorSrc(set, i)));
  const next = useMemo(() => {
    const tried = new Set(state.lrAttempts.map((a) => a.set));
    const i = LR_CATALOG.findIndex((x) => x.id === set.id);
    return [...LR_CATALOG.slice(i + 1), ...LR_CATALOG.slice(0, i)].find((x) => !tried.has(x.id));
  }, [state.lrAttempts, set.id]);
  const [seed] = useState(uid);
  const over = attempt.secs > set.minutes * 60;
  return (
    <ScoreCard score={(s.marks > 0 ? "+" : "") + s.marks} of={3 * set.questions.length}
      parts={[["Correct", s.c], ["Wrong", s.w + s.tw], ["Skipped", s.skipped], ["Time", <span key="t" className={cn(over && "text-danger")}>{fmtSecs(attempt.secs)}</span>]]}>
      <p className="text-base text-muted-foreground">Attempted {mediumDate(attempt.d)}, target {set.minutes} minutes. Logged in Progress as a DILR practice set. Wrong MCQs cost a mark; wrong typed answers cost nothing.</p>
      <div className="flex flex-wrap gap-3">
        {missing.length > 0 && <Button onClick={() => { update((st) => { missing.forEach((i) => st.errors.push(lrError(set, i, attempt.ans[i], todayIso(), !!attempt.unsure?.includes(i), attempt.id))); }); toast(`Added ${missing.length} to your Error log.`); }}>Add {missing.length} to Error log</Button>}
        {next && <Button asChild variant="secondary" className="h-auto min-h-10 max-w-full shrink whitespace-normal py-2 text-left"><Link to={`/practice/lr/${next.id}`}>Next set: {next.title}</Link></Button>}
        <Button asChild variant="ghost"><Link to={`/practice/lr/${set.id}?n=${seed}`}>Retake</Link></Button>
      </div>
    </ScoreCard>
  );
}

/** One row of tap choices for the post-mortem. */
function Pick<T extends string | number>({ label, value, options, onChange }: { label: string; value: T | undefined; options: [T, string][]; onChange: (v: T | undefined) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-base font-semibold">{label}</p>
      <ToggleGroup type="single" value={value === undefined ? "" : String(value)} onValueChange={(v) => onChange(v ? options.find(([k]) => String(k) === v)?.[0] : undefined)} aria-label={label} className="flex flex-wrap justify-start gap-2">
        {options.map(([k, t]) => (
          <ToggleGroupItem key={String(k)} value={String(k)} className="min-h-11 min-w-11 flex-none rounded-md bg-secondary px-3.5 text-base data-[state=on]:bg-background data-[state=on]:font-semibold data-[state=on]:text-primary data-[state=on]:ring-1 data-[state=on]:ring-inset data-[state=on]:ring-primary/40">
            {t}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

/**
 * The set post-mortem (F86): three taps, before or after reading the walkthrough. Self-explanation of the key step is
 * what turns a solved set into a lesson (docs/research/lr.md §4). Each tap saves at once; nothing here is required.
 */
function PostMortem({ set, attempt }: { set: LrSet; attempt: LrAttempt }) {
  const { update } = useStore();
  const pm = attempt.pm ?? {};
  const [open, setOpen] = usePref("lrPm", true);
  const save = (p: LrPostMortem) => update((st) => saveLrPostMortem(st, attempt.id, p, Date.now()));
  const clues: [number, string][] = set.clues.map((_, i) => [i + 1, String(i + 1)]);
  const done = [pm.key, pm.time, pm.slip].filter((x) => x !== undefined).length;
  const needsClue = pm.slip === "misread" || pm.slip === "missed-case" || pm.slip === "assumption";
  return (
    <Fold title={`Two-minute post-mortem${done ? `, ${done} of 3 answered` : ""}`} open={open} onOpenChange={setOpen}>
      <div className="flex flex-col gap-5">
        <p className="measure text-base text-muted-foreground">Answer from memory, before the walkthrough if you can. Saying what opened the set, and what went wrong, is what makes the next set faster.</p>
        {clues.length > 0 && <Pick label="Which clue gave you the first real deduction?" value={pm.key} options={clues} onChange={(key) => save({ ...pm, key })} />}
        <Pick label="Where did most of the time go?" value={pm.time} options={LR_TIME_SINKS.map((k) => [k, LR_TIME_LABEL[k]])} onChange={(time) => save({ ...pm, time })} />
        <Pick label="What cost you an answer?" value={pm.slip} options={LR_SLIPS.map((k) => [k, LR_SLIP_LABEL[k]])} onChange={(slip) => save({ ...pm, slip, ...(slip === "none" ? { slipClue: undefined } : {}) })} />
        {needsClue && clues.length > 0 && <Pick label="Which clue was it?" value={pm.slipClue} options={clues} onChange={(slipClue) => save({ ...pm, slipClue })} />}
        {done > 0 && <p className="text-sm text-success" role="status">Saved with this attempt. History shows the clue that opened the set.</p>}
      </div>
    </Fold>
  );
}
