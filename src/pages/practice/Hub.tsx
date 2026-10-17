import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { todayIso, uid } from "../../lib/date";
import { useStore } from "../../lib/store";
import { Field, LinkButton, Meta, NativeSelect, Page, PageHeader, Section, TextLink } from "../../components/kit";
import { RC_CATALOG } from "../../practice/catalog.gen";
import { dayNumber, rcOfDay } from "../../practice/daily";
import { dueRedo } from "../../practice/redo";
import { loadDraft } from "../../practice/sectional";
import { GENRES } from "../../practice/types";
import { DAILY_MIX, VA_KIND, type VaKind } from "../../practice/va/build";
import { StreakBadge } from "./common";

/** A panel on the practice page: a heading, a line on what it is, and its action pinned to the bottom. */
function Panel({ title, children, action, className }: { title: React.ReactNode; children: React.ReactNode; action: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-lg bg-card p-5 sm:p-6", className)}>
      <h2 className="text-heading font-semibold">{title}</h2>
      <div className="flex flex-col gap-2 text-base">{children}</div>
      <div className="mt-auto flex flex-wrap gap-3 pt-2">{action}</div>
    </div>
  );
}

export default function PracticeHub() {
  const { state } = useStore();
  const today = todayIso();
  const daily = rcOfDay(today);
  const dailyTry = state.rcAttempts.filter((a) => a.set === daily.id && a.d === today).pop();
  const vaToday = state.vaAttempts.filter((a) => a.mode === "daily" && a.d === today).pop();
  const best = state.speedRuns.filter((r) => r.recall === 2).reduce((m, r) => Math.max(m, r.wpm), 0);
  const redoDue = dueRedo(state.redo, today).length;
  const redoOpen = state.redo.filter((r) => !r.cleared).length;
  const lastSec = state.sectionals[state.sectionals.length - 1];
  const [hasDraft] = useState(() => !!loadDraft());
  const [kind, setKind] = useState<VaKind | "mix">("mix");
  const [count, setCount] = useState(6);
  const [seed] = useState(uid);
  const tried = new Set(state.rcAttempts.map((a) => a.set));
  const next = RC_CATALOG.filter((s) => !tried.has(s.id) && s.id !== daily.id).slice(0, 3);

  return (
    <Page>
      <PageHeader title="Practice" aside={<StreakBadge />}>
        Exam-style questions written for this site. Every answer is explained, scores go to Progress, and the questions you miss come back in your redo queue.
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel className="md:col-span-2" title={<><span className="block pb-1 text-base font-medium text-muted-foreground">RC of the day, day {dayNumber(today)}</span><Link to={`/practice/rc/${daily.id}`} className="text-[1.75rem] leading-tight font-bold tracking-tight hover:text-primary"><span className="hl">{daily.title}</span></Link></>}
          action={dailyTry
            ? <><LinkButton to={`/practice/rc/${daily.id}?review=${dailyTry.id}`} size="lg">Review your answers</LinkButton><LinkButton to={`/practice/rc/${daily.id}`} size="lg" variant="secondary">Retake</LinkButton></>
            : <LinkButton to={`/practice/rc/${daily.id}`} size="lg">Start the passage</LinkButton>}>
          <p>{GENRES[daily.genre]}, {daily.difficulty}, {daily.words} words, {daily.questions} questions. About 7 minutes.</p>
          {dailyTry ? <p className="text-success">Done today: {dailyTry.c} of {daily.questions} correct.</p> : <p className="text-muted-foreground">The same passage for everyone today. A new one tomorrow.</p>}
        </Panel>
        <Panel title="Daily VA drill" action={<LinkButton to="/practice/va" variant={vaToday ? "secondary" : "default"}>{vaToday ? "Review" : "Start the drill"}</LinkButton>}>
          <p>{DAILY_MIX.length} questions in about 12 minutes: 2 each of para summary, sentence insertion, odd sentence out and para jumbles.</p>
          {vaToday && <p className="text-success">Done today: {vaToday.items.filter((i) => i.ok).length} of {vaToday.items.length} correct.</p>}
        </Panel>
        <Panel title="Timed VARC sectional" action={<>
          <LinkButton to="/practice/sectional" variant="secondary">{hasDraft ? "Resume" : state.sectionals.length ? "Start another" : "Start a sectional"}</LinkButton>
          {lastSec && <LinkButton to={`/practice/sectional/${lastSec.id}`} variant="ghost">Last: {3 * lastSec.c - lastSec.w > 0 ? "+" : ""}{3 * lastSec.c - lastSec.w} of 72</LinkButton>}
        </>}>
          <p>{hasDraft ? "A sectional is in progress, and its clock is running." : "40 minutes, 24 questions, marked the way CAT marks them, on a CAT-style screen."}</p>
        </Panel>
      </div>

      <Section title="More ways to practice">
        <div className="grid gap-4 md:grid-cols-3">
          <Panel title={redoDue ? `${redoDue} to redo today` : "Redo queue"} className={redoDue ? "bg-highlight-soft" : undefined}
            action={(redoDue > 0 || redoOpen > 0) ? <LinkButton to="/practice/redo" variant={redoDue ? "default" : "secondary"}>{redoDue ? "Start" : "See the queue"}</LinkButton> : <Meta>Nothing to redo yet.</Meta>}>
            <p className="text-muted-foreground">Missed questions come back after 1, 3 and 7 days, until you get them right three times in a row.</p>
          </Panel>
          <Panel title="Drill one type" action={<LinkButton to={`/practice/va?type=${kind}&n=${count}&seed=${seed}`}>Start drill</LinkButton>}>
            <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
              <Field label="Type">
                <NativeSelect value={kind} onChange={(e) => setKind(e.target.value as VaKind | "mix")}>
                  <option value="mix">Mixed</option>
                  {(Object.keys(VA_KIND) as VaKind[]).map((k) => <option key={k} value={k}>{VA_KIND[k].label}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Questions">
                <NativeSelect value={count} onChange={(e) => setCount(+e.target.value)}>{[4, 6, 8, 10].map((n) => <option key={n}>{n}</option>)}</NativeSelect>
              </Field>
            </div>
          </Panel>
          <Panel title="Reading speed test" action={<LinkButton to="/practice/speed" variant="secondary">Take the test</LinkButton>}>
            <p className="text-muted-foreground">One timed passage, then two recall questions. CAT needs about 200 words a minute.</p>
            <p>Your best: <b className="font-semibold">{best ? best + " wpm" : "not tested yet"}</b></p>
          </Panel>
        </div>
      </Section>

      <Section title="RC library" action={<TextLink to="/practice/library">All {RC_CATALOG.length} sets</TextLink>} description={`${tried.size} of ${RC_CATALOG.length} tried. Filter by genre and level in the library, and find past RCs of the day there too.`}>
        {next.length > 0 && (
          <ul className="grid gap-3 md:grid-cols-3">
            {next.map((s) => (
              <li key={s.id}>
                <Link to={`/practice/rc/${s.id}`} className="flex h-full flex-col gap-1 rounded-lg bg-card p-5 hover:bg-card/70">
                  <span className="text-sm text-muted-foreground">Not tried yet</span>
                  <span className="text-base font-semibold">{s.title}</span>
                  <Meta>{GENRES[s.genre]}, {s.difficulty}, {s.words} words</Meta>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div><LinkButton to="/practice/library" variant="secondary">Open the library</LinkButton></div>
      </Section>

      <p className="measure text-sm text-muted-foreground">All passages, questions and VA paragraphs here are original practice material written for this site, not real CAT questions. For real past papers, see the Practice tab on the <TextLink to="/varc">VARC page</TextLink>.</p>
    </Page>
  );
}
