import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { todayIso, uid } from "../../lib/date";
import { useGsap } from "../../lib/motion";
import type { LrDrillRun } from "../../lib/state";
import { useStore } from "../../lib/store";
import { ContentGate } from "../../components/Content";
import { boardCaption, caseLines, DrillHow, HowSteps, RuleTiles, SeatBoard, type Mark } from "../../components/DrillBoard";
import { ArrowLink, LinkButton, Page } from "../../components/kit";
import { LR_CATALOG } from "../../practice/catalog.gen";
import { backTo, CLUE_RUN, pickClues, type LrDrills } from "../../practice/lrdrill";
import { answerOf, CLUE_KIND, isRuleClue, markClue, MISREAD, type ClueItem, type ClueKind, type Misread, type World } from "../../practice/lrlogic";
import { fmtSecs } from "../../practice/record";
import { PaletteCell, PlayerBar, ScoreCard } from "./common";

/** The clue translator (F83): eight clues, about three minutes, each read onto a board. */
export default function ClueDrill() {
  const [run, setRun] = useState(0);
  const [sp] = useSearchParams();
  const k = sp.get("kind");
  const kind = k && k in CLUE_KIND ? (k as ClueKind) : undefined;
  return <ContentGate need={{ drills: true }}>{(c) => <Run key={run} d={c.lrDrills!} kind={kind} back={backTo(sp.get("back"))} again={() => setRun((n) => n + 1)} />}</ContentGate>;
}

/** How the translator works, with a live example: "only if" rules out one case. */
function How({ done }: { done: boolean }) {
  const ex = { p: "Asha is picked", q: "Bilal is picked", np: "Asha is not picked", nq: "Bilal is not picked" };
  return (
    <DrillHow id="clue" done={done}>
      <p className="measure text-base">Most LR marks are lost to a clue read slightly wrong. Each screen here is one clue: read it onto a small board, then check.</p>
      <HowSteps steps={[
        "A clue about seats: tap every seat the named person could take, given who is already seated.",
        "A clue with if, only if, unless or either: four tiles show every case. Tap each case the clue rules out.",
        "Check. If your answer matches a known misreading, it is named, with the fix.",
      ]} />
      <div className="flex flex-col gap-2 rounded-xl bg-card p-4">
        <p className="text-base">Example: <b>"Asha is picked only if Bilal is picked."</b> It rules out one case only: Asha picked without Bilal. Bilal picked without Asha is still allowed.</p>
        <RuleTiles lines={caseLines(ex)} picked={["p"]} answer={["p"]} />
      </div>
    </DrillHow>
  );
}

type Pick = number | World;
type Result = LrDrillRun["items"][number];

