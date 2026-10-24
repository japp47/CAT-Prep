import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { addDays, shortDate, todayIso } from "../../lib/date";
import { usePref } from "../../lib/prefs";
import type { RcAttempt } from "../../lib/state";
import { useStore } from "../../lib/store";
import { Empty, LinkButton, Meta, Page, PageHeader } from "../../components/kit";
import { NativeSelect } from "../../components/Select";
import { RC_CATALOG } from "../../practice/catalog.gen";
import { DAILY_EPOCH, dayNumber, rcOfDay } from "../../practice/daily";
import { GENRES, type Genre, type RcMeta } from "../../practice/types";

interface Best { best: number; last: RcAttempt }

const counts = RC_CATALOG.map((s) => s.questions);
const lo = Math.min(...counts), hi = Math.max(...counts);
const qRange = lo === hi ? String(lo) : lo + " or " + hi;

/** Each tried set's best score and latest attempt, worked out once for the whole list. */
function useBest(): Map<string, Best> {
  const { state } = useStore();
  return useMemo(() => {
    const m = new Map<string, Best>();
    for (const a of state.rcAttempts) {
      const marks = 3 * a.c - a.w, prev = m.get(a.set);
      m.set(a.set, { best: prev ? Math.max(prev.best, marks) : marks, last: a });
    }
    return m;
  }, [state.rcAttempts]);
}

function Row({ set, label, best }: { set: RcMeta; label?: string; best?: Best }) {
  return (
    // A grid, not flex-wrap: a two-line title must not push the button under it. On a phone a tried set stacks its two buttons on the right.
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-md px-4 py-3 hover:bg-muted/60">
      <div className="flex min-w-0 flex-col gap-0.5">
        {label && <span className="text-sm text-muted-foreground">{label}</span>}
        <Link to={`/practice/rc/${set.id}`} className="text-base font-semibold text-pretty hover:text-primary">{set.title}</Link>
        <Meta>{GENRES[set.genre]}, {set.difficulty}, {set.words} words{best ? `. Best ${best.best > 0 ? "+" : ""}${best.best} of ${3 * set.questions}` : ""}</Meta>
      </div>
      <div className="flex flex-col-reverse items-stretch gap-1 sm:flex-row sm:items-center sm:gap-2">
        {best && <LinkButton to={`/practice/rc/${set.id}?review=${best.last.id}`} variant="ghost" size="sm">Review</LinkButton>}
        {/* Quiet buttons: a list of 40 filled buttons would break the one-filled-button rule. */}
        <LinkButton to={`/practice/rc/${set.id}`} variant="secondary" size="sm">{best ? "Retake" : "Start"}</LinkButton>
      </div>
    </li>
  );
}

/** Every RC set, with filters, and the archive of past RCs of the day. */
export default function Library() {
  const today = todayIso();
  const [tab, setTab] = usePref<"all" | "daily">("libTab", "all");
  const [genre, setGenre] = usePref<Genre | "all">("libGenre", "all");
  const [diff, setDiff] = usePref<"all" | "easy" | "medium" | "hard">("libDiff", "all");
  const [attempted, setAttempted] = usePref<"all" | "tried" | "untried">("libAttempted", "all");
  const bests = useBest();
  const tried = new Set(bests.keys());
  const lib = RC_CATALOG.filter((s) =>
    (genre === "all" || s.genre === genre) &&
    (diff === "all" || s.difficulty === diff) &&
    (attempted === "all" || (attempted === "tried" ? tried.has(s.id) : !tried.has(s.id)))
  );
  const archiveDays = Array.from({ length: 14 }, (_, i) => addDays(today, -i - 1)).filter((d) => d >= DAILY_EPOCH);

  return (
    <Page>
      <PageHeader title="RC library" back={{ to: "/practice", label: "Practice" }}>
        {RC_CATALOG.length} original passages, {qRange} questions each, with every option explained. You have tried {tried.size}.
      </PageHeader>
      <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "daily")} className="gap-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="all">All sets</TabsTrigger>
          <TabsTrigger value="daily">Past RCs of the day</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <NativeSelect aria-label="Genre" value={genre} onChange={(e) => setGenre(e.target.value as Genre | "all")} className="w-auto min-w-52">
              <option value="all">All genres</option>
              {(Object.keys(GENRES) as Genre[]).map((g) => <option key={g} value={g}>{GENRES[g]}</option>)}
            </NativeSelect>
            <NativeSelect aria-label="Practice status" value={attempted} onChange={(e) => setAttempted(e.target.value as typeof attempted)} className="w-auto min-w-44">
              <option value="all">All passages</option>
              <option value="tried">Practised</option>
              <option value="untried">Not practised</option>
            </NativeSelect>
            <ToggleGroup type="single" value={diff} onValueChange={(v) => v && setDiff(v as typeof diff)} className="rounded-lg bg-secondary p-1" aria-label="Difficulty">
              {(["all", "easy", "medium", "hard"] as const).map((d) => <ToggleGroupItem key={d} value={d} className="h-9 rounded-md px-3.5 text-base data-[state=on]:bg-card data-[state=on]:font-semibold">{d === "all" ? "Any level" : d[0].toUpperCase() + d.slice(1)}</ToggleGroupItem>)}
            </ToggleGroup>
          </div>
          {lib.length
            ? <ul className="flex flex-col rounded-lg bg-card p-1.5">{lib.map((s) => <Row key={s.id} set={s} best={bests.get(s.id)} />)}</ul>
            : <Empty>Nothing matches. Change the filters.</Empty>}
        </TabsContent>
        <TabsContent value="daily" className="flex flex-col gap-5">
          {archiveDays.length
            ? <ul className="flex flex-col rounded-lg bg-card p-1.5">{archiveDays.map((d) => { const s = rcOfDay(d); return <Row key={d} set={s} best={bests.get(s.id)} label={`${shortDate(d)}, day ${dayNumber(d)}`} />; })}</ul>
            : <Empty>Past RCs of the day appear here from tomorrow.</Empty>}
        </TabsContent>
      </Tabs>
    </Page>
  );
}
