import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { todayIso, uid } from "../../lib/date";
import { useStore } from "../../lib/store";
import { ContentGate } from "../../components/Content";
import { Empty, LinkButton, Page, TextLink } from "../../components/kit";
import { vaKeysOfDay } from "../../practice/daily";
import { fmtSecs, LETTERS, recordVa, vaError, vaErrorSrc } from "../../practice/record";
import { answerLabel, cleanAnswer, customDrill, parseKey, scoreItem, sentenceAt, sumAt, VA_KIND, type VaItem, type VaKind } from "../../practice/va/build";
import { paraText, type VaPara } from "../../practice/types";
import { Choice, Confirm, PaletteCell, PlayerBar, ReportLink, ReviewChoice, ScoreCard, Timer, useElapsed } from "./common";

const SECS_PER_ITEM = 90;

/** A new query string (a new custom drill) starts a fresh page. */
export default function VaPlayer() {
  const loc = useLocation();
  return <ContentGate>{(c) => <VaPage key={loc.search} paras={c.vaParas} />}</ContentGate>;
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
  return <Drill key={initial ?? "new"} items={items} mode={mode} initialAttempt={initial} />;
}

function Drill({ items, mode, initialAttempt }: { items: VaItem[]; mode: "daily" | "custom"; initialAttempt: string | null }) {
  const { state, update } = useStore();
  const navigate = useNavigate();
  const past = initialAttempt ? state.vaAttempts.find((a) => a.id === initialAttempt) : undefined;
  const [attemptId, setAttemptId] = useState<string | null>(past?.id ?? null);
  const [answers, setAnswers] = useState<string[]>(past ? past.items.map((i) => i.a) : items.map(() => ""));
  const [cur, setCur] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const startAt = useRef(Date.now());
  const reviewing = attemptId !== null;
  const elapsed = useElapsed(!reviewing, startAt.current);
  const attempt = attemptId ? state.vaAttempts.find((a) => a.id === attemptId) : undefined;
  useEffect(() => { window.scrollTo(0, 0); }, [reviewing]);

  if (!items.length) return <Page><Empty action={<LinkButton to="/practice">Back to Practice</LinkButton>}>No drill questions found.</Empty></Page>;

  const item = items[cur];
  const setAnswer = (v: string) => setAnswers((a) => a.map((x, i) => (i === cur ? v : x)));
  const submit = () => {
    const id = uid();
    const secs = (Date.now() - startAt.current) / 1000;
    update((st) => recordVa(st, id, items, answers, secs, mode, todayIso()));
    setAttemptId(id);
    setConfirming(false);
    setCur(0);
  };
  const blanks = answers.filter((a) => !cleanAnswer(a)).length;
  const target = items.length * SECS_PER_ITEM;
  const score = items.reduce((s, it, i) => s + scoreItem(it, answers[i]).pts, 0);

  return (
    <Page width="read" className="gap-6 lg:gap-8">
      <PlayerBar kicker={`${reviewing ? "Review" : mode === "daily" ? "Today's VA drill" : "Custom VA drill"}, ${items.length} questions`} title={VA_KIND[item.kind].label}>
        {!reviewing && <Timer over={elapsed > target}>{fmtSecs(elapsed)} / {fmtSecs(target)}</Timer>}
        {!reviewing && <Button size="sm" onClick={() => setConfirming(true)}>Submit drill</Button>}
        {reviewing && <LinkButton to="/practice" variant="secondary" size="sm">Back to Practice</LinkButton>}
      </PlayerBar>

      {reviewing && attempt && (
        <ScoreCard score={(score > 0 ? "+" : "") + score} of={items.length * 3} parts={[
          ["Correct", attempt.items.filter((i) => i.ok).length],
          ["Wrong", attempt.items.filter((i) => !i.ok && cleanAnswer(i.a)).length],
          ["Blank", attempt.items.filter((i) => !cleanAnswer(i.a)).length],
          ["Time", fmtSecs(attempt.secs)],
        ]}>
          <p className="text-base text-muted-foreground">Para jumbles and odd sentence out are TITA: +3 or 0. Para summary and sentence insertion are MCQs: +3, −1 for a wrong answer, 0 if blank. Logged in Progress by question type. Wrong and blank questions join your <TextLink to="/practice/redo">redo queue</TextLink>.</p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate(`/practice/va?type=mix&n=8&seed=${uid()}`)}>New custom drill</Button>
            <Button variant="secondary" onClick={() => { setAttemptId(null); setAnswers(items.map(() => "")); startAt.current = Date.now(); }}>Retake these questions</Button>
          </div>
        </ScoreCard>
      )}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Questions">
        {items.map((it, i) => {
          const s = scoreItem(it, answers[i]);
          const st = reviewing ? (s.blank ? "blank" : s.ok ? "right" : "wrong") : s.blank ? "unseen" : "done";
          return <PaletteCell key={it.key} n={i + 1} state={st} current={i === cur} onClick={() => setCur(i)} label={`Question ${i + 1}, ${VA_KIND[it.kind].label}`} />;
        })}
      </div>

      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted-foreground">Question {cur + 1} of {items.length}, {VA_KIND[item.kind].tita ? "TITA, no negative marks" : "MCQ, −1 if wrong"}</p>
        {reviewing ? <ItemReview item={item} answer={answers[cur]} /> : <ItemInput key={cur} item={item} answer={answers[cur]} setAnswer={setAnswer} />}
        <div className="flex justify-between gap-2 pt-1">
          <Button variant="secondary" size="sm" disabled={cur === 0} onClick={() => setCur(cur - 1)}>Previous</Button>
          {cur < items.length - 1
            ? <Button size="sm" onClick={() => setCur(cur + 1)}>Next</Button>
            : !reviewing && <Button size="sm" onClick={() => setConfirming(true)}>Submit drill</Button>}
        </div>
      </div>

      <Confirm open={confirming} onOpenChange={setConfirming} title="Submit this drill?" action="Submit drill" onAction={submit}>
        {blanks ? `${blanks} question${blanks > 1 ? "s are" : " is"} blank.` : "Every question has an answer."}
      </Confirm>
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
        <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Summaries">
          {item.order.map((_, i) => <Choice key={i} mark={LETTERS[i]} checked={a === String(i + 1)} onClick={() => setAnswer(String(i + 1))}>{sumAt(item, i).t}</Choice>)}
        </div>
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
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" role="radiogroup" aria-label="Gaps">
          {item.gaps.map((_, i) => <Choice key={i} mark={i + 1} checked={a === String(i + 1)} onClick={() => setAnswer(String(i + 1))}>Gap {i + 1}</Choice>)}
        </div>
        {clear}
      </>
    );
  }
  const max = item.kind === "pj" ? 4 : 1;
  const tap = (n: number) => {
    if (item.kind === "oso") setAnswer(String(n));
    else if (!a.includes(String(n)) && a.length < 4) setAnswer(a + n);
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
        <Input id="tita" inputMode="numeric" autoComplete="off" maxLength={max} value={a} onChange={(e) => setAnswer(cleanAnswer(e.target.value).slice(0, max))} placeholder={item.kind === "pj" ? "____" : "_"}
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
  for (let pos = 0; pos <= 4; pos++) {
    const gi = item.gaps.indexOf(pos);
    if (gi >= 0) {
      const n = gi + 1;
      parts.push(onPick
        ? <button key={"g" + pos} type="button" className={cn(gapCls(pick === String(n)), "hover:ring-2 hover:ring-primary/50")} aria-pressed={pick === String(n)} onClick={() => onPick(n)} aria-label={"Gap " + n}>({n})</button>
        : <span key={"g" + pos} className={gapCls(pick === String(n))}>({n})</span>);
      parts.push(" ");
    }
    if (placed && pos === item.para.insAt) parts.push(<span key={"i" + pos} className="rounded-sm bg-success-soft px-0.5">{item.para.ins}</span>, " ");
    if (pos < 4) parts.push(<span key={"s" + pos}>{item.para.s[pos]} </span>);
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
          <p className="text-base text-muted-foreground">The other four read in the order {p.s.map((_, ci) => item.order.indexOf(ci) + 1).join("")}.</p>
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
