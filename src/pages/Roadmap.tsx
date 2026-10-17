import { ROADMAP } from "../data/roadmap";
import { REPO_URL } from "../data/site";

export default function Roadmap() {
  return (
    <div className="page">
      <div className="view-head">
        <h1>What's coming</h1>
        <p>The site grows one step at a time. VARC is live with practice; DILR, Quant and optional sign-in come next. Found a problem or have an idea? <a href={REPO_URL + "/issues/new"} target="_blank" rel="noopener noreferrer">Tell us on GitHub ↗</a></p>
      </div>
      {ROADMAP.map((g) => (
        <section key={g.title} className="card">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}><h2>{g.title}</h2><span className="tag t-opt">{g.status}</span></div>
          <ul className="plain roadmap">
            {g.items.map((it) => <li key={it.title}><b>{it.title}</b><span className="muted">{it.text}</span></li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}
