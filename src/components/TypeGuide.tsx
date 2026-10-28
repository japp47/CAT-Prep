import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { uid } from "../lib/date";
import { VA_KIND } from "../practice/va/build";
import type { GuideLink, Trap, TypeGuide as Guide } from "../sections/varc/guides";
import { ArrowLink } from "./kit";

const LETTERS = "ABCD";

function TrapItem({ t }: { t: Trap }) {
  return typeof t === "string" ? <li>{t}</li> : <li><b className="font-semibold">{t[0]}:</b> {t[1]}</li>;
}

/** A numbered sentence or a lettered option in a worked example. */
function Line({ mark, children }: { mark: string | number; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-3">
      <span className="grid size-7 place-items-center rounded-full bg-card font-sans text-sm font-semibold">{mark}</span>
      <span className="text-reading">{children}</span>
    </li>
  );
}

function Example({ g }: { g: Guide }) {
  const x = g.example;
  const [shown, setShown] = useState(false);
  return (
    <section aria-label="Worked example" className="flex flex-col gap-4 rounded-2xl bg-muted/70 p-5 sm:p-6">
      <h4 className="text-base font-semibold">Worked example</h4>
      <p className="text-base">{x.ask}</p>
      {x.insert && <p className="rounded-md bg-highlight-soft px-4 py-3 text-reading">{x.insert}</p>}
      {x.passage && <p className="measure text-reading">{x.passage}</p>}
      {x.items && <ol className="flex flex-col gap-2.5">{x.items.map((s, i) => <Line key={i} mark={i + 1}>{s}</Line>)}</ol>}
      {x.question && <p className="text-lg leading-snug font-semibold">{x.question}</p>}
      {x.options && <ol className="flex flex-col gap-2.5">{x.options.map((s, i) => <Line key={i} mark={LETTERS[i]}>{s}</Line>)}</ol>}
      {!shown ? <Button variant="outline" className="self-start" onClick={() => setShown(true)}>Try it, then show the answer</Button> : (
        <div className="flex flex-col gap-3">
          <p className="rounded-md bg-success-soft px-4 py-2.5 text-base font-semibold text-success">Answer: {x.answer}</p>
          <ul className="measure flex list-disc flex-col gap-1.5 pl-5 text-base">{x.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}
    </section>
  );
}

function Drill({ g }: { g: Guide }) {
  const [seed] = useState(uid);
  if (!g.drill) return null;
  if (g.drill === "rc") return <Button asChild variant="secondary"><Link to="/varc/practice">Practice RC on this site</Link></Button>;
  if (g.drill === "cr") return <Button asChild variant="secondary"><Link to={`/practice/cr?type=mix&n=6&seed=${seed}`}>Drill 6 critical reasoning questions here</Link></Button>;
  const kind = g.drill;
  return <Button asChild variant="secondary"><Link to={`/practice/va?type=${kind}&n=6&seed=${seed}`}>Drill 6 {VA_KIND[kind].label.toLowerCase()} questions here</Link></Button>;
}

/** A guide's method, as numbered steps. */
export function GuideSteps({ steps }: { steps: string[] }) {
  return (
    <section>
      <h4 className="pb-3 text-base font-semibold">Method</h4>
      <ol className="flex flex-col gap-3 text-base">
        {steps.map((m, i) => (
          <li key={i} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3">
            <span className="grid size-7 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground tabular-nums">{i + 1}</span><span className="pt-0.5">{m}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** A guide's traps, each named. */
export function GuideTraps({ traps }: { traps: Trap[] }) {
  return (
    <section>
      <h4 className="pb-3 text-base font-semibold">Common traps</h4>
      <ul className="flex flex-col gap-3 text-base [&>li]:relative [&>li]:pl-5 [&>li]:before:absolute [&>li]:before:top-[0.6em] [&>li]:before:left-0.5 [&>li]:before:size-2 [&>li]:before:rounded-sm [&>li]:before:bg-danger">
        {traps.map((t, i) => <TrapItem key={i} t={t} />)}
      </ul>
    </section>
  );
}

/** A guide's three links: what each is, and why it is worth the time. */
export function GuideLinks({ links }: { links: GuideLink[] }) {
  return (
    <section>
      <h4 className="pb-3 text-base font-semibold">Read, watch, practise</h4>
      <ul className="grid gap-4 md:grid-cols-3">
        {links.map((l) => (
          <li key={l.u} className="flex flex-col gap-1.5 rounded-xl bg-muted/60 p-4">
            <span className="text-sm text-muted-foreground">{l.k}</span>
            <ArrowLink to={l.u} className="items-start">{l.n}</ArrowLink>
            {l.note && <span className="text-sm text-muted-foreground">{l.note}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One VARC question type's guide, as the Learn tab's explorer shows it (D46). */
export function TypeGuideBody({ g }: { g: Guide }) {
  return (
    <div className="flex flex-col gap-8">
      <p className="measure text-lg leading-relaxed">{g.what}</p>
      {g.kinds && <ul className="grid gap-x-8 gap-y-2 text-base md:grid-cols-2">{g.kinds.map(([k, v]) => <li key={k}><b className="font-semibold">{k}:</b> {v}</li>)}</ul>}
      <div className="grid gap-8 xl:grid-cols-2 xl:gap-10">
        <GuideSteps steps={g.method} />
        <GuideTraps traps={g.traps} />
      </div>
      <Example g={g} />
      <GuideLinks links={g.links} />
      {g.drill && <div><Drill g={g} /></div>}
    </div>
  );
}
