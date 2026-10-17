import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ContentGate } from "../../components/Content";
import { mediumDate, todayIso, uid } from "../../lib/date";
import { useStore } from "../../lib/store";
import type { Content } from "../../practice/content";
import { fmtSecs, LETTERS } from "../../practice/record";
import { resolveRedo } from "../../practice/redo";
import {
  buildPaper, byType, loadDraft, marksOf, newDraft, qStatus, recordSectional, saveDraft, scorePaper, secsLeft,
  SECTIONAL_RC, SECTIONAL_SECS, type Draft, type QStatus,
} from "../../practice/sectional";
import { VA_KIND } from "../../practice/va/build";
import NotFound from "../NotFound";
import { Passage, ReviewQuestion } from "./RcPlayer";
import { ItemInput, ItemReview } from "./VaPlayer";

const MAX = 72;
const STATUS_LABEL: Record<QStatus, string> = { unseen: "not visited", open: "not answered", done: "answered", marked: "marked for review", doneMarked: "answered and marked" };
const STATUS_CLASS: Record<QStatus, string> = { unseen: "", open: " open", done: " ans", marked: " mk", doneMarked: " ans mark" };

export default function Sectional() {
  return <ContentGate>{(c) => <SectionalRoute c={c} />}</ContentGate>;
}

function SectionalRoute({ c }: { c: Content }) {
  const [draft, setDraft] = useState<Draft | null>(() => loadDraft());
  return draft ? <Exam key={draft.id} start={draft} c={c} onQuit={() => { saveDraft(null); setDraft(null); }} /> : <Start onStart={setDraft} />;
}

