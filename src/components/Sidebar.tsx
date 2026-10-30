import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { todayIso } from "../lib/date";
import { calm, loadGsap } from "../lib/motion";
import { usePref } from "../lib/prefs";
import { useStore } from "../lib/store";
import { buildDay, budgetFor, doneMinutes } from "../planner/engine";
import { LIVE_SECTIONS, SECTIONS } from "../sections";
import { IconChart, IconClock, IconHistory, IconHome, IconJournal, IconMistake, IconPen, IconRedo, IconToday, IconWeek, IconWords } from "./Icons";
import { PRACTICE_PATH, SiteNavLink, type SiteNavGroup, type SiteNavItem } from "./SiteHeader";

/**
 * The sidebar, version 2 (D65, docs/design/sidebar-v2.md): the places used every day with icons and what is waiting
 * there (the day's ring on Today, the redo queue's due count), the three sections as tiles, the tracking pages, and the
 * occasional ones folded under More. One card-toned pill marks the current place and slides to the next one. Collapsed,
 * the sidebar shows only the logo, search and its bottom controls (owner, 30 Oct 2026), so none of this renders.
 */

type Badge = "today" | "redo";
interface Item extends SiteNavItem { Icon: () => ReactNode; badge?: Badge }

const MAIN: Item[] = [
  { to: "/", label: "Home", end: true, Icon: IconHome },
  { to: "/today", label: "Today", Icon: IconToday, badge: "today" },
  { to: "/practice", label: "Practice", match: PRACTICE_PATH, Icon: IconPen },
  { to: "/progress", label: "Progress", Icon: IconChart },
  { to: "/plan", label: "Plan and time", Icon: IconClock },
];
const TRACK: Item[] = [
  { to: "/practice/redo", label: "Redo queue", Icon: IconRedo, badge: "redo" },
  { to: "/errors", label: "Error log", Icon: IconMistake },
  { to: "/history", label: "History", Icon: IconHistory },
  { to: "/review", label: "Weekly review", Icon: IconWeek },
  { to: "/words", label: "Words", Icon: IconWords },
  { to: "/journal", label: "Reading journal", Icon: IconJournal },
];
const MORE: SiteNavItem[] = [
  { to: "/updates", label: "Updates" }, { to: "/exams", label: "CAT and other exams" }, { to: "/guides", label: "Guides" },
  { to: "/stories", label: "Topper stories" }, { to: "/roadmap", label: "What's coming" }, { to: "/settings", label: "Settings and backup" },
];
const SECTION_ITEMS: SiteNavItem[] = SECTIONS.map((s) => ({ to: "/" + s.id, label: s.short, soon: s.status === "soon", end: true }));

/** The same places as groups, for the landing page's "All pages" panel. */
export const NAV_GROUPS: SiteNavGroup[] = [
  { title: "Study", items: MAIN },
  { title: "Sections", items: SECTION_ITEMS },
  { title: "Track", items: TRACK },
  { title: "More", items: MORE },
];

/** Practice's own redo page is a Practice address too, but in the sidebar the Redo queue item owns it. */
const isRedo = (p: string) => p.startsWith("/practice/redo");

/** Today's minutes done and planned (the same plan Today shows), and how many redo questions are due. */
function useWaiting() {
  const { state } = useStore();
  return useMemo(() => {
    const d = todayIso();
    const planned = LIVE_SECTIONS.reduce((s, sec) => s + buildDay(sec, state, d, budgetFor(sec, state, d), { today: d }).reduce((t, b) => t + b.mins, 0), 0);
    // Open and due, counted here rather than with dueRedo, whose content checks would join the first download; the
    // redo page itself drops the rare item whose question no longer exists.
    return { done: Math.min(doneMinutes(state, d), planned), planned, redo: state.redo.filter((r) => !r.cleared && r.due <= d).length };
  }, [state]);
}

