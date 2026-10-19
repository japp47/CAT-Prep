import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { todayIso, uid } from "../../lib/date";
import { readDraft, writeDraft } from "../../lib/draft";
import type { VaAttempt } from "../../lib/state";
import { useStore } from "../../lib/store";
import { ContentGate } from "../../components/Content";
import { Empty, LinkButton, Page, TextLink } from "../../components/kit";
import { vaKeysOfDay } from "../../practice/daily";
import { fmtSecs, LETTERS, recordVa, vaError, vaErrorSrc } from "../../practice/record";
import { answerLabel, cleanAnswer, customDrill, parseKey, scoreItem, sentenceAt, sumAt, VA_KIND, type VaItem, type VaKind } from "../../practice/va/build";
import { paraText, type VaPara } from "../../practice/types";
import { Choice, ChoiceGroup, Confirm, ElapsedTimer, PaletteCell, PlayerBar, ReportLink, ReviewChoice, ScoreCard } from "./common";

const SECS_PER_ITEM = 90;

/** A new query string (a new custom drill) starts a fresh page. */
export default function VaPlayer() {
  const loc = useLocation();
  return <ContentGate need={{ va: true }}>{(c) => <VaPage key={loc.search} paras={c.vaParas} />}</ContentGate>;
}

function VaPage({ paras }: { paras: VaPara[] }) {
  const [sp] = useSearchParams();
  const { state } = useStore();
  const today = todayIso();
  const type = sp.get("type") as VaKind | "mix" | null;
  const mode = type ? "custom" : "daily";
  const reviewId = sp.get("review");

  // Fix the item list when the page opens, so finishing a drill does not reshuffle it.
  const [items] = useState<VaItem[]>(() => {
    const past = reviewId ? state.vaAttempts.find((a) => a.id === reviewId) : undefined;
    const build = (keys: string[]) => keys.map((k) => parseKey(k, paras)).filter((x): x is VaItem => !!x);
    if (past) return build(past.items.map((i) => i.k));
    if (mode === "daily") return build(vaKeysOfDay(today));
    const n = Math.min(Math.max(parseInt(sp.get("n") ?? "6", 10) || 6, 2), 12);
    const seen = new Set(state.vaAttempts.flatMap((a) => a.items.map((i) => i.k)));
    return customDrill(paras, type && (type === "mix" || type in VA_KIND) ? type : "mix", n, sp.get("seed") ?? "x", seen);
  });
  const doneToday = mode === "daily" && !reviewId ? state.vaAttempts.find((a) => a.mode === "daily" && a.d === today) : undefined;
  const initial = reviewId ?? doneToday?.id ?? null;
  const draftKey = "va:" + (mode === "daily" ? today : sp.toString());
  return <Drill key={initial ?? "new"} items={items} mode={mode} initialAttempt={initial} draftKey={draftKey} />;
}

interface VaDraft { keys: string[]; answers: string[]; cur: number; secs: number }

/** One VA drill: answering it, then reviewing it on the same page. */
function Drill({ items, mode, initialAttempt, draftKey }: { items: VaItem[]; mode: "daily" | "custom"; initialAttempt: string | null; draftKey: string }) {
  const { state } = useStore();
  const [attemptId, setAttemptId] = useState<string | null>(() => (initialAttempt && state.vaAttempts.some((a) => a.id === initialAttempt) ? initialAttempt : null));
  const attempt = attemptId ? state.vaAttempts.find((a) => a.id === attemptId) : undefined;
  useEffect(() => { window.scrollTo(0, 0); }, [attemptId]);
  if (!items.length) return <Page><Empty action={<LinkButton to="/practice">Back to Practice</LinkButton>}>No drill questions found.</Empty></Page>;
  return attempt
    ? <DrillReview items={items} attempt={attempt} onRetake={() => setAttemptId(null)} />
    : <DrillAttempt items={items} mode={mode} draftKey={draftKey} onDone={setAttemptId} />;
}

