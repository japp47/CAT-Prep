import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { addDays, shortDate, todayIso } from "../../lib/date";
import { usePref } from "../../lib/prefs";
import { useStore } from "../../lib/store";
import { Empty, LinkButton, Meta, NativeSelect, Page, PageHeader } from "../../components/kit";
import { RC_CATALOG } from "../../practice/catalog.gen";
import { DAILY_EPOCH, dayNumber, rcOfDay } from "../../practice/daily";
import { GENRES, type Genre, type RcMeta } from "../../practice/types";

function useBest() {
  const { state } = useStore();
  return (set: RcMeta) => {
    const tries = state.rcAttempts.filter((a) => a.set === set.id);
    if (!tries.length) return null;
    const last = tries[tries.length - 1];
    return { tries: tries.length, best: Math.max(...tries.map((a) => 3 * a.c - a.w)), last };
  };
}

function Row({ set, label }: { set: RcMeta; label?: string }) {
  const best = useBest()(set);
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md px-4 py-3 hover:bg-muted/60">
      <div className="flex min-w-0 flex-col gap-0.5">
        {label && <span className="text-sm text-muted-foreground">{label}</span>}
        <Link to={`/practice/rc/${set.id}`} className="text-base font-semibold hover:text-primary">{set.title}</Link>
        <Meta>{GENRES[set.genre]}, {set.difficulty}, {set.words} words{best ? `. Best ${best.best > 0 ? "+" : ""}${best.best} of ${3 * set.questions}` : ""}</Meta>
      </div>
      <div className="flex items-center gap-2">
        {best && <LinkButton to={`/practice/rc/${set.id}?review=${best.last.id}`} variant="ghost" size="sm">Review</LinkButton>}
        <LinkButton to={`/practice/rc/${set.id}`} variant={best ? "secondary" : "default"} size="sm">{best ? "Retake" : "Start"}</LinkButton>
      </div>
    </li>
  );
}

/** Every RC set, with filters, and the archive of past RCs of the day. */
export default function Library() {
  const { state } = useStore();
  const today = todayIso();
  const [tab, setTab] = usePref<"all" | "daily">("libTab", "all");
  const [genre, setGenre] = usePref<Genre | "all">("libGenre", "all");
  const [diff, setDiff] = usePref<"all" | "easy" | "medium" | "hard">("libDiff", "all");
  const [hideDone, setHideDone] = usePref("libHideDone", false);
  const tried = new Set(state.rcAttempts.map((a) => a.set));
  const lib = RC_CATALOG.filter((s) => (genre === "all" || s.genre === genre) && (diff === "all" || s.difficulty === diff) && !(hideDone && tried.has(s.id)));
  const archiveDays = Array.from({ length: 14 }, (_, i) => addDays(today, -i - 1)).filter((d) => d >= DAILY_EPOCH);

  return (
    <Page>
      <PageHeader title="RC library" back={{ to: "/practice", label: "Practice" }}>
        {RC_CATALOG.length} original passages, four questions each, with every option explained. You have tried {tried.size}.
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
            <ToggleGroup type="single" value={diff} onValueChange={(v) => v && setDiff(v as typeof diff)} className="rounded-lg bg-secondary p-1" aria-label="Difficulty">
              {(["all", "easy", "medium", "hard"] as const).map((d) => <ToggleGroupItem key={d} value={d} className="h-9 rounded-md px-3.5 text-base data-[state=on]:bg-card data-[state=on]:font-semibold">{d === "all" ? "Any level" : d[0].toUpperCase() + d.slice(1)}</ToggleGroupItem>)}
            </ToggleGroup>
            <label className="inline-flex items-center gap-2.5 text-base"><Checkbox checked={hideDone} onCheckedChange={(v) => setHideDone(v === true)} />Hide sets I have tried</label>
          </div>
          {lib.length
            ? <ul className="flex flex-col rounded-lg bg-card p-1.5">{lib.map((s) => <Row key={s.id} set={s} />)}</ul>
            : <Empty>Nothing matches. Change the filters.</Empty>}
        </TabsContent>
        <TabsContent value="daily" className="flex flex-col gap-5">
          {archiveDays.length
            ? <ul className="flex flex-col rounded-lg bg-card p-1.5">{archiveDays.map((d) => <Row key={d} set={rcOfDay(d)} label={`${shortDate(d)}, day ${dayNumber(d)}`} />)}</ul>
            : <Empty>Past RCs of the day appear here from tomorrow.</Empty>}
        </TabsContent>
      </Tabs>
    </Page>
  );
}
