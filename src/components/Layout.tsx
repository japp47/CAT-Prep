import { lazy, Suspense, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, PanelLeftClose, PanelLeftOpen, UserRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SECTIONS } from "../sections";
import { useFocus } from "../lib/focus";
import { whenIdle } from "../lib/idle";
import { usePref } from "../lib/prefs";
import { RedoSeeder } from "./Content";
import FocusBar from "./FocusBar";
import { IconChart, IconHome, IconPen, IconToday } from "./Icons";
import Brand from "./Brand";
import SiteFooter from "./SiteFooter";
import SiteHeader, { type SiteNavGroup } from "./SiteHeader";
import ThemeToggle, { type Theme as ThemeValue } from "./ThemeToggle";

const GROUPS: SiteNavGroup[] = [
  { title: "Study", items: [{ to: "/", label: "Home", end: true }, { to: "/today", label: "Today" }, { to: "/practice", label: "Practice" }, { to: "/plan", label: "Plan and time" }] },
  { title: "Sections", items: SECTIONS.map((s) => ({ to: "/" + s.id, label: s.short, soon: s.status === "soon" })) },
  { title: "Progress", items: [{ to: "/progress", label: "Overview" }, { to: "/errors", label: "Error log" }, { to: "/words", label: "Words" }, { to: "/journal", label: "Reading journal" }] },
  { title: "Explore", items: [{ to: "/updates", label: "Updates" }, { to: "/exams", label: "CAT and other exams" }, { to: "/guides", label: "Guides" }, { to: "/stories", label: "Topper stories" }, { to: "/roadmap", label: "What's coming" }, { to: "/settings", label: "Settings and backup" }] },
];

function Nav({ onPick }: { onPick?: () => void }) {
  return (
    <nav aria-label="Site" className="flex flex-col gap-5">
      {GROUPS.map((g) => (
        <div key={g.title} className="flex flex-col gap-0.5">
          <span className="mb-1 border-b border-border/70 px-3 pb-2 text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">{g.title}</span>
          {g.items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} onClick={onPick}
              className={({ isActive }) => cn("flex h-9 items-center justify-between gap-2 rounded-md px-3 text-base font-medium text-foreground/80 transition-colors hover:bg-card/70 hover:text-foreground", isActive && "bg-card font-semibold text-foreground")}>
              <span>{it.label}</span>
              {it.soon && <span className="text-sm font-normal text-muted-foreground">Soon</span>}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

/** Shown for the moment a page's code is loading. */
function PageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4" role="status">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-10 w-1/3" /><Skeleton className="h-5 w-1/2" /><Skeleton className="mt-6 h-48 w-full" />
    </div>
  );
}

/** The phone's browser bar takes the top bar's colour. index.html sets both, one per system theme. */
const BAR_COLOR = { light: "#eef0f4", dark: "#12161e" };

export type Theme = ThemeValue;
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = usePref<Theme>("theme", "auto");
  useEffect(() => {
    const el = document.documentElement;
    if (theme === "auto") el.removeAttribute("data-theme"); else el.setAttribute("data-theme", theme);
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
      m.content = theme === "auto" ? (m.media.includes("dark") ? BAR_COLOR.dark : BAR_COLOR.light) : BAR_COLOR[theme];
    });
  }, [theme]);
  return [theme, setTheme];
}

const BOTTOM_BAR = "fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"; // taste-skill-ignore: the edge of a fixed bar

// The phone menu loads on first use; loadMenu fetches it early (on idle, or when a finger lands on a menu button).
const loadMenu = () => import("./MenuSheet");
const MenuSheet = lazy(loadMenu);

// Toasts only follow an action, so their code loads after the page.
const Toaster = lazy(() => import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })));

