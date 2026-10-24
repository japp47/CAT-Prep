import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, LinkButton, Page, PageHeader, Section, Segmented, Stat } from "../components/kit";
import { API_ENABLED } from "../lib/api";
import { groupReports, isStaff, KIND_LABEL, listReports, overview, setStatus, type Overview, type ReportGroup, type StaffMe } from "../lib/admin";
import { mediumDate } from "../lib/date";
import { CR_CATALOG, RC_CATALOG, VA_CATALOG } from "../practice/catalog.gen";
import { VA_KIND, type VaKind } from "../practice/va/build";
import NotFound from "./NotFound";

/**
 * The admin page (docs/feature.md F79, B8): problem reports grouped by question, and counts. Only staff get here;
 * everyone else sees the normal "Page not found" (D33). No student's answers are shown (D14).
 */
export default function Admin() {
  const [me, setMe] = useState<StaffMe | null | undefined>(undefined);
  useEffect(() => { if (API_ENABLED) void isStaff().then(setMe); else setMe(null); }, []);
  const can = (p: string) => !!me?.permissions.includes(p);
  const tabs = [can("feedback.read") && "reports", can("stats.read") && "overview"].filter(Boolean) as ("reports" | "overview")[];
  const [tab, setTab] = useState<"reports" | "overview">("reports");
  const shown = tabs.includes(tab) ? tab : tabs[0];

  if (me === undefined) return <Page width="read"><Skeleton className="h-10 w-48" /><Skeleton className="h-40 w-full" /></Page>;
  if (me === null) return <NotFound />;
  return (
    <Page width="read">
      <PageHeader title="Admin">Signed in as {me.email}. Problem reports and counts; no student&rsquo;s answers are ever shown here.</PageHeader>
      {tabs.length > 1 && <Segmented label="Admin view" value={shown} onChange={setTab} options={[["reports", "Reports"], ["overview", "Overview"]]} />}
      {shown === "reports" && <Reports canResolve={can("feedback.resolve")} />}
      {shown === "overview" && <OverviewView />}
    </Page>
  );
}

/** "RC: Why cities keep growing, Q3", "Para jumble: Bees", "Critical reasoning CR-04: …"; the raw id if unknown. */
function questionName(key: string): string {
  const [kind, id, n] = key.split(":");
  if (kind === "rc") {
    const set = RC_CATALOG.find((s) => s.id === id);
    return set ? `RC: ${set.title}, Q${Number(n) + 1}` : key;
  }
  if (kind === "cr") {
    const c = CR_CATALOG.find((x) => x.id === id);
    return c ? `Critical reasoning ${c.id}: ${c.topic}` : key;
  }
  const va = VA_KIND[kind as VaKind], p = VA_CATALOG.find((x) => x.id === id);
  return va && p ? `${va.label}: ${p.topic}` : key;
}

/** Where to read the question: an RC set opens fresh; a VA or CR question opens alone in the redo queue. */
function questionHref(key: string): string {
  const [kind, id] = key.split(":");
  return kind === "rc" ? `/practice/rc/${id}` : `/practice/redo?k=${encodeURIComponent(key)}`;
}

const when = (t: string) => mediumDate(t.slice(0, 10));
const STATUS_WORD = { seen: "Marked seen", fixed: "Marked fixed", wont_fix: "Closed as won't fix" } as const;

