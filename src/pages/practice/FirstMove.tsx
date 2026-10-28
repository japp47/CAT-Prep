import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { todayIso, uid } from "../../lib/date";
import { useGsap } from "../../lib/motion";
import { useStore } from "../../lib/store";
import { ContentGate } from "../../components/Content";
import { boardCaption, DrillHow, HowSteps, SeatBoard, SolveFirst } from "../../components/DrillBoard";
import { ArrowLink, LinkButton, Page } from "../../components/kit";
import { LR_CATALOG } from "../../practice/catalog.gen";
import { backTo, FIRST_MOVES, firstMoveStep, fixedBy, moveReason, nextDrill, type LrDrills } from "../../practice/lrdrill";
import { OPEN_CAP, openCases, seatRows, type LrModel } from "../../practice/lrlogic";
import type { LrSet } from "../../practice/types";
import { PlayerBar, ScoreCard } from "./common";

/** First move (F85): a set opens on an empty board; the student picks the clue to start with, then two more. */
export default function FirstMove() {
  const [sp] = useSearchParams();
  return <ContentGate need={{ drills: true }}>{(c) => <Pick d={c.lrDrills!} asked={sp.get("set")} back={backTo(sp.get("back"))} />}</ContentGate>;
}

function Pick({ d, asked, back }: { d: LrDrills; asked: string | null; back: string | null }) {
  const { state } = useStore();
  const [skip, setSkip] = useState(0);
  // Sets the student said "show me anyway" to on this visit.
  const [allowed, setAllowed] = useState<string[]>([]);
  const solved = useMemo(() => new Set(state.lrAttempts.map((a) => a.set)), [state.lrAttempts]);
  // The set named in the address, else one already solved (D49), never done or done longest ago; "Another set" moves along.
  const first = useMemo(() => d.models.find((m) => m.set === asked) ?? nextDrill(d.models, (m) => m.set, (m) => m.set, state.lrDrills, "first", solved), []); // eslint-disable-line react-hooks/exhaustive-deps
  const m = d.models[((first ? d.models.indexOf(first) : 0) + skip) % d.models.length];
  if (!m) return null;
  const from = skip ? null : back;
  const meta = LR_CATALOG.find((x) => x.id === m.set);
  // Opened from the set's own review, or the set is solved: nothing to spoil.
  if (!from && !solved.has(m.set) && !allowed.includes(m.set) && meta) {
    return (
      <Page width="read" className="gap-6 lg:gap-8">
        <PlayerBar kicker="DILR drill" title="First move"><LinkButton to="/dilr/practice" variant="ghost" size="sm">Stop</LinkButton></PlayerBar>
        <SolveFirst title={meta.title} set={m.set} minutes={meta.minutes} what="This drill shows which clues to start the set with, and fills in its seats as you go."
          onGo={() => setAllowed((a) => [...a, m.set])} />
      </Page>
    );
  }
  return <ContentGate need={{ lr: [m.set] }}>{(s) => <Moves key={m.set + skip} model={m} set={s.lrById(m.set)!} back={from} another={() => setSkip((n) => n + 1)} />}</ContentGate>;
}

