import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Clapperboard, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { shortDate, todayIso, uid } from "../../lib/date";
import { calm } from "../../lib/motion";
import { useStore } from "../../lib/store";
import { ContentGate } from "../../components/Content";
import { Empty, LinkButton, Page, Segmented } from "../../components/kit";
import { SolveFirst } from "../../components/DrillBoard";
import { ReplayBoard, viewOf, WaysLeft, type CellView } from "../../components/ReplayBoard";
import { LR_CATALOG } from "../../practice/catalog.gen";
import { backTo, nextOf } from "../../practice/lrdrill";
import { answerOf, biggestCut, boardOf, FORMAT, hintFor, marksOf, MODE, modelOf, shownOf, solvedBy, splitKey, stepCheck, tap, trailOf, ways, wrongMarks, type BoardGroup, type Marks, type ReplayMode, type ReplayPuzzle, type TrailStep } from "../../practice/replay";
import type { Case, GridModel } from "../../practice/solver";
import { PlayerBar } from "./common";

/** One DILR Replay set (F57): watch the worked steps, do them one at a time, or solve alone (D66). */
export default function ReplayPlayer() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  return (
    <ContentGate need={{ drills: true }}>
      {(c) => {
        const all = c.lrDrills!.replay;
        const p = all.find((x) => x.id === id);
        if (!p) return <Page><Empty action={<LinkButton to="/practice/replay" variant="secondary">All replay sets</LinkButton>}>There is no replay set with this name.</Empty></Page>;
        return <Player key={p.id} p={p} all={all} back={backTo(sp.get("back"))} />;
      }}
    </ContentGate>
  );
}

// The clip panel (F101) draws and encodes video, so it loads on the first tap and never with the page (D94).
const ReplayClip = lazy(() => import("../../components/ReplayClip"));
const preloadClip = () => void import("../../components/ReplayClip");

function ClipButton({ p, m, groups, trail }: { p: ReplayPuzzle; m: GridModel; groups: BoardGroup[]; trail: TrailStep[] }) {
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);
  return (
    <>
      <Button variant="ghost" onClick={() => { setUsed(true); setOpen(true); }} onPointerEnter={preloadClip} onFocus={preloadClip}>
        <Clapperboard aria-hidden /> Make a clip
      </Button>
      {used && <Suspense fallback={null}><ReplayClip p={p} m={m} groups={groups} trail={trail} open={open} onOpenChange={setOpen} /></Suspense>}
    </>
  );
}

