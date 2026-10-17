import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { todayIso, uid } from "../../lib/date";
import { useStore } from "../../lib/store";
import { vaOfDay } from "../../practice/daily";
import { fmtSecs, recordVa, vaError, vaErrorSrc } from "../../practice/record";
import { cleanAnswer, customDrill, parseKey, scoreItem, sentenceAt, VA_KIND, type VaItem, type VaKind } from "../../practice/va/build";
import { VA_PARAS } from "../../practice/va/paragraphs";
import { useElapsed } from "./common";

const SECS_PER_ITEM = 90;

/** A new query string (a new custom drill) starts a fresh page. */
export default function VaPlayer() {
  const loc = useLocation();
  return <VaPage key={loc.search} />;
}

function VaPage() {
  const [sp] = useSearchParams();
  const { state } = useStore();
  const today = todayIso();
  const type = sp.get("type") as VaKind | "mix" | null;
  const mode = type ? "custom" : "daily";
  const reviewId = sp.get("review");

  // Fix the item list when the page opens, so finishing a drill does not reshuffle it.
  const [items] = useState<VaItem[]>(() => {
    const past = reviewId ? state.vaAttempts.find((a) => a.id === reviewId) : undefined;
    if (past) return past.items.map((i) => parseKey(i.k, VA_PARAS)).filter((x): x is VaItem => !!x);
    if (mode === "daily") return vaOfDay(today);
    const n = Math.min(Math.max(parseInt(sp.get("n") ?? "6", 10) || 6, 2), 12);
    const seen = new Set(state.vaAttempts.flatMap((a) => a.items.map((i) => i.k)));
    return customDrill(VA_PARAS, type && (type === "mix" || type in VA_KIND) ? type : "mix", n, sp.get("seed") ?? "x", seen);
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

  if (!items.length) return <div className="page"><div className="empty">No drill items found. <Link to="/practice">Back to Practice</Link></div></div>;

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
    <div className="page">
      <div className="pbar">
        <div className="stack" style={{ gap: 2 }}>
          <span className="eyebrow">{reviewing ? "Review" : mode === "daily" ? "Today's VA drill" : "Custom VA drill"} · {items.length} items</span>
          <h1>{VA_KIND[item.kind].label}</h1>
        </div>
        <div className="row">
          {!reviewing && <span className={"timer" + (elapsed > target ? " over" : "")}>{fmtSecs(elapsed)} / {fmtSecs(target)}</span>}
          {!reviewing && <button type="button" className="btn sm" onClick={() => setConfirming(true)}>Submit</button>}
          {reviewing && <Link className="btn ghost sm" to="/practice">Back to Practice</Link>}
        </div>
      </div>

      {reviewing && attempt && (
        <div className="card stack">
          <div className="scorebox">
            <div><span className="eyebrow">Score</span><div className="big">{score > 0 ? "+" : ""}{score}<span className="muted" style={{ fontSize: 18 }}> / {items.length * 3}</span></div></div>
            <p className="summary">
              <span>Correct <b>{attempt.items.filter((i) => i.ok).length}</b></span>
              <span>Wrong <b>{attempt.items.filter((i) => !i.ok && cleanAnswer(i.a)).length}</b></span>
              <span>Blank <b>{attempt.items.filter((i) => !cleanAnswer(i.a)).length}</b></span>
              <span>Time <b>{fmtSecs(attempt.secs)}</b></span>
            </p>
          </div>
          <p className="muted small">Para jumbles and odd sentence out are TITA: +3 or 0. Sentence insertion is an MCQ: +3, −1 for a wrong answer, 0 if blank. Logged in Progress by question type.</p>
          <div className="row">
            <button type="button" className="btn" onClick={() => navigate(`/practice/va?type=mix&n=8&seed=${uid()}`)}>New custom drill</button>
            <button type="button" className="btn ghost" onClick={() => { setAttemptId(null); setAnswers(items.map(() => "")); startAt.current = Date.now(); }}>Retake these items</button>
          </div>
        </div>
      )}

      <div className="palette" role="group" aria-label="Items">
        {items.map((it, i) => {
          const s = scoreItem(it, answers[i]);
          let cls = "pal";
          if (reviewing) cls += s.blank ? " skip" : s.ok ? " ok" : " bad";
          else if (!s.blank) cls += " ans";
          if (i === cur) cls += " cur";
          return <button key={it.key} type="button" className={cls} onClick={() => setCur(i)} aria-current={i === cur} aria-label={`Item ${i + 1}, ${VA_KIND[it.kind].label}`}>{i + 1}</button>;
        })}
      </div>

      <div className="card stack">
        <span className="eyebrow">Item {cur + 1} of {items.length} · {VA_KIND[item.kind].label} · {VA_KIND[item.kind].tita ? "TITA, no negative marks" : "MCQ, −1 if wrong"}</span>
        {reviewing ? <ItemReview item={item} answer={answers[cur]} /> : <ItemInput item={item} answer={answers[cur]} setAnswer={setAnswer} />}
        <div className="qnav">
          <button type="button" className="btn ghost sm" disabled={cur === 0} onClick={() => setCur(cur - 1)}>Previous</button>
          {cur < items.length - 1
            ? <button type="button" className="btn sm" onClick={() => setCur(cur + 1)}>Next</button>
            : !reviewing && <button type="button" className="btn sm" onClick={() => setConfirming(true)}>Submit</button>}
        </div>
      </div>

      {confirming && (
        <div className="card stack accent" role="alertdialog" aria-label="Submit this drill?">
          <p><b>Submit this drill?</b> {blanks ? `${blanks} item${blanks > 1 ? "s are" : " is"} blank.` : "Every item has an answer."}</p>
          <div className="row"><button type="button" className="btn" onClick={submit}>Submit</button><button type="button" className="btn ghost" onClick={() => setConfirming(false)}>Keep going</button></div>
        </div>
      )}
      <p className="muted small">Paragraphs are original practice material written for this site.</p>
    </div>
  );
}

function ItemInput({ item, answer, setAnswer }: { item: VaItem; answer: string; setAnswer: (v: string) => void }) {
  const a = cleanAnswer(answer);
  if (item.kind === "si") {
    return (
      <>
        <p className="muted">{VA_KIND.si.how}</p>
        <div className="insbox">{item.para.ins}</div>
        <Gapped item={item} pick={a} onPick={(n) => setAnswer(String(n))} />
        <ul className="opts" role="radiogroup" aria-label="Gaps">
          {item.gaps.map((_, i) => (
            <li key={i}><button type="button" role="radio" aria-checked={a === String(i + 1)} className="opt" onClick={() => setAnswer(String(i + 1))}><span className="l">{i + 1}</span><span>Gap {i + 1}</span></button></li>
          ))}
        </ul>
        {a && <button type="button" className="link" style={{ alignSelf: "flex-start" }} onClick={() => setAnswer("")}>Clear</button>}
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
      <p className="muted">{VA_KIND[item.kind].how} {item.kind === "pj" ? "Tap the sentences in order, or type the numbers." : "Tap the sentence, or type its number."}</p>
      <ul className="sents">
        {item.order.map((_, i) => {
          const n = i + 1;
          const on = item.kind === "pj" ? a.includes(String(n)) : a === String(n);
          return (
            <li key={i}>
              <button type="button" className={"sent" + (on ? (item.kind === "pj" ? " used" : " sel") : "")} onClick={() => tap(n)} aria-pressed={on}>
                <span className="n">{n}</span><span>{sentenceAt(item, i)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="tita">
        <label className="muted small" htmlFor="tita">Your answer</label>
        <input id="tita" inputMode="numeric" autoComplete="off" maxLength={max} value={a} onChange={(e) => setAnswer(cleanAnswer(e.target.value).slice(0, max))} placeholder={item.kind === "pj" ? "____" : "_"} />
        {a && <button type="button" className="btn ghost sm" onClick={() => setAnswer("")}>Clear</button>}
      </div>
    </>
  );
}

/** The insertion paragraph with numbered gaps. `placed` shows the missing sentence in its right gap. */
function Gapped({ item, pick, onPick, placed }: { item: VaItem; pick: string; onPick?: (n: number) => void; placed?: boolean }) {
  const parts: ReactNode[] = [];
  for (let pos = 0; pos <= 4; pos++) {
    const gi = item.gaps.indexOf(pos);
    if (gi >= 0) {
      const n = gi + 1;
      parts.push(onPick
        ? <button key={"g" + pos} type="button" className="gap" aria-pressed={pick === String(n)} onClick={() => onPick(n)} aria-label={"Gap " + n}>({n})</button>
        : <span key={"g" + pos} className="gap" aria-pressed={pick === String(n)}>({n})</span>);
      parts.push(" ");
    }
    if (placed && pos === item.para.insAt) parts.push(<span key={"i" + pos} className="ins-in">{item.para.ins}</span>, " ");
    if (pos < 4) parts.push(<span key={"s" + pos}>{item.para.s[pos]} </span>);
  }
  return <p className="para">{parts}</p>;
}

function Marked({ text, mark }: { text: string; mark: string }) {
  const i = text.indexOf(mark);
  if (!mark || i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark>{mark}</mark>{text.slice(i + mark.length)}</>;
}

function ItemReview({ item, answer }: { item: VaItem; answer: string }) {
  const { state, update } = useStore();
  const a = cleanAnswer(answer);
  const s = scoreItem(item, a);
  const inLog = state.errors.some((e) => e.src === vaErrorSrc(item));
  const p = item.para;
  return (
    <>
      <div className="row">
        <span className={"tag " + (s.ok ? "t-official" : s.blank ? "t-opt" : "t-must")}>{s.ok ? "Correct +3" : s.blank ? "Blank 0" : item.kind === "si" ? "Wrong −1" : "Wrong 0"}</span>
        <span className="muted small">Key <b>{item.answer}</b> · you {s.blank ? "left it blank" : <>entered <b>{a}</b></>}</span>
      </div>
      {item.kind === "pj" && (
        <>
          <p className="muted small">The paragraph in order, with the cue that fixes each sentence's place:</p>
          <ul className="sents">
            {p.s.map((t, ci) => (
              <li key={ci} className="sent">
                <span className="n">{item.order.indexOf(ci) + 1}</span>
                <span><Marked text={t} mark={p.marks[ci]} /><span className="cue">{p.cues[ci]}</span></span>
              </li>
            ))}
          </ul>
        </>
      )}
      {item.kind === "oso" && (
        <>
          <ul className="sents">
            {item.order.map((ci, i) => (
              <li key={i} className={"sent" + (ci < 0 ? " odd" : "")}>
                <span className="n">{i + 1}</span>
                <span>{ci < 0 ? p.odd : <Marked text={p.s[ci]} mark={p.marks[ci]} />}{ci < 0 && <span className="cue"><b>Odd one out.</b> {p.oddWhy}</span>}</span>
              </li>
            ))}
          </ul>
          <p className="muted small">The other four read in the order {p.s.map((_, ci) => item.order.indexOf(ci) + 1).join("")}.</p>
        </>
      )}
      {item.kind === "si" && (
        <>
          <div className="insbox">{p.ins}</div>
          <Gapped item={item} pick={item.answer} placed />
          <p><b>Gap {item.answer}.</b> {p.insWhy}</p>
        </>
      )}
      {!s.ok && (inLog
        ? <p className="ok">In your Error log.</p>
        : <button type="button" className="btn ghost sm" style={{ alignSelf: "flex-start" }} onClick={() => update((st) => { st.errors.push(vaError(item, a, todayIso())); })}>Add to Error log</button>)}
    </>
  );
}
