import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { SECTIONS } from "../sections";
import { useFocus } from "../lib/focus";
import { usePref } from "../lib/prefs";
import FocusBar from "./FocusBar";
import { IconChart, IconHome, IconMenu, IconPen, IconToday } from "./Icons";

interface Item { to: string; label: string; badge?: "soon" | "live"; end?: boolean }
const GROUPS: { title: string; items: Item[] }[] = [
  { title: "Prepare", items: [{ to: "/", label: "Home", end: true }, { to: "/today", label: "Today's timetable" }, { to: "/practice", label: "Practice" }, { to: "/plan", label: "Plan and time" }] },
  { title: "Sections", items: SECTIONS.map((s) => ({ to: "/" + s.id, label: s.short, badge: s.status })) },
  { title: "Track", items: [{ to: "/progress", label: "Progress" }, { to: "/errors", label: "Error log" }, { to: "/words", label: "Words" }] },
  { title: "Explore", items: [{ to: "/updates", label: "Important updates" }, { to: "/exams", label: "CAT and other exams" }, { to: "/guides", label: "Guides" }, { to: "/stories", label: "Topper stories" }] },
  { title: "More", items: [{ to: "/roadmap", label: "What's coming" }, { to: "/settings", label: "Settings and backup" }] },
];

function Brand() {
  return (
    <Link to="/" className="brand" aria-label="CAT Prep Hub home">
      <span className="logo">CAT</span>
      <span><b>CAT Prep Hub</b><small>Free · CAT 2027</small></span>
    </Link>
  );
}

function Nav({ onPick }: { onPick?: () => void }) {
  return (
    <nav aria-label="Site">
      {GROUPS.map((g) => (
        <div className="navgroup" key={g.title}>
          <span className="eyebrow">{g.title}</span>
          {g.items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} onClick={onPick} className={({ isActive }) => "navlink" + (isActive ? " active" : "")}>
              <span>{it.label}</span>
              {it.badge === "soon" && <span className="soon">Soon</span>}
              {it.badge === "live" && <span className="live">Live</span>}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

export type Theme = "auto" | "light" | "dark";
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = usePref<Theme>("theme", "auto");
  useEffect(() => {
    const el = document.documentElement;
    if (theme === "auto") el.removeAttribute("data-theme"); else el.setAttribute("data-theme", theme);
  }, [theme]);
  return [theme, setTheme];
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const { run } = useFocus();
  useTheme();
  useEffect(() => { window.scrollTo(0, 0); setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const tab = (to: string, label: string, Icon: () => JSX.Element, end = false) => (
    <NavLink to={to} end={end} className={({ isActive }) => (isActive ? "active" : "")}><Icon />{label}</NavLink>
  );

  return (
    <div className="shell">
      <a href="#main" className="skip">Skip to content</a>
      <aside className="side">
        <Brand />
        <Nav />
        <p className="sidefoot">Free and open. Your data stays in this browser.</p>
      </aside>
      <header className="topbar">
        <Brand />
        <button type="button" className="iconbtn" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><IconMenu /></button>
      </header>
      <main id="main" className={"content" + (run ? " has-focus" : "")}>
        <Outlet />
      </main>
      <FocusBar />
      <nav className="bottomnav" aria-label="Quick">
        {tab("/", "Home", IconHome, true)}
        {tab("/today", "Today", IconToday)}
        {tab("/practice", "Practice", IconPen)}
        {tab("/progress", "Progress", IconChart)}
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu"><IconMenu />Menu</button>
      </nav>
      {open && (
        <>
          <div className="drawer-bg" onClick={() => setOpen(false)} />
          <div className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="drawer-head"><Brand /><button type="button" className="iconbtn" aria-label="Close menu" onClick={() => setOpen(false)}>✕</button></div>
            <Nav onPick={() => setOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
