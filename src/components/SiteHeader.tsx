import { useEffect, useRef } from "react";
import { Link, NavLink } from "react-router-dom";
import { ChevronDown, Menu, Search as SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Brand from "./Brand";
import AccountButton from "./AccountButton";
import InstallButton from "./InstallButton";
import ThemeToggle from "./ThemeToggle";

export interface SiteNavItem { to: string; label: string; soon?: boolean; end?: boolean }
export interface SiteNavGroup { title: string; items: SiteNavItem[] }

interface SiteHeaderProps {
  landing: boolean;
  groups: SiteNavGroup[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadMenu: () => unknown;
  onOpenMenu: () => void;
  onOpenSearch: () => void;
}

const LANDING_LINKS: SiteNavItem[] = [
  { to: "/varc", label: "VARC" },
  { to: "/dilr", label: "DILR", soon: true },
  { to: "/quant", label: "Quant", soon: true },
  { to: "/practice", label: "Practice" },
];

export default function SiteHeader({ landing, groups, open, onOpenChange, onLoadMenu, onOpenMenu, onOpenSearch }: SiteHeaderProps) {
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
          <button type="button" aria-expanded={open} aria-controls="all-pages" onClick={() => onOpenChange(!open)}
            className={cn("inline-flex h-11 items-center gap-2 rounded-md px-3 text-base font-medium text-foreground/80 transition-colors hover:bg-card hover:text-foreground", open && "bg-card text-foreground")}>
            All pages<ChevronDown className={cn("size-4 transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
          </button>
        </div>
      </div>
      {open && <div id="all-pages" className="absolute inset-x-0 top-full px-gutter pt-3 pb-6">
        <div className="mx-auto flex w-full max-w-[1440px] justify-end">
          <nav aria-label="All pages" className="grid w-full max-w-[1120px] grid-cols-4 gap-4 rounded-xl border border-border/70 bg-card p-5 shadow-[0_24px_40px_-24px_rgb(0_0_0/0.3)] xl:gap-6 xl:p-6">
            {groups.map((group) => <div key={group.title} className="flex min-w-0 flex-col">
              <span className="mb-1 border-b border-border/70 px-3 pb-2 text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">{group.title}</span>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => <NavLink key={item.to} to={item.to} end={item.end} onClick={() => onOpenChange(false)} title={item.label}
                  className={({ isActive }) => cn("flex min-h-10 items-center justify-between gap-2 rounded-md px-3 py-2 text-base font-medium text-foreground/80 transition-colors hover:bg-muted/70 hover:text-foreground", isActive && "bg-muted text-foreground")}>
                  <span className="truncate">{item.label}</span>{item.soon && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Soon</span>}
                </NavLink>)}
              </div>
            </div>)}
          </nav>
        </div>
      </div>}
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
