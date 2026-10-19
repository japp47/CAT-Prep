import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ChevronDown, Menu, Moon, PanelLeftClose, PanelLeftOpen, Sun } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SECTIONS } from "../sections";
import { useFocus } from "../lib/focus";
import { whenIdle } from "../lib/idle";
import { usePref } from "../lib/prefs";
import { RedoSeeder } from "./Content";
import FocusBar from "./FocusBar";
import { IconChart, IconHome, IconPen, IconToday } from "./Icons";

interface Item { to: string; label: string; soon?: boolean; end?: boolean }
const GROUPS: { title: string; items: Item[] }[] = [
  { title: "Study", items: [{ to: "/", label: "Home", end: true }, { to: "/today", label: "Today" }, { to: "/practice", label: "Practice" }, { to: "/plan", label: "Plan and time" }] },
  { title: "Sections", items: SECTIONS.map((s) => ({ to: "/" + s.id, label: s.short, soon: s.status === "soon" })) },
  { title: "Progress", items: [{ to: "/progress", label: "Overview" }, { to: "/errors", label: "Error log" }, { to: "/words", label: "Words" }, { to: "/journal", label: "Reading journal" }] },
  { title: "Explore", items: [{ to: "/updates", label: "Updates" }, { to: "/exams", label: "CAT and other exams" }, { to: "/guides", label: "Guides" }, { to: "/stories", label: "Topper stories" }, { to: "/roadmap", label: "What's coming" }, { to: "/settings", label: "Settings and backup" }] },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-md text-foreground" aria-label="99ile home">
      {/* The 99 tile: the score students aim for, with the site's highlighter under it. Same file as the favicon. */}
      <img src={import.meta.env.BASE_URL + "favicon.svg"} alt="" className="size-9" width={36} height={36} />
      {!compact && <span className="text-[1.375rem] leading-none font-bold tracking-tight">99ile</span>}
    </Link>
  );
}

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

export type Theme = "auto" | "light" | "dark";
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

function useSystemDark() {
  const query = "(prefers-color-scheme: dark)";
  const [dark, setDark] = useState(() => typeof matchMedia === "function" && matchMedia(query).matches);
  useEffect(() => {
    const media = matchMedia(query), update = () => setDark(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return dark;
}

function ThemeToggle() {
  const [theme, setTheme] = usePref<Theme>("theme", "auto");
  const systemDark = useSystemDark();
  const dark = theme === "dark" || (theme === "auto" && systemDark);
  const label = dark ? "Switch to light theme" : "Switch to dark theme";
  return (
    <button type="button" onClick={() => setTheme(dark ? "light" : "dark")} aria-label={label} title={label}
      className="grid size-11 place-items-center rounded-md text-foreground/75 transition-colors hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      {dark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  );
}

const LANDING_LINKS: Item[] = [...SECTIONS.map((section) => ({ to: "/" + section.id, label: section.short, soon: section.status === "soon" })), { to: "/practice", label: "Practice" }];

function LandingHeader() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    const outside = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    window.addEventListener("keydown", key);
    window.addEventListener("mousedown", outside);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("mousedown", outside); };
  }, [open]);
  const linkClass = "rounded-md px-3 py-2 text-base font-medium text-foreground/80 transition-colors hover:bg-card hover:text-foreground";
  return (
    <header ref={root} className="sticky top-0 z-40 hidden bg-background/95 px-gutter backdrop-blur-md lg:block">
      <div className="mx-auto flex h-[4.5rem] max-w-[1440px] items-center justify-between gap-5">
        <Brand />
        <nav aria-label="Main" className="flex items-center gap-4 xl:gap-6">
          {LANDING_LINKS.map((item) => (
            <Link key={item.to} to={item.to} className={linkClass}>
              {item.label}{item.soon && <span className="ml-1.5 text-sm font-normal text-muted-foreground">Soon</span>}
            </Link>
          ))}
          <a href="#about" className={linkClass}>About</a>
        </nav>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button type="button" aria-expanded={open} aria-controls="all-pages" onClick={() => setOpen((value) => !value)}
            className={cn("inline-flex h-11 items-center gap-2 rounded-md px-3 text-base font-medium text-foreground/80 transition-colors hover:bg-card hover:text-foreground", open && "bg-card text-foreground")}>
            All pages<ChevronDown className={cn("size-4 transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
          </button>
        </div>
      </div>
      {open && (
        <div id="all-pages" className="absolute inset-x-0 top-full px-gutter pt-3 pb-6">
          <div className="mx-auto flex w-full max-w-[1440px] justify-end">
            <nav aria-label="All pages" className="grid w-full max-w-[1120px] grid-cols-4 gap-4 rounded-xl border border-border/70 bg-card p-5 shadow-[0_24px_40px_-24px_rgb(0_0_0/0.3)] xl:gap-6 xl:p-6">
              {GROUPS.map((group) => (
                <div key={group.title} className="flex min-w-0 flex-col">
                  <span className="mb-1 border-b border-border/70 px-3 pb-2 text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">{group.title}</span>
                  <div className="flex flex-col gap-0.5">
                    {group.items.map((item) => (
                      <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)} title={item.label}
                        className={({ isActive }) => cn("flex min-h-10 items-center justify-between gap-2 rounded-md px-3 py-2 text-base font-medium text-foreground/80 transition-colors hover:bg-muted/70 hover:text-foreground", isActive && "bg-muted text-foreground")}>
                        <span className="truncate">{item.label}</span>{item.soon && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Soon</span>}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
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
  useEffect(() => { window.scrollTo(0, 0); setOpen(false); }, [loc.pathname]);
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

      {landing && <LandingHeader />}

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
          <p className="mt-auto px-3 text-sm text-muted-foreground">Free and open. Your data stays in this browser.</p>
        </>}
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between bg-sidebar px-gutter lg:hidden">
        <Brand />
        <div className="-mr-2 flex items-center gap-1">
          <ThemeToggle />
          <button type="button" className="grid size-11 place-items-center rounded-md hover:bg-card" aria-label="Open menu" aria-expanded={open} onPointerDown={loadMenu} onClick={openMenu}><Menu className="size-6" /></button>
        </div>
      </header>

      <main id="main" className={cn("min-w-0 px-gutter pt-6 pb-28 lg:pt-12 lg:pb-20", landing && "lg:pt-8", run && "pb-44 lg:pb-36")}>
        <Suspense fallback={<PageSkeleton />}><Outlet /></Suspense>
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
