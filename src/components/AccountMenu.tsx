import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { ChevronRight, LogOut, MonitorSmartphone, QrCode, RefreshCw, Smartphone, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { SIGNIN_ENABLED } from "@/lib/api";
import { startSignIn, syncNow } from "@/lib/sync/runner";
import type { Status } from "@/lib/sync/status";
import GoogleButton from "./GoogleButton";
import { initial } from "./AccountButton";
import { statusLine, useSyncStatus } from "./SyncNav";
import TurnOff from "./sync/TurnOff";

/**
 * The account menu under the header's account button (B7). Three states, each with what a student can do next:
 * signed in (name, email, sync, devices, sign out); syncing with a code (sign in with Google to keep it safe);
 * off (continue with Google, or join another device with a code). A popover on wide screens, a bottom sheet on a
 * phone, after 21st.dev's User Menu (kuratlielia). Loaded only when first opened.
 */
function useWide() {
  const q = "(min-width: 640px)";
  const [wide, setWide] = useState(() => typeof matchMedia === "function" && matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q), on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}

const rowClass = "group flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left text-base font-medium text-foreground/85 transition-colors hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-default disabled:opacity-60 motion-reduce:transition-none";

function Row({ icon, to, onClick, disabled, danger, children }: { icon: ReactNode; to?: string; onClick?: () => void; disabled?: boolean; danger?: boolean; children: ReactNode }) {
  const inner = <>
    <span className={cn("grid size-9 shrink-0 place-items-center rounded-md bg-background text-primary transition-colors group-hover:bg-accent [&_svg]:size-5", danger && "text-danger")} aria-hidden>{icon}</span>
    <span className="min-w-0 flex-1 truncate">{children}</span>
    {to && <ChevronRight className="size-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />}
  </>;
  const className = cn(rowClass, danger && "text-danger hover:bg-danger-soft hover:text-danger");
  return to
    ? <Link to={to} onClick={onClick} className={className}>{inner}</Link>
    : <button type="button" onClick={onClick} disabled={disabled} className={className}>{inner}</button>;
}

const Dot = ({ s }: { s: Status }) => <span className={cn("size-2 shrink-0 rounded-full", s.phase === "error" ? "bg-warning" : s.phase === "off" ? "bg-muted-foreground/50" : "bg-success")} aria-hidden />;

function Intro({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-accent p-4 text-accent-foreground">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-background/70 text-primary [&_svg]:size-5" aria-hidden>{icon}</span>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-base font-semibold leading-snug">{title}</span>
        <div className="text-sm leading-relaxed text-foreground/75">{children}</div>
      </div>
    </div>
  );
}

function Body({ s, close, signOut }: { s: Status; close: () => void; signOut: () => void }) {
  const loc = useLocation();
  const here = loc.pathname + loc.search;
  const on = s.phase !== "off";
  const busy = s.phase === "syncing";
  const syncRow = <Row icon={<RefreshCw className={cn(busy && "animate-spin motion-reduce:animate-none")} />} disabled={busy} onClick={() => { void syncNow(true); }}>{busy ? "Syncing…" : "Sync now"}</Row>;

  if (s.account) return (
    <>
      <div className="flex items-center gap-3 rounded-xl bg-accent p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-lg font-semibold text-primary-foreground" aria-hidden>{initial(s.account)}</span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-base font-semibold text-accent-foreground">{s.account.name || s.account.email}</span>
          {s.account.name && <span className="truncate text-sm text-foreground/70">{s.account.email}</span>}
          <span className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-background/70 px-2.5 py-1 text-sm text-foreground/75" role="status"><Dot s={s} />{statusLine(s)}</span>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-1 rounded-xl bg-muted/70 p-1.5">
        {syncRow}
        <Row icon={<QrCode />} to="/settings?sync=link#sync" onClick={close}>Link a device</Row>
        <Row icon={<MonitorSmartphone />} to="/settings#sync" onClick={close}>Your devices</Row>
      </div>
      <div className="mt-2 rounded-xl bg-muted/70 p-1.5">
        <Row icon={<LogOut />} onClick={signOut} danger>Sign out</Row>
      </div>
    </>
  );

  if (on) return (
    <>
      <Intro icon={<MonitorSmartphone />} title="Syncing with a code">
        <span className="inline-flex items-center gap-2" role="status"><Dot s={s} />{statusLine(s)}</span>
      </Intro>
      {SIGNIN_ENABLED && (
        <div className="mt-3 flex flex-col gap-3 rounded-xl bg-muted/70 p-3">
          <p className="text-sm leading-relaxed text-muted-foreground">Add an account so a lost phone never means lost progress.</p>
          <GoogleButton onClick={() => startSignIn(here)}>Sign in with Google</GoogleButton>
        </div>
      )}
      <div className="mt-3 flex flex-col gap-1 rounded-xl bg-muted/70 p-1.5">
        {syncRow}
        <Row icon={<QrCode />} to="/settings?sync=link#sync" onClick={close}>Link a device</Row>
        <Row icon={<MonitorSmartphone />} to="/settings#sync" onClick={close}>Your devices</Row>
      </div>
      <div className="mt-2 rounded-xl bg-muted/70 p-1.5">
        <Row icon={<LogOut />} onClick={signOut} danger>Turn off sync on this device</Row>
      </div>
    </>
  );

  return (
    <>
      <Intro icon={<UserRound />} title="Save your progress everywhere">
        Right now it stays in this browser only.
      </Intro>
      {SIGNIN_ENABLED && <div className="mt-3 rounded-xl bg-muted/70 p-3"><GoogleButton onClick={() => startSignIn(here)} /></div>}
      <div className="mt-3 flex flex-col gap-1 rounded-xl bg-muted/70 p-1.5">
        <Row icon={<Smartphone />} to="/settings?sync=join#sync" onClick={close}>I use 99ile on another device</Row>
        <Row icon={<UserRound />} to="/settings#sync" onClick={close}>Sync without an account</Row>
      </div>
      <p className="px-2 pt-2 text-sm leading-relaxed text-muted-foreground">For people 18 and over. <Link to="/privacy" onClick={close} className="font-medium text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground">What we keep</Link></p>
    </>
  );
}

export default function AccountMenu({ open, onOpenChange, anchor }: { open: boolean; onOpenChange: (o: boolean) => void; anchor: RefObject<HTMLButtonElement | null> }) {
  const s = useSyncStatus();
  const wide = useWide();
  const [ask, setAsk] = useState(false);
  const close = () => onOpenChange(false);
  const signOut = () => { close(); setAsk(true); };
  const body = <Body s={s} close={close} signOut={signOut} />;
  const title = s.account ? "Your account" : s.phase !== "off" ? "Sync" : "Sign in";

  return (
    <>
      {wide ? (
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverAnchor virtualRef={anchor} />
          <PopoverContent align="end" sideOffset={8} aria-label={title} className="w-[min(23rem,calc(100vw-2rem))] rounded-2xl p-2.5"
            // The account button toggles the menu itself; a press on it is not a press outside.
            onInteractOutside={(e) => { if (anchor.current?.contains(e.target as Node)) e.preventDefault(); }}
            onCloseAutoFocus={(e) => { e.preventDefault(); anchor.current?.focus(); }}>
            {body}
          </PopoverContent>
        </Popover>
      ) : (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="max-h-[min(84dvh,44rem)] gap-0 overflow-y-auto overscroll-contain rounded-t-2xl bg-card px-4 pt-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <SheetTitle className="sr-only">{title}</SheetTitle>
            <SheetDescription className="sr-only">Your account and sync on this device</SheetDescription>
            <div className="mb-4 flex justify-center" aria-hidden><span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" /></div>
            <div className="[&>div:first-of-type]:pr-10">{body}</div>
          </SheetContent>
        </Sheet>
      )}
      <TurnOff open={ask} signedIn={!!s.account} onClose={() => setAsk(false)} onDone={(text) => toast(text)} />
    </>
  );
}
