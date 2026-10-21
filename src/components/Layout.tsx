import { lazy, Suspense, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu, PanelLeftClose, PanelLeftOpen, Search, UserRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SECTIONS } from "../sections";
import { useFocus } from "../lib/focus";
import { whenIdle } from "../lib/idle";
import { usePref } from "../lib/prefs";
import { RedoSeeder } from "./Content";
import FocusBar from "./FocusBar";
import InstallButton from "./InstallButton";
import { IconChart, IconHome, IconPen, IconToday } from "./Icons";
import Brand from "./Brand";
import SiteFooter from "./SiteFooter";
import SiteHeader, { type SiteNavGroup } from "./SiteHeader";
import ThemeToggle, { type Theme as ThemeValue } from "./ThemeToggle";
const SearchPalette = lazy(() => import("./SearchPalette"));

const GROUPS: SiteNavGroup[] = [
  { title: "Study", items: [{ to: "/", label: "Home", end: true }, { to: "/today", label: "Today" }, { to: "/practice", label: "Practice" }, { to: "/plan", label: "Plan and time" }] },
  { title: "Sections", items: SECTIONS.map((s) => ({ to: "/" + s.id, label: s.short, soon: s.status === "soon" })) },
  { title: "Progress", items: [{ to: "/progress", label: "Overview" }, { to: "/review", label: "Weekly review" }, { to: "/errors", label: "Error log" }, { to: "/words", label: "Words" }, { to: "/journal", label: "Reading journal" }] },
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

const SEARCH_HISTORY_KEY = "__99ileSearchPalette";

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [searchUsed, setSearchUsed] = useState(false);
  // Mounted from the first open on, so later opens and closes animate.
  const [menuUsed, setMenuUsed] = useState(false);
  const openMenu = () => { setMenuUsed(true); setOpen(true); };
  const loc = useLocation();
  const navigate = useNavigate();
  const routeState = loc.state && typeof loc.state === "object" ? loc.state as Record<string, unknown> : {};
  const searchOpen = routeState[SEARCH_HISTORY_KEY] === true;
  useEffect(() => {
    if (searchOpen) setSearchUsed(true);
  }, [searchOpen]);
  const openSearch = () => {
    if (searchOpen) return;
    setSearchUsed(true);
    navigate(`${loc.pathname}${loc.search}${loc.hash}`, {
      state: { ...routeState, [SEARCH_HISTORY_KEY]: true },
      preventScrollReset: true,
    });
  };
  const setSearchOpen = (nextOpen: boolean) => {
    if (nextOpen) openSearch();
    else if (searchOpen) navigate(-1);
  };
  const navigateFromSearch = (href: string) => navigate(href, { replace: searchOpen });
  const { run } = useFocus();
  useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = usePref<boolean>("sidebar-collapsed", false);
  const landing = loc.pathname === "/";
  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [openSearch]);
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

      <SiteHeader landing={landing} groups={GROUPS} open={open} onOpenChange={setOpen} onLoadMenu={loadMenu} onOpenMenu={openMenu} onOpenSearch={openSearch} />

      <aside className={cn("sticky top-0 hidden h-dvh flex-col gap-7 overflow-y-auto bg-sidebar pt-6 pb-6", !landing && "lg:flex", sidebarCollapsed ? "items-center px-2" : "px-4")}>
        <div className={cn("flex w-full items-center", sidebarCollapsed ? "flex-col gap-4" : "justify-between gap-2 px-1")}>
          <Brand compact={sidebarCollapsed} />
          <button type="button" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="grid size-10 shrink-0 place-items-center rounded-md text-foreground/70 transition-colors hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            {sidebarCollapsed ? <PanelLeftOpen className="size-5" aria-hidden /> : <PanelLeftClose className="size-5" aria-hidden />}
          </button>
        </div>
        <button type="button" onClick={openSearch} aria-label="Search" title="Search (⌘K)" aria-keyshortcuts="Meta+K Control+K"
          className={cn("flex h-11 shrink-0 items-center rounded-md text-foreground/75 transition-colors hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", sidebarCollapsed ? "w-11 justify-center" : "w-full justify-between px-3")}>
          <span className="flex items-center gap-3"><Search className="size-5" aria-hidden />{!sidebarCollapsed && <span className="text-sm font-medium">Search</span>}</span>
          {!sidebarCollapsed && <kbd className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground">⌘ K</kbd>}
        </button>
        {!sidebarCollapsed && <>
          <Nav />
        </>}
        <div className={cn("mt-auto flex", sidebarCollapsed ? "flex-col gap-2" : "items-center gap-2 px-1")}>
          <ThemeToggle />
          <InstallButton hideWhenInstalled />
          <button type="button" disabled aria-label="Profile page coming soon" title="Profile page coming soon"
            className="grid size-11 shrink-0 cursor-not-allowed place-items-center rounded-md text-muted-foreground/60 opacity-70" >
            <UserRound className="size-5" aria-hidden />
          </button>
        </div>
        {!sidebarCollapsed && <p className="px-3 text-sm text-muted-foreground">Free and open. Your data stays in this browser.</p>}
      </aside>

      {/* At least a screen tall, with main taking the spare height, so on a short page the footer sits at the bottom
          (just above the phone's bottom bar) instead of floating mid-screen. 3.5rem is the phone header. */}
      <div className={cn("flex min-h-[calc(100dvh-3.5rem)] min-w-0 flex-col px-gutter pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0", !landing && "lg:min-h-dvh")}>
        <main id="main" className={cn("min-w-0 flex-1 pt-6 pb-6 lg:pt-12 lg:pb-0.5", landing && "lg:pt-8", run && "pb-44 lg:pb-36")}>
          <Suspense fallback={<PageSkeleton />}><Outlet /></Suspense>
        </main>
        <SiteFooter />
      </div>

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
      {searchUsed && <Suspense fallback={null}><SearchPalette open={searchOpen} onOpenChange={setSearchOpen} onNavigate={navigateFromSearch} /></Suspense>}
    </div>
  );
}
