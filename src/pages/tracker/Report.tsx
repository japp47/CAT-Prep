import { todayIso } from "../../lib/date";
import { Fixing } from "./Fixing";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Bars, PaceChart } from "../../components/Chart";
import { Empty, LinkButton, Meta, Section, Stat, TextLink } from "../../components/kit";
import { useStore } from "../../lib/store";
import { sectionByLabel } from "../../sections";
import { CR_CATALOG, RC_CATALOG } from "../../practice/catalog.gen";
import { useContent } from "../../practice/content";
import { HABIT_WINDOW, summaryHabits } from "../../practice/summary";
import { accuracy, byPracticeType, crByKind, focusLines, luckyGuesses, MIN_TOTAL, paceTrend, patterns, rcByDifficulty, rcByGenre, rcByQuestionType, topTraps, type Row } from "../../practice/report";

/** CAT has about 2,000 words of RC; reading them in 10 minutes leaves time for the questions. */
const EXAM_PACE = 200;

/** Accuracy bars, one row per group. Bars under 60% are red, and every row says how many questions it rests on. */
/** `unit` names what each row counts; null hides the count when every row counts the same thing, as the title already says. */
function AccuracyList({ title, rows, empty, unit = ["Q", "Qs"] }: { title: string; rows: Row[]; empty: string; unit?: [string, string] | null }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h3 className="text-base font-semibold">{title}</h3>
      {rows.length === 0 ? <p className="text-base text-muted-foreground">{empty}</p> : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => {
            const pct = accuracy(r);
            return (
              <li key={r.key} className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_4.25rem] items-center gap-3 text-base sm:grid-cols-[minmax(0,10.5rem)_minmax(0,1fr)_4.5rem]">
                <span className="leading-snug">{r.label}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-secondary"><span className={cn("block h-full rounded-full", pct !== null && pct < 60 ? "bg-danger" : "bg-primary")} style={{ width: (pct ?? 0) + "%" }} /></span>
                <span className="text-right leading-tight">
                  {pct === null ? <span className="text-sm text-muted-foreground">None yet</span> : <><b className="font-semibold">{pct}%</b>{unit && <span className="block text-sm text-muted-foreground">{r.attempted} {unit[r.attempted === 1 ? 0 : 1]}</span>}</>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** RC accuracy by kind of question. It needs the passages, which load on demand. */
function RcKinds() {
  const { state } = useStore();
  if (!state.rcAttempts.length) return <AccuracyList title="RC questions, by kind" rows={[]} empty="Answer an RC set in Practice and its kinds of question appear here." />;
  return <RcKindsLoaded />;
}

/** Split from RcKinds so the passages are fetched only when there are attempts to read against them. */
function RcKindsLoaded() {
  const { state } = useStore();
  const { content } = useContent();
  if (!content) return <div className="flex flex-col gap-3" role="status"><span className="sr-only">Loading…</span><Skeleton className="h-5 w-1/3" /><Skeleton className="h-24" /></div>;
  return <AccuracyList title="RC questions, by kind" rows={rcByQuestionType(state.rcAttempts, content.rcById)} empty="Answer an RC set in Practice and its kinds of question appear here." />;
}

export function Report({ sec }: { sec: string }) {
  const { state } = useStore();
  const def = sectionByLabel(sec);
  const varc = sec === "VARC";
  const types = byPracticeType(state.practice, sec, def.practiceTypes);
  const attempted = types.reduce((s, r) => s + r.attempted, 0);
  const traps = topTraps(state.errors, sec);
  const genres = varc ? rcByGenre(state.rcAttempts, RC_CATALOG) : [];
  const levels = varc ? rcByDifficulty(state.rcAttempts, RC_CATALOG) : [];
  const crKinds = varc ? crByKind(state.crAttempts, CR_CATALOG) : [];
  const pace = paceTrend(state.speedRuns);
  const lines = varc ? focusLines({ types, genres, traps, pace, examPace: EXAM_PACE, pattern: patterns(state.errors, state.practice, todayIso(), sec)[0] }) : [];
  const lucky = varc ? luckyGuesses(state) : [];
  const luckyN = lucky.reduce((s, [, n]) => s + n, 0);
  const habits = summaryHabits(state.summaries);

  return (
    <div className="flex flex-col gap-12">
      {varc && (
        <Section title="Where to focus" description="Worked out from your practice sets, reading speed tests and Error log.">
          {lines.length > 0 ? (
            <ul className="flex flex-col gap-px overflow-hidden rounded-xl bg-background">
              {lines.map((l, i) => (
                <li key={l.text} className={cn("relative flex flex-wrap items-center justify-between gap-x-6 gap-y-1 bg-card px-5 py-4 sm:px-6", i === 0 && "before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-highlight")}>
                  <p className="measure min-w-0 text-base">{l.text}</p>
                  <TextLink to={l.to}>{l.cta}</TextLink>
                </li>
              ))}
            </ul>
          ) : attempted >= MIN_TOTAL ? (
            <Empty>Nothing stands out. Every type, genre and trap is within a few points of the rest, so keep the mix going.</Empty>
          ) : (
            <Empty action={<LinkButton to="/practice">Go to Practice</LinkButton>}>
              The report card needs about {MIN_TOTAL} questions before it can say what to work on. You have done {attempted}. The daily RC and VA drill make about 12.
            </Empty>
          )}
          {luckyN > 0 && <p className="measure text-base">You got {luckyN === 1 ? "1 answer" : `${luckyN} answers`} right while marked “Not sure”{lucky.length ? `, most in ${lucky[0][0].toLowerCase() === "rc" ? "RC" : lucky[0][0].toLowerCase()}` : ""}. They count in your score, and come back once in your <TextLink to="/practice/redo">redo queue</TextLink> to check the skill is really there.</p>}
        </Section>
      )}

      {varc && <Fixing />}

      <Section title="Accuracy" description="Bars under 60% are red. Spend more drill time on those. A group with only a few questions can swing a lot, so check the count.">
        <div className="grid gap-x-12 gap-y-10 rounded-lg bg-card p-5 sm:p-6 md:grid-cols-2">
          <AccuracyList title="By question type" rows={types} empty="No sets yet." />
          {varc && <RcKinds />}
          {varc && <AccuracyList title="RC, by genre" rows={genres} empty="Answer an RC set in Practice and its genre appears here." />}
          {varc && <AccuracyList title="RC, by difficulty" rows={levels} empty="Answer an RC set in Practice and its difficulty appears here." />}
          {varc && <AccuracyList title="Critical reasoning, by kind" rows={crKinds} empty="Answer a critical reasoning drill in Practice and its kinds of question appear here." />}
        </div>
      </Section>

      {varc && (
        <Section title="Summary habits" description={`How often each check was ticked in your last ${HABIT_WINDOW} summaries. The one you miss most is the habit to work on.`}
          action={habits.count > 0 ? <TextLink to="/journal">Open your reading journal</TextLink> : undefined}>
          {habits.count > 0 ? (
            <div className="flex flex-col gap-5 rounded-lg bg-card p-5 sm:p-6">
              {habits.weakest && <p className="measure text-base"><span className="hl">{habits.weakest}</span></p>}
              <AccuracyList title={`Checks ticked, last ${habits.count}`} rows={habits.rows} empty="" unit={null} />
            </div>
          ) : (
            <Empty action={<LinkButton to="/practice" variant="secondary">Go to Practice</LinkButton>}>
              No summaries yet. After any RC set you are asked to sum up the passage in 25 words; your habits show here after the first one.
            </Empty>
          )}
        </Section>
      )}

      {varc && (
        <Section title="Reading pace" description="Words a minute in your reading speed tests. Only runs with both recall questions right count, because speed without recall proves nothing.">
          {pace.runs.length > 0 ? (
            <div className="flex flex-col gap-5 rounded-lg bg-card p-5 sm:p-6">
              <PaceChart runs={pace.runs.slice(-20)} examPace={EXAM_PACE} />
              <div className="flex flex-wrap gap-x-12 gap-y-3">
                <Stat value={pace.best + " wpm"} label="Best with full recall" />
                {pace.first !== null && pace.last !== null && <Stat value={`${pace.first} to ${pace.last} wpm`} label="First three runs to last three" />}
                <Stat value={EXAM_PACE + " wpm"} label="CAT pace" />
              </div>
            </div>
          ) : (
            <Empty action={<LinkButton to="/practice/speed" variant="secondary">Take the test</LinkButton>}>
              No reading speed tests with full recall yet. One timed passage and two recall questions take about 5 minutes.
            </Empty>
          )}
        </Section>
      )}

      <Section title="Traps that cost you most" description="The reasons behind your logged mistakes. Naming a trap is how you stop falling for it."
        action={traps.length > 0 ? <TextLink to="/errors">Open the Error log</TextLink> : undefined}>
        <div className="rounded-lg bg-card p-5 sm:p-6">
          {traps.length > 0 ? <Bars counts={Object.fromEntries(traps)} empty="" /> : <Meta>No traps logged for {sec} yet. When you add a mistake to the Error log, pick what got you.</Meta>}
        </div>
      </Section>
    </div>
  );
}
