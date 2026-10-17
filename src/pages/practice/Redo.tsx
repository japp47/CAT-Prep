import { useState } from "react";
import { Link } from "react-router-dom";
import { shortDate, todayIso } from "../../lib/date";
import { useStore } from "../../lib/store";
import { LETTERS, recordRedoAnswer } from "../../practice/record";
import { answerRedo, dueRedo, REDO_GAPS, REDO_PER_SESSION, redoPracticeType, resolveRedo, upcomingRedo, type RedoRef } from "../../practice/redo";
import { RC_QTYPE } from "../../practice/types";
import { cleanAnswer, scoreItem, VA_KIND } from "../../practice/va/build";
import { Passage, ReviewQuestion } from "./RcPlayer";
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

  const restart = () => { setSession(dueNow.slice(0, REDO_PER_SESSION).map((r) => r.k)); setPos(0); setResults([]); };

  return (
    <div className="page">
      <div className="view-head">
        <span className="eyebrow">VARC practice</span>
        <h1>Redo queue</h1>
        <p>{HOW}</p>
      </div>

      {session.length === 0 ? (
        <div className="card stack">
          <h3>{open.length ? "Nothing due today" : "Your queue is empty"}</h3>
          <p className="muted">{open.length ? "Come back on the next date below." : "Questions you miss in RC sets and VA drills will appear here the next day."}</p>
          <div className="row"><Link className="btn" to="/practice">Go to Practice</Link></div>
        </div>
      ) : pos >= session.length ? (
        <div className="card stack accent">
          <span className="eyebrow">Session done</span>
          <h3>{results.filter((r) => r.ok).length} of {results.length} right{results.some((r) => r.cleared) ? `, ${results.filter((r) => r.cleared).length} cleared from the queue` : ""}</h3>
          <p className="muted">Missed ones come back tomorrow. Right ones come back later, until they stick.</p>
          <div className="row">
            {dueNow.length > 0 && <button type="button" className="btn" onClick={restart}>{dueNow.length} more due, keep going</button>}
            <Link className={dueNow.length ? "btn ghost" : "btn"} to="/practice">Back to Practice</Link>
          </div>
        </div>
      ) : (
        <RedoQuestion
          key={session[pos]}
          k={session[pos]}
          n={pos + 1}
          of={session.length}
          onAnswered={(ok, done) => setResults((r) => [...r, { ok, cleared: done }])}
          onNext={() => setPos((p) => p + 1)}
        />
      )}

      <div className="card">
        <h3>Queue</h3>
        <p className="summary">
          <span>Due today <b>{dueNow.length}</b></span>
          <span>Open <b>{open.length}</b></span>
          <span>Cleared <b>{cleared}</b></span>
        </p>
        {upcomingRedo(state.redo, today).length > 0 && (
          <ul className="plain" style={{ marginTop: 10 }}>
            {upcomingRedo(state.redo, today).slice(0, 7).map(([d, c]) => <li key={d} className="muted small">{shortDate(d)}: {c} question{c > 1 ? "s" : ""}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

function RedoQuestion({ k, n, of, onAnswered, onNext }: { k: string; n: number; of: number; onAnswered: (ok: boolean, cleared: boolean) => void; onNext: () => void }) {
  const { state, update } = useStore();
  const ref = resolveRedo(k);
  const [pick, setPick] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
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
    <div className={"card stack" + (result.ok ? " accent" : "")} role="status">
      <p><b>{result.ok ? "Right." : "Not this time."}</b> {result.cleared ? "It leaves the queue." : result.ok ? `It comes back in ${REDO_GAPS[result.box]} days.` : "It comes back tomorrow."}</p>
      <div className="row"><button type="button" className="btn" onClick={onNext} autoFocus>{n < of ? "Next question" : "Finish"}</button></div>
    </div>
  ) : (
    <div className="row">
      <button type="button" className="btn" disabled={!answered} onClick={() => check()}>Check</button>
      <button type="button" className="btn ghost" onClick={() => check(true)}>Show the answer</button>
    </div>
  );

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="eyebrow">Question {n} of {of} · {label(ref)} · missed {shortDate(item.added)}</span>
        <span className="pips" title={`Right ${item.box} of ${REDO_GAPS.length} times in a row`}>{REDO_GAPS.map((_, i) => <i key={i} className={i < (result ? result.box : item.box) ? "on" : ""} />)}</span>
      </div>

      {ref.kind === "rc" ? (
        <div className="split">
          <Passage set={ref.set} highlight={result ? ref.set.questions[ref.qi].proof : []} wordMode={false} />
          <div className="qpane">
            {result ? <ReviewQuestion set={ref.set} qi={ref.qi} chosen={result.gaveUp ? null : pick} /> : (
              <div className="card stack">
                <span className="eyebrow">{ref.set.title}</span>
                <p className="stem">{ref.set.questions[ref.qi].stem}</p>
                <ul className="opts" role="radiogroup" aria-label="Options">
                  {ref.set.questions[ref.qi].options.map((o, i) => (
                    <li key={i}><button type="button" role="radio" aria-checked={pick === i} className="opt" onClick={() => setPick(i)}><span className="l">{LETTERS[i]}</span><span>{o.t}</span></button></li>
                  ))}
                </ul>
              </div>
            )}
            {actions}
          </div>
        </div>
      ) : (
        <>
          <div className="card stack">
            {result ? <ItemReview item={ref.item} answer={result.gaveUp ? "" : typed} /> : <ItemInput item={ref.item} answer={typed} setAnswer={setTyped} />}
          </div>
          {actions}
        </>
      )}
    </>
  );
}

const label = (ref: RedoRef) => (ref.kind === "rc" ? "RC: " + RC_QTYPE[ref.set.questions[ref.qi].type].label.toLowerCase() : VA_KIND[ref.item.kind].label);