/** A small ring of the day's minutes: primary while under way, success once the plan is done. */
function DayRing({ done, planned, size = 20 }: { done: number; planned: number; size?: number }) {
  const r = 8, c = 2 * Math.PI * r, part = planned ? Math.min(1, done / planned) : 0;
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden className="-rotate-90 shrink-0">
      <circle cx="10" cy="10" r={r} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground/15" />
      {part > 0 && <circle cx="10" cy="10" r={r} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${c * part} ${c}`} className={part >= 1 ? "text-success" : "text-primary"} />}
    </svg>
  );
}

const minutes = (w: { done: number; planned: number }) => `${w.done} of ${w.planned} minutes done today`;

/**
 * The pill behind the current place. It is measured from the link marked current and moved with a transform, so it
 * slides when the page changes (GSAP) and simply jumps under reduced motion. Hidden when no place in the list is current.
 */
function usePill(box: React.RefObject<HTMLElement | null>, pill: React.RefObject<HTMLSpanElement | null>, deps: unknown[]) {
  const placed = useRef(false);
  useLayoutEffect(() => {
    // The current link outside the section tiles (they carry their own tone).
    const el = [...(box.current?.querySelectorAll<HTMLElement>("a[aria-current=page]") ?? [])].find((a) => !a.closest("[data-tiles]")), p = pill.current;
    if (!p) return;
    if (!el) { p.style.opacity = "0"; placed.current = false; return; }
    p.style.width = el.offsetWidth + "px";
    p.style.height = el.offsetHeight + "px";
    const to = { x: el.offsetLeft, y: el.offsetTop };
    if (!placed.current || calm()) { p.style.transform = `translate(${to.x}px, ${to.y}px)`; p.style.opacity = "1"; placed.current = true; return; }
    p.style.opacity = "1";
    loadGsap().then((gsap) => gsap.to(p, { x: to.x, y: to.y, duration: 0.35, ease: "power3.out" }), () => { p.style.transform = `translate(${to.x}px, ${to.y}px)`; });
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

const ROW = "relative z-[1] flex h-11 items-center gap-3.5 rounded-lg px-3.5 text-base font-medium text-foreground/75 transition-colors duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none [&_svg]:size-5 [&_svg]:shrink-0";
const ROW_ON = "font-semibold text-foreground [&_svg]:text-primary";

/** The expanded list, also the phone menu's list. */
export function SidebarNav({ onPick }: { onPick?: () => void }) {
  const { pathname } = useLocation();
  const w = useWaiting();
  const inMore = MORE.some((m) => pathname.startsWith(m.to));
  const [moreOpen, setMoreOpen] = usePref("navMore", false);
  const showMore = moreOpen || inMore;
  const box = useRef<HTMLElement>(null), pill = useRef<HTMLSpanElement>(null);
  usePill(box, pill, [pathname, showMore]);

  const row = (it: Item) => {
    const item = it.to === "/practice" && isRedo(pathname) ? { ...it, match: undefined, end: true } : it;
    return (
      <SiteNavLink key={it.to} item={item} onClick={onPick} className={(on) => cn(ROW, on && ROW_ON)}>
        <it.Icon />
        <span className="min-w-0 flex-1 truncate">{it.label}</span>
        {it.badge === "today" && w.planned > 0 && <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground tabular-nums" title={minutes(w)}><DayRing {...w} /><span className="sr-only">{minutes(w)}</span><span aria-hidden>{w.done}/{w.planned} min</span></span>}
        {it.badge === "redo" && w.redo > 0 && <span className="rounded-md bg-primary/10 px-1.5 text-sm font-semibold text-primary tabular-nums">{w.redo}<span className="sr-only"> due</span></span>}
      </SiteNavLink>
    );
  };

  return (
    <nav ref={box} aria-label="Site" className="relative flex flex-col gap-7">
      <span ref={pill} aria-hidden className="pointer-events-none absolute top-0 left-0 rounded-lg bg-card opacity-0" />
      <div className="flex flex-col gap-0.5">{MAIN.map(row)}</div>

      <div data-tiles className="grid grid-cols-3 gap-2" aria-label="Sections" role="group">
        {SECTION_ITEMS.map((s) => (
          <NavLink key={s.to} to={s.to} end onClick={onPick}
            className={({ isActive }) => cn("flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-base font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none",
              isActive ? "bg-card text-primary" : "bg-foreground/[0.04] text-foreground/80 hover:bg-card hover:text-foreground", s.soon && !isActive && "text-muted-foreground")}>
            <span className="leading-none">{s.label}</span>
            {s.soon && <span className="text-sm leading-none font-normal">Soon</span>}
          </NavLink>
        ))}
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="px-3.5 pb-1.5 text-sm font-medium text-muted-foreground">Track</span>
        {TRACK.map(row)}
      </div>

      <div className="flex flex-col gap-0.5">
        <button type="button" onClick={() => setMoreOpen(!showMore)} aria-expanded={showMore} aria-controls="nav-more"
          className="flex h-10 items-center justify-between rounded-lg px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          More<ChevronDown className={cn("size-4 transition-transform duration-200 motion-reduce:transition-none", showMore && "rotate-180")} aria-hidden />
        </button>
        {showMore && (
          <div id="nav-more" className="flex flex-col gap-0.5">
            {MORE.map((it) => (
              <SiteNavLink key={it.to} item={it} onClick={onPick} className={(on) => cn(ROW, "h-10 pl-[3.25rem]", on && "font-semibold text-foreground")}>
                {it.label}
              </SiteNavLink>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