function Reports({ canResolve }: { canResolve: boolean }) {
  const [state, setState] = useState<"open" | "closed">("open");
  const [groups, setGroups] = useState<ReportGroup[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const load = useCallback(async (s: "open" | "closed") => {
    setGroups(null); setErr("");
    const res = await listReports(s);
    if (res.ok) setGroups(groupReports(res.data.reports)); else { setErr(res.message); setGroups([]); }
  }, []);
  useEffect(() => { void load(state); }, [state, load]);

  const act = async (g: ReportGroup, status: "seen" | "fixed" | "wont_fix") => {
    setBusy(g.itemId);
    const res = await setStatus(g.reports.map((r) => r.id), status);
    setBusy("");
    if (!res.ok) { toast(res.message); return; }
    const n = g.reports.length;
    toast(`${status === "seen" && state === "closed" ? "Reopened" : STATUS_WORD[status]}: ${n} report${n === 1 ? "" : "s"} on ${questionName(g.itemId)}.`);
    if (status === "seen" && state === "open") setGroups((gs) => gs?.map((x) => x.itemId === g.itemId ? { ...x, reports: x.reports.map((r) => ({ ...r, status: "seen" })) } : x) ?? null);
    else setGroups((gs) => gs?.filter((x) => x.itemId !== g.itemId) ?? null);
  };

  return (
    <Section>
      <Segmented label="Which reports" value={state} onChange={setState} options={[["open", "Open"], ["closed", "Closed, last 90 days"]]} />
      {err && <p className="text-base" role="alert">{err}</p>}
      {groups === null && <><Skeleton className="h-36 w-full" /><Skeleton className="h-36 w-full" /></>}
      {groups?.length === 0 && !err && <Empty>{state === "open" ? "No open reports. Nothing to fix right now." : "Nothing closed in the last 90 days."}</Empty>}
      <ul className="flex flex-col gap-4">
        {groups?.map((g) => {
          const kinds = Object.entries(g.reports.reduce<Record<string, number>>((m, r) => ({ ...m, [r.kind]: (m[r.kind] ?? 0) + 1 }), {}));
          const fresh = g.reports.some((r) => r.status === "new");
          return (
            <li key={g.itemId} className="flex flex-col gap-4 rounded-lg bg-card p-5 sm:p-6">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="text-heading font-semibold">{questionName(g.itemId)}</h3>
                  {fresh && <Badge variant="secondary">New</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {g.reports.length} report{g.reports.length === 1 ? "" : "s"}: {kinds.map(([k, n]) => `${n} ${KIND_LABEL[k as keyof typeof KIND_LABEL].toLowerCase()}`).join(", ")}. Latest {when(g.latest)}.
                </p>
              </div>
              <ul className="flex flex-col gap-2">
                {g.reports.map((r) => (
                  <li key={r.id} className="flex flex-col gap-1 rounded-md bg-background/60 px-4 py-3">
                    <p className="text-base whitespace-pre-line break-words">{r.note || <span className="text-muted-foreground">No note.</span>}</p>
                    <p className="text-sm text-muted-foreground">
                      {KIND_LABEL[r.kind]}, {when(r.createdAt)}, on {r.page}
                      {r.handledAt && <>. {r.status === "fixed" ? "Fixed" : "Won't fix"} {when(r.handledAt)}{r.handledBy && <> by {r.handledBy}</>}</>}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <LinkButton to={questionHref(g.itemId)} variant="secondary" size="sm">Open the question</LinkButton>
                {canResolve && state === "open" && <>
                  <Button size="sm" variant="secondary" disabled={busy === g.itemId} onClick={() => void act(g, "fixed")}>Fixed</Button>
                  <Button size="sm" variant="ghost" disabled={busy === g.itemId} onClick={() => void act(g, "wont_fix")}>Won&rsquo;t fix</Button>
                  {fresh && <Button size="sm" variant="ghost" disabled={busy === g.itemId} onClick={() => void act(g, "seen")}>Mark seen</Button>}
                </>}
                {canResolve && state === "closed" && <Button size="sm" variant="ghost" disabled={busy === g.itemId} onClick={() => void act(g, "seen")}>Reopen</Button>}
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

const MB = 1024 * 1024;

function OverviewView() {
  const [o, setO] = useState<Overview | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { void overview().then((r) => (r.ok ? setO(r.data) : setErr(r.message))); }, []);
  if (err) return <p className="text-base" role="alert">{err}</p>;
  if (!o) return <Skeleton className="h-64 w-full" />;
  const n = (x: number) => x.toLocaleString("en-IN");
  const used = o.databaseBytes / o.databaseFreeBytes;
  const groups: [string, [number | string, string][]][] = [
    ["Students", [[o.identities, "With sync on"], [o.activeThisWeek, "Active this week"], [o.newThisWeek, "New this week"], [o.accounts, "Signed in with Google"]]],
    ["Sync", [[o.devices, "Devices"], [o.records, "Synced records"], [o.refusedThisWeek, "Refused pushes this week"]]],
    ["Problem reports", [[o.reportsOpen, "Open"], [o.reportsNew, "Not in a digest yet"], [o.closedThisWeek, "Closed this week"]]],
  ];
  return (
    <div className="flex flex-col gap-8">
      {groups.map(([title, stats]) => (
        <Section key={title} title={title}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-lg bg-card p-5 sm:grid-cols-4 sm:p-6">
            {stats.map(([v, l]) => <Stat key={l} value={typeof v === "number" ? n(v) : v} label={l} />)}
          </div>
        </Section>
      ))}
      <Section title="Database" description="Supabase's free plan holds 500 MB.">
        <div className="flex flex-col gap-3 rounded-lg bg-card p-5 sm:p-6">
          <p className="text-base"><b className="font-semibold">{(o.databaseBytes / MB).toFixed(1)} MB</b> of {Math.round(o.databaseFreeBytes / MB)} MB used ({Math.round(used * 100)}%)</p>
          <Progress value={Math.min(100, used * 100)} aria-label="Database space used" />
        </div>
      </Section>
    </div>
  );
}
