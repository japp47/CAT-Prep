import { useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { todayIso, uid } from "../../lib/date";
import { readDraft, writeDraft } from "../../lib/draft";
import type { CrAttempt } from "../../lib/state";
import { useStore } from "../../lib/store";
import { ContentGate } from "../../components/Content";
import { Empty, LinkButton, Page } from "../../components/kit";
import { customCr } from "../../practice/crdrill";
import { crError, crErrorSrc, fmtSecs, LETTERS, recordCr, scoreCr } from "../../practice/record";
import { crRedoKey } from "../../practice/redo";
import { CR_TYPE, type CrItem, type CrType } from "../../practice/types";
import { Choice, ChoiceGroup, Confirm, ElapsedTimer, TimeUp, ErrorCause, NotSure, PaletteCell, PlayerBar, ReportLink, ReviewChoice, ScoreCard, useLeaveConfirmation, useShownAttempt, useStartQuestion } from "./common";

const SECS_PER_ITEM = 90;

/** A new query string (a new custom drill) starts a fresh page. */
export default function CrPlayer() {
  const loc = useLocation();
  return <ContentGate need={{ cr: true }}>{(c) => <CrPage key={loc.search} bank={c.crItems} />}</ContentGate>;
}

function CrPage({ bank }: { bank: CrItem[] }) {
  const [sp] = useSearchParams();
  const { state } = useStore();
  const type = sp.get("type");
  const reviewId = sp.get("review");

  // Fix the item list when the page opens, so finishing a drill does not reshuffle it.
  const [items] = useState<CrItem[]>(() => {
    const past = reviewId ? state.crAttempts.find((a) => a.id === reviewId) : undefined;
    if (past) return past.items.map((i) => bank.find((c) => "cr:" + c.id === i.k)).filter((c): c is CrItem => !!c);
    const n = Math.min(Math.max(parseInt(sp.get("n") ?? "6", 10) || 6, 2), 12);
    const seen = new Set(state.crAttempts.flatMap((a) => a.items.map((i) => i.k.slice(3))));
    return customCr(bank, type && type in CR_TYPE ? (type as CrType) : "mix", n, sp.get("seed") ?? "x", seen);
  });
  return <Drill key={reviewId ?? "new"} items={items} initialAttempt={reviewId} draftKey={"cr:" + sp.toString()} />;
}

interface CrDraft { unsure?: boolean[]; ids: string[]; answers: (number | null)[]; cur: number; secs: number }

/** One critical reasoning drill: answering it, then reviewing it on the same page. */
function Drill({ items, initialAttempt, draftKey }: { items: CrItem[]; initialAttempt: string | null; draftKey: string }) {
  const { state } = useStore();
  const { attempt, waiting, finish, retake } = useShownAttempt(state.crAttempts, initialAttempt);
  if (!items.length) return <Page><Empty action={<LinkButton to="/practice">Back to Practice</LinkButton>}>No critical reasoning questions found.</Empty></Page>;
  if (waiting) return null;
  return attempt
    ? <DrillReview items={items} attempt={attempt} onRetake={retake} />
    : <DrillAttempt items={items} draftKey={draftKey} onDone={finish} />;
}

const kindLabel = (c: CrItem) => CR_TYPE[c.type].label;

function DrillAttempt({ items, draftKey, onDone }: { items: CrItem[]; draftKey: string; onDone: (id: string) => void }) {
  const { update } = useStore();
  const leave = useLeaveConfirmation(true);
  const [saved] = useState(() => {
    const d = readDraft<CrDraft>(draftKey);
    return d && d.ids?.join() === items.map((i) => i.id).join() ? d : null;
  });
  const [resumed, setResumed] = useState(!!saved);
  const [answers, setAnswers] = useState<(number | null)[]>(saved?.answers ?? items.map(() => null));
  const [cur, setCur] = useState(saved?.cur ?? 0);
  const [unsure, setUnsure] = useState<boolean[]>(saved?.unsure?.length === items.length ? saved.unsure : items.map(() => false));
  const [confirming, setConfirming] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  // A restored drill carries on the clock from where it stopped.
  const [startAt, setStartAt] = useState(() => Date.now() - (saved?.secs ?? 0) * 1000);
  const startAtRef = useRef(startAt);
  startAtRef.current = startAt;
  const submitted = useRef(false);

  const draft: CrDraft = { ids: items.map((i) => i.id), answers, cur, secs: (Date.now() - startAt) / 1000, unsure };
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // Persist once per state change; pagehide and unmount flush the latest snapshot.
  useEffect(() => {
    if (!submitted.current) writeDraft(draftKey, { ids: items.map((i) => i.id), answers, cur, secs: (Date.now() - startAt) / 1000, unsure });
  }, [draftKey, items, answers, cur, startAt, unsure]);
  useEffect(() => {
    const keep = () => {
      if (!submitted.current) writeDraft(draftKey, { ...draftRef.current, secs: (Date.now() - startAtRef.current) / 1000 });
    };
    window.addEventListener("pagehide", keep);
    return () => { window.removeEventListener("pagehide", keep); keep(); };
  }, [draftKey]);

  const restart = () => {
    writeDraft(draftKey, null);
    setAnswers(items.map(() => null));
    setUnsure(items.map(() => false));
    setCur(0);
    setStartAt(Date.now());
    setResumed(false);
    setConfirmRestart(false);
  };

  const item = items[cur];
  const setPick = (v: number | null) => setAnswers((a) => a.map((x, i) => (i === cur ? v : x)));
  const submit = () => {
    const id = uid();
    submitted.current = true;
    writeDraft(draftKey, null);
    update((st) => recordCr(st, id, items, answers, (Date.now() - startAt) / 1000, todayIso(), unsure));
    setConfirming(false);
    leave.allowNextNavigation(); // the review goes into the address (?review=): not a "leave"
    onDone(id);
  };
  const blanks = answers.filter((a) => a === null).length;

  return (
    <Page width="read" className="gap-6 lg:gap-8">
      <PlayerBar kicker={`Critical reasoning drill, ${items.length} questions`} title={kindLabel(item)}>
        <ElapsedTimer startAt={startAt} target={items.length * SECS_PER_ITEM} />
        <Button size="sm" variant="secondary" onClick={() => setConfirming(true)}>Submit drill</Button>
      </PlayerBar>
      <TimeUp key={startAt} startAt={startAt} target={items.length * SECS_PER_ITEM} onSubmit={submit} />
      {resumed && saved && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">Your saved answers are back. The timer paused while you were away ({fmtSecs(saved.secs)} elapsed).</p>
        <Button variant="ghost" size="sm" onClick={() => setConfirmRestart(true)}>Start over</Button>
      </div>}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Questions">
        {items.map((it, i) => (
          <PaletteCell key={it.id} n={i + 1} state={answers[i] !== null ? "done" : "unseen"} current={i === cur} onClick={() => setCur(i)}
            label={`Question ${i + 1}, ${kindLabel(it)}, ${answers[i] !== null ? "answered" : "not answered"}`} />
        ))}
      </div>

      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted-foreground">Question {cur + 1} of {items.length}</p>
        <CrQuestion key={cur} item={item} pick={answers[cur]} setPick={setPick} />
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <NotSure on={unsure[cur]} onChange={(v) => setUnsure((u) => u.map((x, i) => (i === cur ? v : x)))} />
          <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" disabled={cur === 0} onClick={() => setCur(cur - 1)}>Previous</Button>
          {cur < items.length - 1
            ? <Button size="sm" onClick={() => setCur(cur + 1)}>Next</Button>
            : <Button size="sm" onClick={() => setConfirming(true)}>Submit drill</Button>}
          </div>
        </div>
      </div>

      <Confirm open={confirming} onOpenChange={setConfirming} title="Submit this drill?" action="Submit drill" onAction={submit}>
        {blanks ? `${blanks} question${blanks > 1 ? "s are" : " is"} blank.` : "Every question has an answer."}
      </Confirm>
      <Confirm open={confirmRestart} onOpenChange={setConfirmRestart} title="Start a new drill?" action="Start over" onAction={restart} cancel="Keep this drill" danger actionClassName="!text-white dark:!text-black">
        This clears your saved answers and elapsed time for this drill.
      </Confirm>
      <Confirm open={leave.open} onOpenChange={leave.onOpenChange} title="Leave this drill?" action="Leave drill" onAction={leave.onLeave} cancel="Keep practicing" danger actionClassName="!text-white dark:!text-black">
        Your answers, current question and elapsed time are saved. The timer pauses while you are away. Return within 24 hours to resume.
      </Confirm>
      <p className="text-sm text-muted-foreground">Questions are original practice material written for this site. CAT does not ask critical reasoning; XAT does.</p>
    </Page>
  );
}

function DrillReview({ items, attempt, onRetake }: { items: CrItem[]; attempt: CrAttempt; onRetake: () => void }) {
  const { start, el } = useStartQuestion(items.length);
  const [cur, setCur] = useState(start);
  const [seed] = useState(uid);
  const answers = items.map((_, i) => attempt.items[i]?.a ?? null);
  const right = attempt.items.filter((i) => i.ok).length;
  const wrong = attempt.items.filter((i) => !i.ok && i.a !== null).length;
  const item = items[cur];

  return (
    <Page width="read" className="gap-6 lg:gap-8">
      <PlayerBar kicker={`Review, ${items.length} questions`} title={kindLabel(item)}>
        <LinkButton to="/practice" variant="secondary" size="sm">Back to Practice</LinkButton>
      </PlayerBar>

      <ScoreCard score={right} of={items.length} unit="correct" parts={[
        ["Correct", right], ["Wrong", wrong], ["Blank", attempt.items.length - right - wrong], ["Time", fmtSecs(attempt.secs)],
      ]}>
        <p className="text-base text-muted-foreground">Logged in Progress as critical reasoning. Wrong and blank questions join your redo queue.</p>
        <div className="flex flex-wrap gap-3">
          <LinkButton to={`/practice/cr?type=mix&n=6&seed=${seed}`}>New drill</LinkButton>
          <Button variant="secondary" onClick={onRetake}>Retake these questions</Button>
        </div>
      </ScoreCard>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Questions">
        {items.map((it, i) => {
          const s = scoreCr(it, answers[i]);
          return <PaletteCell key={it.id} n={i + 1} state={s.blank ? "blank" : s.ok ? "right" : "wrong"} current={i === cur} onClick={() => setCur(i)}
            label={`Question ${i + 1}, ${kindLabel(it)}, ${s.blank ? "blank" : s.ok ? "correct" : "wrong"}`} />;
        })}
      </div>

      <div ref={el} className="flex scroll-mt-24 flex-col gap-5">
        <p className="text-sm text-muted-foreground">Question {cur + 1} of {items.length}</p>
        <CrReview item={item} chosen={answers[cur]} att={attempt.id} />
        <div className="flex justify-between gap-2 pt-1">
          <Button variant="secondary" size="sm" disabled={cur === 0} onClick={() => setCur(cur - 1)}>Previous</Button>
          {cur < items.length - 1 && <Button size="sm" onClick={() => setCur(cur + 1)}>Next</Button>}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Questions are original practice material written for this site. CAT does not ask critical reasoning; XAT does.</p>
    </Page>
  );
}

/** The stimulus. With a conclusion, `mark` highlights it, which is how review shows what the argument is aiming at. */
function Stimulus({ item, mark }: { item: CrItem; mark?: boolean }) {
  const at = mark && item.conclusion ? item.stimulus.indexOf(item.conclusion) : -1;
  return (
    <p className="rounded-lg bg-card px-5 py-4 text-reading">
      {at < 0 ? item.stimulus : <>{item.stimulus.slice(0, at)}<mark className="hl text-inherit">{item.conclusion}</mark>{item.stimulus.slice(at + item.conclusion!.length)}</>}
    </p>
  );
}

/** One question to answer: the argument, the question and four options. Also used by the redo queue. */
export function CrQuestion({ item, pick, setPick }: { item: CrItem; pick: number | null; setPick: (v: number | null) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <Stimulus item={item} />
      <p className="text-lg leading-snug font-semibold">{item.question}</p>
      <ChoiceGroup label="Options">
        {item.options.map((o, i) => <Choice key={i} mark={LETTERS[i]} checked={pick === i} onClick={() => setPick(i)}>{o.t}</Choice>)}
      </ChoiceGroup>
      {pick !== null && <Button variant="link" size="sm" className="self-start" onClick={() => setPick(null)}>Clear my answer</Button>}
    </div>
  );
}

/** A question after marking: every option with the reason it is right or wrong, then the rule to take away. */
export function CrReview({ item, chosen, att }: { item: CrItem; chosen: number | null; att?: string }) {
  const { state, update } = useStore();
  const s = scoreCr(item, chosen);
  const inLog = state.errors.some((e) => e.src === crErrorSrc(item));
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={s.ok ? "success" : s.blank ? "secondary" : "danger"}>{s.ok ? "Correct" : s.blank ? "Blank" : "Wrong"}</Badge>
        <span className="text-base text-muted-foreground">Key <b className="text-foreground">{LETTERS[item.answer]}</b>, you {s.blank ? "left it blank" : <>chose <b className="text-foreground">{LETTERS[chosen!]}</b></>}</span>
      </div>
      <Stimulus item={item} mark />
      {item.conclusion && <p className="text-base text-muted-foreground">The conclusion is highlighted.</p>}
      <p className="text-lg leading-snug font-semibold">{item.question}</p>
      <ul className="flex flex-col gap-2.5">
        {item.options.map((o, i) => (
          <ReviewChoice key={i} mark={LETTERS[i]} state={i === item.answer ? "right" : i === chosen ? "wrong" : "plain"} why={o.why}
            tags={<>{i === item.answer && <Badge variant="success">Answer</Badge>}{i === chosen && i !== item.answer && <Badge variant="danger">Your pick</Badge>}{o.trap && <Badge variant="secondary">{o.trap}</Badge>}</>}>
            {o.t}
          </ReviewChoice>
        ))}
      </ul>
      <p className="rounded-lg bg-card px-5 py-4 text-base"><b className="font-semibold">{CR_TYPE[item.type].label}:</b> {item.takeaway}</p>
      {!s.ok && (inLog
        ? <ErrorCause src={crErrorSrc(item)} />
        : <Button variant="secondary" size="sm" className="self-start" onClick={() => { update((st) => { st.errors.push(crError(item, chosen, todayIso(), att)); }); toast("Added to your Error log."); }}>Add to Error log</Button>)}
      <ReportLink what={`Critical reasoning: ${item.topic} (${item.id})`} item={crRedoKey(item.id)} />
    </div>
  );
}
