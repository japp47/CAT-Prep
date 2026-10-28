import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { shortDate, todayIso } from "../../lib/date";
import { ContentGate } from "../../components/Content";
import { Empty, LinkButton, Page, PageHeader, Section, Stat } from "../../components/kit";
import { useStore } from "../../lib/store";
import type { Content } from "../../practice/content";
import { lrRight } from "../../practice/lrcheck";
import { LETTERS, recordRedoAnswer } from "../../practice/record";
import { answerRedo, dueRedo, groupBySet, lrRedoLabel, REDO_GAPS, REDO_PER_SESSION, redoKeyExists, redoNeed, redoNow, redoPracticeType, redoSection, resolveRedo, upcomingRedo, type RedoRef } from "../../practice/redo";
import { lastMistake } from "../../practice/errorlink";
import { CAUSES } from "../../data/traps";
import { CR_TYPE, RC_QTYPE } from "../../practice/types";
import { cleanAnswer, scoreItem, VA_KIND } from "../../practice/va/build";
import { Choice, ChoiceGroup, Confirm, useLeaveConfirmation } from "./common";
import { CrQuestion, CrReview } from "./CrPlayer";
import { PaneJump, PaneSwitch, Passage, ReviewQuestion, showQuestion, Split } from "./RcPlayer";
import { ItemInput, ItemReview } from "./VaPlayer";
import { ReviewQuestion as LrReview, SetText } from "./LrPlayer";

const HOW = `Every question you get wrong or skip in Practice comes back here after ${REDO_GAPS[0]} day; an LR question comes back with its whole set, and the questions of one set come together. Get it right and it returns after ${REDO_GAPS[1]} days, then ${REDO_GAPS[2]}. Right ${REDO_GAPS.length} times in a row and it leaves the queue. A miss starts it again from tomorrow.`;

export default function Redo() {
  const { state, update } = useStore();
  const today = todayIso();
  // "Try it again" from the Error log opens one question (?k=), or a filtered list (?k=a,b,c), back in the queue and due today.
  const [sp] = useSearchParams();
  const only = (sp.get("k") ?? "").split(",").filter(redoKeyExists).slice(0, 20).join(",");
  useEffect(() => { if (only) update((st) => only.split(",").forEach((k) => redoNow(st, k, today))); }, [only, today, update]);
  // Fix the session's list when the page opens, so answering does not reshuffle it.
  const [session, setSession] = useState(() => groupBySet(only ? only.split(",") : dueRedo(state.redo, today).slice(0, REDO_PER_SESSION).map((r) => r.k)));
  const [pos, setPos] = useState(0);
  const [results, setResults] = useState<{ ok: boolean; cleared: boolean }[]>([]);
  const dueNow = dueRedo(state.redo, today);
  const open = state.redo.filter((r) => !r.cleared);
  const cleared = state.redo.length - open.length;
  const upcoming = upcomingRedo(state.redo, today);

  const restart = () => { setSession(groupBySet(dueNow.slice(0, REDO_PER_SESSION).map((r) => r.k))); setPos(0); setResults([]); };

  return (
    <Page>
      <PageHeader title="Redo queue" back={{ to: "/practice", label: "Practice" }}>{HOW}</PageHeader>

      {session.length === 0 ? (
        <Empty action={<LinkButton to="/practice">Go to Practice</LinkButton>}>
          <b className="block text-heading font-semibold text-foreground">{open.length ? "Nothing due today" : "Your queue is empty"}</b>
          {open.length ? "Come back on the next date below." : "Questions you miss in RC sets, VA drills, critical reasoning drills and LR sets will appear here the next day."}
        </Empty>
      ) : pos >= session.length ? (
        <div className="flex flex-col gap-4 rounded-lg bg-card p-6">
          <h2 className="text-heading font-semibold">{results.filter((r) => r.ok).length} of {results.length} right{results.some((r) => r.cleared) ? `, ${results.filter((r) => r.cleared).length} cleared from the queue` : ""}</h2>
          <p className="text-base text-muted-foreground">Missed ones come back tomorrow. Right ones come back later, until they stick.</p>
          <div className="flex flex-wrap gap-3">
            {dueNow.length > 0 && <Button onClick={restart}>Keep going: {dueNow.length} more due</Button>}
            <LinkButton to="/practice" variant={dueNow.length ? "secondary" : "default"}>Back to Practice</LinkButton>
          </div>
        </div>
      ) : (
        <ContentGate inline need={redoNeed(session)}>
          {(c) => (
            <RedoQuestion key={session[pos]} c={c} k={session[pos]} n={pos + 1} of={session.length}
              onAnswered={(ok, done) => setResults((r) => [...r, { ok, cleared: done }])} onNext={() => setPos((p) => p + 1)} />
          )}
        </ContentGate>
      )}

      <Section title="Your queue">
        <div className="flex flex-wrap gap-x-12 gap-y-4 rounded-lg bg-card p-5 sm:p-6">
          <Stat value={dueNow.length} label="Due today" />
          <Stat value={open.length} label="Open" />
          <Stat value={cleared} label="Cleared" />
        </div>
        {upcoming.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {upcoming.slice(0, 7).map(([d, c]) => <li key={d} className="rounded-md bg-card px-3 py-1.5 text-sm">{shortDate(d)}: <b className="font-semibold">{c}</b> question{c > 1 ? "s" : ""}</li>)}
          </ul>
        )}
      </Section>
    </Page>
  );
}