const TABS = [
  { to: "/", label: "Home", Icon: IconHome, end: true },
  { to: "/today", label: "Today", Icon: IconToday },
  { to: "/practice", label: "Practice", Icon: IconPen },
  { to: "/progress", label: "Progress", Icon: IconChart },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  // Mounted from the first open on, so later opens and closes animate.
  const [menuUsed, setMenuUsed] = useState(false);
  const openMenu = () => { setMenuUsed(true); setOpen(true); };
  const loc = useLocation();
  const { run } = useFocus();
  useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = usePref<boolean>("sidebar-collapsed", false);
  const landing = loc.pathname === "/";
  useEffect(() => {
    setOpen(false);
    if (loc.hash) {
      requestAnimationFrame(() => document.getElementById(decodeURIComponent(loc.hash.slice(1)))?.scrollIntoView());
    } else window.scrollTo(0, 0);
  }, [loc.pathname, loc.hash]);
  // Fetch the menu when the browser is idle, so the first tap opens it at once. The toast code mounts then too:
  // toasts only ever follow an action, so nothing needs it while the page is loading.
  // A toast raised before then is not lost: the Toaster replays active toasts when it mounts. A first tap or key press
  // mounts it at once, since toasts follow actions.
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    const ready = () => setIdle(true);
    window.addEventListener("pointerdown", ready, { once: true });
    window.addEventListener("keydown", ready, { once: true });
    const stop = whenIdle(() => { void loadMenu(); ready(); });
    return () => { stop(); window.removeEventListener("pointerdown", ready); window.removeEventListener("keydown", ready); };
  }, []);

  return (
    <div className={cn("min-h-dvh", !landing && "lg:grid", !landing && (sidebarCollapsed ? "lg:grid-cols-[72px_minmax(0,1fr)]" : "lg:grid-cols-[248px_minmax(0,1fr)]"))}>
      <a href="#main" className="sr-only z-50 rounded-md bg-card px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2">Skip to content</a>

      <SiteHeader landing={landing} groups={GROUPS} open={open} onOpenChange={setOpen} onLoadMenu={loadMenu} onOpenMenu={openMenu} />

      <aside className={cn("sticky top-0 hidden h-dvh flex-col gap-7 overflow-y-auto bg-sidebar pt-6 pb-6", !landing && "lg:flex", sidebarCollapsed ? "items-center px-2" : "px-4")}>
        <div className={cn("flex w-full items-center", sidebarCollapsed ? "flex-col gap-4" : "justify-between gap-2 px-1")}>
          <Brand compact={sidebarCollapsed} />
          <button type="button" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="grid size-10 shrink-0 place-items-center rounded-md text-foreground/70 transition-colors hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            {sidebarCollapsed ? <PanelLeftOpen className="size-5" aria-hidden /> : <PanelLeftClose className="size-5" aria-hidden />}
          </button>
        </div>
        {!sidebarCollapsed && <>
          <Nav />
        </>}
        <div className={cn("mt-auto flex", sidebarCollapsed ? "flex-col gap-2" : "items-center gap-2 px-1")}>
          <ThemeToggle />
          <button type="button" disabled aria-label="Profile page coming soon" title="Profile page coming soon"
            className="grid size-11 shrink-0 cursor-not-allowed place-items-center rounded-md text-muted-foreground/60 opacity-70" >
            <UserRound className="size-5" aria-hidden />
          </button>
        </div>
        {!sidebarCollapsed && <p className="px-3 text-sm text-muted-foreground">Free and open. Your data stays in this browser.</p>}
      </aside>

      <main id="main" className={cn("min-w-0 px-gutter pt-6 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pt-12 lg:pb-8", landing && "lg:pt-8", run && "pb-44 lg:pb-36")}>
        <Suspense fallback={<PageSkeleton />}><Outlet /></Suspense>
        <SiteFooter />
      </main>

      <FocusBar />
      <RedoSeeder />
      {idle && <Suspense fallback={null}><Toaster /></Suspense>}

      <nav aria-label="Quick" className={BOTTOM_BAR}>
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cn("flex h-16 flex-col items-center justify-center gap-1 text-sm font-medium text-muted-foreground [&_svg]:size-6", isActive && "text-primary")}>
            <Icon />{label}
          </NavLink>
        ))}
        <button type="button" aria-expanded={open} onPointerDown={loadMenu} onClick={openMenu} className="flex h-16 flex-col items-center justify-center gap-1 text-sm font-medium text-muted-foreground"><Menu className="size-6" />Menu</button>
      </nav>

      {menuUsed && (
        <Suspense fallback={null}>
          <MenuSheet open={open} onOpenChange={setOpen} title={<Brand />}><Nav onPick={() => setOpen(false)} /></MenuSheet>
        </Suspense>
      )}
    </div>
  );
}
