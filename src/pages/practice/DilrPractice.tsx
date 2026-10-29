import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PAPERS_PAGE } from "../../data/papers";
import { shortDate, todayIso, uid } from "../../lib/date";
import { calm, loadGsap, type Gsap } from "../../lib/motion";
import { usePref } from "../../lib/prefs";
import type { LrAttempt, LrDrillRun } from "../../lib/state";
import { useStore } from "../../lib/store";
import { ArrowLink, LinkButton, Section, TextLink } from "../../components/kit";
import { LR_GUIDE_BY_TYPE } from "../../sections/dilr/guides";
import { LR_CATALOG } from "../../practice/catalog.gen";
import { dueRedo, upcomingRedo } from "../../practice/redo";
import { LR_TYPE, LR_TYPES, type LrMeta, type LrType } from "../../practice/types";
import { LrThumb as Thumb } from "../../components/LrThumb";
import { PaperRow, Row, Rows } from "./rows";

const LEVEL = { easy: 0, medium: 1, hard: 2 } as const;
/** Easiest first, then shorter first: the order a student should meet the sets in. */
export const LR_ORDER = [...LR_CATALOG].sort((a, b) => LR_TYPES.indexOf(a.type) - LR_TYPES.indexOf(b.type) || LEVEL[a.difficulty] - LEVEL[b.difficulty] || a.minutes - b.minutes);


const meta = (s: LrMeta) => { const t = [s.sub, s.difficulty, `${s.minutes} minutes`, `${s.questions} questions`].filter(Boolean).join(", "); return t[0].toUpperCase() + t.slice(1); };
const score = (s: LrMeta, a: LrAttempt) => `${3 * a.c - a.w} of ${3 * s.questions}`;

/**
 * One type of set, folded (D43): the header says how far the student has got; the sets render only while open, so a
 * long library costs nothing until it is opened. GSAP eases the height and brings the rows in one after another.
 */
function TypeGroup({ type, sets, last, open, onToggle, children }: { type: LrType; sets: LrMeta[]; last: Map<string, LrAttempt>; open: boolean; onToggle: (o: boolean) => void; children: React.ReactNode }) {
  const body = useRef<HTMLDivElement>(null);
  const gsap = useRef<Gsap | null>(null);
  const [shown, setShown] = useState(open);
  const tried = sets.filter((s) => last.has(s.id)).length;
  const id = `lr-group-${type}`;
  useEffect(() => { if (!calm()) loadGsap().then((g) => { gsap.current = g; }, () => {}); }, []);
  // Closing, by its own header or by "Close all": the height eases to nothing, then the rows leave the page.
  useEffect(() => {
    if (open) { setShown(true); return; }
    const el = body.current, g = gsap.current;
    if (!el || !g) { setShown(false); return; }
    g.killTweensOf(el);
    g.to(el, { height: 0, opacity: 0, duration: 0.28, ease: "power2.in", onComplete: () => setShown(false) });
  }, [open]);
  // Opening: from no height to the rows' height, then the rows step in.
  useLayoutEffect(() => {
    const el = body.current, g = gsap.current;
    if (!open || !shown || !el || !g) return;
    g.killTweensOf(el);
    g.fromTo(el, { height: 0, opacity: 0 }, { height: "auto", opacity: 1, duration: 0.4, ease: "power2.out" });
    g.from(el.querySelectorAll("li"), { y: 10, opacity: 0, duration: 0.35, stagger: 0.05, delay: 0.08, ease: "power2.out", clearProps: "all" });
  }, [open, shown]);
  const toggle = () => onToggle(!open);
  return (
    <div className="flex flex-col gap-px overflow-hidden rounded-xl bg-background">
      <button type="button" onClick={toggle} aria-expanded={open} aria-controls={id}
        className="group flex w-full items-center gap-4 bg-card px-5 py-4 text-left transition-colors hover:bg-card/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset sm:px-6">
        <Thumb type={type} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-heading font-semibold">{LR_TYPE[type].label}</span>
          <span className="text-sm text-muted-foreground">{sets.length} {sets.length === 1 ? "set" : "sets"}{tried ? `, ${tried} tried` : ", none tried yet"}</span>
        </span>
        {/* One pill per set, filled once tried. */}
        <span className="hidden items-center gap-1 sm:flex" aria-hidden>
          {sets.map((s) => <span key={s.id} className={cn("h-2 w-5 rounded-full", last.has(s.id) ? "bg-primary" : "bg-secondary")} />)}
        </span>
        <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform duration-300 group-aria-expanded:rotate-180 motion-reduce:transition-none" aria-hidden />
      </button>
      {shown && <div ref={body} id={id} className="overflow-hidden">{children}</div>}
    </div>
  );
}

