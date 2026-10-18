import { lazy, Suspense, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SECTIONS } from "../sections";
import { useFocus } from "../lib/focus";
import { usePref } from "../lib/prefs";
import { RedoSeeder } from "./Content";
import FocusBar from "./FocusBar";
import { IconChart, IconHome, IconPen, IconToday } from "./Icons";

interface Item { to: string; label: string; soon?: boolean; end?: boolean }
const GROUPS: { title: string; items: Item[] }[] = [
  { title: "Study", items: [{ to: "/", label: "Home", end: true }, { to: "/today", label: "Today" }, { to: "/practice", label: "Practice" }, { to: "/plan", label: "Plan and time" }] },
  { title: "Sections", items: SECTIONS.map((s) => ({ to: "/" + s.id, label: s.short, soon: s.status === "soon" })) },
  { title: "Track", items: [{ to: "/progress", label: "Progress" }, { to: "/errors", label: "Error log" }, { to: "/words", label: "Words" }] },
  { title: "Explore", items: [{ to: "/updates", label: "Updates" }, { to: "/exams", label: "CAT and other exams" }, { to: "/guides", label: "Guides" }, { to: "/stories", label: "Topper stories" }, { to: "/roadmap", label: "What's coming" }] },
];

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-md text-foreground" aria-label="99ile home">
      {/* The 99 tile: the score students aim for, with the site's highlighter under it. Same file as the favicon. */}
      <img src={import.meta.env.BASE_URL + "favicon.svg"} alt="" className="size-9" width={36} height={36} />
      <span className="text-[1.375rem] leading-none font-bold tracking-tight">99ile</span>
    </Link>
  );
}

function Nav({ onPick }: { onPick?: () => void }) {
  return (
    <nav aria-label="Site" className="flex flex-col gap-5">
      {GROUPS.map((g) => (
        <div key={g.title} className="flex flex-col gap-0.5">
          <span className="px-3 pb-1 text-sm font-medium text-muted-foreground">{g.title}</span>
          {g.items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} onClick={onPick}
              className={({ isActive }) => cn("flex h-9 items-center justify-between gap-2 rounded-md px-3 text-base font-medium text-foreground/80 transition-colors hover:bg-card/70 hover:text-foreground", isActive && "bg-card font-semibold text-foreground")}>
              <span>{it.label}</span>
              {it.soon && <span className="text-sm font-normal text-muted-foreground">Soon</span>}
            </NavLink>
          ))}
        </div>
      ))}
      <NavLink to="/settings" onClick={onPick} className={({ isActive }) => cn("flex h-9 items-center rounded-md px-3 text-base font-medium text-foreground/80 hover:bg-card/70 hover:text-foreground", isActive && "bg-card font-semibold text-foreground")}>Settings and backup</NavLink>
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

const BOTTOM_BAR = "fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"; // taste-skill-ignore: the edge of a fixed bar

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
  const loc = useLocation();
  const { run } = useFocus();
  useTheme();
  useEffect(() => { window.scrollTo(0, 0); setOpen(false); }, [loc.pathname]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <a href="#main" className="sr-only z-50 rounded-md bg-card px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2">Skip to content</a>

      <aside className="sticky top-0 hidden h-dvh flex-col gap-7 overflow-y-auto bg-sidebar px-4 pt-6 pb-6 lg:flex">
        <div className="px-1"><Brand /></div>
        <Nav />
        <p className="mt-auto px-3 text-sm text-muted-foreground">Free and open. Your data stays in this browser.</p>
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between bg-sidebar px-gutter lg:hidden">
        <Brand />
        <button type="button" className="grid size-11 place-items-center rounded-md hover:bg-card" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><Menu className="size-6" /></button>
      </header>

      <main id="main" className={cn("min-w-0 px-gutter pt-6 pb-28 lg:pt-12 lg:pb-20", run && "pb-44 lg:pb-36")}>
        <Suspense fallback={<PageSkeleton />}><Outlet /></Suspense>
      </main>

      <FocusBar />
      <RedoSeeder />
      <Suspense fallback={null}><Toaster /></Suspense>

      <nav aria-label="Quick" className={BOTTOM_BAR}>
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cn("flex h-16 flex-col items-center justify-center gap-1 text-sm font-medium text-muted-foreground [&_svg]:size-6", isActive && "text-primary")}>
            <Icon />{label}
          </NavLink>
        ))}
        <button type="button" aria-expanded={open} onClick={() => setOpen(true)} className="flex h-16 flex-col items-center justify-center gap-1 text-sm font-medium text-muted-foreground"><Menu className="size-6" />Menu</button>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" aria-describedby={undefined} className="w-[min(86vw,340px)] gap-6 overflow-y-auto overscroll-contain bg-sidebar pt-6 pb-8 pl-4 pr-[max(1rem,env(safe-area-inset-right))]">
          <SheetTitle className="px-1"><Brand /></SheetTitle>
          <Nav onPick={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
