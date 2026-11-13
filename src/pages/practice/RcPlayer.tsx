import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Check, ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { mediumDate, todayIso, uid } from "../../lib/date";
import { readDraft, writeDraft } from "../../lib/draft";
import { useFocus } from "../../lib/focus";
import { usePref } from "../../lib/prefs";
import type { RcAttempt } from "../../lib/state";
import { useStore } from "../../lib/store";
import { ContentGate } from "../../components/Content";
import { Field, LinkButton, Page, TextLink } from "../../components/kit";
import { Checklist, ModelSummary, SummaryPair, WriteCard } from "../../components/Summary";
import { RC_CATALOG } from "../../practice/catalog.gen";
import { rcOfDay } from "../../practice/daily";
import { fmtSecs, LETTERS, rcError, rcErrorSrc, recordRc, scoreRc } from "../../practice/record";
import { recordRcSummary, SUMMARY_CHECKS, SUMMARY_SHORT, summaryFor, summaryScore } from "../../practice/summary";
import { rcStale } from "../../practice/versions";
import { GENRES, RC_QTYPE, rcVersion, setWords, SUMMARY_MAX_WORDS, words, type RcQuestion, type RcSet, type RcSummary } from "../../practice/types";
import { checkSummary, fixSummary, flagAi, useAi, type SummaryFix, type SummaryVerdict } from "../../lib/ai";
import { diffWords } from "../../practice/wordDiff";
import { startSignIn } from "../../lib/sync/runner";
import { findLine, lineVerdict, sentences, type LineRef } from "../../practice/sentences";
import NotFound from "../NotFound";
import { BreakNote, Choice, ChoiceGroup, ComeBack, QuestionNav, Confirm, ElapsedTimer, TimeUp, ErrorCause, NotSure, PaletteCell, PlayerBar, ReportLink, ResumeNote, type Resume, ReviewChoice, ScoreCard, timeShown, useLeaveConfirmation, useShownAttempt, useStartQuestion } from "./common";

/** Words too common to be worth saving to flashcards. */
const COMMON = new Set("the and for are but not you all any can had her was one our out has him his how its may new now old see two way who did get let put say she too use that with have this will your from they know want been good much some time very when come here just like long make many more only over such take than them well were what which their there these those would could should about after other where while being because through between does into also each most even then upon whose".split(" "));

/** About seven minutes per RC is the CAT pace: 28 minutes for four passages. */
const TARGET_SECS = 7 * 60;

export default function RcPlayer() {
  const { id } = useParams();
  const setId = id === "today" ? rcOfDay(todayIso()).id : id ?? "";
  // Only this set's file loads, about a tenth of all the passages.
  return <ContentGate need={{ rc: [setId] }}>{(c) => <RcRoute set={c.rcById(setId)} />}</ContentGate>;
}

function RcRoute({ set }: { set: RcSet | undefined }) {
  const [sp] = useSearchParams();
  if (!set) return <NotFound />;
  const review = sp.get("review");
  return <Player key={set.id + ":" + (review ?? "") + ":" + (sp.get("n") ?? "")} set={set} reviewId={review} />;
}

/** Passage or question, for phones, where the two cannot sit side by side. */
export function PaneSwitch({ pane, setPane, q, p = "Passage" }: { pane: "p" | "q"; setPane: (p: "p" | "q") => void; q: string; p?: string }) {
  return (
    <ToggleGroup type="single" value={pane} onValueChange={(v) => v && setPane(v as "p" | "q")} className="w-full rounded-lg bg-secondary p-1 lg:hidden" aria-label="Show">
      <ToggleGroupItem value="p" className="h-10 flex-1 rounded-md text-base data-[state=on]:bg-card data-[state=on]:font-semibold">{p}</ToggleGroupItem>
      <ToggleGroupItem value="q" className="h-10 flex-1 rounded-md text-base data-[state=on]:bg-card data-[state=on]:font-semibold">{q}</ToggleGroupItem>
    </ToggleGroup>
  );
}

/** Passage beside the questions on a wide screen; one or the other on a phone. */
export function Split({ pane, children }: { pane: "p" | "q"; children: [React.ReactNode, React.ReactNode] }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-8">
      <div className={cn("min-w-0 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto", pane === "q" && "max-lg:hidden")}>{children[0]}</div>
      <div className={cn("flex min-w-0 flex-col gap-4", pane === "p" && "max-lg:hidden")}>{children[1]}</div>
    </div>
  );
}

/**
 * On a phone a long passage pushes the question out of reach, so a bar above the bottom navigation goes straight to it.
 * It sits higher while the focus timer bar is showing. Render it only while the passage pane is open.
 */