/** A small picture of each drill: four cases with one struck out, three bins, bars of different lengths. */
function DrillGlyph({ kind }: { kind: LrDrillRun["kind"] }) {
  const c = "fill-secondary transition-[fill] duration-300 motion-reduce:transition-none";
  return (
    <svg viewBox="0 0 48 48" className="size-12 shrink-0" aria-hidden>
      {kind === "clue" && <>
        <rect x="4" y="4" width="18" height="18" rx="4" className={c} />
        <rect x="26" y="4" width="18" height="18" rx="4" className="fill-danger-soft" />
        <path d="M30 8l10 10M40 8L30 18" className="stroke-danger" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="4" y="26" width="18" height="18" rx="4" className={c} />
        <rect x="26" y="26" width="18" height="18" rx="4" className={cn(c, "group-hover:fill-primary/30")} />
      </>}
      {kind === "mcc" && <>
        <rect x="4" y="8" width="11" height="32" rx="3" className="fill-success-soft" />
        <rect x="18.5" y="8" width="11" height="32" rx="3" className={cn(c, "group-hover:fill-primary/30")} />
        <rect x="33" y="8" width="11" height="32" rx="3" className="fill-danger-soft" />
      </>}
      {kind === "first" && <>
        <rect x="4" y="8" width="12" height="7" rx="3.5" className="fill-success" />
        <rect x="4" y="20.5" width="40" height="7" rx="3.5" className={c} />
        <rect x="4" y="33" width="26" height="7" rx="3.5" className={cn(c, "group-hover:fill-primary/30")} />
      </>}
    </svg>
  );
}

const DRILLS: { kind: LrDrillRun["kind"]; to: string; h: string; p: string; meta: string }[] = [
  { kind: "clue", to: "/practice/clues", h: "Clue translator", p: "Read \"only if\", \"unless\", \"between\" and left and right onto a small board. A misreading is named.", meta: "8 clues, about 3 minutes" },
  { kind: "mcc", to: "/practice/must-could", h: "Must, could, cannot", p: "A set's finished seatings side by side; sort six statements by whether they hold in all, some or none. Uses sets you have solved.", meta: "6 statements, about 4 minutes" },
  { kind: "first", to: "/practice/first-move", h: "First move", p: "Pick the clue to start with. See how many ways each clue leaves open, worked out by solving the set. Uses sets you have solved.", meta: "3 moves, about 3 minutes" },
];

