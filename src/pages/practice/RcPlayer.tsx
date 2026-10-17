import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { mediumDate, todayIso, uid } from "../../lib/date";
import { usePref } from "../../lib/prefs";
import { useStore } from "../../lib/store";
import { ContentGate } from "../../components/Content";
import { LinkButton, Page, TextLink } from "../../components/kit";
import { RC_CATALOG } from "../../practice/catalog.gen";
import { rcOfDay } from "../../practice/daily";
import { fmtSecs, LETTERS, rcError, rcErrorSrc, recordRc, scoreRc } from "../../practice/record";
import { GENRES, RC_QTYPE, setWords, type RcSet } from "../../practice/types";
import NotFound from "../NotFound";
import { Choice, Confirm, PaletteCell, PlayerBar, ReportLink, ReviewChoice, ScoreCard, Timer, useElapsed } from "./common";

/** Words too common to be worth saving to flashcards. */
const COMMON = new Set("the and for are but not you all any can had her was one our out has him his how its may new now old see two way who did get let put say she too use that with have this will your from they know want been good much some time very when come here just like long make many more only over such take than them well were what which their there these those would could should about after other where while being because through between does into also each most even then upon whose".split(" "));

/** About seven minutes per RC is the CAT pace: 28 minutes for four passages. */
const TARGET_SECS = 7 * 60;

export default function RcPlayer() {
  return <ContentGate>{(c) => <RcRoute rcById={c.rcById} />}</ContentGate>;
}