const andList = (xs: number[]) => (xs.length < 2 ? String(xs[0]) : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const ways = (n: number) => (n === 1 ? "1 way" : n >= OPEN_CAP ? `over ${OPEN_CAP.toLocaleString("en-IN")} ways` : `${n.toLocaleString("en-IN")} ways`);

function Moves({ model, set, back, another }: { model: LrModel; set: LrSet; back: string | null; another: () => void }) {
  const { state, update } = useStore();
  // Clues used so far, in order, and each move's verdict.
  const [picked, setPicked] = useState<number[]>([]);
  const [shown, setShown] = useState<number | null>(null);
  const [oks, setOks] = useState<boolean[]>([]);
  const [startAt] = useState(Date.now);
  const done = picked.length === FIRST_MOVES;
  // After the last move there is nothing left to count.
  const step = useMemo(() => (done ? { counts: [], best: 0 } : firstMoveStep(model, picked)), [model, picked, done]);
  const n = (k: number) => step.counts.find((c) => c.clue === k)?.n ?? 0;
  const max = Math.max(2, ...step.counts.map((c) => c.n));
  const placed = useMemo(() => fixedBy(model, picked), [model, picked]);
  const sofar = useMemo(() => (picked.length ? openCases(model, picked) : 0), [model, picked]);

  const choose = (k: number) => { if (shown === null && !done) { setShown(k); setOks((o) => [...o, n(k) === step.best]); } };
  const go = () => {
    if (shown === null) return;
    const p = [...picked, shown];
    setPicked(p);
    setShown(null);
    if (p.length === FIRST_MOVES) {
      update((st) => { st.lrDrills.push({ id: uid(), d: todayIso(), kind: "first", ref: model.set, items: oks.map((ok, i) => ({ k: `${model.set}:${i + 1}`, ok })), secs: Math.round((Date.now() - startAt) / 1000) }); });
    }
  };
  const bestClues = step.counts.filter((c) => c.n === step.best).map((c) => c.clue);

  return (
    <Page className="gap-6 lg:gap-8">
      <PlayerBar kicker="DILR drill" title="First move">
        <LinkButton to={back ?? "/dilr/practice"} variant="ghost" size="sm">{back ? "Back to the set" : "Stop"}</LinkButton>
      </PlayerBar>
      <DrillHow id="first" done={state.lrDrills.some((r) => r.kind === "first")}>
        <p className="measure text-base">Toppers start a set with the clue that leaves the least to try. This drill shows you, clue by clue, how much each one leaves open.</p>
        <HowSteps steps={[
          "Read the set. Pick the clue you would start with.",
          <>Every clue then shows how many <b>ways</b> it leaves: how many ways the people and things it names could sit, given the clues picked so far. 1 way means everything it names is fixed.</>,
          "The clue with the fewest ways is a best move. Pick two more; the board fills in as seats get fixed.",
        ]} />
        <p className="measure rounded-xl bg-card px-4 py-3 text-base">Example: in a row of six, "The architect sits in seat 6" leaves <b>1 way</b>. "The doctor does not sit at either end" leaves <b>4 ways</b> (seats 2 to 5). Start with the first; keep the second for later, to cut cases.</p>
      </DrillHow>
      <header className="flex flex-col gap-3">
        <h2 className="text-title font-extrabold">{set.title}</h2>
        {set.intro.map((p, i) => <p key={i} className="measure text-base text-muted-foreground">{p}</p>)}
      </header>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-8">
        <section aria-label="Clues" className="flex flex-col gap-3">
          <p className="text-heading font-semibold" aria-live="polite">
            {done ? "Three moves made." : shown === null
              ? picked.length ? `Move ${picked.length + 1} of ${FIRST_MOVES}: which clue next?` : `Move 1 of ${FIRST_MOVES}: which clue would you start with?`
              : n(shown) === step.best ? (bestClues.length > 1 ? `A best move: clues ${andList(bestClues)} all leave ${ways(step.best)}.` : "The best move.") : `${bestClues.length > 1 ? `Clues ${andList(bestClues)} each` : `Clue ${bestClues[0]}`} would have left fewer ways.`}
          </p>
          {shown === null && !done && <p className="measure text-base text-muted-foreground">Pick the clue that leaves the fewest ways to seat the people and things you have used so far.</p>}
          {shown !== null && (
            <div className="flex flex-col gap-1 rounded-xl bg-card px-4 py-3">
              <p className="measure text-base">Clue {shown} leaves {ways(n(shown))}: {moveReason(model, picked, shown, n(shown))}.</p>
              {n(shown) !== step.best && <p className="measure text-base">Clue {bestClues[0]} leaves {ways(step.best)}: {moveReason(model, picked, bestClues[0], step.best)}.</p>}
            </div>
          )}
          <ClueList set={set} picked={picked} shown={shown} counts={shown !== null ? step.counts : null} best={step.best} max={max} onPick={choose} />
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {shown !== null && <Button onClick={go}>{picked.length + 1 < FIRST_MOVES ? "Next move" : "Finish"}</Button>}
          </div>
        </section>
        <aside className="flex flex-col gap-4 rounded-2xl bg-card p-5 lg:sticky lg:top-24">
          <p className="text-base font-semibold">{picked.length ? `After clue ${picked.join(", ")}` : "The empty board"}</p>
          <SeatBoard board={model.board} small label="The board so far" seat={(k) => {
            if (!placed) return {};
            const row = seatRows(model, placed)[k].filter(Boolean);
            return row.length ? { lines: row, fresh: true } : {};
          }} />
          <p className="text-sm text-muted-foreground">
            {!picked.length ? boardCaption(model.board) : placed ? "These clues fix where everyone they name sits." : `These clues leave ${ways(sofar)} to seat everyone they name, so nothing is fixed yet.`}
          </p>
        </aside>
      </div>
      {done && <Finished set={set} oks={oks} another={another} back={back} />}
    </Page>
  );
}

/**
 * The set's clues as buttons. Once one is picked, every clue still open shows how many ways it would leave, as a bar
 * that grows from nothing (log scale, so 1 and 400 both read), with the fewest marked.
 */
function ClueList({ set, picked, shown, counts, best, max, onPick }: { set: LrSet; picked: number[]; shown: number | null; counts: { clue: number; n: number }[] | null; best: number; max: number; onPick: (k: number) => void }) {
  const root = useRef<HTMLOListElement>(null);
  useGsap(root, (gsap, el) => {
    if (counts) gsap.from(el.querySelectorAll("[data-bar]"), { scaleX: 0, transformOrigin: "left center", duration: 0.7, stagger: 0.03, ease: "power3.out", clearProps: "transform" });
  }, [!!counts, picked.length]);
  const width = (n: number) => `${8 + 92 * (Math.log(n) / Math.log(max))}%`;
  return (
    <ol ref={root} className="flex flex-col gap-1.5">
      {set.clues.map((text, i) => {
        const k = i + 1, used = picked.indexOf(k), c = counts?.find((x) => x.clue === k);
        const isBest = !!c && c.n === best, mine = shown === k;
        return (
          <li key={k}>
            <button type="button" disabled={used >= 0 || shown !== null} onClick={() => onPick(k)}
              className={cn("relative flex w-full items-start gap-3 overflow-hidden rounded-xl bg-card px-4 py-3 text-left transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none enabled:hover:bg-muted",
                used >= 0 && "bg-secondary", mine && "ring-2 ring-primary ring-inset")}>
              {c && <span data-bar aria-hidden className={cn("absolute inset-y-0 left-0", isBest ? "bg-success-soft" : "bg-muted")} style={{ width: width(c.n) }} />}
              <span className="relative w-6 shrink-0 text-base font-semibold text-muted-foreground tabular-nums">{k}</span>
              <span className={cn("relative flex-1 text-base", used >= 0 && "text-muted-foreground")}>{text}</span>
              {used >= 0 && <span className="relative inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-muted-foreground"><Check className="size-4" aria-hidden />Move {used + 1}</span>}
              {c && <span className={cn("relative shrink-0 text-sm font-semibold tabular-nums", isBest ? "text-success" : "text-muted-foreground")}>{ways(c.n)}{isBest && <span className="sr-only">, fewest</span>}</span>}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Finished({ set, oks, another, back }: { set: LrSet; oks: boolean[]; another: () => void; back: string | null }) {
  const right = oks.filter(Boolean).length;
  return (
    <ScoreCard score={right} of={oks.length} unit="best moves" parts={[]}>
      <p className="measure text-base">
        {right === oks.length ? "Every move kept the cases as few as they could be: fixed facts first, then clues that name someone already placed."
          : "Clues that fix a seat, or name someone already placed, open the fewest ways. Clues with \"not\", \"either\" or \"if\" open many and are best used late, to cut cases."}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <LinkButton to={back ?? `/practice/lr/${set.id}`}>{back ? "Back to the set" : "Solve the set"}</LinkButton>
        <Button variant="secondary" onClick={another}>Another set</Button>
      </div>
      <ArrowLink to="/dilr?guide=arrangement">Where to start, in the arrangement guide</ArrowLink>
    </ScoreCard>
  );
}