function Run({ d, kind, back, again }: { d: LrDrills; kind?: ClueKind; back: string | null; again: () => void }) {
  const { state, update } = useStore();
  const [items] = useState(() => pickClues(d.clues, state.lrDrills, CLUE_RUN, Math.random, kind));
  const firstRun = !state.lrDrills.some((r) => r.kind === "clue");
  const [i, setI] = useState(0);
  // Taps and verdicts per clue, so the student can move between clues, skip one and come back to it.
  const [picks, setPicks] = useState<Pick[][]>(() => items.map(() => []));
  const [results, setResults] = useState<(Result | undefined)[]>(() => items.map(() => undefined));
  const [startAt] = useState(Date.now);
  const [secs, setSecs] = useState<number | null>(null);
  const item = items[i];
  const picked = picks[i] ?? [];
  const res = results[i];
  const checked = !!res;
  const answered = results.filter(Boolean).length;
  const open = results.findIndex((r, k) => !r && k !== i);

  const toggle = (x: Pick) => { if (!checked) setPicks((ps) => ps.map((p, k) => (k !== i ? p : p.includes(x) ? p.filter((y) => y !== x) : [...p, x]))); };
  const check = () => { if (picked.length && !checked) setResults((r) => r.map((x, k) => (k === i ? { k: item.id, ...markClue(item, picked) } : x))); };
  const go = (k: number) => { if (k >= 0 && k < items.length) setI(k); };
  /** Ends the run with the clues checked so far; skipped ones are not counted. */
  const finish = () => {
    const done = results.filter((r): r is Result => !!r);
    const s = Math.round((Date.now() - startAt) / 1000);
    if (done.length) update((st) => { st.lrDrills.push({ id: uid(), d: todayIso(), kind: "clue", items: done.map(({ k, ok, miss }) => ({ k, ok, ...(miss ? { miss } : {}) })), secs: s }); });
    setSecs(s);
  };
  /** After a check: the next clue not yet checked (from here, then from the start), or the end of the run. */
  const next = () => {
    const after = results.findIndex((r, k) => !r && k > i);
    const k = after >= 0 ? after : results.findIndex((r) => !r);
    if (k >= 0 && k !== i) go(k);
    else finish();
  };

  // Keys: 1 to 9 tap a seat or case, Enter checks and then moves on, arrows move between clues.
  const keys = useRef({ toggle, check, next, go, i, checked, done: secs !== null, item });
  keys.current = { toggle, check, next, go, i, checked, done: secs !== null, item };
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const k = keys.current;
      if (k.done || e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest("input, textarea")) return;
      if (e.key === "Enter" && !(e.target as HTMLElement).closest("button, a")) { e.preventDefault(); if (k.checked) k.next(); else k.check(); return; }
      if (e.key === "ArrowRight") { k.go(k.i + 1); return; }
      if (e.key === "ArrowLeft") { k.go(k.i - 1); return; }
      const n = parseInt(e.key, 10);
      if (!n || k.checked) return;
      if (isRuleClue(k.item)) { if (n <= 4) k.toggle((["both", "p", "q", "neither"] as const)[n - 1]); }
      else if (n <= k.item.board.n && !Object.values(k.item.fixed).includes(n)) k.toggle(n);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  if (!items.length) return null;
  if (secs !== null) return <Done items={items} results={results} secs={secs} again={again} back={back} />;
  return (
    <Page width="read" className="gap-6 lg:gap-8">
      <PlayerBar kicker={kind ? `DILR drill: ${CLUE_KIND[kind].toLowerCase()} clues` : "DILR drill, about three minutes"} title="Clue translator">
        {answered > 0 && answered < items.length && <Button variant="ghost" size="sm" onClick={finish}>Finish now</Button>}
        <LinkButton to={back ?? "/dilr/practice"} variant="ghost" size="sm">{back ? "Back to the set" : "Stop"}</LinkButton>
      </PlayerBar>
      {i === 0 && !checked && <How done={!firstRun} />}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5 sm:gap-2" role="group" aria-label="Clues in this run">
          {items.map((c, k) => (
            <PaletteCell key={c.id} n={k + 1} current={k === i} onClick={() => go(k)} className="h-9 min-w-9 sm:h-10 sm:min-w-10"
              state={results[k] ? (results[k]!.ok ? "right" : "wrong") : picks[k].length ? "open" : "unseen"}
              label={`Clue ${k + 1}, ${results[k] ? (results[k]!.ok ? "right" : "wrong") : "not checked"}`} />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">Clue {i + 1} of {items.length}. {CLUE_KIND[item.kind]}</p>
      </div>
      <ClueCard key={item.id} item={item} picked={picked} toggle={toggle} res={res} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {!checked
            ? <Button onClick={check} disabled={!picked.length}>Check</Button>
            : <Button onClick={next}>{open >= 0 ? "Next clue" : "See how you did"}</Button>}
          {!checked && open >= 0 && <Button variant="ghost" onClick={() => go(results.findIndex((r, k) => !r && k > i) >= 0 ? results.findIndex((r, k) => !r && k > i) : open)}>Skip for now</Button>}
          <span className="text-sm text-muted-foreground max-sm:hidden">{checked ? "Enter for the next clue" : "Keys 1 to 9 tap, Enter checks, arrows move"}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={i === 0} onClick={() => go(i - 1)}>Previous</Button>
          <Button variant="secondary" size="sm" disabled={i === items.length - 1} onClick={() => go(i + 1)}>Next</Button>
        </div>
      </div>
    </Page>
  );
}

/** One clue: the sentence, what to do, the board, and once checked, the verdict and the misreading if it was one. */
function ClueCard({ item, picked, toggle, res }: { item: ClueItem; picked: Pick[]; toggle: (x: Pick) => void; res?: Result }) {
  const root = useRef<HTMLDivElement>(null);
  // The clue arrives with a short rise; the verdict follows it once checked.
  useGsap(root, (gsap, el) => { gsap.from(el.querySelector("[data-clue]"), { y: 12, opacity: 0, duration: 0.45, ease: "power3.out", clearProps: "all" }); }, [item.id]);
  useGsap(root, (gsap, el) => { if (res) gsap.from(el.querySelector("[data-verdict]"), { y: 10, opacity: 0, duration: 0.4, ease: "power2.out", clearProps: "all" }); }, [!!res]);
  const answer = res ? answerOf(item) : undefined;
  const from = item.from ? LR_CATALOG.find((m) => m.id === item.from) : undefined;
  return (
    <div ref={root} className="flex flex-col gap-6">
      <section className="flex flex-col gap-6 rounded-2xl bg-card p-5 sm:p-8">
        <p data-clue className="max-w-[28ch] text-[clamp(1.5rem,1.2rem+1.1vw,2.1rem)] leading-[1.15] font-extrabold tracking-[-0.025em] text-balance">{item.text}</p>
        {isRuleClue(item) ? (
          <div className="flex flex-col gap-3">
            <p className="text-base text-muted-foreground">Tap every case this clue rules out.</p>
            <RuleTiles lines={caseLines(item)} picked={picked as World[]} onTap={res ? undefined : toggle} answer={answer as World[] | undefined} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-base text-muted-foreground">{boardCaption(item.board)} Tap every seat where <strong className="font-semibold text-foreground">{item.who}</strong> can sit.</p>
            <SeatBoard board={item.board} label={`Seats for ${item.who}`} onTap={res ? undefined : (k) => toggle(k + 1)}
              seat={(k) => {
                const s = k + 1, who = Object.entries(item.fixed).find(([, x]) => x === s)?.[0];
                if (who) return { lines: [who] };
                const on = picked.includes(s);
                if (!answer) return { tap: true, picked: on ? item.who : undefined };
                const ok = (answer as number[]).includes(s);
                const mark: Mark = ok && on ? "right" : ok ? "missed" : on ? "wrong" : "no";
                return { mark, picked: ok ? item.who : undefined, fresh: ok };
              }} />
          </div>
        )}
      </section>
      {res && <Verdict item={item} res={res} from={from} />}
    </div>
  );
}

function Verdict({ item, res, from }: { item: ClueItem; res: Result; from?: { id: string; title: string } }) {
  const how = res.miss as Misread | undefined;
  return (
    <section data-verdict aria-live="polite" className={cn("flex flex-col gap-2 rounded-2xl p-5 sm:p-6", res.ok ? "bg-success-soft" : "bg-danger-soft")}>
      <p className="text-heading font-semibold">
        {res.ok ? "Read right." : how ? <><span className="sr-only">Not quite. </span><mark className="bg-highlight text-highlight-foreground">{MISREAD[how].h}</mark>.</> : "Not quite."}
      </p>
      {how && <p className="measure text-base">{MISREAD[how].fix}</p>}
      {item.why && <p className="measure text-base">{item.why}</p>}
      {from && <p className="text-base text-muted-foreground">You will meet this clue in <Link to={`/practice/lr/${from.id}`} className="font-semibold text-foreground underline-offset-4 hover:underline">{from.title}</Link>.</p>}
    </section>
  );
}

/** The run's score, the misreadings it showed and every clue with how it went. */
function Done({ items, results, secs, again, back }: { items: ClueItem[]; results: (Result | undefined)[]; secs: number; again: () => void; back: string | null }) {
  const right = results.filter((r) => r?.ok).length;
  const slips = [...new Set(results.map((r) => r?.miss).filter((m): m is Misread => !!m))];
  const skipped = results.filter((r) => !r).length;
  return (
    <Page width="read" className="gap-6 lg:gap-8">
      <PlayerBar kicker="DILR drill" title="Clue translator" />
      <ScoreCard score={right} of={items.length - skipped} parts={[["Time", fmtSecs(secs)], ["Misreadings named", String(slips.length)], ...(skipped ? [["Skipped", String(skipped)] as [string, string]] : [])]}>
        {slips.length > 0 && (
          <ul className="flex flex-col gap-3">
            {slips.map((m) => <li key={m} className="flex flex-col gap-0.5"><span className="text-base font-semibold">{MISREAD[m].h}</span><span className="measure text-base text-muted-foreground">{MISREAD[m].fix}</span></li>)}
          </ul>
        )}
      </ScoreCard>
      <ol className="flex flex-col gap-px overflow-hidden rounded-xl">
        {items.map((c, i) => (
          <li key={c.id} className="flex items-start gap-3 bg-card px-5 py-3.5">
            <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", !results[i] ? "bg-secondary" : results[i]!.ok ? "bg-success" : "bg-danger")} aria-label={!results[i] ? "Skipped" : results[i]!.ok ? "Right" : "Wrong"} />
            <span className="flex flex-col gap-0.5">
              <span className="text-base">{c.text}</span>
              <span className="text-sm text-muted-foreground">{CLUE_KIND[c.kind]}{!results[i] ? ". Skipped" : results[i]!.miss ? `. ${MISREAD[results[i]!.miss as Misread].h}` : ""}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={again}>Another {CLUE_RUN}</Button>
        <LinkButton to={back ?? "/dilr/practice"} variant="secondary">{back ? "Back to the set" : "Back to DILR practice"}</LinkButton>
      </div>
      <ArrowLink to="/progress?sec=DILR">Your reading pattern over time, in Progress</ArrowLink>
    </Page>
  );
}
