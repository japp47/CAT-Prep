import { Link } from "react-router-dom";
import { Ext } from "../components/Links";
import { LESSONS, TOPPERS } from "../data/stories";
import { RESOURCES } from "../sections/varc/resources";

export default function Stories() {
  const interviews = RESOURCES.filter((r) => r.c === "toppers");
  return (
    <div className="page">
      <div className="view-head">
        <h1>Topper stories</h1>
        <p>How 99+ percentile scorers prepared, in their own words where an interview is available.</p>
      </div>
      <div className="grid2">
        {LESSONS.map((l) => <div key={l.h} className="card"><h3>{l.h}</h3><p className="muted">{l.p}</p></div>)}
      </div>
      <section className="stack">
        <h2>What they did</h2>
        <div className="grid3">
          {TOPPERS.map((t) => (
            <article key={t.name} className="card stack">
              <span className="eyebrow">{t.result}</span>
              <h3>{t.name}</h3>
              <p className="muted">{t.what}</p>
              {t.link && <Ext className="go" href={t.link}>Read the interview ↗</Ext>}
            </article>
          ))}
        </div>
      </section>
      <section className="stack">
        <h2>Interviews and exam analysis</h2>
        <div className="card"><ul className="plain next">
          {interviews.map((r) => (
            <li key={r.id}>
              <div style={{ minWidth: 0 }}><span className="ct">{r.t}</span><Ext className="res-name" href={r.u}>{r.n}</Ext><p className="muted small">{r.w}</p></div>
              <Ext className="go" href={r.u}>Open ↗</Ext>
            </li>
          ))}
        </ul></div>
      </section>
      <div className="card stack">
        <h3>Share your story</h3>
        <p className="muted">Scored well in CAT? Your preparation story can help next year's students. Story submissions are on the <Link to="/roadmap">roadmap</Link>.</p>
      </div>
    </div>
  );
}
