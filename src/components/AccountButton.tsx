import { Link, useLocation } from "react-router-dom";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_ENABLED, SIGNIN_ENABLED } from "../lib/api";
import { useSyncStatus } from "./SyncNav";

/** The first letter of the name, else of the email: shown in a circle when signed in. */
export const initial = (a: { email: string; name: string }) => (a.name.trim() || a.email).charAt(0).toUpperCase();

/**
 * The account in the header (B7): signed in, your initial, which opens your devices and sign-out; signed out, a
 * person icon that opens /signin. Never a popup or a gate: 99ile works the same without signing in.
 */
export default function AccountButton({ className, withLabel }: { className?: string; withLabel?: boolean }) {
  const s = useSyncStatus();
  const loc = useLocation();
  if (!API_ENABLED) return null;
  if (s.account) {
    return (
      <Link to="/settings#sync" aria-label={`Your account, ${s.account.email}`} title={s.account.email}
        className={cn("grid size-11 place-items-center rounded-md hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", className)}>
        <span className="grid size-8 place-items-center rounded-full bg-primary text-base font-semibold text-primary-foreground" aria-hidden>{initial(s.account)}</span>
      </Link>
    );
  }
  if (!SIGNIN_ENABLED) return null;
  const here = loc.pathname === "/signin" ? "" : "?then=" + encodeURIComponent(loc.pathname + loc.search);
  return (
    <Link to={"/signin" + here} aria-label="Sign in" title="Sign in"
      className={cn("inline-flex h-11 items-center gap-2 rounded-md text-foreground/80 transition-colors hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        withLabel ? "px-3 text-base font-medium" : "w-11 justify-center", className)}>
      <UserRound className="size-5" aria-hidden />{withLabel && "Sign in"}
    </Link>
  );
}