function Start({ onStart }: { onStart: (d: Draft) => void }) {
  const { state } = useStore();
  const begin = () => {
    const d = newDraft(uid(), buildPaper(state, uid()), Date.now());
    saveDraft(d);
    onStart(d);
  };
  const past = [...state.sectionals].reverse();
  return (
    <div className="page">
      <div className="view-head">
        <span className="eyebrow">Timed VARC sectional</span>
        <h1>40 minutes, 24 questions</h1>
        <p>The VARC section as CAT sets it, with passages and paragraphs written for this site. Questions you have not seen yet come first.</p>
      </div>
      <div className="card stack">
        <ul className="sec-rules">
          <li><b>{SECTIONAL_RC} reading passages</b><span>16 questions. MCQ: +3 right, −1 wrong.</span></li>
          <li><b>8 verbal ability questions</b><span>2 each of para summary and sentence insertion (MCQ, −1 wrong), and odd sentence out and para jumbles (TITA, no negative marks).</span></li>
          <li><b>Out of {MAX}</b><span>The 99 percentile in CAT 2025 was about 43 scaled marks, roughly 15 to 17 right with at most 3 wrong.</span></li>
        </ul>
        <p className="muted small">The clock starts when you press Start and keeps running if you leave the page, as in the real exam. Your answers are saved as you go, and the section submits itself at 0:00.</p>
        <div className="row"><button type="button" className="btn" onClick={begin}>Start the sectional</button><Link className="btn ghost" to="/practice">Back to Practice</Link></div>
      </div>
      {past.length > 0 && (
        <section className="stack">
          <h2>Your sectionals</h2>
          <ul className="lib">
            {past.map((s) => (
              <li key={s.id}>
                <div style={{ minWidth: 0 }}>
                  <b>{3 * s.c - s.w > 0 ? "+" : ""}{3 * s.c - s.w} / {MAX}</b>
                  <div className="meta">{mediumDate(s.d)} · {s.c} correct · {fmtSecs(s.secs)} used</div>
                </div>
                <Link className="go" to={`/practice/sectional/${s.id}`}>Review</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Exam({ start, c, onQuit }: { start: Draft; c: Content; onQuit: () => void }) {
  const { update } = useStore();
  const navigate = useNavigate();
  const [d, setD] = useState(start);
  const [now, setNow] = useState(Date.now());
  const [pane, setPane] = useState<"p" | "q">("p");
  const [confirm, setConfirm] = useState<"submit" | "quit" | null>(null);
  // The palette starts folded on phones, so the question stays near the top of the screen.
  const [wide] = useState(() => typeof matchMedia === "function" && matchMedia("(min-width: 960px)").matches);
  const enteredAt = useRef(Date.now());
  const done = useRef(false);
  const left = secsLeft(d, now);

  /** Adds the time since the last call to the question on screen. */
  const spent = () => { const t = Date.now(), dt = (t - enteredAt.current) / 1000; enteredAt.current = t; return dt; };
  const withTime = (p: Draft, dt: number) => ({ ...p, t: p.t.map((x, k) => (k === p.cur ? x + dt : x)) });
  const go = (i: number) => {
    const dt = spent();
    setD((p) => ({ ...withTime(p, dt), cur: i, seen: p.seen.map((s, k) => s || k === i) }));
    setPane("p");
    window.scrollTo(0, 0);
  };
  const setAnswer = (v: string) => setD((p) => ({ ...p, a: p.a.map((x, k) => (k === p.cur ? v : x)) }));
  const toggleMark = () => setD((p) => ({ ...p, marked: p.marked.map((x, k) => (k === p.cur ? !x : x)) }));

  const submit = () => {
    if (done.current) return;
    done.current = true;
    const final = withTime(d, spent());
    const at = Date.now(), secs = Math.min(SECTIONAL_SECS, (at - d.startedAt) / 1000);
    update((st) => recordSectional(st, d.id, final.qs, final.a, final.t, secs, todayIso(), c, at));
    saveDraft(null);
    navigate(`/practice/sectional/${d.id}`, { replace: true });
  };

  useEffect(() => { saveDraft(d); }, [d]);
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const flush = setInterval(() => { const dt = spent(); setD((p) => withTime(p, dt)); }, 5000);
    return () => { clearInterval(tick); clearInterval(flush); };
  }, []);
  useEffect(() => { if (left === 0) submit(); });

  const ref = useMemo(() => resolveRedo(d.qs[d.cur], c), [d.qs, d.cur, c]);
  const n = d.qs.length;
  const counts = d.qs.map((_, i) => qStatus(d, i)).reduce((m, s) => ({ ...m, [s]: (m[s] ?? 0) + 1 }), {} as Partial<Record<QStatus, number>>);
  const blank = d.a.filter((x) => x === "").length;
  const rcCount = d.qs.filter((k) => k.startsWith("rc:")).length;
  const passageNo = ref?.kind === "rc" ? d.qs.slice(0, d.cur + 1).map((k) => k.split(":")[1]).filter((s, i, a) => a.indexOf(s) === i).length : 0;

  return (
    <div className="page">
      <div className="pbar">
        <div className="stack" style={{ gap: 2, minWidth: 0 }}>
          <span className="eyebrow">VARC sectional · question {d.cur + 1} of {n}</span>
          <h1>{ref?.kind === "rc" ? `Passage ${passageNo} of ${SECTIONAL_RC}` : ref ? VA_KIND[ref.item.kind].label : "Question"}</h1>
        </div>
        <div className="row">
          <span className={"timer" + (left <= 300 ? " over" : "")} role="timer" aria-label={`${fmtSecs(left)} left`}>{fmtSecs(left)} left</span>
          <button type="button" className="btn sm" onClick={() => setConfirm("submit")}>Submit section</button>
        </div>
      </div>

      <details className="card sec-pal" open={wide}>
        <summary>Question palette <span className="muted small">· {counts.done ?? 0} answered, {(counts.marked ?? 0) + (counts.doneMarked ?? 0)} marked</span></summary>
        <div className="sec-groups">
          {[["Reading comprehension", 0, rcCount], ["Verbal ability", rcCount, n]].map(([label, from, to]) => (
            <div key={label as string} className="stack" style={{ gap: 6 }}>
              <span className="eyebrow">{label}</span>
              <div className="palette" role="group" aria-label={label as string}>
                {d.qs.slice(from as number, to as number).map((_, j) => {
                  const i = (from as number) + j, s = qStatus(d, i);
                  return <button key={i} type="button" className={"pal" + STATUS_CLASS[s] + (i === d.cur ? " cur" : "")} onClick={() => go(i)} aria-current={i === d.cur} aria-label={`Question ${i + 1}, ${STATUS_LABEL[s]}`}>{i + 1}</button>;
                })}
              </div>
            </div>
          ))}
        </div>
        <ul className="pal-legend" aria-label="Palette key">
          <li><i className="pal ans" />Answered <b>{counts.done ?? 0}</b></li>
          <li><i className="pal open" />Not answered <b>{counts.open ?? 0}</b></li>
          <li><i className="pal mk" />Marked <b>{counts.marked ?? 0}</b></li>
          <li><i className="pal ans mark" />Answered and marked <b>{counts.doneMarked ?? 0}</b></li>
          <li><i className="pal" />Not visited <b>{counts.unseen ?? 0}</b></li>
        </ul>
      </details>

      {ref?.kind === "rc" && (
        <>
          <div className="seg panes" role="group" aria-label="Show" style={{ alignSelf: "flex-start" }}>
            <button type="button" aria-pressed={pane === "p"} onClick={() => setPane("p")}>Passage</button>
            <button type="button" aria-pressed={pane === "q"} onClick={() => setPane("q")}>Question {d.cur + 1}</button>
          </div>
          <div className="split" data-pane={pane}>
            <Passage set={ref.set} highlight={[]} wordMode={false} />
            <div className="qpane">
              <div className="card stack">
                <span className="eyebrow">Question {d.cur + 1} · MCQ, −1 if wrong</span>
                <p className="stem">{ref.set.questions[ref.qi].stem}</p>
                <ul className="opts" role="radiogroup" aria-label={"Options for question " + (d.cur + 1)}>
                  {ref.set.questions[ref.qi].options.map((o, i) => (
                    <li key={i}><button type="button" role="radio" aria-checked={d.a[d.cur] === String(i)} className="opt" onClick={() => setAnswer(String(i))}><span className="l">{LETTERS[i]}</span><span>{o.t}</span></button></li>
                  ))}
                </ul>
              </div>
              <Actions d={d} n={n} go={go} clear={() => setAnswer("")} mark={toggleMark} />
            </div>
          </div>
        </>
      )}
      {ref?.kind === "va" && (
        <div className="card stack">
          <span className="eyebrow">Question {d.cur + 1} · {VA_KIND[ref.item.kind].tita ? "TITA, no negative marks" : "MCQ, −1 if wrong"}</span>
          <ItemInput key={d.cur} item={ref.item} answer={d.a[d.cur]} setAnswer={setAnswer} />
          <Actions d={d} n={n} go={go} clear={() => setAnswer("")} mark={toggleMark} />
        </div>
      )}
      {!ref && <div className="empty">This question is no longer in the library. Move on to the next one.<div className="row" style={{ justifyContent: "center", marginTop: 10 }}><button type="button" className="btn sm" disabled={d.cur === n - 1} onClick={() => go(d.cur + 1)}>Next</button></div></div>}

      {confirm === "submit" && (
        <div className="card stack accent" role="alertdialog" aria-label="Submit the section?">
          <p><b>Submit the section?</b> {blank ? `${blank} question${blank > 1 ? "s are" : " is"} unanswered.` : "Every question has an answer."} {fmtSecs(left)} is left. You cannot change answers after this.</p>
          <div className="row"><button type="button" className="btn" onClick={submit}>Submit</button><button type="button" className="btn ghost" onClick={() => setConfirm(null)}>Keep going</button></div>
        </div>
      )}
      {confirm === "quit" && (
        <div className="card stack accent" role="alertdialog" aria-label="Discard this sectional?">
          <p><b>Discard this sectional?</b> Nothing is saved to Progress. You can start a new one any time.</p>
          <div className="row"><button type="button" className="btn danger" onClick={onQuit}>Discard</button><button type="button" className="btn ghost" onClick={() => setConfirm(null)}>Keep going</button></div>
        </div>
      )}
      {!confirm && <button type="button" className="link small" style={{ alignSelf: "flex-start" }} onClick={() => setConfirm("quit")}>Discard this sectional</button>}
    </div>
  );
}

/** The CAT-style buttons under each question. */
function Actions({ d, n, go, clear, mark }: { d: Draft; n: number; go: (i: number) => void; clear: () => void; mark: () => void }) {
  const last = d.cur === n - 1;
  return (
    <div className="qnav">
      <div className="row">
        <button type="button" className="btn ghost sm" onClick={clear} disabled={d.a[d.cur] === ""}>Clear response</button>
        <button type="button" className="btn ghost sm" aria-pressed={d.marked[d.cur]} onClick={() => { mark(); if (!d.marked[d.cur] && !last) go(d.cur + 1); }}>
          {d.marked[d.cur] ? "Unmark" : last ? "Mark for review" : "Mark for review and next"}
        </button>
      </div>
      <div className="row">
        <button type="button" className="btn ghost sm" disabled={d.cur === 0} onClick={() => go(d.cur - 1)}>Previous</button>
        <button type="button" className="btn sm" disabled={last} onClick={() => go(d.cur + 1)}>Save and next</button>
      </div>
    </div>
  );
}

export function SectionalReview() {
  return <ContentGate>{(c) => <Review c={c} />}</ContentGate>;
}

function Review({ c }: { c: Content }) {
  const { id } = useParams();
  const { state } = useStore();
  const [cur, setCur] = useState(0);
  const [pane, setPane] = useState<"p" | "q">("q");
  const s = state.sectionals.find((x) => x.id === id);
  const rows = useMemo(() => (s ? scorePaper(s.qs, s.a, c) : []), [s, c]);
  useEffect(() => { window.scrollTo(0, 0); }, [cur]);
  if (!s) return <NotFound />;

  const marks = marksOf(rows);
  const types = byType(rows, s.t);
  const attempted = rows.filter((r) => !r.blank).length;
  const correct = rows.filter((r) => r.ok).length;
  const row = rows[cur];
  const slow = [...rows].sort((a, b) => (s.t[b.i] ?? 0) - (s.t[a.i] ?? 0)).slice(0, 3).filter((r) => (s.t[r.i] ?? 0) >= 120);

  return (
    <div className="page">
      <div className="pbar">
        <div className="stack" style={{ gap: 2, minWidth: 0 }}>
          <span className="eyebrow">Sectional review · {mediumDate(s.d)}</span>
          <h1>Score {marks > 0 ? "+" : ""}{marks} of {MAX}</h1>
        </div>
        <div className="row"><Link className="btn ghost sm" to="/practice/sectional">All sectionals</Link></div>
      </div>

      <div className="card stack">
        <div className="scorebox">
          <div><span className="eyebrow">Score</span><div className="big">{marks > 0 ? "+" : ""}{marks}<span className="muted" style={{ fontSize: 18 }}> / {MAX}</span></div></div>
          <p className="summary">
            <span>Correct <b>{correct}</b></span>
            <span>Wrong <b>{attempted - correct}</b></span>
            <span>Blank <b>{rows.length - attempted}</b></span>
            <span>Accuracy <b>{attempted ? Math.round((correct / attempted) * 100) : 0}%</b></span>
            <span>Time <b>{fmtSecs(s.secs)}</b></span>
          </p>
        </div>
        <div className="tbl-wrap"><table>
          <thead><tr><th>Type</th><th className="num">Attempted</th><th className="num">Correct</th><th className="num">Marks</th><th className="num">Time</th><th className="num">Per question</th></tr></thead>
          <tbody>{types.map((x) => (
            <tr key={x.type}><td>{x.type}</td><td className="num">{x.attempted} of {x.n}</td><td className="num">{x.correct}</td><td className="num">{x.marks > 0 ? "+" : ""}{x.marks}</td><td className="num">{fmtSecs(x.secs)}</td><td className="num">{fmtSecs(x.secs / x.n)}</td></tr>
          ))}</tbody>
        </table></div>
        {slow.length > 0 && <p className="muted small">Longest on: {slow.map((r) => `Q${r.i + 1} (${fmtSecs(s.t[r.i])}${r.ok ? ", right" : r.blank ? ", blank" : ", wrong"})`).join(", ")}. Over 2 minutes on one question is usually time better spent elsewhere.</p>}
        <p className="muted small">Saved in Progress as a sectional and by question type. Wrong and blank questions join your <Link to="/practice/redo">redo queue</Link>.</p>
        <div className="row"><Link className="btn" to="/practice/sectional">Take another sectional</Link></div>
      </div>

      <div className="palette" role="group" aria-label="Questions">
        {rows.map((r, k) => (
          <button key={r.i} type="button" className={"pal" + (r.blank ? " blank" : r.ok ? " ok" : " bad") + (k === cur ? " cur" : "")} onClick={() => setCur(k)} aria-current={k === cur} aria-label={`Question ${r.i + 1}, ${r.blank ? "blank" : r.ok ? "correct" : "wrong"}`}>{r.i + 1}</button>
        ))}
      </div>

      {row && <p className="muted small">Question {row.i + 1} · {row.type} · {fmtSecs(s.t[row.i] ?? 0)} spent on it</p>}
      {row?.ref.kind === "rc" && (
        <>
          <div className="seg panes" role="group" aria-label="Show" style={{ alignSelf: "flex-start" }}>
            <button type="button" aria-pressed={pane === "p"} onClick={() => setPane("p")}>Passage</button>
            <button type="button" aria-pressed={pane === "q"} onClick={() => setPane("q")}>Question {row.i + 1}</button>
          </div>
          <div className="split" data-pane={pane}>
            <Passage set={row.ref.set} highlight={row.ref.set.questions[row.ref.qi].proof} wordMode />
            <div className="qpane"><ReviewQuestion set={row.ref.set} qi={row.ref.qi} chosen={s.a[row.i] === "" ? null : Number(s.a[row.i])} /></div>
          </div>
        </>
      )}
      {row?.ref.kind === "va" && <div className="card stack"><span className="eyebrow">{VA_KIND[row.ref.item.kind].label}</span><ItemReview item={row.ref.item} answer={s.a[row.i]} /></div>}
      <div className="qnav">
        <button type="button" className="btn ghost sm" disabled={cur === 0} onClick={() => setCur(cur - 1)}>Previous question</button>
        <button type="button" className="btn ghost sm" disabled={cur >= rows.length - 1} onClick={() => setCur(cur + 1)}>Next question</button>
      </div>
    </div>
  );
}