function RcRoute({ rcById }: { rcById: (id: string) => RcSet | undefined }) {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const set = rcById(id === "today" ? rcOfDay(todayIso()).id : id ?? "");
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

function Player({ set, reviewId }: { set: RcSet; reviewId: string | null }) {
  const { state, update } = useStore();
  const navigate = useNavigate();
  const today = todayIso();
  const past = reviewId ? state.rcAttempts.find((a) => a.id === reviewId && a.set === set.id) : undefined;
  const n = set.questions.length;

  const [attemptId, setAttemptId] = useState<string | null>(past?.id ?? null);
  const [ans, setAns] = useState<(number | null)[]>(past ? past.ans : Array(n).fill(null));
  const [marked, setMarked] = useState<boolean[]>(Array(n).fill(false));
  const [cur, setCur] = useState(0);
  const [pane, setPane] = useState<"p" | "q">("p");
  const [confirming, setConfirming] = useState(false);
  const [hideTimer, setHideTimer] = usePref("rcHideTimer", false);
  const startAt = useRef(Date.now());
  const firstAt = useRef<number | null>(null);
  const reviewing = attemptId !== null;
  const elapsed = useElapsed(!reviewing, startAt.current);
  const attempt = attemptId ? state.rcAttempts.find((a) => a.id === attemptId) : undefined;

  useEffect(() => { window.scrollTo(0, 0); }, [reviewing]);

  const choose = (opt: number) => {
    if (reviewing) return;
    if (firstAt.current === null) firstAt.current = Date.now();
    setAns((a) => a.map((x, i) => (i === cur ? opt : x)));
  };
  const submit = () => {
    const secs = (Date.now() - startAt.current) / 1000;
    const first = firstAt.current ? (firstAt.current - startAt.current) / 1000 : secs;
    const mode = rcOfDay(today).id === set.id ? "daily" : "library";
    const newId = uid();
    update((st) => recordRc(st, newId, set, ans, secs, first, mode, today));
    setAttemptId(newId);
    setConfirming(false);
    setCur(0);
    setPane("q");
  };
  const blanks = ans.filter((a) => a === null).length;
  const go = (i: number) => { setCur(i); setPane("q"); };

  return (
    <Page className="gap-6 lg:gap-8">
      <PlayerBar kicker={`${reviewing ? "Review" : "RC practice"}, ${GENRES[set.genre].toLowerCase()}, ${set.difficulty}`} title={set.title}>
        {!reviewing && (hideTimer
          ? <Button variant="link" size="sm" onClick={() => setHideTimer(false)}>Show timer</Button>
          : <Timer over={elapsed > TARGET_SECS} onClick={() => setHideTimer(true)} title="Target 7 minutes. Tap to hide.">{fmtSecs(elapsed)} / 7:00</Timer>)}
        {!reviewing && <Button size="sm" onClick={() => setConfirming(true)}>Submit set</Button>}
        {reviewing && <LinkButton to="/practice" variant="secondary" size="sm">Back to Practice</LinkButton>}
      </PlayerBar>

      {reviewing && attempt && <Summary set={set} attempt={attempt} onRetake={() => navigate(`/practice/rc/${set.id}?n=${uid()}`)} />}

      <PaneSwitch pane={pane} setPane={setPane} q={`Question ${cur + 1} of ${n}`} />

      <Split pane={pane}>
        <Passage set={set} highlight={reviewing ? set.questions[cur].proof : []} wordMode={reviewing} />
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Questions">
            {set.questions.map((q, i) => {
              const s = reviewing ? (ans[i] === null ? "blank" : ans[i] === q.answer ? "right" : "wrong") : marked[i] ? (ans[i] !== null ? "doneMarked" : "marked") : ans[i] !== null ? "done" : "unseen";
              return <PaletteCell key={i} n={i + 1} state={s} current={i === cur} onClick={() => go(i)} label={`Question ${i + 1}, ${s === "right" ? "correct" : s === "wrong" ? "wrong" : s === "blank" ? "skipped" : ans[i] === null ? "not answered" : "answered"}${marked[i] && !reviewing ? ", marked" : ""}`} />;
            })}
          </div>
          {reviewing ? <ReviewQuestion set={set} qi={cur} chosen={ans[cur]} /> : (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">Question {cur + 1} of {n}</p>
              <p className="text-lg leading-snug font-semibold">{set.questions[cur].stem}</p>
              <div className="flex flex-col gap-2.5" role="radiogroup" aria-label={"Options for question " + (cur + 1)}>
                {set.questions[cur].options.map((o, i) => <Choice key={i} mark={LETTERS[i]} checked={ans[cur] === i} onClick={() => choose(i)}>{o.t}</Choice>)}
              </div>
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
          )}
          {reviewing && (
            <div className="flex justify-between gap-2">
              <Button variant="secondary" size="sm" disabled={cur === 0} onClick={() => setCur(cur - 1)}>Previous question</Button>
              <Button variant="secondary" size="sm" disabled={cur === n - 1} onClick={() => setCur(cur + 1)}>Next question</Button>
            </div>
          )}
        </>
      </Split>
      {reviewing && <p className="text-sm text-muted-foreground">Tap any word in the passage to save it to your Words. Passages and questions are original practice material written for this site.</p>}

      <Confirm open={confirming} onOpenChange={setConfirming} title="Submit this set?" action="Submit set" onAction={submit}>
        {blanks ? `${blanks} question${blanks > 1 ? "s are" : " is"} unanswered. Blanks score 0; wrong answers cost 1 mark.` : "All questions answered."}
      </Confirm>
    </Page>
  );
}

export function Passage({ set, highlight, wordMode }: { set: RcSet; highlight: number[]; wordMode: boolean }) {
  const [pick, setPick] = useState<string | null>(null);
  const onClick = (e: MouseEvent) => {
    const w = (e.target as HTMLElement).dataset?.w;
    if (w) setPick(w);
  };
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
    toast(`Added "${w}" to Words. It is due for review today.`);
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
            <Input aria-label="Meaning" placeholder="Meaning in your own words" value={meaning} onChange={(e) => setMeaning(e.target.value)} className="min-w-56 flex-1" autoFocus />
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

function Summary({ set, attempt, onRetake }: { set: RcSet; attempt: { id: string; d: string; ans: (number | null)[]; secs: number; first: number }; onRetake: () => void }) {
  const { state, update } = useStore();
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
        <Button variant="ghost" onClick={onRetake}>Retake</Button>
      </div>
    </ScoreCard>
  );
}
