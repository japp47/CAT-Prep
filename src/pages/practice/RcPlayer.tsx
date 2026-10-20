import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
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
import { recordRcSummary, summaryFor, summaryScore } from "../../practice/summary";
import { GENRES, RC_QTYPE, setWords, SUMMARY_MAX_WORDS, words, type RcSet, type RcSummary } from "../../practice/types";
import NotFound from "../NotFound";
import { Choice, ChoiceGroup, Confirm, ElapsedTimer, PaletteCell, PlayerBar, ReportLink, ReviewChoice, ScoreCard, useLeaveConfirmation } from "./common";

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
export function PaneSwitch({ pane, setPane, q }: { pane: "p" | "q"; setPane: (p: "p" | "q") => void; q: string }) {
  return (
    <ToggleGroup type="single" value={pane} onValueChange={(v) => v && setPane(v as "p" | "q")} className="w-full rounded-lg bg-secondary p-1 lg:hidden" aria-label="Show">
      <ToggleGroupItem value="p" className="h-10 flex-1 rounded-md text-base data-[state=on]:bg-card data-[state=on]:font-semibold">Passage</ToggleGroupItem>
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

interface RcDraft { ans: (number | null)[]; marked: boolean[]; cur: number; secs: number; first: number | null }

/** One RC set: answering it, then reviewing it on the same page. */
function Player({ set, reviewId }: { set: RcSet; reviewId: string | null }) {
  const { state } = useStore();
  // Right after a submit, a set with a model summary asks for the student's own first: the main-idea answer would give it away.
  // The pending step is kept as a draft, so a reload or a phone switching apps comes back to it instead of a fresh set.
  const pendingKey = "sumfor:" + set.id;
  const [pending] = useState(() => { const id = readDraft<string>(pendingKey); return !reviewId && id && state.rcAttempts.some((a) => a.id === id) ? id : null; });
  const [attemptId, setAttemptId] = useState<string | null>(() => pending ?? (reviewId && state.rcAttempts.some((a) => a.id === reviewId && a.set === set.id) ? reviewId : null));
  const [writing, setWriting] = useState(!!pending);
  const attempt = attemptId ? state.rcAttempts.find((a) => a.id === attemptId) : undefined;
  useEffect(() => { window.scrollTo(0, 0); }, [attemptId, writing]);
  if (attempt && writing && set.summary) return <SummaryStep set={set} model={set.summary} attempt={attempt} onDone={() => { writeDraft(pendingKey, null); setWriting(false); }} />;
  return attempt ? <Review set={set} attempt={attempt} /> : <Attempt set={set} onDone={(id) => { setAttemptId(id); if (set.summary) { writeDraft(pendingKey, id); setWriting(true); } }} />;
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
  const [pane, setPane] = useState<"p" | "q">("q");
  const [id] = useState(uid);
  useEffect(() => { if (!comparing) writeDraft(key, text.trim() || tone ? ({ text, tone } satisfies SummaryDraft) : null); }, [key, text, tone, comparing]);
  const n = words(text);
  const s = scoreRc(set, attempt.ans);
  const compare = () => { setComparing(true); setPane("q"); window.scrollTo(0, 0); };
  const finish = (save: boolean) => {
    writeDraft(key, null);
    if (save) update((st) => { if (!summaryFor(st, attempt.id)) recordRcSummary(st, id, set, attempt.id, text, tone, checks, todayIso(), Date.now()); });
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
        {mine ? <SummaryPair text={mine.text} tone={mine.tone} model={set.summary} /> : (
          <div className="flex flex-col gap-1.5">
            <ModelSummary s={set.summary} />
            <p className="text-sm text-muted-foreground">Tone: {set.summary.tone}. The highlighted words are the claim and the qualifier a good summary keeps.</p>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function Attempt({ set, onDone }: { set: RcSet; onDone: (id: string) => void }) {
  const { update } = useStore();
  const { run } = useFocus();
  const leave = useLeaveConfirmation(true);
  const n = set.questions.length;
  const draftKey = "rc:" + set.id;
  const [saved] = useState(() => { const d = readDraft<RcDraft>(draftKey); return d && d.ans?.length === n ? d : null; });
  const [resumed, setResumed] = useState(!!saved);
  const [ans, setAns] = useState<(number | null)[]>(saved?.ans ?? Array(n).fill(null));
  const [marked, setMarked] = useState<boolean[]>(saved?.marked ?? Array(n).fill(false));
  const [cur, setCur] = useState(saved?.cur ?? 0);
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
  const draft: RcDraft = { ans, marked, cur, secs: (Date.now() - startAt) / 1000, first };
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // Persist once per state change; pagehide and unmount flush the latest snapshot.
  useEffect(() => {
    if (!submitted.current) writeDraft(draftKey, { ans, marked, cur, secs: (Date.now() - startAt) / 1000, first } satisfies RcDraft);
  }, [draftKey, ans, marked, cur, startAt, first]);
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
    setCur(0);
    firstAt.current = null;
    setStartAt(Date.now());
    setResumed(false);
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
    update((st) => recordRc(st, id, set, ans, secs, first, mode, today));
    setConfirming(false);
    onDone(id);
  };
  const blanks = ans.filter((a) => a === null).length;
  const go = (i: number) => { setCur(i); setPane("q"); };
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
        <Button size="sm" onClick={() => setConfirming(true)}>Submit set</Button>
      </PlayerBar>
      {resumed && saved && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">Your saved answers are back. The timer paused while you were away ({fmtSecs(saved.secs)} elapsed).</p>
        <Button variant="ghost" size="sm" onClick={() => setConfirmRestart(true)}>Start over</Button>
      </div>}

      <PaneSwitch pane={pane} setPane={setPane} q={`Question ${cur + 1} of ${n}`} />

      <Split pane={pane}>
        <>
          <Passage set={set} highlight={[]} wordMode={false} />
          <div className={cn("lg:hidden", run ? "h-40" : "h-20")} aria-hidden />
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
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" onClick={() => setAns((a) => a.map((x, i) => (i === cur ? null : x)))} disabled={ans[cur] === null}>Clear</Button>
                <Button variant="ghost" size="sm" aria-pressed={marked[cur]} onClick={() => setMarked((m) => m.map((x, i) => (i === cur ? !x : x)))}>{marked[cur] ? "Unmark" : "Mark for review"}</Button>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={cur === 0} onClick={() => setCur(cur - 1)}>Previous</Button>
                {cur < n - 1 ? <Button size="sm" onClick={() => setCur(cur + 1)}>Next</Button> : <Button size="sm" onClick={() => setConfirming(true)}>Submit set</Button>}
              </div>
            </div>
          </div>
        </>
      </Split>

      {pane === "p" && (
        <div className={cn(
          "fixed inset-x-0 z-30 bg-background/95 px-gutter py-3 backdrop-blur-sm lg:hidden",
          run ? "bottom-[calc(15rem+env(safe-area-inset-bottom))]" : "bottom-[calc(4rem+env(safe-area-inset-bottom))]",
        )}>
          <Button className="w-full" onClick={() => { jumpToQuestion.current = true; setPane("q"); }}>
            Question {cur + 1} of {n}
            <ArrowRight aria-hidden />
          </Button>
        </div>
      )}

      <Confirm open={confirming} onOpenChange={setConfirming} title="Submit this set?" action="Submit set" onAction={submit}>
        {blanks ? `${blanks} question${blanks > 1 ? "s are" : " is"} unanswered. Blanks score 0; wrong answers cost 1 mark.` : "All questions answered."}
      </Confirm>
      <Confirm open={confirmRestart} onOpenChange={setConfirmRestart} title="Start a new attempt?" action="Start over" onAction={restart} cancel="Keep this attempt" danger actionClassName="!text-white dark:!text-black">
        This clears your saved answers and elapsed time for this set.
      </Confirm>
      <Confirm open={leave.open} onOpenChange={leave.onOpenChange} title="Leave this practice?" action="Leave practice" onAction={leave.onLeave} cancel="Keep practicing" danger actionClassName="!text-white dark:!text-black">
        Your answers, current question and elapsed time are saved. The timer pauses while you are away. Return within 24 hours to resume.
      </Confirm>
    </Page>
  );
}

function Review({ set, attempt }: { set: RcSet; attempt: RcAttempt }) {
  const n = set.questions.length;
  const [cur, setCur] = useState(0);
  const [pane, setPane] = useState<"p" | "q">("q");
  const ans = attempt.ans;
  return (
    <Page className="gap-6 lg:gap-8">
      <PlayerBar kicker={`Review, ${GENRES[set.genre].toLowerCase()}, ${set.difficulty}`} title={set.title}>
        <LinkButton to="/practice" variant="secondary" size="sm">Back to Practice</LinkButton>
      </PlayerBar>

      <Summary set={set} attempt={attempt} />
      <SummaryReview set={set} attempt={attempt} />

      <PaneSwitch pane={pane} setPane={setPane} q={`Question ${cur + 1} of ${n}`} />

      <Split pane={pane}>
        <Passage set={set} highlight={set.questions[cur].proof} wordMode />
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Questions">
            {set.questions.map((q, i) => {
              const s = ans[i] === null ? "blank" : ans[i] === q.answer ? "right" : "wrong";
              return <PaletteCell key={i} n={i + 1} state={s} current={i === cur} onClick={() => { setCur(i); setPane("q"); }} label={`Question ${i + 1}, ${s === "right" ? "correct" : s === "wrong" ? "wrong" : "skipped"}`} />;
            })}
          </div>
          <ReviewQuestion set={set} qi={cur} chosen={ans[cur]} />
          <div className="flex justify-between gap-2">
            <Button variant="secondary" size="sm" disabled={cur === 0} onClick={() => setCur(cur - 1)}>Previous question</Button>
            <Button variant="secondary" size="sm" disabled={cur === n - 1} onClick={() => setCur(cur + 1)}>Next question</Button>
          </div>
        </>
      </Split>
      <p className="text-sm text-muted-foreground">Tap any word in the passage, or type it below the passage, to save it to your Words. Passages and questions are original practice material written for this site.</p>
    </Page>
  );
}

export function Passage({ set, highlight, wordMode }: { set: RcSet; highlight: number[]; wordMode: boolean }) {
  const [pick, setPick] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const onClick = (e: MouseEvent) => {
    const w = (e.target as HTMLElement).dataset?.w;
    if (w) setPick(w);
  };
  const word = typed.trim().replace(/[^A-Za-z'-]/g, "");
  return (
    <>
      <article className="flex flex-col gap-4 rounded-lg bg-card px-5 py-5 sm:px-7 sm:py-6" aria-label="Passage" onClick={wordMode ? onClick : undefined}>
        {set.paras.map((p, i) => (
          <p key={i} className={cn("text-reading", highlight.includes(i) && "-mx-3 rounded-md bg-highlight-soft px-3 py-1")}>
            {wordMode ? p.split(/(\s+)/).map((tok, k) => {
              const clean = tok.replace(/^[^A-Za-z]+|[^A-Za-z'-]+$/g, "").replace(/'s$/, "");
              return clean.length >= 3 && /^[A-Za-z][A-Za-z'-]*$/.test(clean) && !COMMON.has(clean.toLowerCase())
                ? <span key={k} className="cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground" data-w={clean}>{tok}</span> : tok;
            }) : p}
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

export function ReviewQuestion({ set, qi, chosen }: { set: RcSet; qi: number; chosen: number | null }) {
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
      <p className="text-sm text-muted-foreground">The highlighted paragraph{q.proof.length > 1 ? "s settle" : " settles"} this question.</p>
      {!ok && (inLog
        ? <p className="text-base text-success">In your Error log.</p>
        : <Button variant="secondary" size="sm" className="self-start" onClick={() => { update((st) => { st.errors.push(rcError(set, qi, chosen, todayIso())); }); toast("Added to your Error log."); }}>Add to Error log</Button>)}
      <ReportLink what={`${set.title}, Q${qi + 1} (${set.id})`} />
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
  const wpm = attempt.first >= 30 ? Math.round(setWords(set) / (attempt.first / 60)) : null;
  const parts: [string, React.ReactNode][] = [["Correct", s.c], ["Wrong", s.w], ["Skipped", s.skipped], ["Time", fmtSecs(attempt.secs)]];
  if (wpm) parts.push(["Reading pace", `${wpm} wpm`]);
  return (
    <ScoreCard score={(s.marks > 0 ? "+" : "") + s.marks} of={3 * set.questions.length} parts={parts}>
      <p className="text-base text-muted-foreground">Attempted {mediumDate(attempt.d)}. Logged in Progress as an RC practice set. Each wrong option shows its trap: the reason it looked right.</p>
      <div className="flex flex-wrap gap-3">
        {missing.length > 0 && <Button onClick={() => { update((st) => { missing.forEach((i) => st.errors.push(rcError(set, i, attempt.ans[i], todayIso()))); }); toast(`Added ${missing.length} to your Error log.`); }}>Add {missing.length} to Error log</Button>}
        <Button asChild variant="secondary"><Link to={`/practice/rc/${next.id}`}>Next set: {next.title}</Link></Button>
        <Button asChild variant="ghost"><Link to={`/practice/rc/${set.id}?n=${seed}`}>Retake</Link></Button>
      </div>
    </ScoreCard>
  );
}
