import { lazy, Suspense, useRef, useState } from "react";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_ENABLED, SIGNIN_ENABLED } from "../lib/api";
import { useSyncStatus } from "./SyncNav";

const AccountMenu = lazy(() => import("./AccountMenu"));

/** The first letter of the name, else of the email: shown in a circle when signed in. */
export const initial = (a: { email: string; name: string }) => (a.name.trim() || a.email).charAt(0).toUpperCase();

/**
 * The account in the header (B7): signed in, your initial; otherwise a person icon, with a dot while sync is on.
 * It opens the account menu (AccountMenu): sign in, sync, devices, sign out. Never a gate: 99ile works the same
 * without signing in.
 */
export default function AccountButton({ className, withLabel }: { className?: string; withLabel?: boolean }) {
  const s = useSyncStatus();
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  // Stays mounted after the first open, so the menu can animate closed.
  const [loaded, setLoaded] = useState(false);
  if (!API_ENABLED || (!s.account && !SIGNIN_ENABLED)) return null;
  const on = s.phase !== "off";
  const label = s.account ? `Your account, ${s.account.email}` : on ? "Sync and sign in" : "Sign in";
  return (
    <>
      <button ref={ref} type="button" aria-label={label} title={s.account?.email ?? label} aria-haspopup="dialog" aria-expanded={open}
        onPointerEnter={() => { void import("./AccountMenu"); }}
        onClick={() => { setLoaded(true); setOpen((o) => !o); }}
        className={cn("inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-md text-foreground/80 transition-colors hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          withLabel && !s.account ? "px-3 text-base font-medium" : "w-11 justify-center", open && "bg-card text-foreground", className)}>
        <span className="relative grid place-items-center">
          {s.account
            ? <span className="grid size-8 place-items-center rounded-full bg-primary text-base font-semibold text-primary-foreground" aria-hidden>{initial(s.account)}</span>
            : <UserRound className="size-5" aria-hidden />}
          {on && <span className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-background", s.phase === "error" ? "bg-warning" : "bg-success")} aria-hidden />}
        </span>
        {withLabel && !s.account && (on ? "Sync" : "Sign in")}
      </button>
      {loaded && <Suspense fallback={null}><AccountMenu open={open} onOpenChange={setOpen} anchor={ref} /></Suspense>}
    </>
  );
}