export function PaneJump({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  const { run } = useFocus();
  return (
    <>
      <div className={cn("lg:hidden", run ? "h-40" : "h-20")} aria-hidden />
      <div className={cn(
        "fixed inset-x-0 z-30 bg-background/95 px-gutter py-3 backdrop-blur-sm lg:hidden",
        run ? "bottom-[calc(15rem+env(safe-area-inset-bottom))]" : "bottom-[calc(4rem+env(safe-area-inset-bottom))]",
      )}>
        <Button className="w-full" onClick={onClick}>{children}<ArrowRight aria-hidden /></Button>
      </div>
    </>
  );
}
/** Shows the question pane from the top, for screens that keep their question near the top. */
export const showQuestion = (setPane: (p: "p" | "q") => void) => { setPane("q"); window.scrollTo(0, 0); };

interface RcDraft { ans: (number | null)[]; marked: boolean[]; cur: number; secs: number; first: number | null; unsure?: boolean[]; lines?: (LineRef | null)[] }

/** One RC set: answering it, then reviewing it on the same page. */
function Player({ set, reviewId }: { set: RcSet; reviewId: string | null }) {
  const { state } = useStore();
  // Right after a submit, a set with a model summary asks for the student's own first: the main-idea answer would give it away.
  // The pending step is kept as a draft, so a reload or a phone switching apps comes back to it instead of a fresh set.
  const pendingKey = "sumfor:" + set.id;
  const [pending] = useState(() => { const id = readDraft<string>(pendingKey); return id && (!reviewId || reviewId === id) && state.rcAttempts.some((a) => a.id === id) ? id : null; });
  const { attempt: shown, waiting, finish } = useShownAttempt(state.rcAttempts, pending ?? reviewId);
  const attempt = shown && shown.set === set.id ? shown : undefined;
  const [writing, setWriting] = useState(!!pending);
  useEffect(() => { window.scrollTo(0, 0); }, [writing]);
  if (waiting) return null;
  if (attempt && writing && set.summary) return <SummaryStep set={set} model={set.summary} attempt={attempt} onDone={() => { writeDraft(pendingKey, null); setWriting(false); }} />;
  // A finished set goes into the address (?review=): see useShownAttempt.
  return attempt ? <Review set={set} attempt={attempt} /> : <Attempt set={set} onDone={(id) => {
    if (set.summary) { writeDraft(pendingKey, id); setWriting(true); }
    finish(id, ["n"]);
  }} />;
}

interface SummaryDraft { text: string; tone: string }

/** Step 2e: write a summary, compare it with the model, tick what you got, then go on to the answers. */
function SummaryStep({ set, model, attempt, onDone }: { set: RcSet; model: RcSummary; attempt: RcAttempt; onDone: () => void }) {
  const { update } = useStore();
  const key = "sum:" + attempt.id;
  const [saved] = useState(() => readDraft<SummaryDraft>(key));
  const [text, setText] = useState(saved?.text ?? "");
  const [tone, setTone] = useState(saved?.tone ?? "");
  const [comparing, setComparing] = useState(false);
  const [checks, setChecks] = useState([false, false, false, false]);
  const [aiChecks, setAiChecks] = useState<boolean[] | null>(null);
  const [revised, setRevised] = useState("");
  const [pane, setPane] = useState<"p" | "q">("q");
  const [id] = useState(uid);
  useEffect(() => { if (!comparing) writeDraft(key, text.trim() || tone ? ({ text, tone } satisfies SummaryDraft) : null); }, [key, text, tone, comparing]);
  const n = words(text);
  const s = scoreRc(set, attempt.ans);
  const compare = () => { setComparing(true); setPane("q"); window.scrollTo(0, 0); };
  const finish = (save: boolean) => {
    writeDraft(key, null);
    if (save) update((st) => { if (!summaryFor(st, attempt.id)) recordRcSummary(st, id, set, attempt.id, text, tone, checks, todayIso(), Date.now(), aiChecks ?? undefined, revised || undefined); });
    onDone();
  };

  return (
    <Page className="gap-6 lg:gap-8">
      <PlayerBar kicker="Summary, before the answers" title={set.title}>
        <Button variant="ghost" size="sm" onClick={() => finish(false)}>Skip to the answers</Button>
      </PlayerBar>
      <p className="measure text-base text-muted-foreground">
        Set saved: {s.c} of {set.questions.length} right. {comparing
          ? "Compare yours with the model, then tick what you got. Be strict: the ticks are your score."
          : `Before the answers, sum up the passage in ${SUMMARY_MAX_WORDS} words or fewer: what the author claims, and how strongly.`}
      </p>

      <PaneSwitch pane={pane} setPane={setPane} q={comparing ? "Compare" : "Your summary"} />

      <Split pane={pane}>
        <Passage set={set} highlight={[]} wordMode={false} />
        {comparing ? (
          <>
            <SummaryPair text={text.trim()} tone={tone} model={model} />
            <Checklist checks={checks} onChange={setChecks} model={model} />
            <SecondOpinion set={set} text={text.trim()} checks={checks} onVerdicts={setAiChecks} onRevised={setRevised} />
            <div><Button onClick={() => finish(true)}>Save and see the answers</Button></div>
          </>
        ) : (
          <>
            <WriteCard text={text} onText={setText} tone={tone} onTone={setTone} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Button disabled={n < 5} onClick={compare}>Compare with the model</Button>
              {n < 5 && <span className="text-sm text-muted-foreground">Write at least 5 words first.</span>}
            </div>
            {saved && <p className="text-sm text-muted-foreground">Your summary from earlier is back.</p>}
          </>
        )}
      </Split>
      {pane === "p" && <PaneJump onClick={() => showQuestion(setPane)}>{comparing ? "Compare with the model" : "Write your summary"}</PaneJump>}
    </Page>
  );
}

/** In the review: the summary written after this attempt beside the model, or the model alone. Folded, so it does not push the questions down. */
function SummaryReview({ set, attempt }: { set: RcSet; attempt: RcAttempt }) {
  const { state } = useStore();
  if (!set.summary) return null;
  const mine = summaryFor(state, attempt.id);
  return (
    <Collapsible className="group rounded-lg bg-card">
      <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-5 py-4 text-left">
        <span className="text-base font-semibold">{mine ? `Your summary and the model, ${summaryScore(mine.checks)} of 4` : "Model summary"}</span>
        <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none" aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-5 pb-5">
        {mine ? <>
          <SummaryPair text={mine.text} tone={mine.tone} model={set.summary} />
          {mine.revised && <p className="rounded-lg bg-secondary px-4 py-3 text-base"><span className="font-semibold">Your revision:</span> {mine.revised}</p>}
        </> : (
          <div className="flex flex-col gap-1.5">
            <ModelSummary s={set.summary} />
            <p className="text-sm text-muted-foreground">Tone: {set.summary.tone}. The highlighted words are the claim and the qualifier a good summary keeps.</p>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

/** The set behind its door (D83): after a long break it asks to start fresh or carry on. */
function Attempt({ set, onDone }: { set: RcSet; onDone: (id: string) => void }) {
  return (
    <ComeBack draftKey={"rc:" + set.id} kicker={`RC practice, ${GENRES[set.genre].toLowerCase()}, ${set.difficulty}`} title={set.title}>
      {(r) => <Solve set={set} onDone={onDone} resume={r} />}
    </ComeBack>
  );
}

function Solve({ set, onDone, resume }: { set: RcSet; onDone: (id: string) => void; resume: Resume }) {
  const { update } = useStore();
  const leave = useLeaveConfirmation(true);
  const n = set.questions.length;
  const draftKey = "rc:" + set.id;
  const [saved] = useState(() => { const d = readDraft<RcDraft>(draftKey); return d && d.ans?.length === n ? d : null; });
  const [resumed, setResumed] = useState(!!saved);
  const [away, setAway] = useState(saved ? resume.away ?? 0 : 0);
  const [ans, setAns] = useState<(number | null)[]>(saved?.ans ?? Array(n).fill(null));
  const [marked, setMarked] = useState<boolean[]>(saved?.marked ?? Array(n).fill(false));
  const [unsure, setUnsure] = useState<boolean[]>(saved?.unsure?.length === n ? saved.unsure : Array(n).fill(false));
  const [cur, setCur] = useState(saved?.cur ?? 0);
  // Prove it (F103): the line marked for each question, and whether the passage is taking a tap now.
  const [lines, setLines] = useState<(LineRef | null)[]>(saved?.lines?.length === n ? saved.lines : Array(n).fill(null));
  const [picking, setPicking] = useState(false);
  const [pane, setPane] = useState<"p" | "q">("p");
  const [confirming, setConfirming] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [hideTimer, setHideTimer] = usePref("rcHideTimer", false);
  const questionRef = useRef<HTMLDivElement>(null);
  const jumpToQuestion = useRef(false);
  // A restored set carries on the clock from where it stopped, not from when it was first opened.
  const [startAt, setStartAt] = useState(() => Date.now() - (saved?.secs ?? 0) * 1000);
  const startAtRef = useRef(startAt);
  startAtRef.current = startAt;
  const firstAt = useRef<number | null>(saved?.first != null ? startAt + saved.first * 1000 : null);
  const submitted = useRef(false);

  const first = firstAt.current === null ? null : (firstAt.current - startAt) / 1000;
  const draft: RcDraft = { ans, marked, cur, secs: (Date.now() - startAt) / 1000, first, unsure, lines };
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // Persist once per state change; pagehide and unmount flush the latest snapshot.
  useEffect(() => {
    if (!submitted.current) writeDraft(draftKey, { ans, marked, cur, secs: (Date.now() - startAt) / 1000, first, unsure, lines } satisfies RcDraft);
  }, [draftKey, ans, marked, cur, startAt, first, unsure, lines]);
  useEffect(() => {
    const keep = () => {
      if (submitted.current) return;
      writeDraft(draftKey, { ...draftRef.current, secs: (Date.now() - startAtRef.current) / 1000 });
    };
    window.addEventListener("pagehide", keep);
    return () => { window.removeEventListener("pagehide", keep); keep(); };
  }, [draftKey]);

  const restart = () => {
    writeDraft(draftKey, null);
    setAns(Array(n).fill(null));
    setMarked(Array(n).fill(false));
    setUnsure(Array(n).fill(false));
    setLines(Array(n).fill(null));
    setPicking(false);
    setCur(0);
    firstAt.current = null;
    setStartAt(Date.now());
    setResumed(false);
    setAway(0);
    setConfirmRestart(false);
  };

  const choose = (opt: number) => {
    if (firstAt.current === null) firstAt.current = Date.now();
    setAns((a) => a.map((x, i) => (i === cur ? opt : x)));
  };
  const submit = () => {
    const today = todayIso();
    const secs = (Date.now() - startAt) / 1000;
    const first = firstAt.current ? (firstAt.current - startAt) / 1000 : secs;
    const mode = rcOfDay(today).id === set.id ? "daily" : "library";
    const id = uid();
    submitted.current = true;
    writeDraft(draftKey, null);
    update((st) => recordRc(st, id, set, ans, secs, first, mode, today, unsure.flatMap((u, i) => (u ? [i] : [])), away, lines));
    setConfirming(false);
    leave.allowNextNavigation(); // the review goes into the address (?review=): not a "leave"
    onDone(id);
  };
  const blanks = ans.filter((a) => a === null).length;
  const go = (i: number) => { setCur(i); setPane("q"); setPicking(false); };
  const q = set.questions[cur];
  const canProve = !!q.lines?.length && ans[cur] !== null;
  const startPick = () => { setPicking(true); setPane("p"); };
  const tapLine = (r: LineRef) => { setLines((l) => l.map((x, i) => (i === cur ? r : x))); setPicking(false); setPane("q"); };
  useEffect(() => {
    if (pane !== "q" || !jumpToQuestion.current) return;
    jumpToQuestion.current = false;
    questionRef.current?.scrollIntoView({ block: "start" });
  }, [pane]);

  return (
    <Page className="gap-6 lg:gap-8">
      <PlayerBar kicker={`RC practice, ${GENRES[set.genre].toLowerCase()}, ${set.difficulty}`} title={set.title}>
        {hideTimer
          ? <Button variant="link" size="sm" onClick={() => setHideTimer(false)}>Show timer</Button>
          : <ElapsedTimer startAt={startAt} target={TARGET_SECS} onClick={() => setHideTimer(true)} title="Target 7 minutes. Tap to hide." />}
        <Button size="sm" variant="secondary" onClick={() => setConfirming(true)}>Submit set</Button>
      </PlayerBar>
      <TimeUp key={startAt} startAt={startAt} target={TARGET_SECS} onSubmit={submit} />
      <ResumeNote r={resume} restored={resumed && !!saved} onRestart={() => setConfirmRestart(true)} />

      <PaneSwitch pane={pane} setPane={setPane} q={`Question ${cur + 1} of ${n}`} />

      <Split pane={pane}>
        <>
          <Passage set={set} highlight={[]} wordMode={false}
            lines={{ tap: picking ? tapLine : undefined, mine: lines[cur],
              prompt: picking && <><span>Tap the line that proves your answer to question {cur + 1}.</span><Button variant="ghost" size="sm" onClick={() => { setPicking(false); setPane("q"); }}>Cancel</Button></> }} />
        </>
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Questions">
            {set.questions.map((_, i) => {
              const s = marked[i] ? (ans[i] !== null ? "doneMarked" : "marked") : ans[i] !== null ? "done" : "unseen";
              return <PaletteCell key={i} n={i + 1} state={s} current={i === cur} onClick={() => go(i)} label={`Question ${i + 1}, ${ans[i] === null ? "not answered" : "answered"}${marked[i] ? ", marked" : ""}`} />;
            })}
          </div>
          <div ref={questionRef} className="scroll-mt-28 flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Question {cur + 1} of {n}</p>
            <p className="text-lg leading-snug font-semibold">{set.questions[cur].stem}</p>
            <ChoiceGroup label={"Options for question " + (cur + 1)}>
              {set.questions[cur].options.map((o, i) => <Choice key={i} mark={LETTERS[i]} checked={ans[cur] === i} onClick={() => choose(i)}>{o.t}</Choice>)}
            </ChoiceGroup>
            {canProve && <ProveIt line={lines[cur] ? sentences(set.paras[lines[cur]![0]])[lines[cur]![1]] : null} picking={picking}
              onPick={startPick} onRemove={() => setLines((l) => l.map((x, i) => (i === cur ? null : x)))} />}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" onClick={() => setAns((a) => a.map((x, i) => (i === cur ? null : x)))} disabled={ans[cur] === null}>Clear</Button>
                <Button variant="ghost" size="sm" aria-pressed={marked[cur]} onClick={() => setMarked((m) => m.map((x, i) => (i === cur ? !x : x)))}>{marked[cur] ? "Unmark" : "Mark for review"}</Button>
                <NotSure on={unsure[cur]} onChange={(v) => setUnsure((u) => u.map((x, i) => (i === cur ? v : x)))} />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={cur === 0} onClick={() => setCur(cur - 1)}>Previous</Button>
                {cur < n - 1 ? <Button size="sm" onClick={() => setCur(cur + 1)}>Next</Button> : <Button size="sm" onClick={() => setConfirming(true)}>Submit set</Button>}
              </div>
            </div>
          </div>
        </>
      </Split>

      {pane === "p" && <PaneJump onClick={() => { jumpToQuestion.current = true; setPane("q"); }}>Question {cur + 1} of {n}</PaneJump>}

      <Confirm open={confirming} onOpenChange={setConfirming} title="Submit this set?" action="Submit set" onAction={submit}>
        {blanks ? `${blanks} question${blanks > 1 ? "s are" : " is"} unanswered. Blanks score 0; wrong answers cost 1 mark.` : "All questions answered."}
      </Confirm>
      <Confirm open={confirmRestart} onOpenChange={setConfirmRestart} title="Start a new attempt?" action="Start over" onAction={restart} cancel="Keep this attempt" danger actionClassName="!text-white dark:!text-black">
        This clears your saved answers and elapsed time for this set.
      </Confirm>
      <Confirm open={leave.open} onOpenChange={leave.onOpenChange} title="Leave this practice?" action="Leave practice" onAction={leave.onLeave} cancel="Keep practicing" danger actionClassName="!text-white dark:!text-black">
        Your answers, current question and elapsed time are saved. The timer pauses while you are away. Back within 30 minutes, you carry on; after longer, you choose to start fresh or carry on with this set's time not counted. Unfinished sets keep for a day.
      </Confirm>
    </Page>
  );
}

function Review({ set, attempt }: { set: RcSet; attempt: RcAttempt }) {
  if (rcStale(attempt)) return <StaleReview set={set} attempt={attempt} />;
  return <FullReview set={set} attempt={attempt} />;
}

/** The set was rewritten after this attempt: the old answers would point at new questions, so only the score is shown. */
function StaleReview({ set, attempt }: { set: RcSet; attempt: RcAttempt }) {
  const [seed] = useState(uid);
  const skipped = attempt.ans.filter((a) => a === null).length;
  return (
    <Page className="gap-6 lg:gap-8">
      <PlayerBar kicker={`Review, ${GENRES[set.genre].toLowerCase()}, ${set.difficulty}`} title={set.title}>
        <LinkButton to="/practice" variant="secondary" size="sm">Back to Practice</LinkButton>
      </PlayerBar>
      <ScoreCard score={(3 * attempt.c - attempt.w > 0 ? "+" : "") + (3 * attempt.c - attempt.w)} parts={[["Correct", attempt.c], ["Wrong", attempt.w], ["Skipped", skipped], ["Time", fmtSecs(attempt.secs)]]}>
        <p className="measure text-base">This set was rewritten after you took it on {mediumDate(attempt.d)}, so your old answers no longer match its questions. Your score stays in Progress.</p>
        <div><LinkButton to={`/practice/rc/${set.id}?n=${seed}`}>Take the new version</LinkButton></div>
      </ScoreCard>
    </Page>
  );
}

function FullReview({ set, attempt }: { set: RcSet; attempt: RcAttempt }) {
  const n = set.questions.length;
  const { start, el } = useStartQuestion(n);
  const [cur, setCur] = useState(start);
  const [pane, setPane] = useState<"p" | "q">("q");
  const ans = attempt.ans;
  return (
    <Page className="gap-6 lg:gap-8">
      <PlayerBar kicker={`Review, ${GENRES[set.genre].toLowerCase()}, ${set.difficulty}`} title={set.title}>
        <LinkButton to="/practice" variant="secondary" size="sm">Back to Practice</LinkButton>
      </PlayerBar>

      <Summary set={set} attempt={attempt} />
      <SummaryReview set={set} attempt={attempt} />

      <div ref={el} className="scroll-mt-24"><PaneSwitch pane={pane} setPane={setPane} q={`Question ${cur + 1} of ${n}`} /></div>

      <Split pane={pane}>
        <Passage set={set} highlight={set.questions[cur].proof} wordMode
          lines={set.questions[cur].lines?.length ? { key: set.questions[cur].lines!.map((l) => findLine(set.paras, l)).filter((r): r is LineRef => r !== null), mine: attempt.lines?.[cur] ?? null } : undefined} />
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Questions">
            {set.questions.map((q, i) => {
              const s = ans[i] === null ? "blank" : ans[i] === q.answer ? "right" : "wrong";
              return <PaletteCell key={i} n={i + 1} state={s} current={i === cur} onClick={() => { setCur(i); setPane("q"); }} label={`Question ${i + 1}, ${s === "right" ? "correct" : s === "wrong" ? "wrong" : "skipped"}`} />;
            })}
          </div>
          <ReviewQuestion set={set} qi={cur} chosen={ans[cur]} att={attempt.id} mine={attempt.lines?.[cur] ?? null} />
          <QuestionNav cur={cur} n={n} onGo={setCur} />
        </>
      </Split>
      {pane === "p" && <PaneJump onClick={() => showQuestion(setPane)}>Question {cur + 1} of {n}</PaneJump>}
      <p className="text-sm text-muted-foreground">Tap any word in the passage, or type it below the passage, to save it to your Words. Passages and questions are original practice material written for this site.</p>
    </Page>
  );
}

/**
 * Prove it (F103) on the passage: `tap` turns each sentence into a button that marks it; `mine` is the student's line
 * (an accent tint while solving, an underline in review when it is not the deciding one); `key` are the deciding lines,
 * on the highlighter inside the paragraph that settles the question; `prompt` sits above the passage while picking.
 */
export interface PassageLines { tap?: (r: LineRef) => void; mine?: LineRef | null; key?: LineRef[]; prompt?: ReactNode }

/** Prove it under the options: mark the line that proves the answer; optional, and it never changes the score. */
function ProveIt({ line, picking, onPick, onRemove }: { line: string | null; picking: boolean; onPick: () => void; onRemove: () => void }) {
  if (picking) return <p className="text-base text-muted-foreground" role="status">Tap the line in the passage that proves your answer.</p>;
  if (!line) return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Button variant="secondary" size="sm" onClick={onPick}>Prove it: tap the line</Button>
      <span className="text-sm text-muted-foreground">Optional. It does not change your score.</span>
    </div>
  );
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-accent px-4 py-3 text-accent-foreground">
      <p className="text-base"><b className="font-semibold">Your line:</b> “{line}”</p>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={onPick}>Change</Button>
        <Button variant="ghost" size="sm" onClick={onRemove}>Remove</Button>
      </div>
    </div>
  );
}

/** One line in place of an AI button when the student is not signed in: the action sits in the sentence (as in reminders). */
function SignInForAi({ children }: { children: ReactNode }) {
  return (
    <p className="text-base text-muted-foreground">
      <button type="button" onClick={() => startSignIn(location.pathname + location.search)}
        className="font-medium text-primary underline underline-offset-4 decoration-primary/40 transition-colors hover:decoration-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none">Sign in with Google</button>{" "}
      {children}.
    </p>
  );
}

/**
 * F36: after the student ticks their own checks, AI judges the same four without seeing the ticks, quoting the
 * student's words. All four verdicts are shown, each with its line, in the checklist's order: showing only the
 * differences hid the notes whenever the two agreed (an empty checklist "agreed" with four misses). Where the AI and
 * the tick differ, the row says so; the ticks stay the student's to change.
 */
function SecondOpinion({ set, text, checks, onVerdicts, onRevised }: { set: RcSet; text: string; checks: boolean[]; onVerdicts: (ai: boolean[] | null) => void; onRevised: (text: string) => void }) {
  const ai = useAi();
  type Round = { text: string; v: SummaryVerdict[]; key: string };
  const [st, setSt] = useState<{ phase: "idle" | "busy" | "done" | "failed"; msg?: string; first?: Round; ticks?: boolean[]; flagged?: boolean }>({ phase: "idle" });
  if (ai === "none") return null;
  if (ai === "signin") return <SignInForAi>for a second opinion on your ticks from AI</SignInForAi>;
  const ask = async () => {
    setSt({ phase: "busy" });
    const r = await askVerdicts(set, text);
    if (typeof r === "string") { setSt({ phase: "failed", msg: r }); return; }
    // The ticks as they were when the student asked, so the list does not shift while they change a tick.
    setSt({ phase: "done", first: r, ticks: checks.slice() });
    onVerdicts(r.v.map((x) => x.ok));
  };
  if (st.phase === "idle" || st.phase === "busy") return (
    <div className="flex flex-col gap-1.5">
      <Button variant="secondary" className="self-start" onClick={ask} disabled={st.phase === "busy"}>{st.phase === "busy" ? "Checking…" : "Get a second opinion"}</Button>
      <p className="text-sm text-muted-foreground">AI checks the same four against the passage, without seeing your ticks.</p>
    </div>
  );
  if (st.phase === "failed") return <p className="text-base text-muted-foreground" role="status">{st.msg}</p>;
  const { first, ticks } = st as Required<typeof st>;
  const met = first.v.filter((x) => x.ok).length;
  const differ = first.v.filter((x, i) => x.ok !== ticks[i]).length;
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-lg bg-accent px-4 py-3.5 text-accent-foreground" aria-label="Second opinion">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-semibold">AI&rsquo;s verdict: {met} of 4 met.</h3>
          <p className="text-base">{differ === 0 ? "The same as your ticks." : `It differs from your ticks on ${differ === 1 ? "one check" : `${differ} checks`}, marked below.`}</p>
        </div>
        <Verdicts v={first.v} ticks={ticks} />
        <p className="flex flex-wrap items-center gap-x-3 text-sm opacity-80">
          <span>{differ ? "Change a tick above if it convinced you. " : ""}Written by AI; its quotes are checked against your summary.</span>
          {st.flagged ? <span>Thanks, noted.</span>
            : <button type="button" className="underline underline-offset-4" onClick={() => { void flagAi(first.key); setSt({ ...st, flagged: true }); }}>This is wrong</button>}
        </p>
      </section>
      {met < 4 && <Revise set={set} first={first} onRevised={onRevised} />}
    </div>
  );
}

/** One check of a summary with AI, as a round of verdicts, or the message to show instead. */
async function askVerdicts(set: RcSet, text: string): Promise<{ text: string; v: SummaryVerdict[]; key: string } | string> {
  const r = await checkSummary({ set: set.id, v: rcVersion(set), text });
  if (!r.ok) return r.message;
  const v = SUMMARY_CHECKS.map((c) => r.data.checks.find((x) => x.id === c.id));
  if (v.some((x) => !x)) return "The second opinion did not come through. Your own ticks still count.";
  return { text, v: v as SummaryVerdict[], key: r.data.key };
}

/** The four verdicts in the checklist's order; with ticks, rows where AI and the tick differ are marked. */
function Verdicts({ v, ticks }: { v: SummaryVerdict[]; ticks?: boolean[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {v.map((x, i) => (
        <li key={x.id} className="flex gap-2.5">
          {x.ok ? <Check className="mt-0.5 size-5 shrink-0 text-success" aria-hidden /> : <X className="mt-0.5 size-5 shrink-0" aria-hidden />}
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-base"><b className="font-semibold">{SUMMARY_SHORT[i]}: {x.ok ? "met" : "not yet"}.</b> {x.note}</p>
            {x.words && <p className="text-base">In yours: <q className="font-medium">{x.words}</q></p>}
            {ticks && x.ok !== ticks[i] && <p className="text-base font-medium"><mark className="hl text-foreground">{ticks[i] ? "You ticked this one." : "You left this one unticked."}</mark></p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * F36b: after the verdicts, one revision of the student's own summary, checked again; only if that still misses a
 * check, the smallest fix of their words, with the changes marked. Effort first, the smallest hint next; the whole
 * answer, the model summary, is already above.
 */
function Revise({ set, first, onRevised }: { set: RcSet; first: { text: string; v: SummaryVerdict[] }; onRevised: (text: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [round, setRound] = useState<{ phase: "busy" | "done" | "failed"; msg?: string; r?: { text: string; v: SummaryVerdict[]; key: string } } | null>(null);
  const n = words(draft ?? "");
  const same = draft !== null && draft.trim().replace(/\s+/g, " ").toLowerCase() === first.text.toLowerCase();
  const check = async () => {
    const t = draft!.trim().replace(/\s+/g, " ");
    setRound({ phase: "busy" });
    const r = await askVerdicts(set, t);
    if (typeof r === "string") { setRound({ phase: "failed", msg: r }); return; }
    setRound({ phase: "done", r });
    onRevised(t);
  };

  if (round?.phase === "done") {
    const r = round.r!, before = first.v.filter((x) => x.ok).length, now = r.v.filter((x) => x.ok).length;
    return (
      <section className="flex flex-col gap-3 rounded-lg bg-card px-4 py-3.5" aria-label="Your revision">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-semibold">Your revision: {now} of 4 met{now !== before ? `, up from ${before}` : ", as before"}.</h3>
          <p className="text-base text-muted-foreground"><q>{r.text}</q></p>
        </div>
        <Verdicts v={r.v} />
        {now < 4 ? <SmallestFix set={set} text={r.text} /> : <p className="text-base">All four met, in your own words.</p>}
      </section>
    );
  }
  if (draft === null) return (
    <div className="flex flex-col gap-1.5">
      <Button variant="secondary" className="self-start" onClick={() => setDraft(first.text)}>Revise yours</Button>
      <p className="text-sm text-muted-foreground">Fix what it flagged in your own words, then check again. Revising is where a summary gets better.</p>
    </div>
  );
  return (
    <section className="flex flex-col gap-2 rounded-lg bg-card px-4 py-3.5" aria-label="Revise your summary">
      <label className="flex flex-col gap-2">
        <span className="text-base font-semibold">Your summary, revised</span>
        <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} autoFocus className="min-h-24 bg-background text-base leading-relaxed" />
        <span className={cn("text-sm", n > SUMMARY_MAX_WORDS ? "font-medium text-warning" : "text-muted-foreground")} aria-live="polite">{n} of {SUMMARY_MAX_WORDS} words</span>
      </label>
      {round?.phase === "failed" && <p className="text-base text-muted-foreground" role="status">{round.msg}</p>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button variant="secondary" onClick={check} disabled={round?.phase === "busy" || n < 5 || n > SUMMARY_MAX_WORDS || same}>{round?.phase === "busy" ? "Checking…" : "Check again"}</Button>
        <Button variant="ghost" onClick={() => { setDraft(null); setRound(null); }}>Cancel</Button>
        {same && <span className="text-sm text-muted-foreground">Change something first.</span>}
      </div>
    </section>
  );
}

/** The fewest changes to the student's words that meet all four checks: struck words went, highlighted ones came in. */
function SmallestFix({ set, text }: { set: RcSet; text: string }) {
  const [f, setF] = useState<{ phase: "idle" | "busy" | "done" | "failed"; fix?: SummaryFix; msg?: string; flagged?: boolean }>({ phase: "idle" });
  const ask = async () => {
    setF({ phase: "busy" });
    const r = await fixSummary({ set: set.id, v: rcVersion(set), text });
    setF(r.ok ? { phase: "done", fix: r.data } : { phase: "failed", msg: r.message });
  };
  if (f.phase === "idle" || f.phase === "busy") return (
    <div className="flex flex-col gap-1.5 border-t pt-3">
      <Button variant="secondary" className="self-start" onClick={ask} disabled={f.phase === "busy"}>{f.phase === "busy" ? "Working…" : "Show the smallest fix"}</Button>
      <p className="text-sm text-muted-foreground">The fewest changes to your words that would meet all four.</p>
    </div>
  );
  if (f.phase === "failed") return <p className="text-base text-muted-foreground" role="status">{f.msg}</p>;
  const fix = f.fix!;
  if (fix.tooFar || !fix.fixed) return <p className="border-t pt-3 text-base">This is too far from the passage for a small fix. Start again from the model summary above, in your own words.</p>;
  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      <h4 className="text-base font-semibold">The smallest fix</h4>
      <p className="text-base leading-relaxed">
        {diffWords(text, fix.fixed).map((p, i) => (
          <span key={i}>{i > 0 && " "}{p.op === "same" ? p.t : p.op === "add" ? <mark className="hl text-foreground">{p.t}</mark>
            : <del className="text-muted-foreground decoration-1">{p.t}</del>}</span>
        ))}
      </p>
      <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
        <span>Highlighted words are added, struck ones removed. Written by AI.</span>
        {f.flagged ? <span>Thanks, noted.</span>
          : <button type="button" className="underline underline-offset-4" onClick={() => { void flagAi(fix.key); setF({ ...f, flagged: true }); }}>This is wrong</button>}
      </p>
    </div>
  );
}

/** The review's word on the student's line, and the deciding line itself (F103). */
function ProofVerdict({ set, q, mine }: { set: RcSet; q: RcQuestion; mine: LineRef | null }) {
  const deciding = (q.lines ?? []).join(" ");
  const v = mine ? lineVerdict(set.paras, q.lines ?? [], q.proof, mine) : null;
  const head = v === "proves" ? "That's the line." : v === "near" ? "Right paragraph." : v === "off" ? "That line doesn't settle it." : "The line that settles it:";
  return (
    <div className={cn("flex flex-col gap-1.5 rounded-lg px-4 py-3", v === "proves" ? "bg-success-soft" : "bg-muted")} role="note">
      <p className="text-base"><b className="font-semibold">{head}</b>{v === "proves" ? " You found what settles this question." : v ? " The deciding line, highlighted in the passage:" : ""}</p>
      {v !== "proves" && <p className="measure text-base">“{deciding}”</p>}
    </div>
  );
}

export function Passage({ set, highlight, wordMode, lines }: { set: RcSet; highlight: number[]; wordMode: boolean; lines?: PassageLines }) {
  const [pick, setPick] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const onClick = (e: MouseEvent) => {
    const w = (e.target as HTMLElement).dataset?.w;
    if (w) setPick(w);
  };
  const word = typed.trim().replace(/[^A-Za-z'-]/g, "");
  const tokens = (text: string) => wordMode ? text.split(/(\s+)/).map((tok, k) => {
    const clean = tok.replace(/^[^A-Za-z]+|[^A-Za-z'-]+$/g, "").replace(/'s$/, "");
    return clean.length >= 3 && /^[A-Za-z][A-Za-z'-]*$/.test(clean) && !COMMON.has(clean.toLowerCase())
      ? <span key={k} className="cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground" data-w={clean}>{tok}</span> : tok;
  }) : text;
  const same = (a: LineRef | null | undefined, pi: number, si: number) => !!a && a[0] === pi && a[1] === si;
  const line = (text: string, pi: number, si: number) => {
    const isKey = !!lines?.key?.some((r) => same(r, pi, si)), isMine = same(lines?.mine, pi, si);
    const cls = cn("rounded-sm box-decoration-clone",
      isKey && "bg-highlight/70 text-foreground dark:bg-highlight/45",
      isMine && !lines?.key && "bg-accent text-accent-foreground",
      isMine && lines?.key && !isKey && "underline decoration-primary decoration-2 underline-offset-[5px]");
    // A span, not a button: browsers draw a button as a block of its own, and a line must flow inside its paragraph.
    return lines?.tap
      ? <span key={si} role="button" tabIndex={0} onClick={() => lines.tap!([pi, si])}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); lines.tap!([pi, si]); } }}
          className={cn(cls, "cursor-pointer transition-colors hover:bg-primary/12 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none")}>{text}</span>
      : <span key={si} className={cls}>{tokens(text)}</span>;
  };
  return (
    <>
      {lines?.prompt && <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg bg-accent px-4 py-2.5 text-base text-accent-foreground" role="status">{lines.prompt}</div>}
      <article className="flex flex-col gap-4 rounded-lg bg-card px-5 py-5 sm:px-7 sm:py-6" aria-label="Passage" onClick={wordMode ? onClick : undefined}>
        {set.paras.map((p, i) => (
          <p key={i} className={cn("text-reading", highlight.includes(i) && "-mx-3 rounded-md bg-highlight-soft px-3 py-1")}>
            {lines ? sentences(p).flatMap((x, k) => (k ? [" ", line(x, i, k)] : [line(x, i, k)])) : tokens(p)}
          </p>
        ))}
        <p className="text-sm text-muted-foreground">{setWords(set)} words</p>
      </article>
      {/* Tapping a word needs a pointer; typing it works from the keyboard too. */}
      {wordMode && (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (word) { setPick(word); setTyped(""); } }}>
          <Field label="Save a word from the passage" className="min-w-48 flex-1">
            <Input name="word" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} placeholder="ostensibly…" />
          </Field>
          <Button type="submit" variant="secondary" disabled={!word}>Save word</Button>
        </form>
      )}
      <WordSheet word={pick} source={set.title} onClose={() => setPick(null)} />
    </>
  );
}

function WordSheet({ word, source, onClose }: { word: string | null; source: string; onClose: () => void }) {
  const { state, update } = useStore();
  const [meaning, setMeaning] = useState("");
  const w = (word ?? "").toLowerCase();
  const exists = state.vocab.some((v) => v.w.toLowerCase() === w);
  const add = () => {
    if (!meaning.trim()) return;
    update((st) => { st.vocab.push({ id: uid(), w, m: meaning.trim(), s: source, b: 0, due: todayIso() }); });
    toast(`Added “${w}” to Words. It is due for review today.`);
    setMeaning("");
    onClose();
  };
  return (
    <Sheet open={!!word} onOpenChange={(o) => { if (!o) { setMeaning(""); onClose(); } }}>
      <SheetContent side="bottom" className="mx-auto max-w-2xl gap-4 rounded-t-xl bg-card px-5 pt-6 pb-8">
        <SheetTitle className="font-serif text-title font-semibold">{w}</SheetTitle>
        <SheetDescription className="sr-only">Save this word with a meaning in your own words.</SheetDescription>
        {exists ? <p className="text-base text-muted-foreground">Already in your Words.</p> : (
          <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
            {/* The sheet exists to take this one answer, so the field gets focus. */}
            <Input aria-label="Meaning" name="meaning" autoComplete="off" placeholder="Meaning in your own words…" value={meaning} onChange={(e) => setMeaning(e.target.value)} className="min-w-56 flex-1" autoFocus />
            <Button type="submit" disabled={!meaning.trim()}>Add to Words</Button>
          </form>
        )}
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <TextLink to={"https://www.google.com/search?q=define+" + encodeURIComponent(w)}>Look up the meaning</TextLink>
          <TextLink to={"https://www.etymonline.com/search?q=" + encodeURIComponent(w)}>Etymonline</TextLink>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function ReviewQuestion({ set, qi, chosen, att, mine = null }: { set: RcSet; qi: number; chosen: number | null; att?: string; mine?: LineRef | null }) {
  const { state, update } = useStore();
  const q = set.questions[qi];
  const ok = chosen === q.answer;
  const inLog = state.errors.some((e) => e.src === rcErrorSrc(set, qi));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Question {qi + 1}, {RC_QTYPE[q.type].label.toLowerCase()}</span>
        <Badge variant={ok ? "success" : chosen === null ? "secondary" : "danger"}>{ok ? "Correct, +3" : chosen === null ? "Skipped, 0" : "Wrong, −1"}</Badge>
      </div>
      <p className="text-lg leading-snug font-semibold">{q.stem}</p>
      <ul className="flex flex-col gap-2.5">
        {q.options.map((o, i) => (
          <ReviewChoice key={i} mark={LETTERS[i]} state={i === q.answer ? "right" : i === chosen ? "wrong" : "plain"} why={o.why}
            tags={<>{i === q.answer && <Badge variant="success">Answer</Badge>}{i === chosen && i !== q.answer && <Badge variant="danger">Your pick</Badge>}{o.trap && <Badge variant="secondary">{o.trap}</Badge>}</>}>
            {o.t}
          </ReviewChoice>
        ))}
      </ul>
      {q.lines?.length ? <ProofVerdict set={set} q={q} mine={mine} />
        : <p className="text-sm text-muted-foreground">The highlighted paragraph{q.proof.length > 1 ? "s settle" : " settles"} this question.</p>}
      {!ok && (inLog
        ? <ErrorCause src={rcErrorSrc(set, qi)} />
        : <Button variant="secondary" size="sm" className="self-start" onClick={() => { update((st) => { st.errors.push(rcError(set, qi, chosen, todayIso(), false, att)); }); toast("Added to your Error log."); }}>Add to Error log</Button>)}
      <ReportLink what={`${set.title}, Q${qi + 1} (${set.id})`} item={`rc:${set.id}:${qi}`} />
    </div>
  );
}

function Summary({ set, attempt }: { set: RcSet; attempt: RcAttempt }) {
  const { state, update } = useStore();
  const [seed] = useState(uid);
  const s = scoreRc(set, attempt.ans);
  const wrongIdx = set.questions.map((_, i) => i).filter((i) => attempt.ans[i] !== set.questions[i].answer);
  const missing = wrongIdx.filter((i) => !state.errors.some((e) => e.src === rcErrorSrc(set, i)));
  const next = useMemo(() => {
    const tried = new Set(state.rcAttempts.map((a) => a.set));
    const i = RC_CATALOG.findIndex((x) => x.id === set.id);
    return [...RC_CATALOG.slice(i + 1), ...RC_CATALOG.slice(0, i)].find((x) => !tried.has(x.id)) ?? RC_CATALOG[(i + 1) % RC_CATALOG.length];
  }, [state.rcAttempts, set.id]);
  const wpm = !attempt.away && attempt.first >= 30 ? Math.round(setWords(set) / (attempt.first / 60)) : null;
  const marks = (attempt.lines ?? []).map((m, qi) => (m && set.questions[qi]?.lines?.length ? lineVerdict(set.paras, set.questions[qi].lines!, set.questions[qi].proof, m) : null)).filter((v) => v !== null);
  const proved = marks.length ? { marked: marks.length, found: marks.filter((v) => v === "proves").length } : null;
  const parts: [string, React.ReactNode][] = [["Correct", s.c], ["Wrong", s.w], ["Skipped", s.skipped], ["Time", timeShown(attempt)]];
  if (wpm) parts.push(["Reading pace", `${wpm} wpm`]);
  return (
    <ScoreCard score={(s.marks > 0 ? "+" : "") + s.marks} of={3 * set.questions.length} parts={parts}>
      <BreakNote away={attempt.away} />
      <p className="text-base text-muted-foreground">Attempted {mediumDate(attempt.d)}. Logged in Progress as an RC practice set. Each wrong option shows its trap: the reason it looked right.</p>
      {proved && <p className="text-base"><b className="font-semibold">Lines: {proved.found} of {proved.marked}</b> <span className="text-muted-foreground">of the lines you marked are the ones that settle their questions.</span></p>}
      <div className="flex flex-wrap gap-3">
        {missing.length > 0 && <Button onClick={() => { update((st) => { missing.forEach((i) => st.errors.push(rcError(set, i, attempt.ans[i], todayIso(), !!attempt.unsure?.includes(i), attempt.id))); }); toast(`Added ${missing.length} to your Error log.`); }}>Add {missing.length} to Error log</Button>}
        <Button asChild variant="secondary" className="h-auto min-h-10 max-w-full shrink whitespace-normal py-2 text-left"><Link to={`/practice/rc/${next.id}`}>Next set: {next.title}</Link></Button>
        <Button asChild variant="ghost"><Link to={`/practice/rc/${set.id}?n=${seed}`}>Retake</Link></Button>
      </div>
    </ScoreCard>
  );
}
