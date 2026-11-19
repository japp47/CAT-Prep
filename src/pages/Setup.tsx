import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Page, PageHeader, Segmented } from "../components/kit";
import { YearSwitch } from "../components/YearSwitch";
import { todayIso } from "../lib/date";
import { useRoad } from "../lib/useRoad";
import { useStore } from "../lib/store";
import { fitPlan, TIME_BY_WORK, WD_CHOICES, WE_CHOICES, why, type Answers, type Stand, type Work } from "../planner/fit";
import { LIVE_SECTIONS, SECTION_BY_ID } from "../sections";
import type { SectionId } from "../sections/types";

const LIVE = LIVE_SECTIONS.map((s) => s.id);
const short = (id: SectionId) => SECTION_BY_ID[id].short;

/**
 * A plan that fits you, part 1 (F82, D116; docs/design/personal-plan.md): four questions on one page, each with an
 * answer already chosen, and the plan beside them changing as the student taps. "Use this plan" writes each live
 * section's usual minutes; "Keep the standard plan" changes nothing but remembers the choice, so it is not offered again.
 */
export default function Setup() {
  const { state, update } = useStore();
  const road = useRoad();
  const nav = useNavigate();
  const a = state.about;
  const done = !!a.setup && !a.setup.skipped;
  // Back to change it: the answers given; the times as set now, when they are among the choices.
  const now = (k: "wd" | "we") => LIVE.reduce((s, id) => s + state.settings[id][k], 0);
  const work0: Work = a.work ?? "studying";
  const [ans, setAns] = useState<Answers>(() => ({
    work: work0,
    wd: done && WD_CHOICES.includes(now("wd")) ? now("wd") : TIME_BY_WORK[work0].wd,
    we: done && WE_CHOICES.includes(now("we")) ? now("we") : TIME_BY_WORK[work0].we,
    stand: a.level ?? (a.attempt === "repeat" ? "repeat" : "new"),
    weak: a.weak && LIVE.includes(a.weak) ? a.weak : null,
  }));
  // Times follow the days answer until the student picks a time themselves.
  const [timeTouched, setTimeTouched] = useState(done);
  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => setAns((x) => ({ ...x, [k]: v }));
  const setWork = (w: Work) => setAns((x) => ({ ...x, work: w, ...(timeTouched ? {} : TIME_BY_WORK[w]) }));
  const plan = fitPlan(ans, LIVE);
  const hadDays = LIVE.some((id) => state.settings[id].dow.some((m) => m !== null));

  const use = () => {
    update((st) => {
      for (const id of LIVE) st.settings[id] = { wd: plan.minutes[id].wd, we: plan.minutes[id].we, dow: [null, null, null, null, null, null, null] };
      st.about.work = ans.work;
      if (ans.stand === "unsure") delete st.about.level; else st.about.level = ans.stand;
      if (ans.stand === "repeat") st.about.attempt = "repeat";
      else if (ans.stand === "new") st.about.attempt = "first";
      if (ans.weak) st.about.weak = ans.weak; else delete st.about.weak;
      st.about.setup = { at: todayIso() };
    });
    nav(plan.first.kind === "today" ? "/today" : plan.first.to);
  };
  const skip = () => {
    update((st) => { if (!st.about.setup) st.about.setup = { at: todayIso(), skipped: true }; });
    nav("/today");
  };

  return (
    <Page>
      <PageHeader title="Make your plan">
        Four questions, about a minute. Your answers set how long each section gets and where you start; change any of it later on You.
      </PageHeader>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,24rem)] lg:gap-12">
        <div className="flex min-w-0 flex-col gap-8">
          <p className="text-base text-foreground/85">Preparing for <YearSwitch label={`Your exam: ${road.name}. Change it`}>{road.name}</YearSwitch></p>

          <Question title="How do your days look?">
            <Segmented label="How do your days look?" value={ans.work} onChange={setWork}
              options={[["studying", "Studying"], ["working", "Working"], ["both", "Both"]]} />
          </Question>

          <Question title="Time you can give" hint="Start with what you can keep up on a busy day; you can add more any time.">
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">On a weekday</span>
              <Segmented label="Minutes on a weekday" value={String(ans.wd)} onChange={(v) => { setTimeTouched(true); set("wd", Number(v)); }}
                options={WD_CHOICES.map((m) => [String(m), `${m} min`] as [string, string])} />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">On a weekend day</span>
              <Segmented label="Minutes on a weekend day" value={String(ans.we)} onChange={(v) => { setTimeTouched(true); set("we", Number(v)); }}
                options={WE_CHOICES.map((m) => [String(m), m < 120 ? `${m} min` : `${m / 60} h`] as [string, string])} />
            </div>
          </Question>

          <Question title="Where do you stand?" hint="This sets where you start, not how hard the plan is; your practice will show the rest.">
            <Segmented<Stand> label="Where do you stand?" value={ans.stand} onChange={(v) => set("stand", v)}
              options={[["new", "Just starting"], ["some", "Prepared before"], ["repeat", "Taken CAT before"], ["unsure", "Not sure"]]} />
          </Question>

          {LIVE.length > 1 && (
            <Question title="Which section feels hardest?" hint="It gets a little more of each day. The others never drop below 15 minutes.">
              <Segmented<string> label="Which section feels hardest?" value={ans.weak ?? "none"} onChange={(v) => set("weak", v === "none" ? null : (v as SectionId))}
                options={[...LIVE.map((id) => [id, short(id)] as [string, string]), ["none", "Not sure"]]} />
            </Question>
          )}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-8" aria-label="Your plan">
          <section className="flex flex-col gap-4 rounded-2xl bg-card p-5 sm:p-6" aria-live="polite">
            <h2 className="text-heading font-semibold">Your plan</h2>
            <Day label="Weekdays" total={ans.wd} parts={LIVE.map((id) => [short(id), plan.minutes[id].wd])} />
            <Day label="Weekends" total={ans.we} parts={LIVE.map((id) => [short(id), plan.minutes[id].we])} />
            <div className="flex flex-col gap-1 rounded-lg bg-muted/60 px-4 py-3">
              <span className="text-sm text-muted-foreground">You start with</span>
              <span className="text-base"><mark className="hl font-semibold text-foreground">{plan.first.label}</mark></span>
            </div>
            {why(ans.work, ans.weak && short(ans.weak)) && <p className="text-sm text-muted-foreground">Because: {why(ans.work, ans.weak && short(ans.weak))}.</p>}
          </section>
          {done && hadDays && <p className="text-sm text-muted-foreground">This replaces the times you set for single days of the week on Plan.</p>}
          <Button size="lg" className="w-full" onClick={use}>Use this plan</Button>
          {!done && (
            <button type="button" onClick={skip} className="self-center text-base font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary">
              Keep the standard plan
            </button>
          )}
        </aside>
      </div>
    </Page>
  );
}

function Question({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** One kind of day in the plan: its total, and each section's minutes. */
function Day({ label, total, parts }: { label: string; total: number; parts: [string, number][] }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="flex items-baseline justify-between gap-3"><span className="text-base font-semibold">{label}</span><span className="text-base tabular-nums">{total} min</span></p>
      <p className="text-base text-muted-foreground">{parts.map(([n, m]) => `${n} ${m} min`).join(", ")}</p>
    </div>
  );
}
