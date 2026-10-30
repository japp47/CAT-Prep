import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ContentGate } from "../../components/Content";
import { ArrowLink, LinkButton, Meta, Page, PageHeader, Section } from "../../components/kit";
import { TimelineFigure } from "../../components/LrFigures";
import { mediumDate, todayIso, uid } from "../../lib/date";
import { useGsap } from "../../lib/motion";
import type { ArenaGuess, ArenaRound } from "../../lib/state";
import { useStore } from "../../lib/store";
import {
  ARENA_SECS, ARENA_SETS, arenaTrend, costliest, debrief, freshLeft, letterOf, LOOK_NUDGE, pickRound, resultOf, roundScore, selectionAccuracy, setSecs, visitLanes,
} from "../../practice/arena";
import { LR_CATALOG } from "../../practice/catalog.gen";
import type { Content } from "../../practice/content";
import { recordLr } from "../../practice/lrattempt";
import { fmtSecs } from "../../practice/record";
import type { LrSet } from "../../practice/types";
import NotFound from "../NotFound";
import { Confirm, PlayerBar, ScoreCard, Timer, useLeaveConfirmation } from "./common";
import { answered, blankWork, LrSolve, SetText, type LrWork } from "./LrPlayer";

/**
 * The Set Selection Arena (F56, docs/design/arena.md): five unseen DILR sets under one 40-minute clock. The student
 * looks, picks an order (and may leave sets), solves, then sees their picks against what happened. The clock keeps
 * running if they leave, as in the exam; the round is kept in its own storage key until it is submitted.
 */
export default function Arena() {
  const [sp] = useSearchParams();
  const id = sp.get("round");
  return id ? <Debrief key={id} id={id} /> : <Live />;
}

const META = new Map(LR_CATALOG.map((m) => [m.id, m]));
const KEY = "cat-prep-arena";

interface Draft {
  id: string; sets: string[]; replay: boolean; startedAt: number; phase: "look" | "solve";
  order: string[]; left: string[]; guess: Record<string, ArenaGuess>; look: number;
  open: string; from: number; visits: [string, number, number][]; work: Record<string, LrWork>;
  /** Sets the student has opened while looking. */
  seen?: string[];
}

function loadDraft(): Draft | null {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) ?? "null") as Draft | null;
    return d && Array.isArray(d.sets) && d.sets.length === ARENA_SETS && typeof d.startedAt === "number" && Array.isArray(d.visits) ? d : null;
  } catch {
    return null;
  }
}
function saveDraft(d: Draft | null) {
  try {
    if (d) localStorage.setItem(KEY, JSON.stringify(d));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: the round still works, it just will not survive a reload */
  }
}

const elapsed = (d: Draft, now = Date.now()) => Math.min(ARENA_SECS, Math.floor((now - d.startedAt) / 1000));

function Live() {
  const [draft, setDraft] = useState<Draft | null>(() => loadDraft());
  if (!draft) return <Deal onStart={(d) => { saveDraft(d); setDraft(d); }} />;
  return <ContentGate need={{ lr: draft.sets }}>{(c) => <Round start={draft} c={c} />}</ContentGate>;
}

// ---------------------------------------------------------------------------------------------------------------
// Deal

