import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ChevronDown, Menu, Search as SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Brand from "./Brand";
import AccountButton from "./AccountButton";
import InstallButton from "./InstallButton";
import ThemeToggle from "./ThemeToggle";

/** match: other addresses where this item is the current page (Practice is current on /varc/practice too). */
export interface SiteNavItem { to: string; label: string; soon?: boolean; end?: boolean; match?: RegExp }
/** Practice and every section's practice page (D39), and the players under /practice. */
export const PRACTICE_PATH = /^\/((varc|dilr|quant)\/)?practice(\/|$)/;

/** A nav link that is also current on the item's `match` addresses, with aria-current set either way. */
export function SiteNavLink({ item, className, onClick, title, children }: { item: Pick<SiteNavItem, "to" | "end" | "match">; className: (active: boolean) => string; onClick?: () => void; title?: string; children: ReactNode }) {
  const { pathname } = useLocation();
  if (item.match?.test(pathname)) return <Link to={item.to} aria-current="page" className={className(true)} onClick={onClick} title={title}>{children}</Link>;
  return <NavLink to={item.to} end={item.end} className={({ isActive }) => className(isActive)} onClick={onClick} title={title}>{children}</NavLink>;
}

interface SiteHeaderProps {
  landing: boolean;
  /** The "All pages" panel (components/AllPages.tsx, loaded on demand), shown while open. */
  panel: ReactNode;
  /** Starts loading the panel, on hover or focus of its button, so a click opens it at once. */
  onLoadPanel: () => unknown;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadMenu: () => unknown;
  onOpenMenu: () => void;
  onOpenSearch: () => void;
}

const LANDING_LINKS: SiteNavItem[] = [
  { to: "/varc", label: "VARC" },
  { to: "/dilr", label: "DILR" },
  { to: "/quant", label: "Quant", soon: true },
  { to: "/practice", label: "Practice" },
];

export default function SiteHeader({ landing, panel, onLoadPanel, open, onOpenChange, onLoadMenu, onOpenMenu, onOpenSearch }: SiteHeaderProps) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") onOpenChange(false); };
    const outside = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) onOpenChange(false); };
    window.addEventListener("keydown", key);
    window.addEventListener("mousedown", outside);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("mousedown", outside); };
  }, [open, onOpenChange]);

  const linkClass = "rounded-md px-3 py-2 text-base font-medium text-foreground/80 transition-colors hover:bg-card hover:text-foreground";
  return <>
    {landing && <header ref={root} className="sticky top-0 z-40 hidden bg-background/95 px-gutter backdrop-blur-md lg:block">
      <div className="mx-auto flex h-[4.5rem] max-w-[1440px] items-center justify-between gap-5">
        <Brand />
        <nav aria-label="Main" className="flex items-center gap-4 xl:gap-6">
          {LANDING_LINKS.map((item) => (
            <Link key={item.to} to={item.to} className={linkClass}>
              {item.label}{item.soon && <span className="ml-1.5 text-sm font-normal text-muted-foreground">Soon</span>}
            </Link>
          ))}
          <a href="/#about" className={linkClass}>About</a>
        </nav>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onOpenSearch} aria-label="Search" title="Search (⌘K)" aria-keyshortcuts="Meta+K Control+K"
            className="grid size-11 place-items-center rounded-md text-foreground/75 transition-colors hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"><SearchIcon className="size-5" aria-hidden /></button>
          <ThemeToggle />
          <InstallButton hideWhenInstalled />
          <AccountButton withLabel />
          <button type="button" aria-expanded={open} aria-controls="all-pages" onClick={() => onOpenChange(!open)} onPointerEnter={() => { void onLoadPanel(); }} onFocus={() => { void onLoadPanel(); }}
            className={cn("inline-flex h-11 items-center gap-2 rounded-md px-3 text-base font-medium text-foreground/80 transition-colors hover:bg-card hover:text-foreground", open && "bg-card text-foreground")}>
            All pages<ChevronDown className={cn("size-4 transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
          </button>
        </div>
      </div>
      {open && panel}
    </header>}
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between bg-sidebar px-gutter lg:hidden">
      <Brand />
      <div className="-mr-2 flex items-center gap-1">
        <ThemeToggle />
        <button type="button" onClick={onOpenSearch} aria-label="Search" title="Search" aria-keyshortcuts="Meta+K Control+K"
          className="grid size-11 place-items-center rounded-md text-foreground/75 transition-colors hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"><SearchIcon className="size-5" aria-hidden /></button>
        <InstallButton />
        <AccountButton />
        <button type="button" className="grid size-11 place-items-center rounded-md hover:bg-card" aria-label="Open menu" aria-expanded={open} onPointerDown={() => { void onLoadMenu(); }} onClick={onOpenMenu}><Menu className="size-6" /></button>
      </div>
    </header>
  </>;
}
