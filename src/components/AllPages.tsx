import { lazy, Suspense, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { addDays, todayIso } from "../lib/date";
import { useGsap } from "../lib/motion";
import { useStore } from "../lib/store";
import { LR_CATALOG, RC_CATALOG } from "../practice/catalog.gen";
import { DayRing, MAIN, minutes, MORE, SECTION_ITEMS, TRACK, useWaiting, type Item } from "./Sidebar";
import { SiteNavLink } from "./SiteHeader";
import type { Sec, Tower } from "./SectionTowers";

/**
 * The landing page's "All pages" panel, version 2 (D69, docs/design/all-pages.md): the three sections as towers of
 * real numbers (three.js, loaded with this panel), the daily places with a line each and what is waiting there, the
 * tracking pages, and the occasional ones. Set apart from the page by tone and a dimmed page behind it, not by a border
 * or a shadow. One entrance: the panel settles and its columns step in (GSAP); nothing moves under reduced motion.
 */

const SectionTowers = lazy(() => import("./SectionTowers"));

const ABOUT: Record<string, string> = {
  "/": "Where to start, and the days left",
  "/today": "Your plan for the day",
  "/practice": "Sets and drills for every section",
  "/progress": "Where you stand, skill by skill",
  "/plan": "Your timetable and phases",
};

/** A block per this many: a round number that keeps the tallest tower at twelve blocks or fewer. */
const unitFor = (max: number) => [1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000].find((u) => Math.ceil(max / u) <= 12) ?? Math.ceil(max / 12);

/**
 * What the towers show: the student's answers in the last 30 days (from the practice log, which every on-site answer
 * and every logged outside set joins) once there are any, else the sets on the site.
 */
function useTowers() {
  const { state } = useStore();
  return useMemo(() => {
    const from = addDays(todayIso(), -29);
    const mine = { varc: 0, dilr: 0, quant: 0 } as Record<Sec, number>;
    state.practice.forEach((p) => { if (p.d >= from) { const k = p.sec.toLowerCase() as Sec; if (k in mine) mine[k] += p.a; } });
    const own = mine.varc + mine.dilr + mine.quant > 0;
    const n: Record<Sec, number> = own ? mine : { varc: RC_CATALOG.length, dilr: LR_CATALOG.length, quant: 0 };
    const unit = unitFor(Math.max(n.varc, n.dilr, n.quant, 1));
    const soon = (s: Sec) => SECTION_ITEMS.find((i) => i.to === "/" + s)?.soon;
    const blocks = (s: Sec) => Math.max(n[s] ? 1 : 0, Math.round(n[s] / unit));
    // A section not open yet is an outline no taller than the shortest real tower, so it never reads as a number.
    const low = Math.min(...(["varc", "dilr"] as Sec[]).map(blocks).filter((b) => b > 0), 4);
    const towers: Tower[] = (["varc", "dilr", "quant"] as Sec[]).map((s) => ({ sec: s, blocks: soon(s) ? Math.max(2, low) : blocks(s), soon: soon(s) }));
    const label = (s: Sec) => (soon(s) ? "Soon" : own ? `${n[s].toLocaleString("en-IN")} ${n[s] === 1 ? "answer" : "answers"}` : `${n[s]} ${s === "varc" ? "RC" : "LR"} sets`);
    return { towers, own, unit, label };
  }, [state.practice]);
}

/** Flat towers, when WebGL is not there: the same numbers as bars. */
function FlatTowers({ towers, hot }: { towers: Tower[]; hot: Sec | null }) {
  const top = Math.max(1, ...towers.map((t) => t.blocks));
  return (
    <div className="flex h-full items-end justify-center gap-6 pb-2" aria-hidden>
      {towers.map((t) => (
        <span key={t.sec} className={cn("w-12 rounded-md transition-colors duration-200 motion-reduce:transition-none", t.soon ? "border-2 border-dashed border-muted-foreground/40" : hot && hot !== t.sec ? "bg-muted-foreground/30" : "bg-primary")}
          style={{ height: `${Math.max(12, ((t.soon ? 3 : t.blocks) / top) * 100)}%` }} />
      ))}
    </div>
  );
}

export default function AllPages({ onClose }: { onClose: () => void }) {
  const w = useWaiting();
  const t = useTowers();
  const navigate = useNavigate();
  const [hot, setHot] = useState<Sec | null>(null);
  const [flat, setFlat] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useGsap(ref, (gsap, el) => {
    gsap.from(el.querySelector("[data-scrim]"), { opacity: 0, duration: 0.25, ease: "power1.out" });
    gsap.from(el.querySelector("nav"), { y: -10, opacity: 0, duration: 0.35, ease: "power3.out" });
    gsap.from(el.querySelectorAll("[data-col]"), { y: 8, opacity: 0, duration: 0.4, stagger: 0.06, delay: 0.08, ease: "power3.out", clearProps: "all" });
  }, []);

  const row = (it: Item, about?: string) => (
    <SiteNavLink key={it.to} item={it} onClick={onClose}
      className={(on) => cn("group flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium text-foreground/80 transition-colors duration-150 hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none [&_svg]:size-5 [&_svg]:shrink-0",
        about ? "min-h-14" : "min-h-11", on && "bg-secondary font-semibold text-foreground [&_svg]:text-primary")}>
      <span className="text-foreground/60 transition-colors group-hover:text-primary"><it.Icon /></span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{it.label}</span>
        {about && <span className="truncate text-sm font-normal text-muted-foreground">{about}</span>}
      </span>
      {it.badge === "today" && w.planned > 0 && <span className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums" title={minutes(w)}><DayRing {...w} /><span className="sr-only">{minutes(w)}</span><span aria-hidden>{w.done}/{w.planned}</span></span>}
      {it.badge === "redo" && w.redo > 0 && <span className="rounded-md bg-primary/10 px-1.5 text-sm font-semibold text-primary tabular-nums">{w.redo}<span className="sr-only"> due</span></span>}
    </SiteNavLink>
  );
  const head = (s: string) => <h2 className="px-3 pb-1.5 text-sm font-medium text-muted-foreground">{s}</h2>;

  return (
    <div ref={ref} id="all-pages" className="absolute inset-x-0 top-full px-gutter pt-3 pb-6">
      {/* The page behind dims, so the panel stands apart by tone; a click on it closes the panel. */}
      <div data-scrim aria-hidden onClick={onClose} className="fixed inset-x-0 top-[4.5rem] bottom-0 -z-10 bg-scrim backdrop-blur-[2px]" />
      <div className="mx-auto flex w-full max-w-[1440px] justify-end">
        <nav aria-label="All pages" className="glass grid w-full max-w-[1180px] grid-cols-[19rem_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.9fr)] gap-3 rounded-3xl p-3 xl:gap-5"
          /* A popover is small and floats over flat text; this panel covers the hero's display type, which
             ghosted through the stock 74% pour. Same glass, denser. */
          style={{ backgroundColor: "color-mix(in oklab, var(--popover) 94%, transparent)" }}>
          <div data-col className="flex flex-col gap-3 rounded-2xl bg-secondary/70 p-4">
            <div className="flex flex-col">
              <h2 className="text-sm font-medium text-muted-foreground">Sections</h2>
              <p className="text-sm text-muted-foreground">{t.own ? `Your answers, last 30 days. A block is ${t.unit === 1 ? "one answer" : `${t.unit} answers`}.` : `Sets to practise. A block is ${t.unit === 1 ? "one set" : `${t.unit} sets`}.`}</p>
            </div>
            <div className="h-52">
              {flat
                ? <FlatTowers towers={t.towers} hot={hot} />
                : <Suspense fallback={<FlatTowers towers={t.towers} hot={hot} />}>
                    <SectionTowers towers={t.towers} hot={hot} onHot={setHot} onFail={() => setFlat(true)} onPick={(s) => { onClose(); navigate("/" + s); }} />
                  </Suspense>}
            </div>
            <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Sections">
              {SECTION_ITEMS.map((s) => {
                const sec = s.to.slice(1) as Sec;
                return (
                  <Link key={s.to} to={s.to} onClick={onClose} onPointerEnter={() => setHot(sec)} onPointerLeave={() => setHot(null)} onFocus={() => setHot(sec)} onBlur={() => setHot(null)}
                    className={cn("flex min-h-14 flex-col items-center justify-center rounded-xl px-1 text-center transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none",
                      hot === sec ? "bg-card text-primary" : "bg-card/60 hover:bg-card", s.soon && hot !== sec && "text-muted-foreground")}>
                    <span className="text-base leading-tight font-semibold">{s.label}</span>
                    <span className="text-sm leading-tight text-muted-foreground">{t.label(sec)}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div data-col className="flex flex-col gap-0.5 py-2">
            {head("Study")}
            {MAIN.map((it) => row(it, ABOUT[it.to]))}
          </div>
          <div data-col className="flex flex-col gap-0.5 py-2">
            {head("Track")}
            {TRACK.map((it) => row(it))}
          </div>
          <div data-col className="flex flex-col gap-0.5 py-2">
            {head("More")}
            {MORE.map((it) => row(it))}
          </div>
        </nav>
      </div>
    </div>
  );
}
