import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { shortDate, todayIso } from "../../lib/date";
import { ContentGate } from "../../components/Content";
import { Empty, LinkButton, Page, PageHeader, Section, Stat } from "../../components/kit";
import { useStore } from "../../lib/store";
import type { Content } from "../../practice/content";
import { LETTERS, recordRedoAnswer } from "../../practice/record";
import { answerRedo, dueRedo, REDO_GAPS, REDO_PER_SESSION, redoPracticeType, resolveRedo, upcomingRedo, type RedoRef } from "../../practice/redo";
import { RC_QTYPE } from "../../practice/types";
import { cleanAnswer, scoreItem, VA_KIND } from "../../practice/va/build";
import { Choice } from "./common";
import { PaneSwitch, Passage, ReviewQuestion, Split } from "./RcPlayer";
import { ItemInput, ItemReview } from "./VaPlayer";

const HOW = `Every question you get wrong or skip in Practice comes back here after ${REDO_GAPS[0]} day. Get it right and it returns after ${REDO_GAPS[1]} days, then ${REDO_GAPS[2]}. Right ${REDO_GAPS.length} times in a row and it leaves the queue. A miss starts it again from tomorrow.`;

export default function Redo() {
  const { state } = useStore();
  const today = todayIso();
  // Fix the session's list when the page opens, so answering does not reshuffle it.
  const [session, setSession] = useState(() => dueRedo(state.redo, today).slice(0, REDO_PER_SESSION).map((r) => r.k));
  const [pos, setPos] = useState(0);
  const [results, setResults] = useState<{ ok: boolean; cleared: boolean }[]>([]);
  const dueNow = dueRedo(state.redo, today);
  const open = state.redo.filter((r) => !r.cleared);
  const cleared = state.redo.length - open.length;
  const upcoming = upcomingRedo(state.redo, today);

  const restart = () => { setSession(dueNow.slice(0, REDO_PER_SESSION).map((r) => r.k)); setPos(0); setResults([]); };

  return (
    <Page>
      <PageHeader title="Redo queue" back={{ to: "/practice", label: "Practice" }}>{HOW}</PageHeader>

      {session.length === 0 ? (
        <Empty action={<LinkButton to="/practice">Go to Practice</LinkButton>}>
          <b className="block text-heading font-semibold text-foreground">{open.length ? "Nothing due today" : "Your queue is empty"}</b>
          {open.length ? "Come back on the next date below." : "Questions you miss in RC sets and VA drills will appear here the next day."}
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
        <ContentGate inline>
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
  const ref = resolveRedo(k, c);
  const [pick, setPick] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [pane, setPane] = useState<"p" | "q">("p");
  const [result, setResult] = useState<{ ok: boolean; cleared: boolean; box: number; gaveUp: boolean } | null>(null);
  const item = state.redo.find((r) => r.k === k);
  if (!ref || !item) return null;

  const check = (giveUp = false) => {
    const ok = !giveUp && (ref.kind === "rc" ? pick === ref.set.questions[ref.qi].answer : scoreItem(ref.item, typed).ok);
    const d = todayIso();
    const box = ok ? item.box + 1 : 0;
    const cleared = ok && box >= REDO_GAPS.length;
    update((st) => { answerRedo(st, k, ok, d); recordRedoAnswer(st, redoPracticeType(ref), ok, d); });
    setResult({ ok, cleared, box, gaveUp: giveUp });
    onAnswered(ok, cleared);
  };
  const answered = ref.kind === "rc" ? pick !== null : !!cleanAnswer(typed);
  // Sits under the question, so on a wide screen it stays next to the options, not below the passage.
  const actions = result ? (
    <div className={cn("flex flex-col gap-3 rounded-lg p-5", result.ok ? "bg-success-soft" : "bg-card")} role="status">
      <p className="text-base"><b>{result.ok ? "Right." : "Not this time."}</b> {result.cleared ? "It leaves the queue." : result.ok ? `It comes back in ${REDO_GAPS[result.box]} days.` : "It comes back tomorrow."}</p>
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
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground" title={`Right ${item.box} of ${REDO_GAPS.length} times in a row`}>
          {REDO_GAPS.map((_, i) => <i key={i} className={cn("size-2 rounded-full", i < box ? "bg-primary" : "bg-secondary")} />)}
          <span className="ml-1">{box} of {REDO_GAPS.length}</span>
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
                <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Options">
                  {ref.set.questions[ref.qi].options.map((o, i) => <Choice key={i} mark={LETTERS[i]} checked={pick === i} onClick={() => setPick(i)}>{o.t}</Choice>)}
                </div>
              </div>
            )}
            {actions}
          </>
        </Split>
        </>
      ) : (
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5">
          {result ? <ItemReview item={ref.item} answer={result.gaveUp ? "" : typed} /> : <ItemInput item={ref.item} answer={typed} setAnswer={setTyped} />}
          {actions}
        </div>
      )}
    </div>
  );
}

const label = (ref: RedoRef) => (ref.kind === "rc" ? "RC, " + RC_QTYPE[ref.set.questions[ref.qi].type].label.toLowerCase() : VA_KIND[ref.item.kind].label.toLowerCase());
