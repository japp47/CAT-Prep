import { Link, useParams } from "react-router-dom";
import { GUIDES } from "../data/guides";
import NotFound from "./NotFound";

export function GuideList() {
  return (
    <div className="page">
      <div className="view-head">
        <h1>Guides</h1>
        <p>Short, practical reads on planning, mocks, staying consistent and what happens after the score.</p>
      </div>
      <div className="grid2">
        {GUIDES.map((g) => (
          <Link key={g.id} to={"/guides/" + g.id} className="card tile">
            <span className="eyebrow">{g.tag} · {g.minutes} min read</span>
            <h3>{g.title}</h3>
            <p>{g.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function GuidePage() {
  const { id } = useParams();
  const i = GUIDES.findIndex((g) => g.id === id);
  if (i < 0) return <NotFound />;
  const g = GUIDES[i], next = GUIDES[(i + 1) % GUIDES.length];
  return (
    <div className="page">
      <Link className="link" to="/guides" style={{ alignSelf: "flex-start" }}>All guides</Link>
      <div className="view-head">
        <span className="eyebrow">{g.tag} · {g.minutes} min read</span>
        <h1>{g.title}</h1>
        <p>{g.summary}</p>
      </div>
      <article className="card read">
        {g.parts.map((p) => (
          <section key={p.h}>
            <h3>{p.h}</h3>
            {p.p?.map((x, k) => <p key={k}>{x}</p>)}
            {p.ol && <ol>{p.ol.map((x, k) => <li key={k}>{x}</li>)}</ol>}
            {p.ul && <ul>{p.ul.map((x, k) => <li key={k}>{x}</li>)}</ul>}
          </section>
        ))}
      </article>
      <Link to={"/guides/" + next.id} className="card tile"><span className="eyebrow">Next guide</span><h3>{next.title}</h3><p>{next.summary}</p></Link>
    </div>
  );
}