function DrillAttempt({ items, mode, draftKey, onDone }: { items: VaItem[]; mode: "daily" | "custom"; draftKey: string; onDone: (id: string) => void }) {
  const { update } = useStore();
  const [saved] = useState(() => {
    const d = readDraft<VaDraft>(draftKey);
    return d && d.keys?.join() === items.map((i) => i.key).join() ? d : null;
  });
  const [answers, setAnswers] = useState<string[]>(saved?.answers ?? items.map(() => ""));
  const [cur, setCur] = useState(saved?.cur ?? 0);
  const [confirming, setConfirming] = useState(false);
  // A restored drill carries on the clock from where it stopped.
  const [startAt] = useState(() => Date.now() - (saved?.secs ?? 0) * 1000);
  const submitted = useRef(false);

  // Keep the answers on every change, when the page is hidden and when it closes.
  useEffect(() => {
    const keep = () => {
      if (submitted.current) return;
      const draft: VaDraft = { keys: items.map((i) => i.key), answers, cur, secs: (Date.now() - startAt) / 1000 };
      writeDraft(draftKey, answers.some((a) => cleanAnswer(a)) ? draft : null);
    };
    keep();
    window.addEventListener("pagehide", keep);
    return () => { window.removeEventListener("pagehide", keep); keep(); };
  }, [draftKey, items, startAt, answers, cur]);

  const item = items[cur];
  const setAnswer = (v: string) => setAnswers((a) => a.map((x, i) => (i === cur ? v : x)));
  const submit = () => {
    const id = uid();
    submitted.current = true;
    writeDraft(draftKey, null);
    update((st) => recordVa(st, id, items, answers, (Date.now() - startAt) / 1000, mode, todayIso()));
    setConfirming(false);
    onDone(id);
  };
  const blanks = answers.filter((a) => !cleanAnswer(a)).length;

  return (
    <Page width="read" className="gap-6 lg:gap-8">
      <PlayerBar kicker={`${mode === "daily" ? "Today's VA drill" : "Custom VA drill"}, ${items.length} questions`} title={VA_KIND[item.kind].label}>
        <ElapsedTimer startAt={startAt} target={items.length * SECS_PER_ITEM} />
        <Button size="sm" onClick={() => setConfirming(true)}>Submit drill</Button>
      </PlayerBar>
      {saved && <p className="text-base text-muted-foreground">Your answers from earlier are back, and the clock carries on from {fmtSecs(saved.secs)}.</p>}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Questions">
        {items.map((it, i) => (
          <PaletteCell key={it.key} n={i + 1} state={cleanAnswer(answers[i]) ? "done" : "unseen"} current={i === cur} onClick={() => setCur(i)}
            label={`Question ${i + 1}, ${VA_KIND[it.kind].label}, ${cleanAnswer(answers[i]) ? "answered" : "not answered"}`} />
        ))}
      </div>

      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted-foreground">Question {cur + 1} of {items.length}, {VA_KIND[item.kind].tita ? "TITA, no negative marks" : "MCQ, −1 if wrong"}</p>
        <ItemInput key={cur} item={item} answer={answers[cur]} setAnswer={setAnswer} />
        <div className="flex justify-between gap-2 pt-1">
          <Button variant="secondary" size="sm" disabled={cur === 0} onClick={() => setCur(cur - 1)}>Previous</Button>
          {cur < items.length - 1
            ? <Button size="sm" onClick={() => setCur(cur + 1)}>Next</Button>
            : <Button size="sm" onClick={() => setConfirming(true)}>Submit drill</Button>}
        </div>
      </div>

      <Confirm open={confirming} onOpenChange={setConfirming} title="Submit this drill?" action="Submit drill" onAction={submit}>
        {blanks ? `${blanks} question${blanks > 1 ? "s are" : " is"} blank.` : "Every question has an answer."}
      </Confirm>
      <p className="text-sm text-muted-foreground">Paragraphs are original practice material written for this site.</p>
    </Page>
  );
}

