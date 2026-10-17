import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { todayIso, uid } from "../../lib/date";
import { useStore } from "../../lib/store";
import { LinkButton, NativeSelect, Page, PageHeader, Section, TextLink } from "../../components/kit";
import { RC_CATALOG } from "../../practice/catalog.gen";
import { dayNumber, rcOfDay } from "../../practice/daily";
import { dueRedo } from "../../practice/redo";
import { loadDraft } from "../../practice/sectional";
import { GENRES } from "../../practice/types";
import { DAILY_MIX, VA_KIND, type VaKind } from "../../practice/va/build";
import { StreakBadge } from "./common";

/** Rows on one sheet, set apart by a hairline of the page's own tone rather than as separate cards. */
function Rows({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col gap-px overflow-hidden rounded-xl bg-background">{children}</ul>;
}

/** One way to practice: what it is on the left, its action on the right. `next` marks the one thing to do now. */
function Row({ title, children, action, next }: { title: ReactNode; children?: ReactNode; action: ReactNode; next?: boolean }) {
  return (
    <li className={cn("relative grid gap-x-8 gap-y-3 bg-card px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6", next && "before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-highlight")}>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="text-heading font-semibold">{title}</h3>
        {children && <div className="measure flex flex-col gap-1 text-base text-muted-foreground">{children}</div>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{action}</div>
    </li>
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
  const untried = RC_CATALOG.filter((s) => !tried.has(s.id) && s.id !== daily.id).slice(0, 3);
  // The first daily task not yet done gets the highlighter and the one filled button.
  const next = !dailyTry ? "rc" : !vaToday ? "va" : redoDue ? "redo" : null;

  return (
    <Page>
      <PageHeader title="Practice" aside={<StreakBadge />}>
        Exam-style questions written for this site. Every answer is explained, scores go to Progress, and the questions you miss come back in your redo queue.
      </PageHeader>

      <Section title="Every day">
        <Rows>
          <Row next={next === "rc"} title={<Link to={`/practice/rc/${daily.id}`} className="hover:text-primary">{daily.title}</Link>}
            action={dailyTry
              ? <><LinkButton to={`/practice/rc/${daily.id}?review=${dailyTry.id}`} variant="secondary">Review your answers</LinkButton><LinkButton to={`/practice/rc/${daily.id}`} variant="ghost">Retake</LinkButton></>
              : <LinkButton to={`/practice/rc/${daily.id}`}>Start the passage</LinkButton>}>
            <p>RC of the day, day {dayNumber(today)}: {GENRES[daily.genre].toLowerCase()}, {daily.difficulty}, {daily.words} words and {daily.questions} questions, about 7 minutes.</p>
            {dailyTry && <p className="text-success">Done today: {dailyTry.c} of {daily.questions} correct.</p>}
          </Row>
          <Row next={next === "va"} title="Daily VA drill"
            action={<LinkButton to="/practice/va" variant={next === "va" ? "default" : "secondary"}>{vaToday ? "Review your answers" : "Start the drill"}</LinkButton>}>
            <p>{DAILY_MIX.length} questions in about 12 minutes: 2 each of para summary, sentence insertion, odd sentence out and para jumbles.</p>
            {vaToday && <p className="text-success">Done today: {vaToday.items.filter((i) => i.ok).length} of {vaToday.items.length} correct.</p>}
          </Row>
          <Row next={next === "redo"} title={redoDue ? `Redo queue, ${redoDue} due today` : "Redo queue"}
            action={redoDue > 0 || redoOpen > 0
              ? <LinkButton to="/practice/redo" variant={next === "redo" ? "default" : "secondary"}>{redoDue ? "Start" : "See the queue"}</LinkButton>
              : <span className="text-base text-muted-foreground">Nothing to redo yet</span>}>
            <p>Missed questions come back after 1, 3 and 7 days, until you get them right three times in a row.</p>
          </Row>
        </Rows>
      </Section>

      <Section title="When you have more time">
        <Rows>
          <Row title="Timed VARC sectional"
            action={<>
              <LinkButton to="/practice/sectional" variant="secondary">{hasDraft ? "Resume" : state.sectionals.length ? "Start another" : "Start a sectional"}</LinkButton>
              {lastSec && <LinkButton to={`/practice/sectional/${lastSec.id}`} variant="ghost">Last: {3 * lastSec.c - lastSec.w > 0 ? "+" : ""}{3 * lastSec.c - lastSec.w} of 72</LinkButton>}
            </>}>
            <p>{hasDraft ? "A sectional is in progress, and its clock is running." : "40 minutes, 24 questions, marked the way CAT marks them, on a CAT-style screen."}</p>
          </Row>
          <Row title="Drill one type"
            action={<>
              <NativeSelect aria-label="Question type" value={kind} onChange={(e) => setKind(e.target.value as VaKind | "mix")} className="w-auto">
                <option value="mix">Mixed types</option>
                {(Object.keys(VA_KIND) as VaKind[]).map((k) => <option key={k} value={k}>{VA_KIND[k].label}</option>)}
              </NativeSelect>
              <NativeSelect aria-label="Number of questions" value={count} onChange={(e) => setCount(+e.target.value)} className="w-auto">
                {[4, 6, 8, 10].map((n) => <option key={n} value={n}>{n} questions</option>)}
              </NativeSelect>
              <LinkButton to={`/practice/va?type=${kind}&n=${count}&seed=${seed}`} variant="secondary">Start drill</LinkButton>
            </>}>
            <p>Practice the VA type that costs you most marks.</p>
          </Row>
          <Row title="Reading speed test" action={<LinkButton to="/practice/speed" variant="secondary">Take the test</LinkButton>}>
            <p>One timed passage, then two recall questions. CAT needs about 200 words a minute. Your best: <b className="font-semibold text-foreground">{best ? best + " wpm" : "not tested yet"}</b>.</p>
          </Row>
        </Rows>
      </Section>

      <Section title="RC library" action={<TextLink to="/practice/library">All {RC_CATALOG.length} sets</TextLink>}
        description={`You have tried ${tried.size} of ${RC_CATALOG.length}.${untried.length ? " Here are the next ones you have not tried." : ""} The library has filters for genre and level, and the past RCs of the day.`}>
        {untried.length > 0 && (
          <Rows>
            {untried.map((s) => (
              <Row key={s.id} title={<Link to={`/practice/rc/${s.id}`} className="hover:text-primary">{s.title}</Link>} action={<LinkButton to={`/practice/rc/${s.id}`} variant="secondary">Start</LinkButton>}>
                <p>{GENRES[s.genre]}, {s.difficulty}, {s.words} words</p>
              </Row>
            ))}
          </Rows>
        )}
      </Section>

      <p className="measure text-sm text-muted-foreground">All passages, questions and VA paragraphs here are original practice material written for this site, not real CAT questions. For real past papers, see the Practice tab on the <TextLink to="/varc">VARC page</TextLink>.</p>
    </Page>
  );
}
