import { ROADMAP } from "../data/roadmap";

export default function Roadmap() {
  return (
    <div className="page">
      <div className="view-head">
        <h1>What's coming</h1>
        <p>The site grows section by section. VARC is live. DILR and Quant are next.</p>
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