function DrillReview({ items, attempt, onRetake }: { items: VaItem[]; attempt: VaAttempt; onRetake: () => void }) {
  const [cur, setCur] = useState(0);
  const [seed] = useState(uid);
  const answers = items.map((_, i) => attempt.items[i]?.a ?? "");
  const score = items.reduce((s, it, i) => s + scoreItem(it, answers[i]).pts, 0);
  const item = items[cur];

  return (
    <Page width="read" className="gap-6 lg:gap-8">
      <PlayerBar kicker={`Review, ${items.length} questions`} title={VA_KIND[item.kind].label}>
        <LinkButton to="/practice" variant="secondary" size="sm">Back to Practice</LinkButton>
      </PlayerBar>

      <ScoreCard score={(score > 0 ? "+" : "") + score} of={items.length * 3} parts={[
        ["Correct", attempt.items.filter((i) => i.ok).length],
        ["Wrong", attempt.items.filter((i) => !i.ok && cleanAnswer(i.a)).length],
        ["Blank", attempt.items.filter((i) => !cleanAnswer(i.a)).length],
        ["Time", fmtSecs(attempt.secs)],
      ]}>
        <p className="text-base text-muted-foreground">Para jumbles and odd sentence out are TITA: +3 or 0. Para summary and sentence insertion are MCQs: +3, −1 for a wrong answer, 0 if blank. Logged in Progress by question type. Wrong and blank questions join your <TextLink to="/practice/redo">redo queue</TextLink>.</p>
        <div className="flex flex-wrap gap-3">
          <LinkButton to={`/practice/va?type=mix&n=8&seed=${seed}`}>New custom drill</LinkButton>
          <Button variant="secondary" onClick={onRetake}>Retake these questions</Button>
        </div>
      </ScoreCard>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Questions">
        {items.map((it, i) => {
          const s = scoreItem(it, answers[i]);
          return <PaletteCell key={it.key} n={i + 1} state={s.blank ? "blank" : s.ok ? "right" : "wrong"} current={i === cur} onClick={() => setCur(i)}
            label={`Question ${i + 1}, ${VA_KIND[it.kind].label}, ${s.blank ? "blank" : s.ok ? "correct" : "wrong"}`} />;
        })}
      </div>

      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted-foreground">Question {cur + 1} of {items.length}, {VA_KIND[item.kind].tita ? "TITA, no negative marks" : "MCQ, −1 if wrong"}</p>
        <ItemReview item={item} answer={answers[cur]} />
        <div className="flex justify-between gap-2 pt-1">
          <Button variant="secondary" size="sm" disabled={cur === 0} onClick={() => setCur(cur - 1)}>Previous</Button>
          {cur < items.length - 1 && <Button size="sm" onClick={() => setCur(cur + 1)}>Next</Button>}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Paragraphs are original practice material written for this site.</p>
    </Page>
  );
}

const Para = ({ children }: { children: ReactNode }) => <p className="rounded-lg bg-card px-5 py-4 text-reading">{children}</p>;

/** A numbered sentence for jumbles and odd sentence out. */
function Sentence({ n, children, state, onClick, pressed }: { n: number; children: ReactNode; state?: "used" | "sel" | "odd"; onClick?: () => void; pressed?: boolean }) {
  const cls = cn("grid w-full grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-3 rounded-lg bg-card px-4 py-3.5 text-left text-reading ring-1 ring-inset ring-transparent",
    onClick && "transition-colors hover:ring-primary/60", state === "used" && "opacity-45", state === "sel" && "bg-accent ring-2 ring-primary", state === "odd" && "bg-danger-soft");
  const num = <span className={cn("grid size-7 place-items-center rounded-full bg-secondary font-sans text-sm font-semibold", state === "sel" && "bg-primary text-primary-foreground")}>{n}</span>;
  return onClick
    ? <button type="button" className={cls} onClick={onClick} aria-pressed={pressed}>{num}<span>{children}</span></button>
    : <div className={cls}>{num}<span>{children}</span></div>;
}

