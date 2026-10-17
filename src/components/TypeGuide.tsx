import { Link, useNavigate } from "react-router-dom";
import { uid } from "../lib/date";
import { VA_KIND } from "../practice/va/build";
import type { Trap, TypeGuide as Guide } from "../sections/varc/guides";
import { Ext } from "./Links";

const LETTERS = "ABCD";

function TrapItem({ t }: { t: Trap }) {
  return typeof t === "string" ? <li>{t}</li> : <li><b>{t[0]}:</b> {t[1]}</li>;
}

function Example({ g }: { g: Guide }) {
  const x = g.example;
  return (
    <section className="g-ex" aria-label="Worked example">
      <h4>Worked example</h4>
      <p className="g-ask">{x.ask}</p>
      {x.insert && <p className="insbox">{x.insert}</p>}
      {x.passage && <p className="g-passage">{x.passage}</p>}
      {x.items && <ol className="g-items">{x.items.map((s, i) => <li key={i}><span className="n">{i + 1}</span><span>{s}</span></li>)}</ol>}
      {x.question && <p className="stem">{x.question}</p>}
      {x.options && <ol className="g-items">{x.options.map((s, i) => <li key={i}><span className="n">{LETTERS[i]}</span><span>{s}</span></li>)}</ol>}
      <details className="g-ans">
        <summary>Try it, then show the answer</summary>
        <p><b>Answer: {x.answer}</b></p>
        <ul>{x.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
      </details>
    </section>
  );
}

function Drill({ g }: { g: Guide }) {
  const navigate = useNavigate();
  if (!g.drill) return null;
  if (g.drill === "rc") return <Link className="btn ghost" to="/practice">Practice RC on this site</Link>;
  const kind = g.drill;
  return (
    <button type="button" className="btn ghost" onClick={() => navigate(`/practice/va?type=${kind}&n=6&seed=${uid()}`)}>
      Drill 6 {VA_KIND[kind].label.toLowerCase()} questions here
    </button>
  );
}

/** One question type's guide, folded into a details box on the VARC Learn tab. */
export function TypeGuide({ g }: { g: Guide }) {
  return (
    <details className="qa guide" id={"type-" + g.id}>
      <summary><span className="g-h">{g.h}<span className="tag t-type">{g.tag}</span></span></summary>
      <div className="g-body">
        <p className="g-what">{g.what}</p>
        {g.kinds && <ul className="g-kinds">{g.kinds.map(([k, v]) => <li key={k}><b>{k}:</b> {v}</li>)}</ul>}
        <div className="g-cols">
          <section><h4>Method</h4><ol className="g-steps">{g.method.map((m, i) => <li key={i}>{m}</li>)}</ol></section>
          <section><h4>Common traps</h4><ul className="g-traps">{g.traps.map((t, i) => <TrapItem key={i} t={t} />)}</ul></section>
        </div>
        <Example g={g} />
        <section>
          <h4>Learn more</h4>
          <ul className="g-links">
            {g.links.map((l) => (
              <li key={l.k}>
                <span className="tag t-good">{l.k}</span>
                <div><Ext href={l.u}>{l.n} ↗</Ext>{l.note && <p>{l.note}</p>}</div>
              </li>
            ))}
          </ul>
        </section>
        {g.drill && <div className="row"><Drill g={g} /></div>}
      </div>
    </details>
  );
}

/** Chips that open and jump to a guide. */
export function TypeIndex({ guides }: { guides: Guide[] }) {
  const open = (id: string) => {
    const el = document.getElementById("type-" + id) as HTMLDetailsElement | null;
    if (!el) return;
    el.open = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <nav className="chips" aria-label="Question type guides">
      {guides.map((g) => <button key={g.id} type="button" className="chip" onClick={() => open(g.id)}>{g.h}</button>)}
    </nav>
  );
}
