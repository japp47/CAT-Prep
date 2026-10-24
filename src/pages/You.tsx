import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { initial } from "../components/AccountButton";
import { LinkButton, Page, Section, Segmented, Stat } from "../components/kit";
import { statusLine, useSyncStatus } from "../components/SyncNav";
import { EXAM_CONFIRMED, EXAM_ISO, EXAM_NAME } from "../data/exam";
import { api, API_ENABLED, SIGNIN_ENABLED } from "../lib/api";
import { diffDays, longDate, todayIso } from "../lib/date";
import { useStore } from "../lib/store";
import type { About } from "../lib/state";
import type { Account } from "../lib/sync/client";
import { activityDays, computeStreak } from "../practice/streak";
import { studySoFar } from "../practice/history";
import { TargetPicker } from "./tracker/Target";

// The sync card moved here from Settings (D35). Loaded only in builds with the API on, as before.
const SyncCard = API_ENABLED ? lazy(() => import("../components/SyncCard")) : null;

const Panel = ({ children }: { children: React.ReactNode }) => <div className="flex flex-col gap-5 rounded-lg bg-card p-5 sm:p-6">{children}</div>;

/** "October 2026" from an ISO timestamp. */
const monthYear = (t: string) => {
  const d = new Date(t);
  return isNaN(d.getTime()) ? "" : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][d.getMonth()] + " " + d.getFullYear();
};

/**
 * You (docs/feature.md F81, part 1): who you are on 99ile, what you are preparing for, and your study so far, with
 * the account and sync in one place. Works for everyone: signed in, syncing with a code, or on this device only.
 */
export default function You() {
  const { state, update } = useStore();
  const s = useSyncStatus();
  const [since, setSince] = useState("");
  // "Member since" is not kept on the device: ask once when signed in.
  useEffect(() => {
    if (!s.account) return;
    let live = true;
    void api<{ account: Account | null }>("/identity").then((r) => { if (live && r.ok && r.data.account?.createdAt) setSince(monthYear(r.data.account.createdAt)); });
    return () => { live = false; };
  }, [s.account]);

  const today = todayIso();
  const streak = useMemo(() => computeStreak(activityDays(state), today), [state, today]);
  const study = useMemo(() => studySoFar(state), [state]);
  const left = diffDays(today, EXAM_ISO);
  const setAbout = <K extends keyof About>(k: K, v: About[K]) => update((st) => { st.about[k] = v; });
  const hours = study.minutes >= 60 ? `${Math.floor(study.minutes / 60)} h ${study.minutes % 60} min` : `${study.minutes} min`;

  const accountStatus = s.account
    ? { label: "Signed in", variant: "success" as const }
    : s.phase === "syncing"
      ? { label: "Syncing", variant: "success" as const }
      : s.phase === "error"
        ? { label: "Sync needs attention", variant: "warning" as const }
        : s.phase !== "off"
          ? { label: "Sync is on", variant: "success" as const }
          : { label: "This device only", variant: "secondary" as const };

  return (
    <Page width="wide">
      <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-xl bg-accent p-5 sm:gap-6 sm:p-7 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
        <span className="grid size-16 place-items-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground sm:size-20 sm:text-3xl" aria-hidden>
          {s.account ? initial(s.account) : <UserRound className="size-8" />}
        </span>
        <div className="contents sm:flex sm:min-w-0 sm:flex-col sm:items-start sm:gap-1">
          <div className="min-w-0">
            <h1 className="max-w-full truncate text-title font-semibold">{s.account ? s.account.name || "You" : "Your 99ile"}</h1>
          </div>
          <div className="col-span-2 flex min-w-0 flex-col items-start gap-1 sm:col-span-1">
            <Badge variant={accountStatus.variant}>{accountStatus.label}</Badge>
            {s.account
              ? <><p className="max-w-full truncate text-base text-muted-foreground">{s.account.email}</p>{since && <p className="text-sm text-muted-foreground">Member since {since}</p>}</>
              : <p className="text-base text-muted-foreground">
                  {s.phase !== "off" ? `Not signed in · ${statusLine(s)}.` : "Your progress is saved on this device."}
                </p>}
          </div>
        </div>
        {!s.account && API_ENABLED && (
          <LinkButton to={SIGNIN_ENABLED ? "/signin?then=%2Fyou" : "/you#sync"} variant="secondary" className="col-span-2 w-fit justify-self-start sm:col-span-1 lg:col-span-1">
            {SIGNIN_ENABLED ? "Sign in" : "Set up sync"} <ArrowRight data-icon="inline-end" />
          </LinkButton>
        )}
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-2">
        <Section title="Your CAT" description={<>{EXAM_NAME}, {EXAM_CONFIRMED ? "on" : "expected on"} {longDate(EXAM_ISO)}{left > 0 && <>, {left} days to go</>}.</>}>
          <Panel>
            <Choice label="Target percentile in VARC" hint="Used in your plan, Progress and mock chart.">
              <TargetPicker />
            </Choice>
            <Choice label="Is this your first CAT?">
              <Segmented label="Is this your first CAT?" value={state.about.attempt ?? ""} onChange={(v) => setAbout("attempt", v || undefined)}
                options={[["first", "First attempt"], ["repeat", "Taken it before"]]} />
            </Choice>
            <Choice label="Right now you are">
              <Segmented label="Right now you are" value={state.about.work ?? ""} onChange={(v) => setAbout("work", v || undefined)}
                options={[["studying", "Studying"], ["working", "Working"]]} />
            </Choice>
          </Panel>
        </Section>

        <Section title="Your study so far" description="A snapshot of your study time, questions and consistency." action={<span className="flex flex-wrap gap-x-4 gap-y-2 text-base"><Link to="/history" className="font-medium text-primary underline-offset-4 hover:underline">History</Link><Link to="/progress" className="font-medium text-primary underline-offset-4 hover:underline">Progress</Link></span>}>
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-card p-3 sm:gap-4 sm:p-4">
            <Stat className="min-h-24 justify-center rounded-md bg-muted/60 p-4" value={streak.days ? `${streak.days} day${streak.days === 1 ? "" : "s"}` : "None yet"} label="Current streak" />
            <Stat className="min-h-24 justify-center rounded-md bg-muted/60 p-4" value={study.days} label="Days studied" />
            <Stat className="min-h-24 justify-center rounded-md bg-muted/60 p-4" value={study.questions} label="Questions answered" />
            <Stat className="min-h-24 justify-center rounded-md bg-muted/60 p-4" value={hours} label="Time studied" />
          </div>
          {study.days === 0 && <p className="text-base text-muted-foreground">Your first study session is waiting. <Link to="/today" className="font-medium text-primary underline-offset-4 hover:underline">Start today’s plan</Link>.</p>}
        </Section>
      </div>

      {SyncCard
        ? <Suspense fallback={null}><SyncCard /></Suspense>
        : <Section title="Your data"><p className="text-base">Your progress is saved in this browser. Download a backup in <Link to="/settings" className="font-medium text-primary underline underline-offset-4">Settings</Link>.</p></Section>}

      <p className="text-base text-muted-foreground">Theme, backups and starting over are in <Link to="/settings" className="font-medium text-primary underline underline-offset-4">Settings</Link>.</p>
    </Page>
  );
}

function Choice({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-base font-medium">{label}</span>
      {hint && <span className="-mt-1.5 text-sm text-muted-foreground">{hint}</span>}
      {children}
    </div>
  );
}