export function ItemInput({ item, answer, setAnswer }: { item: VaItem; answer: string; setAnswer: (v: string) => void }) {
  const a = cleanAnswer(answer);
  const clear = a ? <Button variant="link" size="sm" className="self-start" onClick={() => setAnswer("")}>Clear my answer</Button> : null;
  if (item.kind === "ps") {
    return (
      <>
        <p className="text-base">{VA_KIND.ps.how}</p>
        <Para>{paraText(item.para)}</Para>
        <ChoiceGroup label="Summaries">
          {item.order.map((_, i) => <Choice key={i} mark={LETTERS[i]} checked={a === String(i + 1)} onClick={() => setAnswer(String(i + 1))}>{sumAt(item, i).t}</Choice>)}
        </ChoiceGroup>
        {clear}
      </>
    );
  }
  if (item.kind === "si") {
    return (
      <>
        <p className="text-base">{VA_KIND.si.how}</p>
        <p className="rounded-lg bg-highlight-soft px-5 py-4 text-reading">{item.para.ins}</p>
        <Gapped item={item} pick={a} onPick={(n) => setAnswer(String(n))} />
        <ChoiceGroup label="Gaps" className="grid grid-cols-2 sm:grid-cols-4">
          {item.gaps.map((_, i) => <Choice key={i} mark={i + 1} checked={a === String(i + 1)} onClick={() => setAnswer(String(i + 1))}>Gap {i + 1}</Choice>)}
        </ChoiceGroup>
        {clear}
      </>
    );
  }
  const max = item.kind === "pj" ? item.order.length : 1;
  const tap = (n: number) => {
    if (item.kind === "oso") setAnswer(String(n));
    else if (!a.includes(String(n)) && a.length < max) setAnswer(a + n);
  };
  return (
    <>
      <p className="text-base">{VA_KIND[item.kind].how} {item.kind === "pj" ? "Tap the sentences in order, or type the numbers." : "Tap the sentence, or type its number."}</p>
      <div className="flex flex-col gap-2.5">
        {item.order.map((_, i) => {
          const n = i + 1, on = item.kind === "pj" ? a.includes(String(n)) : a === String(n);
          return <Sentence key={i} n={n} onClick={() => tap(n)} pressed={on} state={on ? (item.kind === "pj" ? "used" : "sel") : undefined}>{sentenceAt(item, i)}</Sentence>;
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="tita" className="text-base font-medium">Your answer</label>
        <Input id="tita" inputMode="numeric" autoComplete="off" maxLength={max} value={a} onChange={(e) => setAnswer(cleanAnswer(e.target.value).slice(0, max))} placeholder={"_".repeat(max)}
          className="h-12 w-40 text-center text-xl font-semibold tracking-[0.3em] tabular-nums" />
        {a && <Button variant="ghost" size="sm" onClick={() => setAnswer("")}>Clear</Button>}
      </div>
    </>
  );
}

/** The insertion paragraph with numbered gaps. `placed` shows the missing sentence in its right gap. */
function Gapped({ item, pick, onPick, placed }: { item: VaItem; pick: string; onPick?: (n: number) => void; placed?: boolean }) {
  const parts: ReactNode[] = [];
  const gapCls = (on: boolean) => cn("mx-0.5 inline-grid h-7 min-w-9 place-items-center rounded-md px-1.5 align-middle font-sans text-sm font-semibold", on ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground");
  for (let pos = 0; pos <= item.para.s.length; pos++) {
    const gi = item.gaps.indexOf(pos);
    if (gi >= 0) {
      const n = gi + 1;
      parts.push(onPick
        ? <button key={"g" + pos} type="button" className={cn(gapCls(pick === String(n)), "hover:ring-2 hover:ring-primary/50")} aria-pressed={pick === String(n)} onClick={() => onPick(n)} aria-label={"Gap " + n}>({n})</button>
        : <span key={"g" + pos} className={gapCls(pick === String(n))}>({n})</span>);
      parts.push(" ");
    }
    if (placed && pos === item.para.insAt) parts.push(<span key={"i" + pos} className="rounded-sm bg-success-soft px-0.5">{item.para.ins}</span>, " ");
    if (pos < item.para.s.length) parts.push(<span key={"s" + pos}>{item.para.s[pos]} </span>);
  }
  return <p className="rounded-lg bg-card px-5 py-4 text-reading leading-[1.9]">{parts}</p>;
}

function Marked({ text, mark }: { text: string; mark: string }) {
  const i = text.indexOf(mark);
  if (!mark || i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="hl text-inherit">{mark}</mark>{text.slice(i + mark.length)}</>;
}

export function ItemReview({ item, answer }: { item: VaItem; answer: string }) {
  const { state, update } = useStore();
  const a = cleanAnswer(answer);
  const s = scoreItem(item, a);
  const inLog = state.errors.some((e) => e.src === vaErrorSrc(item));
  const p = item.para;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={s.ok ? "success" : s.blank ? "secondary" : "danger"}>{s.ok ? "Correct, +3" : s.blank ? "Blank, 0" : VA_KIND[item.kind].tita ? "Wrong, 0" : "Wrong, −1"}</Badge>
        <span className="text-base text-muted-foreground">Key <b className="text-foreground">{answerLabel(item, item.answer)}</b>, you {s.blank ? "left it blank" : <>entered <b className="text-foreground">{answerLabel(item, a)}</b></>}</span>
      </div>
      {item.kind === "ps" && (
        <>
          <Para>{paraText(p)}</Para>
          <ul className="flex flex-col gap-2.5">
            {item.order.map((_, i) => {
              const opt = sumAt(item, i), n = String(i + 1);
              return (
                <ReviewChoice key={i} mark={LETTERS[i]} state={n === item.answer ? "right" : n === a ? "wrong" : "plain"} why={opt.why}
                  tags={<>{n === item.answer && <Badge variant="success">Answer</Badge>}{n === a && n !== item.answer && <Badge variant="danger">Your pick</Badge>}{opt.trap && <Badge variant="secondary">{opt.trap}</Badge>}</>}>
                  {opt.t}
                </ReviewChoice>
              );
            })}
          </ul>
        </>
      )}
      {item.kind === "pj" && (
        <>
          <p className="text-base text-muted-foreground">The paragraph in order, with the cue that fixes each sentence's place:</p>
          <div className="flex flex-col gap-2.5">
            {p.s.map((t, ci) => (
              <Sentence key={ci} n={item.order.indexOf(ci) + 1}>
                <Marked text={t} mark={p.marks[ci]} />
                <span className="mt-1.5 block font-sans text-base text-foreground/80">{p.cues[ci]}</span>
              </Sentence>
            ))}
          </div>
        </>
      )}
      {item.kind === "oso" && (
        <>
          <div className="flex flex-col gap-2.5">
            {item.order.map((ci, i) => (
              <Sentence key={i} n={i + 1} state={ci < 0 ? "odd" : undefined}>
                {ci < 0 ? p.odd : <Marked text={p.s[ci]} mark={p.marks[ci]} />}
                {ci < 0 && <span className="mt-1.5 block font-sans text-base"><b>Odd one out.</b> {p.oddWhy}</span>}
              </Sentence>
            ))}
          </div>
          <p className="text-base text-muted-foreground">The other four read in the order {p.s.map((_, ci) => item.order.indexOf(ci) + 1).filter(Boolean).join("")}.</p>
        </>
      )}
      {item.kind === "si" && (
        <>
          <p className="rounded-lg bg-highlight-soft px-5 py-4 text-reading">{p.ins}</p>
          <Gapped item={item} pick={item.answer} placed />
          <p className="text-base"><b>Gap {item.answer}.</b> {p.insWhy}</p>
        </>
      )}
      {!s.ok && (inLog
        ? <p className="text-base text-success">In your Error log.</p>
        : <Button variant="secondary" size="sm" className="self-start" onClick={() => { update((st) => { st.errors.push(vaError(item, a, todayIso())); }); toast("Added to your Error log."); }}>Add to Error log</Button>)}
      <ReportLink what={`${VA_KIND[item.kind].label}: ${p.topic} (${item.key})`} />
    </>
  );
}
