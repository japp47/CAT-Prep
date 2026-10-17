import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { shortDate, todayIso, uid } from "../../lib/date";
import { useStore } from "../../lib/store";
import { speedSetOfDay } from "../../practice/daily";
import { RC_SETS, rcById } from "../../practice/rc";
import { fmtSecs, LETTERS } from "../../practice/record";
import { setWords, type RcSet } from "../../practice/types";

/** CAT has about 2,000 words of RC; reading them in 10 minutes leaves time for the questions. */
const EXAM_PACE = 200;
/** A run shorter than this is a mis-tap, not a reading. */
const MIN_SECS = 15;

function verdict(wpm: number, recall: number) {
  if (recall < 2) return "Speed only counts with full recall. Slow down a little and read for the argument.";
  if (wpm < 150) return "Below CAT pace. Daily reading of dense essays will lift this steadily.";
  if (wpm < EXAM_PACE) return "Close to CAT pace. Keep reading daily and test again in a couple of weeks.";
  if (wpm <= 280) return "At CAT pace, with full recall. Keep it steady.";
  return "Fast, with full recall. Make sure you still catch the author's tone and qualifiers.";
}

type Phase = "intro" | "read" | "recall" | "done";

export default function SpeedTest() {
  const { state, update } = useStore();
  const today = todayIso();
  const [set, setSet] = useState<RcSet>(() => speedSetOfDay(today));
  const [phase, setPhase] = useState<Phase>("intro");
  const [picks, setPicks] = useState<(number | null)[]>([null, null]);
  const [tooQuick, setTooQuick] = useState(false);
  const [result, setResult] = useState<{ wpm: number; secs: number; recall: number } | null>(null);
  const startAt = useRef(0);
  const readSecs = useRef(0);

  const runs = [...state.speedRuns].sort((a, b) => (a.d < b.d ? 1 : -1));
  const best = runs.filter((r) => r.recall === 2).reduce((m, r) => Math.max(m, r.wpm), 0);
  const words = setWords(set);

  const random = () => {
    const recent = new Set(runs.slice(0, 10).map((r) => r.set));
    const pool = RC_SETS.filter((s) => !recent.has(s.id) && s.id !== set.id);
    const list = pool.length ? pool : RC_SETS.filter((s) => s.id !== set.id);
    setSet(list[Math.floor(Math.random() * list.length)]);
  };
  const begin = () => { startAt.current = Date.now(); setPhase("read"); window.scrollTo(0, 0); };
  const doneReading = () => { readSecs.current = (Date.now() - startAt.current) / 1000; setPhase("recall"); window.scrollTo(0, 0); };
  const finish = () => {
    const secs = readSecs.current;
    if (secs < MIN_SECS) { setTooQuick(true); setPhase("intro"); setPicks([null, null]); return; }
    setTooQuick(false);
    const wpm = Math.round(words / Math.max(secs / 60, 0.1));
    const recall = set.recall.filter((r, i) => picks[i] === r.answer).length;
    update((st) => { st.speedRuns.push({ id: uid(), d: today, set: set.id, words, secs: Math.round(secs), wpm, recall }); });
    setResult({ wpm, secs, recall });
    setPhase("done");
  };
  const again = () => { setPicks([null, null]); setResult(null); random(); setPhase("intro"); };

  return (
    <div className="page">
      <div className="view-head">
        <span className="eyebrow">Free tool · VARC</span>
        <h1>Reading speed test</h1>
        <p>Read one passage at your natural pace, then answer two recall questions. Speed only counts when you remember what you read.</p>
      </div>

      {phase === "intro" && (
        <div className="card stack">
          <span className="eyebrow">Passage</span>
          {tooQuick && <p className="err" role="alert">That was under {MIN_SECS} seconds, too quick to measure, so it was not saved. Read the whole passage, then tap Done.</p>}
          <h3>{set.title}</h3>
          <p className="muted small">{words} words · picked for today. The clock starts when the passage appears and stops when you tap Done.</p>
          <div className="row">
            <button type="button" className="btn" onClick={begin}>Start reading</button>
            <button type="button" className="btn ghost" onClick={random}>Pick another passage</button>
          </div>
          <p className="summary"><span>Best with full recall <b>{best ? best + " wpm" : "none yet"}</b></span><span>CAT pace <b>about {EXAM_PACE} wpm</b></span></p>
        </div>
      )}

      {phase === "read" && (
        <>
          <article className="card speedtext">{set.paras.map((p, i) => <p key={i}>{p}</p>)}</article>
          <button type="button" className="btn" style={{ alignSelf: "flex-start" }} onClick={doneReading}>Done reading</button>
        </>
      )}

      {phase === "recall" && (
        <div className="card stack">
          <p className="muted">The passage is hidden. Answer from memory.</p>
          {set.recall.map((r, qi) => (
            <div key={qi} className="stack">
              <p className="stem">{qi + 1}. {r.q}</p>
              <ul className="opts" role="radiogroup">
                {r.options.map((o, i) => (
                  <li key={i}><button type="button" role="radio" aria-checked={picks[qi] === i} className="opt" onClick={() => setPicks((p) => p.map((x, k) => (k === qi ? i : x)))}><span className="l">{LETTERS[i]}</span><span>{o}</span></button></li>
                ))}
              </ul>
            </div>
          ))}
          <button type="button" className="btn" style={{ alignSelf: "flex-start" }} disabled={picks.some((p) => p === null)} onClick={finish}>See my result</button>
        </div>
      )}

      {phase === "done" && result && (
        <div className="card stack">
          <div className="scorebox">
            <div><span className="eyebrow">Your pace</span><div className="big">{result.wpm}<span className="muted" style={{ fontSize: 18 }}> wpm</span></div></div>
            <p className="summary"><span>Recall <b>{result.recall} of 2</b></span><span>Time <b>{fmtSecs(result.secs)}</b></span><span>Words <b>{words}</b></span></p>
          </div>
          <p>{verdict(result.wpm, result.recall)}</p>
          {set.recall.map((r, i) => picks[i] !== r.answer && <p key={i} className="muted small">Q{i + 1}: the answer was “{r.options[r.answer]}”.</p>)}
          <div className="row">
            <button type="button" className="btn" onClick={again}>Test again</button>
            {rcById(set.id) && <Link className="btn ghost" to={`/practice/rc/${set.id}`}>Answer the RC questions on this passage</Link>}
          </div>
        </div>
      )}

      {runs.length > 0 && phase !== "read" && (
        <div className="card">
          <h3>Your recent runs</h3>
          <ul className="log">
            {runs.slice(0, 8).map((r) => (
              <li key={r.id}>
                <div><div className="l1"><span className="d">{shortDate(r.d)}</span><b>{r.wpm} wpm</b><span className={"tag " + (r.recall === 2 ? "t-official" : "t-opt")}>Recall {r.recall}/2</span></div>
                  <div className="nums">{rcById(r.set)?.title ?? r.set} · {fmtSecs(r.secs)}</div></div>
                <span />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
