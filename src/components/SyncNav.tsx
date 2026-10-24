import { useSyncExternalStore } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { MonitorSmartphone, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_ENABLED, SIGNIN_ENABLED } from "../lib/api";
import { getStatus, subscribe, type Status } from "../lib/sync/status";
import { ago } from "./sync/ago";

export const useSyncStatus = () => useSyncExternalStore(subscribe, getStatus, getStatus);

/** One short line for the nav: what sync is doing, in words. */
export function statusLine(s: Status): string {
  if (s.phase === "off") return "Not set up";
  if (s.phase === "syncing") return "Syncing…";
  if (s.phase === "error") return "Will try again later";
  return ago(s.last);
}

/**
 * The account and sync row in the sidebar and the phone menu, with its status, so a student finds it without
 * digging through Settings and sees at a glance that it worked. A label, never an icon alone (docs: sync UX plan).
 * Signed in: your name and when it last synced. Signed out with Google sign-in on: "Sign in", to /signin.
 * Otherwise "Sync devices", as before accounts.
 */
export function SyncNavRow({ collapsed, onPick }: { collapsed?: boolean; onPick?: () => void }) {
  const s = useSyncStatus();
  const loc = useLocation();
  if (!API_ENABLED) return null;
  const signIn = SIGNIN_ENABLED && s.phase === "off";
  const title = s.account ? s.account.name || s.account.email : signIn ? "Sign in" : "Sync devices";
  const line = signIn ? "Save progress everywhere" : statusLine(s);
  const to = signIn ? "/signin?then=" + encodeURIComponent(loc.pathname) : s.account ? "/you" : "/you#sync";
  return (
    <NavLink to={to} onClick={onPick} title={collapsed ? title + ": " + line : undefined} aria-label={title + ", " + line}
      className={cn("flex items-center gap-3 rounded-md text-foreground/80 transition-colors hover:bg-card/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        collapsed ? "size-11 justify-center" : "min-h-12 px-3 py-2")}>
      <span className="relative shrink-0">
        {s.account
          ? <span className="grid size-6 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground" aria-hidden>{(s.account.name.trim() || s.account.email).charAt(0).toUpperCase()}</span>
          : signIn ? <UserRound className="size-5" aria-hidden /> : <MonitorSmartphone className="size-5" aria-hidden />}
        {s.phase !== "off" && <span className={cn("absolute -right-1 -bottom-0.5 size-2.5 rounded-full ring-2 ring-sidebar", s.phase === "error" ? "bg-warning" : "bg-success")} aria-hidden />}
      </span>
      {!collapsed && (
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-base font-medium">{title}</span>
          <span className="truncate text-sm text-muted-foreground">{line}</span>
        </span>
      )}
    </NavLink>
  );
}

/** The sidebar's last line: true whether or not sync is on. */
export function DataNote() {
  const s = useSyncStatus();
  return <>{API_ENABLED && s.phase !== "off" ? "Free and open. Your progress syncs between your devices." : "Free and open. Your data stays in this browser."}</>;
}