function RedoQuestion({ c, k, n, of, onAnswered, onNext }: { c: Content; k: string; n: number; of: number; onAnswered: (ok: boolean, cleared: boolean) => void; onNext: () => void }) {
  const { state, update } = useStore();
  const [result, setResult] = useState<{ ok: boolean; cleared: boolean; box: number; gaveUp: boolean } | null>(null);
  const leave = useLeaveConfirmation(result === null);
  const ref = resolveRedo(k, c);
  const [pick, setPick] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [pane, setPane] = useState<"p" | "q">("p");
  const item = state.redo.find((r) => r.k === k);
  if (!ref || !item) return null;
  const last = lastMistake(state, k);

  const check = (giveUp = false) => {
    const ok = !giveUp && (ref.kind === "rc" ? pick === ref.set.questions[ref.qi].answer : ref.kind === "cr" ? pick === ref.item.answer
      : ref.kind === "lr" ? lrRight(ref.set.questions[ref.qi], ref.set.questions[ref.qi].kind === "mcq" ? pick : typed.trim()) : scoreItem(ref.item, typed).ok);
    const d = todayIso();
    const box = ok ? item.box + 1 : 0;
    const cleared = ok && box >= REDO_GAPS.length;
    update((st) => { answerRedo(st, k, ok, d); recordRedoAnswer(st, redoPracticeType(ref), ok, d, redoSection(ref)); });
    setResult({ ok, cleared, box, gaveUp: giveUp });
    onAnswered(ok, cleared);
  };
  const answered = ref.kind === "va" ? !!cleanAnswer(typed) : ref.kind === "lr" && ref.set.questions[ref.qi].kind === "tita" ? typed.trim() !== "" : pick !== null;
  // Sits under the question, so on a wide screen it stays next to the options, not below the passage.
  const actions = result ? (
    <div className={cn("flex flex-col gap-3 rounded-lg p-5", result.ok ? "bg-success-soft" : "bg-card")} role="status">
      <p className="text-base"><b>{result.ok ? "Right." : "Not this time."}</b> {result.cleared ? "It leaves the queue." : result.ok ? `It comes back in ${REDO_GAPS[result.box]} days.` : "It comes back tomorrow."}</p>
      {last && <LastTime e={last} />}
      <div><Button onClick={onNext} autoFocus>{n < of ? "Next question" : "Finish"}</Button></div>
    </div>
  ) : (
    <div className="flex flex-wrap gap-3">
      <Button disabled={!answered} onClick={() => check()}>Check</Button>
      <Button variant="secondary" onClick={() => check(true)}>Show the answer</Button>
    </div>
  );
  const box = result ? result.box : item.box;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-base text-muted-foreground">Question {n} of {of}, {label(ref)}, missed {shortDate(item.added)}</span>
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          {REDO_GAPS.map((_, i) => <i key={i} className={cn("size-2 rounded-full", i < box ? "bg-primary" : "bg-secondary")} aria-hidden />)}
          <span className="ml-1">Right {box} of {REDO_GAPS.length} times in a row</span>
        </span>
      </div>

      {ref.kind === "rc" ? (
        <>
        <PaneSwitch pane={pane} setPane={setPane} q="Question" />
        <Split pane={pane}>
          <Passage set={ref.set} highlight={result ? ref.set.questions[ref.qi].proof : []} wordMode={false} />
          <>
            {result ? <ReviewQuestion set={ref.set} qi={ref.qi} chosen={result.gaveUp ? null : pick} /> : (
              <div className="flex flex-col gap-4">
                <Badge variant="secondary">{ref.set.title}</Badge>
                <p className="text-lg leading-snug font-semibold">{ref.set.questions[ref.qi].stem}</p>
                <ChoiceGroup label="Options">
                  {ref.set.questions[ref.qi].options.map((o, i) => <Choice key={i} mark={LETTERS[i]} checked={pick === i} onClick={() => setPick(i)}>{o.t}</Choice>)}
                </ChoiceGroup>
              </div>
            )}
            {actions}
          </>
        </Split>
        {pane === "p" && <PaneJump onClick={() => showQuestion(setPane)}>Question</PaneJump>}
        </>
      ) : ref.kind === "lr" ? (
        <LrRedo ref_={ref} pane={pane} setPane={setPane} pick={pick} setPick={setPick} typed={typed} setTyped={setTyped} result={result} actions={actions} />
      ) : ref.kind === "cr" ? (
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5">
          {result ? <CrReview item={ref.item} chosen={result.gaveUp ? null : pick} /> : <CrQuestion item={ref.item} pick={pick} setPick={setPick} />}
          {actions}
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5">
          {result ? <ItemReview item={ref.item} answer={result.gaveUp ? "" : typed} /> : <ItemInput item={ref.item} answer={typed} setAnswer={setTyped} />}
          {actions}
        </div>
      )}
      <Confirm open={leave.open} onOpenChange={leave.onOpenChange} title="Leave this question?" action="Leave question" onAction={leave.onLeave} cancel="Keep practicing" danger actionClassName="!text-white dark:!text-black">
        Your answer will be recorded when you check it. Leave now or stay and finish this question.
      </Confirm>
    </div>
  );
}