const ABOUT: Record<ReplayMode, string> = {
  watch: "See the deductions in order, and how many arrangements each one leaves.",
  steps: "One step at a time: mark what its clues settle, then check. The worked step follows.",
  solve: "Every clue at once, as in the exam. A hint names the clue to use next.",
};
const MODES: ReplayMode[] = ["watch", "steps", "solve"];
const listNums = (xs: number[]) => (xs.length < 2 ? String(xs[0]) : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const cluesWord = (xs: number[]) => `${xs.length === 1 ? "clue" : "clues"} ${listNums(xs)}`;

function Player({ p, all, back }: { p: ReplayPuzzle; all: ReplayPuzzle[]; back: string | null }) {
  const { state } = useStore();
  const [sp, setSp] = useSearchParams();
  const runs = state.lrDrills.filter((r) => r.kind === "replay");
  // Help fades over sets (D66): step by step for the first two, then alone. Watch is always one tap away.
  const asked = sp.get("mode") as ReplayMode | null;
  const mode: ReplayMode = asked && MODES.includes(asked) ? asked : runs.length < 2 ? "steps" : "solve";
  const setMode = (m: ReplayMode) => setSp((s) => { s.set("mode", m); return s; }, { replace: true });
  const m = useMemo(() => modelOf(p), [p]);
  const groups = useMemo(() => boardOf(m), [m]);
  const answer = useMemo(() => answerOf(p), [p]);
  // A replay of an LR set shows that set's answer: ask to solve the set first, as the other drills do (D49), unless it
  // is solved already or the student came from its review.
  const [anyway, setAnyway] = useState(false);
  const meta = p.set ? LR_CATALOG.find((x) => x.id === p.set) : undefined;
  const ask = !!meta && !back && !anyway && !state.lrAttempts.some((a) => a.set === p.set);
  // The widest board takes a moment to count, so the page paints first.
  const [trail, setTrail] = useState<TrailStep[] | null>(null);
  useEffect(() => {
    if (ask) return;
    const t = setTimeout(() => setTrail(trailOf(p)), 30);
    return () => clearTimeout(t);
  }, [p, ask]);
  const next = nextOf(all.filter((x) => x.id !== p.id), (x) => x.id, runs, "replay");
  const done = runs.filter((r) => r.ref === p.id).pop();

  return (
    <Page className="gap-6 lg:gap-8">
      <PlayerBar kicker={`DILR replay, ${FORMAT[p.format].label.toLowerCase()}`} title={p.title}>
        <LinkButton to={back ?? "/practice/replay"} variant="ghost" size="sm">{back ? "Back to the set" : "All replay sets"}</LinkButton>
      </PlayerBar>
      {ask && meta ? (
        <SolveFirst title={meta.title} set={meta.id} minutes={meta.minutes} onGo={() => setAnyway(true)}
          what="This replay is the same set as one in DILR practice, and it shows every deduction up to the answer." />
      ) : <>
        <div className="flex flex-col gap-2">
          <Segmented value={mode} onChange={setMode} options={MODES.map((x) => [x, MODE[x]] as [ReplayMode, string])} label="How to work through the set" />
          <p className="measure text-base text-muted-foreground">{ABOUT[mode]}{done ? ` You did this set on ${shortDate(done.d)}.` : ""}</p>
        </div>
        {trail
          ? <Work key={mode} mode={mode} p={p} m={m} groups={groups} answer={answer} trail={trail} next={next} back={back} onWatch={() => setMode("watch")} />
          : <p className="text-base text-muted-foreground" role="status">Solving the set…</p>}
      </>}
    </Page>
  );
}

interface WorkProps { mode: ReplayMode; p: ReplayPuzzle; m: GridModel; groups: BoardGroup[]; answer: Case; trail: TrailStep[]; next?: ReplayPuzzle; back: string | null; onWatch: () => void }

function Work(props: WorkProps) {
  const { mode, p } = props;
  const { update } = useStore();
  const [startAt] = useState(Date.now);
  // Clues to light in the list (the step's, or a hint's) and clues already used.
  const [lit, setLit] = useState<number[]>([]);
  const [used, setUsed] = useState<number[]>([]);
  const save = (items: { k: string; ok: boolean }[]) => {
    const id = uid(), d = todayIso(), secs = Math.round((Date.now() - startAt) / 1000);
    update((st) => { st.lrDrills.push({ id, d, kind: "replay", ref: p.id, items, secs }); });
  };
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:gap-8">
      <TheSet p={p} lit={lit} used={used} />
      <div className="flex min-w-0 flex-col gap-4">
        {mode === "watch" && <Watch {...props} setLit={setLit} setUsed={setUsed} />}
        {mode === "steps" && <Steps {...props} setLit={setLit} setUsed={setUsed} save={save} />}
        {mode === "solve" && <Solve {...props} setLit={setLit} save={save} />}
      </div>
    </div>
  );
}

