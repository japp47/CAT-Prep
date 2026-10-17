import { Link } from "react-router-dom";
import { daysLeft, examLine, PhaseBar } from "../components/Countdown";
import { CAT_PATTERN, CHECKED_ON, EXAM_CONFIRMED, EXAM_NAME, PHASES, phaseOf } from "../data/exam";
import { UPDATES } from "../data/updates";
import { addDays, clamp, diffDays, longDate, mediumDate, shortDate, todayIso, weekStart } from "../lib/date";
import { useStore } from "../lib/store";
import { budgetFor, buildDay, doneMinutes } from "../planner/engine";
import { LIVE_SECTIONS, SECTIONS } from "../sections";
import { rcOfDay } from "../practice/daily";
import { dueRedo } from "../practice/redo";
import { activityDays } from "../practice/streak";
import { GENRES } from "../practice/types";
import { DAILY_MIX } from "../practice/va/build";
import { StreakBadge } from "./practice/common";

/** The site map below the fold. Each row is a page and one line on why you would open it. */
const INDEX: { h: string; rows: { to: string; n: string; w: string; soon?: boolean }[] }[] = [
  { h: "Study", rows: [
    { to: "/today", n: "Today's timetable", w: "A plan that fits the time you have, from 30 minutes to 3 hours." },
    { to: "/plan", n: "Plan and time", w: "Five phases to the exam, and your usual time per day." },
    { to: "/practice", n: "Practice", w: "Original RC sets, VA drills, a redo queue and a speed test." },
  ] },
  { h: "Sections", rows: SECTIONS.map((s) => ({ to: "/" + s.id, n: s.short, w: s.name + (s.status === "live" ? ". Guides, question banks, reading lists." : "."), soon: s.status !== "live" })) },
  { h: "Track", rows: [
    { to: "/progress", n: "Progress", w: "Accuracy by question type and your mock scores." },
    { to: "/errors", n: "Error log", w: "Every mistake, with the trap that caught you." },
    { to: "/words", n: "Words", w: "Flashcards from the words you save while reading." },
  ] },
  { h: "Explore", rows: [
    { to: "/guides", n: "Guides", w: "Starting out, studying while working, mock analysis." },
    { to: "/updates", n: "Important updates", w: "Exam dates and changes, marked official or expected." },
    { to: "/exams", n: "CAT and other exams", w: "Pattern, marking and the other MBA tests." },
    { to: "/stories", n: "Topper stories", w: "What 99+ percentile scorers actually did." },
  ] },
];

const STATUS = { official: "Official", expected: "Expected", tip: "Tip" } as const;
const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

function Hero({ isNew }: { isNew: boolean }) {
  const left = Math.max(daysLeft(), 0);
  const t = todayIso();
  const ph = phaseOf(t);
  const caption = ph.kind === "phase"
    ? <>Phase {ph.phase.id} of {PHASES.length}, <b>{ph.phase.name}</b>. {diffDays(t, ph.phase.end) + 1} days left in this phase, to {mediumDate(ph.phase.end)}.</>
    : ph.kind === "pre" ? <>The plan starts on {mediumDate(PHASES[0].start)}.</>
    : ph.kind === "exam" ? <>Exam day. All the best.</> : <>{EXAM_NAME} is over. Check results on iimcat.ac.in.</>;
  return (
    <header className="h-hero">
      <div className="h-intro">
        <span className="eyebrow">{longDate(t)}</span>
        <h1>Prepare for {EXAM_NAME}, <span className="h-soft">one day at a time.</span></h1>
        <p className="h-lede">A free study plan that fits the time you have, with original practice, hand-picked resources and plain guidance. No sign-up. Everything stays on your device.</p>
        <div className="row">
          <Link className="btn" to="/today">Open today's plan</Link>
          <Link className="btn ghost" to="/practice">Practice now</Link>
        </div>
        {isNew && <p className="small muted">New here? <Link to="/guides/start-here">Read the start guide</Link>, about 4 minutes.</p>}
      </div>
      <div className="h-count">
        <span className="h-num">{left}</span>
        <span className="h-unit">{left === 1 ? "day" : "days"} to {EXAM_NAME}</span>
        <span className="h-date">{examLine(EXAM_CONFIRMED)}</span>
      </div>
      <div className="h-year">
        <PhaseBar />
        <p className="small muted">{caption}</p>
      </div>
    </header>
  );
}

