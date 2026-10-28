import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PAPERS_PAGE } from "../../data/papers";
import { shortDate, todayIso, uid } from "../../lib/date";
import { calm, loadGsap, type Gsap } from "../../lib/motion";
import { usePref } from "../../lib/prefs";
import type { LrAttempt } from "../../lib/state";
import { useStore } from "../../lib/store";
import { LinkButton, Section, TextLink } from "../../components/kit";
import { LR_CATALOG } from "../../practice/catalog.gen";
import { dueRedo, upcomingRedo } from "../../practice/redo";
import { LR_TYPE, LR_TYPES, type LrMeta, type LrType } from "../../practice/types";
import { PaperRow, Row, Rows } from "./rows";

const LEVEL = { easy: 0, medium: 1, hard: 2 } as const;
/** Easiest first, then shorter first: the order a student should meet the sets in. */
export const LR_ORDER = [...LR_CATALOG].sort((a, b) => LR_TYPES.indexOf(a.type) - LR_TYPES.indexOf(b.type) || LEVEL[a.difficulty] - LEVEL[b.difficulty] || a.minutes - b.minutes);


const meta = (s: LrMeta) => { const t = [s.sub, s.difficulty, `${s.minutes} minutes`, `${s.questions} questions`].filter(Boolean).join(", "); return t[0].toUpperCase() + t.slice(1); };
const score = (s: LrMeta, a: LrAttempt) => `${3 * a.c - a.w} of ${3 * s.questions}`;

/** A small drawing of each type's picture, so a group reads at a glance: seats round a table, a bracket, a table. */
function Thumb({ type }: { type: LrType }) {
  const c = "fill-none stroke-current stroke-[1.75]";
  return (
    <svg viewBox="0 0 48 48" className="size-11 shrink-0 text-primary" aria-hidden>
      {type === "arrangement" ? (
        <><circle cx="24" cy="24" r="9" className={c} />{Array.from({ length: 6 }, (_, k) => { const a = (k * Math.PI) / 3; return <circle key={k} cx={24 + 17 * Math.sin(a)} cy={24 + 17 * Math.cos(a)} r="3.2" className="fill-current" />; })}</>
      ) : type === "routes" ? (
        <><path d="M8 36 20 12l12 22 9-20M20 12l21 2M8 36h24" className={c} />{[[8, 36], [20, 12], [32, 34], [41, 14]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3.6" className="fill-current" />)}</>
      ) : type === "venn" || type === "setmax" ? (
        <><circle cx="18" cy="20" r="11" className={c} /><circle cx="30" cy="20" r="11" className={c} /><circle cx="24" cy="31" r="11" className={c} /></>
      ) : type === "tournament" ? (
        <path d="M5 8h10v8H5M5 32h10v8H5M15 12h8v24h-8M23 24h8M31 18h10v12H31" className={c} />
      ) : (
        <><rect x="5" y="8" width="38" height="32" rx="3" className={c} /><path d="M5 18.5h38M5 29h38M17.5 8v32M30.5 8v32" className={c} /></>
      )}
    </svg>
  );
}

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
          <span className="text-sm text-muted-foreground">{sets.length} sets{tried ? `, ${tried} tried` : ", none tried yet"}</span>
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

/** DILR practice: the next set to try, every LR set by type, and past papers. */
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
              </TypeGroup>
            );
          })}
          <p className="measure pt-3 text-base text-muted-foreground">All six logical reasoning types are here. Data interpretation sets join in December.</p>
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
