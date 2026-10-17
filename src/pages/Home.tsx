import { Link } from "react-router-dom";
import { CountdownNumber, Timeline, examLine, phaseCaption } from "../components/Countdown";
import { UpdateItem } from "../components/UpdateItem";
import { CAT_PATTERN, CHECKED_ON, EXAM_CONFIRMED } from "../data/exam";
import { UPDATES } from "../data/updates";
import { todayIso } from "../lib/date";
import { useStore } from "../lib/store";
import { budgetFor, buildDay } from "../planner/engine";
import { LIVE_SECTIONS, SECTIONS } from "../sections";
import { rcOfDay } from "../practice/daily";
import { RC_SETS } from "../practice/rc";
import { StreakBadge } from "./practice/common";

const TILES = [
  { to: "/today", eyebrow: "Planner", title: "Today's timetable", text: "A plan for today that fits the time you have. 30 minutes or 3 hours." },
  { to: "/practice", eyebrow: "Practice", title: "RC and VA practice", text: `${RC_SETS.length} exam-style RC sets with every option explained, a daily VA drill, a redo queue for mistakes and a reading speed test. Free, no sign-up.` },
  { to: "/varc", eyebrow: "VARC", title: "VARC resource library", text: "About 120 hand-picked links: books, question banks, past papers, mocks, reading lists and videos." },
  { to: "/updates", eyebrow: "News", title: "Important updates", text: "CAT, XAT, SNAP and NMAT dates and changes, marked official or expected." },
  { to: "/exams", eyebrow: "Exams", title: "CAT and other exams", text: "Pattern, marking, timeline, and the other MBA tests worth a seat." },
  { to: "/guides", eyebrow: "Guidance", title: "Guides", text: "Starting from zero, preparing while working, mock analysis and life after the score." },
  { to: "/stories", eyebrow: "Stories", title: "Topper stories", text: "What 99+ percentile scorers actually did, with links to their interviews." },
];

export default function Home() {
  const { state } = useStore();
  const t = todayIso();
  const planned = LIVE_SECTIONS.reduce((s, sec) => s + budgetFor(sec, state, t), 0);
  const core = LIVE_SECTIONS.map((sec) => ({ sec, b: buildDay(sec, state, t, budgetFor(sec, state, t), { today: t }).find((b) => b.pri === 1) })).filter((x) => x.b);
  const doneToday = state.days[t]?.done ?? {};

  return (
    <div className="page">
      <section className="card hero">
        <div className="hero-top">
          <div className="stack" style={{ gap: 8 }}>
            <span className="eyebrow">{examLine(EXAM_CONFIRMED)}</span>
            <h1>Prepare for CAT 2027, one day at a time</h1>
            <p className="muted" style={{ maxWidth: "60ch" }}>A free hub with a timetable that adapts to your day, curated resources, past papers, updates and guidance. No sign-up. Your progress stays on your device.</p>
          </div>
          <CountdownNumber />
        </div>
        <Timeline />
        <p className="muted">{phaseCaption()}</p>
        <div className="row">
          <Link className="btn" to="/today">Open today's timetable</Link>
          <Link className="btn ghost" to="/plan">Set my study time</Link>
        </div>
      </section>

      <div className="grid2">
        <div className="card stack">
          <div className="row" style={{ justifyContent: "space-between" }}><h3>Today at a glance</h3><StreakBadge /></div>
          <p className="summary"><span>Planned <b>{planned}</b> min</span><span>Done <b>{Object.values(doneToday).reduce((a, b) => a + b, 0)}</b> min</span></p>
          {core.length ? core.map(({ sec, b }) => (
            <p key={sec.id}><span className="tag t-must">{sec.short} core</span> {b!.name} · {b!.mins} min {doneToday[b!.key] ? <span className="ok">Done</span> : null}</p>
          )) : <p className="muted">Nothing planned today. Enjoy the rest.</p>}
          <p><span className="tag t-good">RC of the day</span> <Link to={`/practice/rc/${rcOfDay(t).id}`}>{rcOfDay(t).title}</Link></p>
          <Link className="link" to="/today" style={{ alignSelf: "flex-start" }}>See the full timetable</Link>
        </div>
        <div className="card">
          <h3>Sections</h3>
          {SECTIONS.map((s) => (
            <div key={s.id} className="secrow">
              <div><b>{s.short}</b> <span className="muted small">{s.name}</span></div>
              {s.status === "live" ? <Link className="go" to={"/" + s.id}>Open</Link> : <span className="soon">Soon</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid3">
        {TILES.map((x) => (
          <Link key={x.to} to={x.to} className="card tile"><span className="eyebrow">{x.eyebrow}</span><h3>{x.title}</h3><p>{x.text}</p></Link>
        ))}
      </div>

      <section className="stack">
        <div className="row" style={{ justifyContent: "space-between" }}><h2>Latest updates</h2><Link className="link" to="/updates">All updates</Link></div>
        {UPDATES.slice(0, 3).map((u) => <UpdateItem key={u.id} u={u} />)}
      </section>

      <section className="stack">
        <h2>The exam in one table</h2>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Section</th><th className="num">Questions</th><th className="num">Minutes</th><th>What it tests</th></tr></thead>
            <tbody>{CAT_PATTERN.map((s) => <tr key={s.id}><td>{s.name}</td><td className="num">{s.questions}</td><td className="num">{s.minutes}</td><td>{s.notes}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="muted small">Pattern from CAT 2024 and 2025. +3 for a correct answer, −1 for a wrong MCQ, no negative marking on TITA questions. <Link to="/exams">More on the exam</Link>.</p>
      </section>

      <p className="foot">Resources checked on {CHECKED_ON}. The CAT 2027 date is an estimate until the conducting IIM announces it. Score benchmarks come from coaching institutes. Not affiliated with the IIMs or any coaching institute. Avoid pirated book PDFs; the papers and free mocks listed here are legitimately free.</p>
    </div>
  );
}