function TodayPanel() {
  const { state } = useStore();
  const t = todayIso();
  const planned = LIVE_SECTIONS.reduce((s, sec) => s + budgetFor(sec, state, t), 0);
  const done = doneMinutes(state, t);
  const core = LIVE_SECTIONS.map((sec) => buildDay(sec, state, t, budgetFor(sec, state, t), { today: t }).find((b) => b.pri === 1)).filter((b) => !!b);
  const doneMap = state.days[t]?.done ?? {};
  const active = activityDays(state);
  const mon = weekStart(t);

  const rc = rcOfDay(t);
  const rcTry = state.rcAttempts.filter((a) => a.set === rc.id && a.d === t).pop();
  const vaTry = state.vaAttempts.filter((a) => a.mode === "daily" && a.d === t).pop();
  const redo = dueRedo(state.redo, t).length;

  return (
    <section className="stack" aria-labelledby="h-today">
      <div className="h-head"><h2 id="h-today">Today</h2><StreakBadge /></div>
      <div className="h-panel">
        <div className="h-cell">
          <span className="eyebrow">Your plan</span>
          <p className="h-fig"><b>{done}</b><span> of {planned} min</span></p>
          <div className="meter" role="progressbar" aria-label="Minutes done today" aria-valuemin={0} aria-valuemax={planned} aria-valuenow={done}>
            <i style={{ width: (planned ? clamp(done / planned, 0, 1) * 100 : 0) + "%" }} />
          </div>
          {core.length
            ? core.map((b) => <p key={b.key} className="h-line"><span className="tag t-must">Core</span> {b.name}, {b.mins} min{doneMap[b.key] ? <span className="ok"> · done</span> : null}</p>)
            : <p className="h-line muted">Rest day. Nothing planned.</p>}
          <ol className="h-week" aria-label="Days studied this week">
            {WEEK.map((w, i) => {
              const d = addDays(mon, i);
              const on = active.has(d);
              return <li key={d} className={(on ? "on" : "") + (d === t ? " now" : "")} title={shortDate(d) + (on ? ", studied" : "")}><i />{w}</li>;
            })}
          </ol>
          <Link className="h-go" to="/today">Open the timetable →</Link>
        </div>
        <div className="h-cell">
          <span className="eyebrow">RC of the day · {GENRES[rc.genre]}</span>
          <Link className="h-title" to={`/practice/rc/${rc.id}`}>{rc.title}</Link>
          <p className="h-line muted">{rc.words} words, {rc.questions} questions, every option explained.</p>
          {rcTry && <p className="h-line ok">Done today: {rcTry.c} of {rc.questions} correct.</p>}
          <Link className="h-go" to={rcTry ? `/practice/rc/${rc.id}?review=${rcTry.id}` : `/practice/rc/${rc.id}`}>{rcTry ? "Review your answers →" : "Start the passage →"}</Link>
        </div>
        <div className="h-cell">
          <span className="eyebrow">Daily VA drill</span>
          <Link className="h-title" to="/practice/va">{DAILY_MIX.length} questions, all four VA types</Link>
          <p className="h-line muted">Para summary, sentence insertion, odd sentence out and para jumbles.</p>
          {vaTry && <p className="h-line ok">Done today: {vaTry.items.filter((i) => i.ok).length} of {vaTry.items.length} correct.</p>}
          {redo > 0 && <Link className="h-redo" to="/practice/redo"><b>{redo}</b> missed question{redo > 1 ? "s" : ""} due in the redo queue →</Link>}
          <Link className="h-go" to="/practice/va">{vaTry ? "Review your answers →" : "Start the drill →"}</Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { state } = useStore();
  const isNew = activityDays(state).size === 0;
  const total = CAT_PATTERN.reduce((a, s) => ({ q: a.q + s.questions, m: a.m + s.minutes }), { q: 0, m: 0 });

  return (
    <div className="page home">
      <Hero isNew={isNew} />
      <TodayPanel />

      <section className="stack" aria-labelledby="h-index">
        <div className="h-head"><h2 id="h-index">On this site</h2></div>
        <div className="h-index">
          {INDEX.map((g) => (
            <div key={g.h} className="h-group">
              <span className="eyebrow">{g.h}</span>
              <ul>
                {g.rows.map((r) => (
                  <li key={r.to}>
                    <Link to={r.to}><b>{r.n}{r.soon && <span className="soon">Soon</span>}</b><span>{r.w}</span></Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="h-split">
        <section className="stack" aria-labelledby="h-upd">
          <div className="h-head"><h2 id="h-upd">Latest updates</h2><Link className="link" to="/updates">All updates</Link></div>
          <ul className="h-upd">
            {UPDATES.slice(0, 4).map((u) => (
              <li key={u.id}>
                <span className="h-meta">{shortDate(u.date)} · {u.exam} · <span className={"st-" + u.status}>{STATUS[u.status]}</span></span>
                <Link to="/updates">{u.title}</Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="stack" aria-labelledby="h-exam">
          <div className="h-head"><h2 id="h-exam">The exam</h2><Link className="link" to="/exams">Pattern and marking</Link></div>
          <ul className="h-exam">
            {CAT_PATTERN.map((s) => (
              <li key={s.id}>
                <b>{s.id.toUpperCase()}</b>
                <span>{s.name}</span>
                <span className="h-qm">{s.questions} Q · {s.minutes} min</span>
              </li>
            ))}
            <li className="h-total"><b>Total</b><span>+3 for a right answer, −1 for a wrong MCQ, no penalty on TITA.</span><span className="h-qm">{total.q} Q · {total.m} min</span></li>
          </ul>
        </section>
      </div>

      <p className="foot">Resources checked on {CHECKED_ON}. The {EXAM_NAME} date is an estimate until the conducting IIM announces it. Score benchmarks come from coaching institutes. Not affiliated with the IIMs or any coaching institute. Avoid pirated book PDFs; the papers and free mocks listed here are legitimately free.</p>
    </div>
  );
}
