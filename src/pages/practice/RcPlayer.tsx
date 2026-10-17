import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { mediumDate, todayIso, uid } from "../../lib/date";
import { usePref } from "../../lib/prefs";
import { useStore } from "../../lib/store";
import { rcOfDay } from "../../practice/daily";
import { RC_SETS, rcById } from "../../practice/rc";
import { fmtSecs, LETTERS, rcError, rcErrorSrc, recordRc, scoreRc } from "../../practice/record";
import { GENRES, RC_QTYPE, setWords, type RcSet } from "../../practice/types";
import NotFound from "../NotFound";
import { ReportLink, useElapsed } from "./common";

/** Words too common to be worth saving to flashcards. */
const COMMON = new Set("the and for are but not you all any can had her was one our out has him his how its may new now old see two way who did get let put say she too use that with have this will your from they know want been good much some time very when come here just like long make many more only over such take than them well were what which their there these those would could should about after other where while being because through between does into also each most even then upon whose".split(" "));

/** About seven minutes per RC is the CAT pace: 28 minutes for four passages. */
const TARGET_SECS = 7 * 60;

export default function RcPlayer() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const set = id === "today" ? rcOfDay(todayIso()) : rcById(id ?? "");
  if (!set) return <NotFound />;
  const review = sp.get("review");
  return <Player key={set.id + ":" + (review ?? "") + ":" + (sp.get("n") ?? "")} set={set} reviewId={review} />;
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
  };
  const blanks = ans.filter((a) => a === null).length;

  return (
    <div className="page">
      <div className="pbar">
        <div className="stack" style={{ gap: 2, minWidth: 0 }}>
          <span className="eyebrow">{reviewing ? "Review" : "RC practice"} · {GENRES[set.genre]} · {set.difficulty}</span>
          <h1>{set.title}</h1>
        </div>
        <div className="row">
          {!reviewing && (
            hideTimer
              ? <button type="button" className="link" onClick={() => setHideTimer(false)}>Show timer</button>
              : <button type="button" className={"timer" + (elapsed > TARGET_SECS ? " over" : "")} onClick={() => setHideTimer(true)} title="Target 7 minutes. Tap to hide.">{fmtSecs(elapsed)} / 7:00</button>
          )}
          {!reviewing && <button type="button" className="btn sm" onClick={() => setConfirming(true)}>Submit</button>}
          {reviewing && <Link className="btn ghost sm" to="/practice">Back to Practice</Link>}
        </div>
      </div>

      {reviewing && attempt && <Summary set={set} attempt={attempt} onRetake={() => navigate(`/practice/rc/${set.id}?n=${uid()}`)} />}

      <div className="seg panes" role="group" aria-label="Show" style={{ alignSelf: "flex-start" }}>
        <button type="button" aria-pressed={pane === "p"} onClick={() => setPane("p")}>Passage</button>
        <button type="button" aria-pressed={pane === "q"} onClick={() => setPane("q")}>Question {cur + 1} of {n}</button>
      </div>

      <div className="split" data-pane={pane}>
        <Passage set={set} highlight={reviewing ? set.questions[cur].proof : []} wordMode={reviewing} />
        <div className="qpane">
          <Palette n={n} cur={cur} setCur={setCur} ans={ans} marked={marked} set={reviewing ? set : null} />
          {reviewing ? <ReviewQuestion set={set} qi={cur} chosen={ans[cur]} /> : (
            <div className="card stack">
              <span className="eyebrow">Question {cur + 1} of {n}</span>
              <p className="stem">{set.questions[cur].stem}</p>
              <ul className="opts" role="radiogroup" aria-label={"Options for question " + (cur + 1)}>
                {set.questions[cur].options.map((o, i) => (
                  <li key={i}>
                    <button type="button" role="radio" aria-checked={ans[cur] === i} className="opt" onClick={() => choose(i)}>
                      <span className="l">{LETTERS[i]}</span><span>{o.t}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="qnav">
                <div className="row">
                  <button type="button" className="btn ghost sm" onClick={() => setAns((a) => a.map((x, i) => (i === cur ? null : x)))} disabled={ans[cur] === null}>Clear</button>
                  <button type="button" className="btn ghost sm" aria-pressed={marked[cur]} onClick={() => setMarked((m) => m.map((x, i) => (i === cur ? !x : x)))}>{marked[cur] ? "Unmark" : "Mark for review"}</button>
                </div>
                <div className="row">
                  <button type="button" className="btn ghost sm" disabled={cur === 0} onClick={() => setCur(cur - 1)}>Previous</button>
                  {cur < n - 1
                    ? <button type="button" className="btn sm" onClick={() => setCur(cur + 1)}>Next</button>
                    : <button type="button" className="btn sm" onClick={() => setConfirming(true)}>Submit</button>}
                </div>
              </div>
            </div>
          )}
          {reviewing && (
            <div className="qnav">
              <button type="button" className="btn ghost sm" disabled={cur === 0} onClick={() => setCur(cur - 1)}>Previous question</button>
              <button type="button" className="btn ghost sm" disabled={cur === n - 1} onClick={() => setCur(cur + 1)}>Next question</button>
            </div>
          )}
          {confirming && (
            <div className="card stack accent" role="alertdialog" aria-label="Submit this set?">
              <p><b>Submit this set?</b> {blanks ? `${blanks} question${blanks > 1 ? "s are" : " is"} unanswered. Blanks score 0; wrong answers cost 1 mark.` : "All questions answered."}</p>
              <div className="row"><button type="button" className="btn" onClick={submit}>Submit</button><button type="button" className="btn ghost" onClick={() => setConfirming(false)}>Keep going</button></div>
            </div>
          )}
        </div>
      </div>
      {reviewing && <p className="muted small">Tap any word in the passage to save it to your Words. Passages and questions are original practice material written for this site.</p>}
    </div>
  );
}

function Palette({ n, cur, setCur, ans, marked, set }: { n: number; cur: number; setCur: (i: number) => void; ans: (number | null)[]; marked: boolean[]; set: RcSet | null }) {
  return (
    <div className="palette" role="group" aria-label="Questions">
      {Array.from({ length: n }, (_, i) => {
        let cls = "pal";
        if (set) cls += ans[i] === null ? " skip" : ans[i] === set.questions[i].answer ? " ok" : " bad";
        else { if (ans[i] !== null) cls += " ans"; if (marked[i]) cls += " mark"; }
        if (i === cur) cls += " cur";
        const status = set ? (ans[i] === null ? "skipped" : ans[i] === set.questions[i].answer ? "correct" : "wrong") : ans[i] === null ? "not answered" : "answered";
        return <button key={i} type="button" className={cls} onClick={() => setCur(i)} aria-label={`Question ${i + 1}, ${status}${marked[i] && !set ? ", marked" : ""}`} aria-current={i === cur}>{i + 1}</button>;
      })}
    </div>
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
      <article className="passage" aria-label="Passage" onClick={wordMode ? onClick : undefined}>
        {set.paras.map((p, i) => (
          <p key={i} className={highlight.includes(i) ? "proof" : undefined}>
            {wordMode ? p.split(/(\s+)/).map((tok, k) => {
              const clean = tok.replace(/^[^A-Za-z]+|[^A-Za-z'-]+$/g, "").replace(/'s$/, "");
              return clean.length >= 3 && /^[A-Za-z][A-Za-z'-]*$/.test(clean) && !COMMON.has(clean.toLowerCase()) ? <span key={k} className="w" data-w={clean}>{tok}</span> : tok;
            }) : p}
          </p>
        ))}
        <p className="muted small" style={{ fontFamily: "var(--font-ui)" }}>{setWords(set)} words</p>
      </article>
      {pick && <WordSheet word={pick} source={set.title} onClose={() => setPick(null)} />}
    </>
  );
}

function WordSheet({ word, source, onClose }: { word: string; source: string; onClose: () => void }) {
  const { state, update } = useStore();
  const [meaning, setMeaning] = useState("");
  const [done, setDone] = useState(false);
  const w = word.toLowerCase();
  const exists = state.vocab.some((v) => v.w.toLowerCase() === w);
  const add = () => {
    if (!meaning.trim()) return;
    update((st) => { st.vocab.push({ id: uid(), w, m: meaning.trim(), s: source, b: 0, due: todayIso() }); });
    setDone(true);
  };
  return (
    <div className="sheet" role="dialog" aria-label={"Save " + w}>
      <div className="inner">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="wordh">{w}</span>
          <button type="button" className="x" onClick={onClose}>Close</button>
        </div>
        {done ? <p className="ok">Added to Words. It is due for review today.</p>
          : exists ? <p className="muted">Already in your Words.</p>
          : (
            <form className="row" onSubmit={(e) => { e.preventDefault(); add(); }}>
              <input aria-label="Meaning" placeholder="Meaning in your own words" value={meaning} onChange={(e) => setMeaning(e.target.value)} style={{ flex: "1 1 220px" }} autoFocus />
              <button type="submit" className="btn sm" disabled={!meaning.trim()}>Add to Words</button>
            </form>
          )}
        <div className="row small">
          <a className="link" href={"https://www.google.com/search?q=define+" + encodeURIComponent(w)} target="_blank" rel="noopener noreferrer">Look up meaning ↗</a>
          <a className="link" href={"https://www.etymonline.com/search?q=" + encodeURIComponent(w)} target="_blank" rel="noopener noreferrer">Etymonline ↗</a>
        </div>
      </div>
    </div>
  );
}

export function ReviewQuestion({ set, qi, chosen }: { set: RcSet; qi: number; chosen: number | null }) {
  const { state, update } = useStore();
  const q = set.questions[qi];
  const ok = chosen === q.answer;
  const inLog = state.errors.some((e) => e.src === rcErrorSrc(set, qi));
  return (
    <div className="card stack">
      <div className="row">
        <span className="eyebrow">Question {qi + 1} · {RC_QTYPE[q.type].label}</span>
        <span className={"tag " + (ok ? "t-official" : chosen === null ? "t-opt" : "t-must")}>{ok ? "Correct +3" : chosen === null ? "Skipped 0" : "Wrong −1"}</span>
      </div>
      <p className="stem">{q.stem}</p>
      <ul className="opts">
        {q.options.map((o, i) => (
          <li key={i} className={"opt" + (i === q.answer ? " right" : i === chosen ? " wrong" : "")}>
            <span className="l">{LETTERS[i]}</span>
            <span>
              {o.t}
              <span className="why">{o.why}</span>
              {i === q.answer && <span className="tag t-official who">Answer</span>}
              {i === chosen && i !== q.answer && <span className="tag t-must who">Your pick</span>}
              {o.trap && <span className="tag t-opt who">{o.trap}</span>}
            </span>
          </li>
        ))}
      </ul>
      <p className="muted small">The highlighted paragraph{q.proof.length > 1 ? "s settle" : " settles"} this question.</p>
      {!ok && (inLog
        ? <p className="ok">In your Error log.</p>
        : <button type="button" className="btn ghost sm" style={{ alignSelf: "flex-start" }} onClick={() => update((st) => { st.errors.push(rcError(set, qi, chosen, todayIso())); })}>Add to Error log</button>)}
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
    const i = RC_SETS.findIndex((x) => x.id === set.id);
    return [...RC_SETS.slice(i + 1), ...RC_SETS.slice(0, i)].find((x) => !tried.has(x.id)) ?? RC_SETS[(i + 1) % RC_SETS.length];
  }, [state.rcAttempts, set.id]);
  const wpm = attempt.first >= 30 ? Math.round(setWords(set) / (attempt.first / 60)) : null;
  return (
    <div className="card stack">
      <div className="scorebox">
        <div><span className="eyebrow">Score</span><div className="big">{s.marks > 0 ? "+" : ""}{s.marks}<span className="muted" style={{ fontSize: 18 }}> / {3 * set.questions.length}</span></div></div>
        <p className="summary">
          <span>Correct <b>{s.c}</b></span><span>Wrong <b>{s.w}</b></span><span>Skipped <b>{s.skipped}</b></span>
          <span>Time <b>{fmtSecs(attempt.secs)}</b></span>
          {wpm && <span title="Words in the passage divided by the time to your first answer">Reading pace <b>about {wpm} wpm</b></span>}
        </p>
      </div>
      <p className="muted small">Attempted {mediumDate(attempt.d)}. Logged in Progress as an RC practice set. Wrong answers show their trap, the reason the option looked right.</p>
      <div className="row">
        {missing.length > 0 && <button type="button" className="btn" onClick={() => update((st) => { missing.forEach((i) => st.errors.push(rcError(set, i, attempt.ans[i], todayIso()))); })}>Add {missing.length} to Error log</button>}
        <Link className="btn ghost" to={`/practice/rc/${next.id}`}>Next set: {next.title}</Link>
        <button type="button" className="btn ghost" onClick={onRetake}>Retake</button>
      </div>
    </div>
  );
}