/** The three LR drills, each with how the last run went. */
function Drills({ runs }: { runs: LrDrillRun[] }) {
  return (
    <ul className="grid gap-3 md:grid-cols-3">
      {DRILLS.map((d) => {
        const mine = runs.filter((r) => r.kind === d.kind), last = mine[mine.length - 1] as LrDrillRun | undefined;
        const c = last?.items.filter((i) => i.ok).length;
        return (
          <li key={d.kind}>
            <Link to={d.to} className="group flex h-full flex-col gap-3 rounded-xl bg-card p-5 transition-colors hover:bg-card/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:p-6">
              <DrillGlyph kind={d.kind} />
              <span className="text-heading font-semibold group-hover:text-primary">{d.h}</span>
              <span className="text-base text-muted-foreground">{d.p}</span>
              <span className="mt-auto pt-1 text-sm text-muted-foreground">{last ? `Last time ${c} of ${last.items.length}, ${shortDate(last.d)}` : d.meta}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** DILR practice: the next set to try, the LR drills, every LR set by type, and past papers. */
export default function DilrPractice({ next }: { next: LrMeta | undefined }) {
  const { state } = useStore();
  const [seed] = useState(uid);
  const last = new Map<string, LrAttempt>();
  state.lrAttempts.forEach((a) => last.set(a.set, a));
  const types = LR_TYPES.filter((t) => LR_ORDER.some((s) => s.type === t));
  // The LR part of the redo queue.
  const lrRedo = state.redo.filter((r) => r.k.startsWith("lr:"));
  const lrOpen = lrRedo.filter((r) => !r.cleared), lrDue = dueRedo(lrRedo, todayIso()), lrNext = upcomingRedo(lrRedo, todayIso())[0]?.[0];
  // Which groups are open is remembered; at first only the group holding the next set is.
  const [saved, setSaved] = usePref<LrType[] | null>("lrOpen", null);
  const openTypes = saved ?? [next?.type ?? types[0]];
  const setOpenTypes = (ts: LrType[]) => setSaved(ts);

  return (
    <>
      <Section title="Next set">
        <Rows>
          {next ? (
            <Row next title={<Link to={`/practice/lr/${next.id}`} className="hover:text-primary">{next.title}</Link>}
              action={<LinkButton to={`/practice/lr/${next.id}`}>Start the set</LinkButton>}>
              <p>{LR_TYPE[next.type].label}. {meta(next)}. Read every clue, work it out in the scratch pad beside the questions, and stop at the target time.</p>
            </Row>
          ) : (
            <Row title="You have tried every set" action={<LinkButton to="/dilr" variant="secondary">Sets on other sites</LinkButton>}>
              <p>Retake the ones you got wrong without looking at the walkthrough, or practise past CAT sets from the DILR page while new types arrive.</p>
            </Row>
          )}
          {lrOpen.length > 0 && (
            <Row title={lrDue.length ? `Redo queue, ${lrDue.length} LR ${lrDue.length === 1 ? "question" : "questions"} due` : "Redo queue"}
              action={lrDue.length ? <LinkButton to={`/practice/redo?k=${lrDue.slice(0, 20).map((r) => r.k).join(",")}`} variant="secondary">Redo them</LinkButton> : <span className="text-base text-muted-foreground">Nothing due today</span>}>
              <p>LR questions you missed come back after 1, 3 and 7 days, each with its whole set, until you get them right three times in a row.{!lrDue.length && lrNext ? ` Next on ${shortDate(lrNext)}.` : ""}</p>
            </Row>
          )}
        </Rows>
      </Section>

      <Section title="Drills" description="Short drills for the skills that lose solved sets: reading a clue exactly, telling must from could, and choosing where to start. Every answer is worked out by solving the set in code.">
        <Drills runs={state.lrDrills} />
      </Section>

      <Section title="Logical reasoning sets"
        description={`${LR_ORDER.length} original sets, every answer checked by solving the set in code. Each has a timer, a scratch pad, a solution drawn step by step as a picture, and a two-minute post-mortem.${last.size ? ` You have tried ${last.size}.` : ""}`}>
        <div className="flex flex-col gap-3">
          {types.length > 1 && (
            <div className="flex gap-2 self-end">
              <Button variant="ghost" size="sm" onClick={() => setOpenTypes(types)} disabled={types.every((t) => openTypes.includes(t))}>Open all</Button>
              <Button variant="ghost" size="sm" onClick={() => setOpenTypes([])} disabled={!openTypes.length}>Close all</Button>
            </div>
          )}
          {types.map((t) => {
            const sets = LR_ORDER.filter((s) => s.type === t);
            return (
              <TypeGroup key={t} type={t} sets={sets} last={last} open={openTypes.includes(t)}
                onToggle={(o) => setOpenTypes(o ? [...openTypes, t] : openTypes.filter((x) => x !== t))}>
                <Rows>
                  {sets.map((s) => {
                    const a = last.get(s.id);
                    return (
                      <Row key={s.id} side title={<Link to={a ? `/practice/lr/${s.id}?review=${a.id}` : `/practice/lr/${s.id}`} className="hover:text-primary">{s.title}</Link>}
                        action={a
                          ? <><LinkButton to={`/practice/lr/${s.id}?review=${a.id}`} variant="secondary">Review</LinkButton><LinkButton to={`/practice/lr/${s.id}?n=${seed}`} variant="ghost" className="max-sm:hidden">Retake</LinkButton></>
                          : <LinkButton to={`/practice/lr/${s.id}`} variant="secondary">Start</LinkButton>}>
                        <p>{meta(s)}</p>
                        {a && <p className="text-foreground">Scored {score(s, a)}{a.pm?.key ? `; opened with clue ${a.pm.key}` : ""}</p>}
                      </Row>
                    );
                  })}
                </Rows>
                {LR_GUIDE_BY_TYPE.has(t) && <div className="bg-card px-5 py-4 sm:px-6"><ArrowLink to={`/dilr?guide=${t}`}>Read the guide first: what to draw and where to start</ArrowLink></div>}
              </TypeGroup>
            );
          })}
          <p className="measure pt-3 text-base text-muted-foreground">{types.length} kinds of logical reasoning set are here. Data interpretation sets join in December.</p>
        </div>
      </Section>

      <Section title="When you have more time">
        <Rows>
          <PaperRow>
            <p>Sit the DILR section of a past paper alone: 40 minutes, read all the sets first and pick two or three. Papers up to 2020 come with solutions, later ones with answer keys. From <TextLink to={PAPERS_PAGE}>Bodhee Prep</TextLink>.</p>
          </PaperRow>
          <Row title="Sets and sections on other sites" action={<LinkButton to="/dilr" variant="secondary">Open the DILR page</LinkButton>}>
            <p>Past CAT sets by topic, hundreds of sets with video solutions, free timed sections and mocks, all checked, on the DILR page's Practice tab.</p>
          </Row>
        </Rows>
      </Section>

      <p className="measure text-sm text-muted-foreground">Every set here is original practice material written for this site, not a real CAT question.</p>
    </>
  );
}