function Deal({ onStart }: { onStart: (d: Draft) => void }) {
  const { state } = useStore();
  const [seed] = useState(uid);
  const deal = useMemo(() => pickRound(state.lrAttempts, state.arenaRounds, seed, todayIso()), [state.lrAttempts, state.arenaRounds, seed]);
  const left = freshLeft(state.lrAttempts, state.arenaRounds);
  const trend = arenaTrend(state.arenaRounds, state.lrAttempts);
  const past = [...state.arenaRounds].sort((a, b) => b.updatedAt - a.updatedAt);
  const start = () => deal && onStart({
    id: uid(), sets: deal.sets, replay: deal.replay, startedAt: Date.now(), phase: "look", order: [], left: [], guess: {}, look: 0,
    open: deal.sets[0], from: 0, visits: [], work: {},
  });
  const rules: [string, string][] = [
    ["Five sets, 40 minutes", "As in CAT's DILR section. The clock starts when you deal and keeps running if you leave."],
    ["Look, then pick", "Read the sets, pick the order you would solve them in and leave the ones you would skip. Guess each set's minutes and right answers if you like. Toppers spend three to five minutes here."],
    ["Then solve", "Switch sets whenever you want. MCQ: +3 right, −1 wrong; typed answers cost nothing when wrong."],
    ["Afterwards", "Your picks against what happened: where the minutes went and which set cost the most."],
  ];
  return (
    <Page>
      <PageHeader title="Set Selection Arena" back={{ to: "/dilr/practice", label: "DILR practice" }}>
        In DILR the score is decided in the first few minutes, by which sets you choose. This trains the choice, not only the solving.
      </PageHeader>
      <div className="flex flex-col gap-6 rounded-lg bg-card p-5 sm:p-7">
        {deal && <DealtCards />}
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-[14rem_minmax(0,1fr)]">
          {rules.map(([k, v]) => <div key={k} className="contents"><dt className="text-base font-semibold">{k}</dt><dd className="measure text-base text-foreground/85">{v}</dd></div>)}
        </dl>
        {deal ? (
          <div className="flex flex-col gap-3">
            {deal.replay
              ? <p className="measure text-base text-muted-foreground">You have met nearly every set. This is a replay round of sets you last saw a month or more ago; it does not count towards your selection score.</p>
              : <p className="measure text-base text-muted-foreground">Rounds use logical reasoning sets you have not tried. {left} are left. Data interpretation sets join when they arrive.</p>}
            <div><Button size="lg" onClick={start}>Deal the round</Button></div>
          </div>
        ) : (
          <p className="measure text-base">Every set has been in a round or practice recently, so no round can be dealt today. New sets are added often; a replay round opens a month after you last saw a set.</p>
        )}
      </div>
      {trend && (
        <Section title="Your set selection">
          <p className="measure text-base">Over {trend.rounds} rounds, your earlier picks earned at least as much a minute as your later ones <b className="font-semibold">{trend.pct}%</b> of the time.</p>
        </Section>
      )}
      {past.length > 0 && (
        <Section title="Your rounds">
          <ul className="flex flex-col gap-1">
            {past.map((r) => {
              const s = roundScore(r, state.lrAttempts), acc = selectionAccuracy(r, state.lrAttempts);
              return (
                <li key={r.id}>
                  <Link to={`/practice/arena?round=${r.id}`} className="flex items-center justify-between gap-4 rounded-md bg-card px-4 py-3 hover:bg-card/70">
                    <span className="flex flex-col">
                      <b className="text-base font-semibold tabular-nums">{s.marks} of {s.max}</b>
                      <Meta>{mediumDate(r.d)}{acc ? `, picks ${Math.round((acc.right / acc.pairs) * 100)}% right` : ""}{r.replay ? ", replay" : ""}</Meta>
                    </span>
                    <span className="text-base font-medium text-primary">Debrief</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </Page>
  );
}

/**
 * Five face-down cards, dealt in once on arrival (the page's one entrance; nothing moves under reduced motion). The
 * letters are all a student knows before the clock starts.
 */
function DealtCards() {
  const box = useRef<HTMLDivElement>(null);
  useGsap(box, (gsap, el) => {
    gsap.from(el.children, { x: -48, y: 12, rotate: -10, opacity: 0, duration: 0.55, stagger: 0.09, ease: "power3.out" });
  }, []);
  return (
    <div ref={box} className="grid max-w-xl grid-cols-5 gap-2 sm:gap-3" aria-hidden>
      {Array.from({ length: ARENA_SETS }, (_, k) => (
        <div key={k} className="grid aspect-[3/4] place-items-center rounded-lg bg-primary text-heading font-bold text-primary-foreground">{String.fromCharCode(65 + k)}</div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The round

function Clock({ d, onEnd }: { d: Draft; onEnd: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const left = ARENA_SECS - elapsed(d, now);
  useEffect(() => { if (left <= 0) onEnd(); });
  return <Timer over={left <= 300}>{fmtSecs(Math.max(0, left))} left</Timer>;
}

function Round({ start, c }: { start: Draft; c: Content }) {
  const { update } = useStore();
  const navigate = useNavigate();
  const leave = useLeaveConfirmation(true);
  const [d, setD] = useState(start);
  const [pane, setPane] = useState<"p" | "q">("p");
  const [confirming, setConfirming] = useState(false);
  const done = useRef(false);
  const sets = d.sets.map((id) => c.lrById(id)).filter((s): s is LrSet => !!s);
  const byId = (id: string) => sets.find((s) => s.id === id)!;

  useEffect(() => { if (!done.current) saveDraft(d); }, [d]);

  const workOf = (id: string) => d.work[id] ?? blankWork(byId(id));
  /** Closes the visit to the set on screen and opens another. */
  const visit = (id: string) => setD((p) => {
    if (p.open === id) return p;
    const now = elapsed(p);
    return { ...p, open: id, from: now, visits: now > p.from ? [...p.visits, [p.open, p.from, now]] : p.visits };
  });

  const submit = () => {
    if (done.current) return;
    done.current = true;
    const end = elapsed(d);
    const visits: [string, number, number][] = d.phase === "solve" && end > d.from ? [...d.visits, [d.open, d.from, end]] : d.visits;
    const now = Date.now(), today = todayIso();
    // Ids are made here, not in the update, which React may run twice.
    const attempts: Record<string, string> = {};
    sets.forEach((s) => { const w = d.work[s.id]; if (w && answered(w)) attempts[s.id] = uid(); });
    const round: ArenaRound = {
      id: d.id, d: today, updatedAt: now, sets: d.sets, order: d.order, left: d.sets.filter((id) => !d.order.includes(id)),
      guess: d.guess, look: d.phase === "solve" ? d.look : end, visits, attempts, secs: end, ...(d.replay ? { replay: true as const } : {}),
    };
    update((st) => {
      sets.forEach((s) => {
        const w = d.work[s.id];
        if (attempts[s.id]) recordLr(st, attempts[s.id], s, w.ans, setSecs(round, s.id) || 1, today, w.unsure.flatMap((u, i) => (u ? [i] : [])), now);
      });
      st.arenaRounds.push(round);
    });
    saveDraft(null);
    leave.allowNextNavigation();
    navigate(`/practice/arena?round=${d.id}`, { replace: true });
  };

  if (sets.length !== ARENA_SETS) return <NotFound />;
  // Leaving is asked on both screens: the blocker holds every link while a round runs, so the dialog must be there.
  const leaving = (
    <Confirm open={leave.open} onOpenChange={leave.onOpenChange} title="Leave the round?" action="Leave the round" onAction={leave.onLeave} cancel="Stay" danger actionClassName="!text-white dark:!text-black">
      The clock keeps running while you are away, as in the exam. Come back to Set Selection Arena before it ends to carry on.
    </Confirm>
  );
  return d.phase === "look"
    ? <><Look d={d} setD={setD} sets={sets} onSubmit={submit} />{leaving}</>
    : (
      <Page className="gap-6 lg:gap-8">
        <PlayerBar kicker={`Set Selection Arena, set ${letterOf(asRound(d), d.open)}`} title={byId(d.open).title}>
          <Clock d={d} onEnd={submit} />
          <Button size="sm" variant="secondary" onClick={() => setConfirming(true)}>Submit the round</Button>
        </PlayerBar>
        <SetBar d={d} sets={sets} workOf={workOf} onPick={(id) => { visit(id); setPane("p"); window.scrollTo(0, 0); }} />
        <LrSolve key={d.open} set={byId(d.open)} work={workOf(d.open)} onChange={(w) => setD((p) => ({ ...p, work: { ...p.work, [p.open]: w } }))} pane={pane} setPane={setPane}
          last={nextOf(d, d.open)
            ? <Button size="sm" onClick={() => { visit(nextOf(d, d.open)!); setPane("p"); window.scrollTo(0, 0); }}>Next set</Button>
            : <Button size="sm" onClick={() => setConfirming(true)}>Submit the round</Button>} />
        <Confirm open={confirming} onOpenChange={setConfirming} title="Submit the round?" action="Submit the round" onAction={submit}>
          {untouched(d).length
            ? `You have not answered anything in ${untouched(d).map((id) => letterOf(asRound(d), id)).join(", ")}. Sets with no answer stay unsolved in your practice list.`
            : "Your picks and answers are saved, and the debrief follows."}
        </Confirm>
        {leaving}
      </Page>
    );
}

const asRound = (d: Draft) => ({ sets: d.sets }) as ArenaRound;
/** The bar's order: the picked sets in the student's order, then the rest. */
const barOrder = (d: Draft) => [...d.order, ...d.sets.filter((id) => !d.order.includes(id))];
const nextOf = (d: Draft, id: string) => { const o = barOrder(d); return o[o.indexOf(id) + 1]; };
const untouched = (d: Draft) => d.order.filter((id) => !d.work[id] || !answered(d.work[id]));

/** The sets in the student's order, each with how many questions are answered; the open one in tone. */
function SetBar({ d, sets, workOf, onPick }: { d: Draft; sets: LrSet[]; workOf: (id: string) => LrWork; onPick: (id: string) => void }) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Sets in this round">
      {barOrder(d).map((id) => {
        const s = sets.find((x) => x.id === id)!, w = workOf(id), on = d.open === id, picked = d.order.includes(id);
        return (
          <button key={id} type="button" onClick={() => onPick(id)} aria-current={on || undefined}
            className={cn("flex min-h-11 items-center gap-2 rounded-md px-3.5 py-2 text-base font-semibold transition-colors motion-reduce:transition-none",
              on ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent", !picked && !on && "text-muted-foreground")}>
            <span>{letterOf(asRound(d), id)}</span>
            <span className={cn("text-sm font-normal tabular-nums", on ? "text-primary-foreground/80" : "text-muted-foreground")}>{answered(w)}/{s.questions.length}{picked ? "" : ", left"}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Look and pick

const MIN_CHOICES = [5, 10, 15, 20, 25];

function Look({ d, setD, sets, onSubmit }: { d: Draft; setD: (f: (p: Draft) => Draft) => void; sets: LrSet[]; onSubmit: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, []);
  const open = sets.find((s) => s.id === d.open)!;
  const r = asRound(d);
  const rank = d.order.indexOf(open.id), isLeft = d.left.includes(open.id);
  const g = d.guess[open.id] ?? {};
  const mcq = open.questions.filter((q) => q.kind === "mcq").length;
  const setGuess = (patch: ArenaGuess) => setD((p) => ({ ...p, guess: { ...p.guess, [open.id]: { ...p.guess[open.id], ...patch } } }));
  // Picking keeps the set open, so its guesses can follow; leaving moves on to the next undecided set.
  const pick = () => setD((p) => ({ ...p, order: [...p.order.filter((x) => x !== open.id), open.id], left: p.left.filter((x) => x !== open.id) }));
  const leaveIt = () => setD((p) => ({ ...p, order: p.order.filter((x) => x !== open.id), left: [...p.left.filter((x) => x !== open.id), open.id], open: nextUnpicked(p, open.id) }));
  const next = nextUnpicked(d, open.id);
  const undo = () => setD((p) => ({ ...p, order: p.order.filter((x) => x !== open.id), left: p.left.filter((x) => x !== open.id) }));
  const begin = () => setD((p) => {
    const t = elapsed(p);
    const first = p.order[0] ?? p.sets[0];
    return { ...p, phase: "solve", look: t, open: first, from: t };
  });
  const looked = elapsed(d, now);

  return (
    <Page className="gap-6 lg:gap-8">
      <PlayerBar kicker="Set Selection Arena, look and pick" title="Pick your order">
        <Clock d={d} onEnd={onSubmit} />
        <Button size="sm" onClick={begin} disabled={!d.order.length}>Start solving</Button>
      </PlayerBar>
      <PickStrip d={d} sets={sets} onOpen={(id) => setD((p) => ({ ...p, open: id, seen: [...new Set([...(p.seen ?? []), p.open, id])] }))} />
      {looked >= LOOK_NUDGE && <p className="-mt-2 text-base text-muted-foreground">Most toppers start solving by now.</p>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="flex flex-col gap-4 lg:order-1">
          <SetText set={open} />
          <section className="flex flex-col gap-3 rounded-lg bg-card px-5 py-5 sm:px-7" aria-label="The questions">
            <h2 className="text-base font-semibold">The questions ({mcq} MCQ, {open.questions.length - mcq} typed)</h2>
            <ol className="flex flex-col gap-3">
              {open.questions.map((q, i) => <li key={i} className="grid grid-cols-[2rem_1fr] gap-1 text-base"><span className="text-muted-foreground tabular-nums">{i + 1}.</span><span className="whitespace-pre-line">{q.stem}</span></li>)}
            </ol>
          </section>
        </div>
        <aside className="flex flex-col gap-5 rounded-lg bg-card p-5 lg:sticky lg:top-32 lg:order-2" aria-label={`Set ${letterOf(r, open.id)}`}>
          <div className="flex flex-col gap-1">
            <h2 className="text-heading font-semibold">Set {letterOf(r, open.id)}</h2>
            <p className="text-base text-muted-foreground">{rank >= 0 ? `Picked ${ORD[rank]}.` : isLeft ? "You are leaving it." : "Not picked yet."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {rank < 0 && <Button variant="secondary" onClick={pick}>Pick it {ORD[d.order.length]}</Button>}
            {!isLeft && <Button variant="ghost" onClick={leaveIt}>Leave it</Button>}
            {(rank >= 0 || isLeft) && <Button variant="ghost" onClick={undo}>Undo</Button>}
          </div>
          <p className="text-base">{open.questions.length} questions: {mcq} MCQ, {open.questions.length - mcq} typed.</p>
          {rank >= 0 && (
            <>
              <Guess label="Your guess: minutes" value={g.min} options={MIN_CHOICES.map((m) => [m, m === 25 ? "25+" : String(m)])} onChange={(v) => setGuess({ min: v })} />
              <Guess label="Your guess: right answers" value={g.right} options={Array.from({ length: open.questions.length + 1 }, (_, i) => [i, String(i)])} onChange={(v) => setGuess({ right: v })} />
              <p className="text-sm text-muted-foreground">Guesses are optional. They make the debrief sharper.</p>
            </>
          )}
          {next !== open.id && <Button variant="ghost" className="self-start" onClick={() => { setD((p) => ({ ...p, open: next, seen: [...new Set([...(p.seen ?? []), p.open, next])] })); window.scrollTo(0, 0); }}>Next set: {letterOf(r, next)}</Button>}
        </aside>
      </div>
    </Page>
  );
}

const ORD = ["1st", "2nd", "3rd", "4th", "5th"];

/**
 * The five sets as tiles, and above them the order as five slots that fill as the student picks. A slot pops in when
 * it fills, answering the tap (GSAP; nothing moves under reduced motion). Tiles say where each set stands: picked, leaving,
 * read or not read yet, so a glance shows what is left to judge.
 */
function PickStrip({ d, sets, onOpen }: { d: Draft; sets: LrSet[]; onOpen: (id: string) => void }) {
  const r = asRound(d);
  const seen = new Set([...(d.seen ?? []), d.open]);
  const rail = useRef<HTMLOListElement>(null);
  useGsap(rail, (gsap, el) => {
    const fresh = el.querySelector("[data-fresh]");
    if (fresh) gsap.from(fresh, { scale: 0.5, opacity: 0, duration: 0.4, ease: "back.out(2.2)" });
  }, [d.order.join(",")]);
  return (
    <section className="flex flex-col gap-4" aria-label="Pick your order">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="text-base font-semibold">Your order</h2>
        <ol ref={rail} className="flex gap-2" aria-live="polite">
          {Array.from({ length: ARENA_SETS }, (_, i) => {
            const id = d.order[i], g = id ? d.guess[id] : undefined;
            return id ? (
              <li key={id} data-fresh={i === d.order.length - 1 || undefined} title={g?.min !== undefined ? `Guess ${g.min} min` : undefined}
                className="grid h-11 min-w-11 place-items-center rounded-full bg-primary px-3 text-base font-bold text-primary-foreground">
                <span><span className="sr-only">{ORD[i]}: set </span>{letterOf(r, id)}</span>
              </li>
            ) : <li key={"slot" + i} className="grid size-11 place-items-center rounded-full bg-secondary text-sm text-muted-foreground tabular-nums" aria-label={`${ORD[i]}: empty`}>{i + 1}</li>;
          })}
        </ol>
        {d.left.length > 0 && <p className="text-base text-muted-foreground">Leaving {d.left.map((id) => letterOf(r, id)).join(", ")}</p>}
      </div>
      <div className="grid grid-cols-5 gap-2 sm:gap-3" role="group" aria-label="The five sets">
        {d.sets.map((id) => {
          const s = sets.find((x) => x.id === id)!, at = d.order.indexOf(id), left = d.left.includes(id), on = d.open === id;
          const where = at >= 0 ? ORD[at] : left ? "Leaving" : seen.has(id) ? "Read" : "Not read";
          return (
            <button key={id} type="button" onClick={() => onOpen(id)} aria-pressed={on}
              aria-label={`Set ${letterOf(r, id)}, ${s.questions.length} questions, ${at >= 0 ? `picked ${ORD[at]}` : where.toLowerCase()}`}
              className={cn("flex min-h-24 flex-col items-start justify-between gap-2 rounded-lg p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none sm:p-4",
                on ? "bg-primary text-primary-foreground" : at >= 0 ? "bg-accent hover:bg-accent/80" : left ? "bg-secondary/50 text-muted-foreground hover:bg-secondary" : "bg-card hover:bg-accent")}>
              <span className={cn("text-heading leading-none font-bold", left && !on && "line-through decoration-2")}>{letterOf(r, id)}</span>
              <span className="flex flex-col">
                <span className={cn("text-sm font-semibold", on ? "text-primary-foreground" : at >= 0 ? "text-primary" : "")}>{where}</span>
                <span className={cn("hidden text-sm sm:block", on ? "text-primary-foreground/80" : "text-muted-foreground")}>{s.questions.length} questions</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** The next set not yet picked or left, after `id` in deal order; `id` itself when every set is decided. */
function nextUnpicked(p: Draft, id: string) {
  const decided = new Set([...p.order, ...p.left, id]);
  const i = p.sets.indexOf(id);
  return [...p.sets.slice(i + 1), ...p.sets.slice(0, i)].find((x) => !decided.has(x)) ?? id;
}

function Guess({ label, value, options, onChange }: { label: string; value: number | undefined; options: [number, string][]; onChange: (v: number | undefined) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="pb-2 text-base font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([v, t]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(value === v ? undefined : v)}
            className={cn("min-h-11 min-w-11 rounded-md px-3 text-base font-semibold tabular-nums", value === v ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-accent")}>{t}</button>
        ))}
      </div>
    </fieldset>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Debrief

function Debrief({ id }: { id: string }) {
  const { state } = useStore();
  const r = state.arenaRounds.find((x) => x.id === id);
  if (!r) return <NotFound />;
  return <DebriefOf r={r} />;
}

function DebriefOf({ r }: { r: ArenaRound }) {
  const { state } = useStore();
  const lr = state.lrAttempts;
  const score = roundScore(r, lr), acc = selectionAccuracy(r, lr), cost = costliest(r, lr), lines = debrief(r, lr);
  const lanes = useMemo(() => visitLanes(r, lr), [r, lr]);
  const title = (id: string) => META.get(id)?.title ?? id;
  const solvedIn = Object.keys(r.attempts);
  const unsolved = r.sets.filter((id) => !r.attempts[id] && !lr.some((a) => a.set === id));
  const box = useRef<HTMLDivElement>(null);
  useGsap(box, (gsap, el) => {
    gsap.from(el.querySelectorAll(".origin-left"), { scaleX: 0, duration: 0.6, stagger: 0.06, ease: "power2.out" });
  }, [r.id]);

  return (
    <Page>
      <PageHeader title="Your picks against what happened" back={{ to: "/practice/arena", label: "Set Selection Arena" }}>
        {mediumDate(r.d)}{r.replay ? ", a replay round (not counted in your selection score)" : ""}.
      </PageHeader>

      <ScoreCard score={score.marks} of={score.max} parts={[
        ["Sets answered", `${solvedIn.length} of ${r.sets.length}`],
        ["Picks right", acc ? `${acc.right} of ${acc.pairs} pairs` : "Too few sets to judge"],
        ["Time used", fmtSecs(r.secs)],
      ]}>
        {cost && <p className="measure rounded-md bg-highlight-soft px-4 py-3 text-base">The set that cost most: <b className="font-semibold">{letterOf(r, cost.set)}</b>, {Math.round(cost.mins)} minutes for {cost.right} right ({cost.marks} marks).</p>}
      </ScoreCard>

      <Section title="Your 40 minutes" description="One lane per set; each bar is a stretch of time on it. Gaps are where you switched.">
        <div ref={box} className="rounded-lg bg-card p-5 sm:p-6">
          <TimelineFigure g={lanes.g} frame={lanes.g.frames[0]} lit={lanes.lit} before={lanes.lit} />
        </div>
      </Section>

      <Section title="Guess against reality">
        <div className="flex flex-col gap-5 rounded-lg bg-card p-5 sm:p-6">
          <Columns r={r} />
          <ul className="flex flex-col gap-2">
            {lines.map((l) => <li key={l.set} className="measure text-base"><b className="font-semibold">{l.letter}</b> ({title(l.set)}). {l.text}</li>)}
          </ul>
          <p className="text-sm text-muted-foreground">"Our estimate" is the time the set was written for. Real times from students replace it once there are enough.</p>
        </div>
      </Section>

      <Section title="What next">
        <ul className="flex flex-col gap-2">
          {solvedIn.map((id) => <li key={id}><ArrowLink to={`/practice/lr/${id}?review=${r.attempts[id]}`}>Review {letterOf(r, id)}: {title(id)}</ArrowLink></li>)}
          {unsolved.map((id) => <li key={id}><ArrowLink to={`/practice/lr/${id}`}>Solve {letterOf(r, id)} now: {title(id)}</ArrowLink></li>)}
        </ul>
        <div className="pt-2"><LinkButton to="/practice/arena">Play another round</LinkButton></div>
      </Section>
    </Page>
  );
}

interface Column { label: string; guess?: number; took?: number; estimate?: number; tone: "good" | "mid" | "poor" | "none" }

/** Guessed and taken minutes per set, as paired bars on one 0 to 40 minute scale. */
function Columns({ r }: { r: ArenaRound }) {
  const { state } = useStore();
  const cols: Column[] = r.sets.map((id) => {
    const x = resultOf(r, id, state.lrAttempts), m = META.get(id), g = r.guess[id] ?? {};
    const inRound = x && !x.later;
    const share = inRound && m ? x.right / m.questions : 0;
    return {
      label: letterOf(r, id), guess: inRound ? g.min : undefined, took: inRound ? x.mins : undefined, estimate: m?.minutes,
      tone: !inRound ? "none" : share >= 0.8 ? "good" : share >= 0.4 ? "mid" : "poor",
    };
  });
  return <GuessBars cols={cols} />;
}

function Legend() {
  return (
    <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
      <span><span className="mr-1.5 inline-block size-3 rounded-sm bg-primary/30 align-middle" />Your guess</span>
      <span><span className="mr-1.5 inline-block size-3 rounded-sm bg-success align-middle" />Taken, most right</span>
      <span><span className="mr-1.5 inline-block size-3 rounded-sm bg-highlight align-middle" />Taken, some right</span>
      <span><span className="mr-1.5 inline-block size-3 rounded-sm bg-danger align-middle" />Taken, few right</span>
      <span><span className="mr-1.5 inline-block size-3 rounded-sm ring-1 ring-muted-foreground ring-inset align-middle" />Our estimate (not solved)</span>
    </p>
  );
}

const TONE_BG = { good: "bg-success", mid: "bg-highlight", poor: "bg-danger", none: "bg-muted-foreground" } as const;

/** Per set, a guess bar over a taken bar on a 0 to 40 minute scale. The bars grow once on arrival. */
function GuessBars({ cols }: { cols: Column[] }) {
  const pct = (m: number) => `${Math.min(100, (m / 40) * 100)}%`;
  const box = useRef<HTMLDivElement>(null);
  useGsap(box, (gsap, el) => { gsap.from(el.querySelectorAll("[data-bar]"), { scaleX: 0, transformOrigin: "left center", duration: 0.7, stagger: 0.06, ease: "power3.out" }); }, []);
  return (
    <div ref={box} className="flex flex-col gap-3">
      {cols.map((c) => (
        <div key={c.label} className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-3">
          <span className="text-base font-bold">{c.label}</span>
          <div className="flex flex-col gap-1">
            {c.took !== undefined ? (
              <>
                {c.guess !== undefined && <div data-bar className="h-3 rounded-sm bg-primary/30" style={{ width: pct(c.guess) }} title={`Guess ${c.guess} min`} />}
                <div data-bar className={cn("h-3 rounded-sm", TONE_BG[c.tone])} style={{ width: pct(c.took) }} title={`Took ${Math.round(c.took)} min`} />
              </>
            ) : c.estimate !== undefined && <div data-bar className="h-3 rounded-sm ring-1 ring-muted-foreground ring-inset" style={{ width: pct(c.estimate) }} title={`Our estimate ${c.estimate} min`} />}
          </div>
        </div>
      ))}
      <Legend />
    </div>
  );
}