const label = (ref: RedoRef) => (ref.kind === "rc" ? "RC, " + RC_QTYPE[ref.set.questions[ref.qi].type].label.toLowerCase() : ref.kind === "cr" ? "critical reasoning, " + CR_TYPE[ref.item.type].label.toLowerCase() : ref.kind === "lr" ? lrRedoLabel(ref.set) : VA_KIND[ref.item.kind].label.toLowerCase());

/**
 * An LR question back from the queue: its whole set beside it, since a set question is solved from the set, and after
 * checking, the explanation with the clues that settle it and a way into the full walkthrough of the last attempt.
 */
function LrRedo({ ref_: ref, pane, setPane, pick, setPick, typed, setTyped, result, actions }: {
  ref_: Extract<RedoRef, { kind: "lr" }>; pane: "p" | "q"; setPane: (p: "p" | "q") => void; pick: number | null; setPick: (i: number) => void;
  typed: string; setTyped: (s: string) => void; result: { gaveUp: boolean } | null; actions: React.ReactNode;
}) {
  const { state } = useStore();
  const q = ref.set.questions[ref.qi];
  const whole = q.uses.length >= ref.set.clues.length;
  const att = state.lrAttempts.filter((a) => a.set === ref.set.id).pop();
  return (
    <>
      <PaneSwitch pane={pane} setPane={setPane} q="Question" p="Set" />
      <Split pane={pane}>
        <SetText set={ref.set} lit={result && !whole ? q.uses : []} />
        <>
          {result ? (
            <>
              <LrReview set={ref.set} qi={ref.qi} given={result.gaveUp ? null : q.kind === "mcq" ? pick : typed.trim()} att={att?.id ?? ""} whole={whole} />
              {att && <LinkButton to={`/practice/lr/${ref.set.id}?review=${att.id}`} variant="ghost" className="w-fit">See how the whole set is solved</LinkButton>}
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <Badge variant="secondary">{ref.set.title}</Badge>
              <p className="text-sm text-muted-foreground">Solve the set again from its clues, then answer. {q.kind === "mcq" ? "Choose one." : "Type the answer; a wrong typed answer costs nothing in CAT."}</p>
              <p className="text-lg leading-snug font-semibold whitespace-pre-line">{q.stem}</p>
              {q.kind === "mcq" ? (
                <ChoiceGroup label="Options">
                  {q.options!.map((o, i) => <Choice key={i} mark={LETTERS[i]} checked={pick === i} onClick={() => setPick(i)}>{o}</Choice>)}
                </ChoiceGroup>
              ) : (
                <Input aria-label="Your answer" autoComplete="off" spellCheck={false} inputMode={/^-?\d+(\.\d+)?$/.test(String(q.answer)) ? "decimal" : "text"}
                  className="w-44 bg-card text-lg font-semibold" value={typed} onChange={(e) => setTyped(e.target.value.slice(0, 20))} placeholder="Answer" />
              )}
            </div>
          )}
          {actions}
        </>
      </Split>
      {pane === "p" && <PaneJump onClick={() => showQuestion(setPane)}>Question</PaneJump>}
    </>
  );
}

/**
 * After a retry: what the Error log says about the last miss, next to today's answer, so the student sees whether
 * the same reasoning came back (docs/feature.md F52).
 */
function LastTime({ e }: { e: import("../../lib/state").ErrorEntry }) {
  return (
    <div className="flex flex-col gap-1 rounded-md bg-muted/60 px-4 py-3">
      <p className="text-sm text-muted-foreground">Last time, {shortDate(e.d)}{e.cause ? `, you noted: ${CAUSES[e.cause].toLowerCase()}` : ""}</p>
      {e.why && <p className="text-base">{e.why}</p>}
    </div>
  );
}
