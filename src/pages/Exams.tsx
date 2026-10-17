import { Ext } from "../components/Links";
import { CAT_PATTERN } from "../data/exam";
import { OTHER_EXAMS, VIA_CAT_NOTES } from "../data/exams";

const TIMELINE = [
  ["Late July", "CAT notification on iimcat.ac.in"],
  ["August to mid-September", "Registration"],
  ["Late October", "Official mock on the real interface"],
  ["Early November", "Admit card"],
  ["Last Sunday of November", "Exam, in three slots"],
  ["Early December", "Response sheet and provisional answer key, objection window"],
  ["Late December or early January", "Results and scorecards"],
  ["January to April", "Shortlists, written ability tests and interviews"],
];

export default function Exams() {
  return (
    <div className="page">
      <div className="view-head">
        <h1>CAT and other exams</h1>
        <p>What CAT looks like, the yearly timeline, and the other entrance tests worth adding to your list.</p>
      </div>
      <section className="stack">
        <h2>CAT pattern</h2>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Section</th><th className="num">Questions</th><th className="num">Minutes</th><th>What it tests</th></tr></thead>
            <tbody>{CAT_PATTERN.map((s) => <tr key={s.id}><td>{s.name}</td><td className="num">{s.questions}</td><td className="num">{s.minutes}</td><td>{s.notes}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="card read">
          <ul>
            <li>68 questions in 120 minutes, with a fixed 40 minutes per section. You cannot switch sections.</li>
            <li>+3 for a correct answer, −1 for a wrong multiple-choice answer, and no negative marking for TITA (type in the answer) questions.</li>
            <li>Scores are scaled across slots, then converted to percentiles. IIMs set both overall and section-wise cutoffs.</li>
            <li>Eligibility: a bachelor's degree with at least 50% marks (45% for SC, ST and PwD), and final-year students can apply.</li>
          </ul>
          <p className="muted small">Based on CAT 2024 and 2025. Read the CAT 2027 notification when it is out.</p>
        </div>
      </section>
      <section className="stack">
        <h2>A typical CAT year</h2>
        <div className="tbl-wrap"><table>
          <thead><tr><th>When</th><th>What</th></tr></thead>
          <tbody>{TIMELINE.map(([w, x]) => <tr key={w}><td>{w}</td><td>{x}</td></tr>)}</tbody>
        </table></div>
      </section>
      <section className="stack">
        <h2>Other MBA entrance exams</h2>
        <div className="grid2">
          {OTHER_EXAMS.map((e) => (
            <article key={e.id} className="card stack">
              <div className="row" style={{ justifyContent: "space-between" }}><h3>{e.name}</h3><span className="eyebrow">{e.body}</span></div>
              <dl className="kv">
                <div><dt>When</dt><dd>{e.window}</dd></div>
                <div><dt>For</dt><dd>{e.for}</dd></div>
                <div><dt>Pattern</dt><dd>{e.pattern}</dd></div>
                <div><dt>Tip</dt><dd>{e.tip}</dd></div>
              </dl>
              <Ext className="go" href={e.site}>Official site ↗</Ext>
            </article>
          ))}
        </div>
      </section>
      <section className="stack">
        <h2>Worth knowing</h2>
        <div className="card"><ul className="plain next">
          {VIA_CAT_NOTES.map((n) => <li key={n.name}><div><span className="ct">{n.name}</span>{n.note}</div><span /></li>)}
        </ul></div>
        <p className="muted small">Windows and admission routes change. Check each school's current admission notice.</p>
      </section>
    </div>
  );
}