/** The set's story and its clues; the clues a step uses are lit, earlier ones dimmed. */
function TheSet({ p, lit, used }: { p: ReplayPuzzle; lit: number[]; used: number[] }) {
  return (
    <section aria-label="The set" className="flex flex-col gap-4 rounded-2xl bg-card p-5 sm:p-6 lg:sticky lg:top-24">
      {p.intro.map((t, i) => <p key={i} className="measure text-base">{t}</p>)}
      <ol className="flex flex-col gap-1">
        {p.clues.map((c, i) => {
          const on = lit.includes(i + 1), was = !on && used.includes(i + 1);
          return (
            <li key={i} className={cn("flex gap-3 rounded-lg px-2.5 py-1.5 text-base transition-colors duration-300 motion-reduce:transition-none", on && "bg-primary/10", was && "text-muted-foreground")}>
              <span className={cn("w-5 shrink-0 font-semibold tabular-nums", on && "text-primary")}>{i + 1}</span>
              <span className="measure">{c}</span>
            </li>
          );
        })}
      </ol>
      <p className="text-sm text-muted-foreground">Skill: {p.skill.toLowerCase()}.</p>
    </section>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section aria-live="polite" className={cn("flex flex-col gap-4 rounded-2xl bg-card p-5 sm:p-6", className)}>{children}</section>;
}

/** The solver's board after a step: settled ticks and crosses, the step's new ones marked fresh. */
const settledView = (t: TrailStep) => (k: string): CellView => {
  const s = t.settled.cells.get(k);
  return s ? { mark: s, locked: true, fresh: t.fresh.includes(k) } : {};
};

function Watch({ p, m, groups, trail, next, setLit, setUsed }: WorkProps & { setLit: (x: number[]) => void; setUsed: (x: number[]) => void }) {
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const best = biggestCut(trail);
  const last = trail.length - 1;
  useEffect(() => {
    setLit(at ? p.steps[at - 1].use : []);
    setUsed(p.steps.slice(0, Math.max(0, at - 1)).flatMap((s) => s.use));
  }, [at]); // eslint-disable-line react-hooks/exhaustive-deps
  // Playing moves on a step every few seconds (slower to read than to watch), and stops at the end.
  useEffect(() => {
    if (!playing) return;
    if (at >= last) { setPlaying(false); return; }
    const t = setTimeout(() => setAt((a) => a + 1), calm() ? 6000 : 4500);
    return () => clearTimeout(t);
  }, [playing, at, last]);
  const step = at ? p.steps[at - 1] : null;
  return (
    <>
      <Panel>
        <WaysLeft trail={trail} at={at} best={best} />
        <div className="flex min-h-24 flex-col gap-1.5">
          {step ? <>
            <h2 className="text-heading font-semibold">Step {at} of {last}: {cluesWord(step.use)}</h2>
            <p className="measure text-base">{step.say}</p>
          </> : <>
            <h2 className="text-heading font-semibold">Before any clue</h2>
            <p className="measure text-base">{ways(trail[0].settled.count, trail[0].settled.capped)} arrangements fit the story alone. Each step applies a clue or two and crosses out what they rule out.</p>
          </>}
          {at === last && <p className="measure text-base font-semibold">One arrangement is left: the answer.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {at < last
            ? <Button onClick={() => { setPlaying(false); setAt(at + 1); }}>{at ? "Next step" : "Apply the first step"}</Button>
            : next ? <LinkButton to={`/practice/replay/${next.id}?mode=steps`}>Try the next set step by step</LinkButton> : null}
          {at < last && (
            <Button variant="secondary" onClick={() => setPlaying(!playing)} aria-pressed={playing}>
              {playing ? <><Pause aria-hidden /> Pause</> : <><Play aria-hidden /> Play</>}
            </Button>
          )}
          <Button variant="ghost" onClick={() => { setPlaying(false); setAt(Math.max(0, at - 1)); }} disabled={!at}>Previous</Button>
          {at === last && <Button variant="ghost" onClick={() => setAt(0)}>Watch again</Button>}
          <ClipButton p={p} m={m} groups={groups} trail={trail} />
        </div>
      </Panel>
      <ReplayBoard model={m} groups={groups} view={settledView(trail[at])} />
    </>
  );
}

function Steps({ p, m, groups, answer, trail, next, back, setLit, setUsed, save, onWatch }: WorkProps & { setLit: (x: number[]) => void; setUsed: (x: number[]) => void; save: (items: { k: string; ok: boolean }[]) => void }) {
  const [k, setK] = useState(1);
  const [marks, setMarks] = useState<Marks>({});
  const [result, setResult] = useState<ReturnType<typeof stepCheck> & { shown: boolean } | null>(null);
  const items = useRef<{ k: string; ok: boolean }[]>([]);
  const last = trail.length - 1;
  const finished = k > last;
  const base = trail[Math.min(k, last) - 1].settled;
  const step = p.steps[Math.min(k, last) - 1];
  useEffect(() => {
    setLit(finished ? [] : step.use);
    setUsed(p.steps.slice(0, Math.min(k, last + 1) - 1).flatMap((s) => s.use));
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps

  const check = (show = false) => {
    const all = { ...marksOf(base), ...marks };
    const r = stepCheck(groups, all, answer, trail[k].settled);
    // A step counts as done when nothing was wrong and nothing it settles was missed.
    items.current.push({ k: `${p.id}#${k}`, ok: !show && !r.wrong.length && !r.missed.length });
    setResult({ ...r, shown: show });
    if (k === last) save(items.current);
  };
  const go = () => { setK(k + 1); setMarks({}); setResult(null); };

  if (finished) return <Done h={items.current.some((i) => i.ok) ? "Done" : "Shown step by step"} p={p} trail={trail} next={next} back={back} onWatch={onWatch} line={`${items.current.filter((i) => i.ok).length} of ${items.current.length} steps done without a slip.`} m={m} groups={groups} />;

  const shown = shownOf(groups, { ...marksOf(base), ...marks });
  const t = trail[k];
  const freshIn = t.fresh.filter((x) => t.settled.cells.get(x) === "in");
  const view = (key: string): CellView => {
    if (result) {
      if (result.wrong.includes(key)) return { mark: marks[key], wrong: true };
      const s = t.settled.cells.get(key);
      return s ? { mark: s, locked: true, fresh: t.fresh.includes(key), missed: result.missed.includes(key) } : {};
    }
    return base.cells.has(key) ? { mark: base.cells.get(key), locked: true } : viewOf(shown, key);
  };
  return (
    <>
      <Panel>
        <WaysLeft trail={trail} at={result ? k : k - 1} best={result && k === last ? biggestCut(trail) : undefined} />
        {!result ? (
          <div className="flex flex-col gap-1.5">
            <h2 className="text-heading font-semibold">Step {k} of {last}: use {cluesWord(step.use)}</h2>
            <p className="measure text-base text-muted-foreground">With what is already on the board, tick what {step.use.length === 1 ? "this clue settles" : "these clues settle"} and cross what {step.use.length === 1 ? "it rules" : "they rule"} out.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <h2 className="text-heading font-semibold">
              {result.shown ? `Step ${k}, shown`
                : !result.wrong.length && !result.missed.length ? `Step ${k}: all found`
                : freshIn.length ? `Step ${k}: ${freshIn.length - result.missed.filter((x) => freshIn.includes(x)).length} of ${freshIn.length} placed`
                : `Step ${k} places no one yet`}
            </h2>
            {!result.shown && result.wrong.length > 0 && <p className="text-base text-danger">{result.wrong.length === 1 ? "One mark was wrong" : `${result.wrong.length} marks were wrong`} (in red).</p>}
            {!result.shown && result.missed.length > 0 && <p className="text-base">Ringed: {result.missed.length === 1 ? "a placement" : "placements"} this step settles that you did not tick.</p>}
            {!result.shown && result.ahead.length > 0 && <p className="text-base text-muted-foreground">{result.ahead.length === 1 ? "One mark was" : `${result.ahead.length} marks were`} ahead of the clues: right, perhaps, but not proven yet.</p>}
            {!freshIn.length && <p className="text-base text-muted-foreground">It rules out {t.fresh.length} {t.fresh.length === 1 ? "cell" : "cells"}, crossed on the board.</p>}
            <p className="measure text-base">{step.say}</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {!result ? <>
            <Button onClick={() => check()}>Check step</Button>
            <Button variant="ghost" onClick={() => check(true)}>Show me</Button>
          </> : <Button onClick={go}>{k === last ? "See how it went" : "Next step"}</Button>}
        </div>
      </Panel>
      <ReplayBoard model={m} groups={groups} view={view} onTap={result ? undefined : (key) => setMarks((x) => tap(x, key))} />
    </>
  );
}

function Solve({ p, m, groups, answer, trail, next, back, setLit, save, onWatch }: WorkProps & { setLit: (x: number[]) => void; save: (items: { k: string; ok: boolean }[]) => void }) {
  const [marks, setMarks] = useState<Marks>({});
  const [checked, setChecked] = useState<string[] | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  // Rows that had a wrong mark at any check: they do not count as right first time.
  const slipped = useRef(new Set<string>());
  const hints = useRef(0);
  const rows = groups.flatMap((g) => g.rows.map((r) => r.name));

  const check = () => {
    const wrong = wrongMarks(marks, answer);
    wrong.forEach((k) => slipped.current.add(splitKey(k)[0]));
    setHint(null);
    if (!wrong.length && solvedBy(groups, marks, answer)) {
      setSolved(true);
      setLit([]);
      save(rows.map((r) => ({ k: `${p.id}:${r}`, ok: !slipped.current.has(r) })));
      return;
    }
    setChecked(wrong);
  };
  const askHint = () => {
    hints.current++;
    const h = hintFor(groups, p, trail, marks, answer);
    if (!h) { setHint("Everything the clues settle is on the board. Check it."); return; }
    // Nothing safe follows from a wrong mark, so the hint shows those first; the heading counts them.
    if ("wrong" in h) { setChecked(h.wrong); setHint("Fix the red marks first: nothing safe follows from a wrong mark."); return; }
    setLit(h.clues);
    setHint(`Try ${cluesWord(h.clues)} with what is on the board. They are lit in the list.`);
  };

  if (solved) return <Done h="Solved" p={p} trail={trail} next={next} back={back} onWatch={onWatch} m={m} groups={groups}
    line={`${rows.length - slipped.current.size} of ${rows.length} rows right at the first check${hints.current ? `, ${hints.current === 1 ? "one hint" : `${hints.current} hints`}` : ", no hints"}.`} />;

  const shown = shownOf(groups, marks);
  const open = groups.reduce((n, g) => n + g.rows.filter((r) => !g.cols.some((c) => shown.get(`${r.name}=${c.v}`) === "in")).length, 0);
  return (
    <>
      <Panel>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-heading font-semibold">{checked ? (checked.length ? `${checked.length === 1 ? "One mark is" : `${checked.length} marks are`} wrong` : `No wrong marks; ${open === 1 ? "one row is" : `${open} rows are`} still open`) : `All ${p.clues.length} clues`}</h2>
          <p className="measure text-base text-muted-foreground">
            {checked ? (checked.length ? (hint ? "" : "They are in red. Tap a cell to change it.") : "Keep going: which clue have you not used yet?")
              : `Tick each answer, cross what is ruled out. Before any clue, ${ways(trail[0].settled.count, trail[0].settled.capped)} arrangements fit; the count stays hidden until you finish.`}
          </p>
          {hint && <p className="measure text-base">{hint}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={check} disabled={!Object.keys(marks).length}>Check</Button>
          <Button variant="secondary" onClick={askHint}>Hint</Button>
          <Button variant="ghost" onClick={onWatch}>Show the answer</Button>
        </div>
      </Panel>
      <ReplayBoard model={m} groups={groups} onTap={(key) => { setMarks((x) => tap(x, key)); setChecked(null); }}
        view={(key) => viewOf(shown, key, { wrong: !!checked?.includes(key) })} />
    </>
  );
}

function Done({ h, p, m, groups, trail, next, back, onWatch, line }: { h: string; p: ReplayPuzzle; m: GridModel; groups: BoardGroup[]; trail: TrailStep[]; next?: ReplayPuzzle; back: string | null; onWatch: () => void; line: string }) {
  const last = trail.length - 1, best = biggestCut(trail);
  return (
    <>
      <Panel>
        <h2 className="text-title font-extrabold">{h}</h2>
        <p className="text-base">{line}</p>
        <WaysLeft trail={trail} at={last} best={best} label="How the ways fell" />
        <p className="measure text-base text-muted-foreground">The step to remember is step {best}, with {cluesWord(p.steps[best - 1].use)}. When a set like this comes up, look for that move first.</p>
        <div className="flex flex-wrap items-center gap-2">
          {back ? <LinkButton to={back}>Back to the set</LinkButton> : next ? <LinkButton to={`/practice/replay/${next.id}`}>Next replay set</LinkButton> : <LinkButton to="/dilr/practice">DILR practice</LinkButton>}
          <Button variant="secondary" onClick={onWatch}>Watch the replay</Button>
          <LinkButton to="/practice/replay" variant="ghost">All replay sets</LinkButton>
          <ClipButton p={p} m={m} groups={groups} trail={trail} />
        </div>
      </Panel>
      <ReplayBoard model={m} groups={groups} view={settledView({ ...trail[last], fresh: [] })} />
    </>
  );
}
