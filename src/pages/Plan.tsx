import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { ErrorText, Field, Meta, NativeSelect, Page, PageHeader, Section, TextLink } from "../components/kit";
import { PHASES, phaseOf } from "../data/exam";
import { addDays, diffDays, DOW, mediumDate, todayIso } from "../lib/date";
import { useStore } from "../lib/store";
import { buildDay, sampleDate } from "../planner/engine";
import { describe, estimate, marks } from "../practice/percentile";
import { LIVE_SECTIONS } from "../sections";
import type { SectionDef } from "../sections/types";
import { TargetNeeds, TargetPicker } from "./tracker/Target";

const PRESETS = [
  { label: "Light", wd: 30, we: 90, note: "30 min weekdays, 1.5 h weekends" },
  { label: "Standard", wd: 60, we: 120, note: "1 h weekdays, 2 h weekends" },
  { label: "Serious", wd: 90, we: 150, note: "1.5 h weekdays, 2.5 h weekends" },
  { label: "Intense", wd: 120, we: 240, note: "2 h weekdays, 4 h weekends" },
];
const parseMin = (v: string) => { const n = parseInt(v, 10); return isNaN(n) || n < 0 || n > 600 ? null : n; };
const hours = (m: number) => (m / 60).toFixed(1).replace(/\.0$/, "") + " h";

/** The percentile the student aims for in VARC, what it takes, and where their latest results put them. */
function TargetCard() {
  const { state } = useStore();
  const recent = state.mocks.map((x, i) => ({ x, i })).filter((o) => o.x.sec === "VARC")
    .sort((a, b) => (a.x.d < b.x.d ? -1 : a.x.d > b.x.d ? 1 : a.i - b.i)).slice(-3).map((o) => o.x);
  const avg = recent.length ? recent.reduce((s, m) => s + marks(m.c, m.w), 0) / recent.length : 0;
  return (
    <Section title="Your VARC target" description="The percentile you are aiming for. Progress draws what it takes on your mock chart.">
      <div className="flex flex-col gap-4 rounded-lg bg-card p-5 sm:p-6">
        <TargetPicker />
        <TargetNeeds pct={state.targets.varc} />
        {recent.length > 0
          ? <p className="measure text-base">Your last {recent.length === 1 ? "result is" : `${recent.length} results average`} <b className="font-semibold">{Math.round(avg)} marks</b>, {describe(estimate(avg))}.</p>
          : <p className="measure text-base text-muted-foreground">Log a paper, a mock or a timed sectional and your estimated percentile shows here.</p>}
        <div><TextLink to="/progress">Open the percentile estimator in Progress</TextLink></div>
      </div>
    </Section>
  );
}

function TimeCard({ sec }: { sec: SectionDef }) {
  const { state, update } = useStore();
  const s = state.settings[sec.id];
  const [err, setErr] = useState("");
  const [showDow, setShowDow] = useState(s.dow.some((x) => x !== null));
  const week = [0, 1, 2, 3, 4, 5, 6].reduce((t, g) => t + (s.dow[g] ?? (g === 0 || g === 6 ? s.we : s.wd)), 0);
  const preset = PRESETS.find((p) => s.wd === p.wd && s.we === p.we && !s.dow.some((x) => x !== null))?.label ?? "";

  const set = (k: "wd" | "we", v: string) => {
    const n = parseMin(v);
    if (n === null) { setErr("Enter minutes from 0 to 600."); return; }
    setErr(""); update((st) => { st.settings[sec.id][k] = n; });
  };
  const setDow = (g: number, v: string) => {
    if (v === "") { update((st) => { st.settings[sec.id].dow[g] = null; }); return; }
    const n = parseMin(v);
    if (n === null) { setErr("Enter minutes from 0 to 600."); return; }
    setErr(""); update((st) => { st.settings[sec.id].dow[g] = n; });
  };

  return (
    <Section title={`Your usual ${sec.short} time`} description={`That is ${week} minutes, about ${hours(week)}, of ${sec.short} a week. A day you change on Today keeps its own time.`}>
      <div className="flex flex-col gap-6 rounded-lg bg-card p-5 sm:p-6">
        <ToggleGroup type="single" value={preset} onValueChange={(v) => { const p = PRESETS.find((x) => x.label === v); if (p) update((st) => { st.settings[sec.id] = { wd: p.wd, we: p.we, dow: [null, null, null, null, null, null, null] }; }); }}
          className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Presets">
          {PRESETS.map((p) => (
            <ToggleGroupItem key={p.label} value={p.label} className="h-auto min-w-0 flex-col items-start gap-0.5 rounded-lg bg-secondary px-4 py-3 text-left whitespace-normal data-[state=on]:bg-foreground data-[state=on]:text-background">
              <span className="text-base font-semibold">{p.label}</span><span className="text-sm opacity-75">{p.note}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Monday to Friday, minutes"><Input key={"wd" + s.wd} type="number" inputMode="numeric" min={0} max={600} step={5} defaultValue={s.wd} onBlur={(e) => set("wd", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") set("wd", e.currentTarget.value); }} /></Field>
          <Field label="Saturday and Sunday, minutes"><Input key={"we" + s.we} type="number" inputMode="numeric" min={0} max={600} step={5} defaultValue={s.we} onBlur={(e) => set("we", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") set("we", e.currentTarget.value); }} /></Field>
        </div>
        <Button variant="link" size="sm" className="self-start" onClick={() => setShowDow(!showDow)}>{showDow ? "Hide the days of the week" : "Set a different time for single days of the week"}</Button>
        {showDow && (
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
            {[1, 2, 3, 4, 5, 6, 0].map((g) => (
              <Field key={g} label={DOW[g].slice(0, 3)}>
                <Input key={g + ":" + s.dow[g]} type="number" inputMode="numeric" min={0} max={600} step={5} placeholder={String(g === 0 || g === 6 ? s.we : s.wd)} defaultValue={s.dow[g] ?? ""} onBlur={(e) => setDow(g, e.target.value)} />
              </Field>
            ))}
          </div>
        )}
        <ErrorText>{err}</ErrorText>
      </div>
    </Section>
  );
}

function RangeCard() {
  const { update } = useStore();
  const t = todayIso();
  const [from, setFrom] = useState(t);
  const [to, setTo] = useState(addDays(t, 6));
  const [min, setMin] = useState("30");
  const [sec, setSec] = useState(LIVE_SECTIONS[0]?.id ?? "varc");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const apply = (reset: boolean) => {
    const n = parseMin(min);
    if (!from || !to || to < from) { setMsg({ ok: false, text: "Pick a start date and an end date after it." }); return; }
    if (!reset && n === null) { setMsg({ ok: false, text: "Enter minutes from 0 to 600." }); return; }
    const days = diffDays(from, to) + 1;
    if (days > 120) { setMsg({ ok: false, text: "Pick a range of 120 days or less." }); return; }
    update((st) => {
      for (let i = 0; i < days; i++) {
        const d = addDays(from, i), r = (st.days[d] ??= {});
        r.min ??= {};
        if (reset) delete r.min[sec]; else r.min[sec] = n!;
      }
    });
    setMsg({ ok: true, text: reset ? "Usual times restored for " + days + " days." : "Set " + n + " min for " + days + " days, " + mediumDate(from) + " to " + mediumDate(to) + "." });
  };
  return (
    <Section title="Set time for a date range" description="For an exam week, a trip or a work deadline, lower or raise every day at once. Use 0 for rest days.">
      <div className="flex flex-col gap-5 rounded-lg bg-card p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          {LIVE_SECTIONS.length > 1 && <Field label="Section"><NativeSelect value={sec} onChange={(e) => setSec(e.target.value as typeof sec)}>{LIVE_SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.short}</option>)}</NativeSelect></Field>}
          <Field label="Minutes a day"><Input type="number" inputMode="numeric" min={0} max={600} step={5} value={min} onChange={(e) => setMin(e.target.value)} /></Field>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => apply(false)}>Apply to these days</Button>
          <Button variant="secondary" onClick={() => apply(true)}>Restore usual times</Button>
        </div>
        {msg && <p className={cn("text-base", msg.ok ? "text-success" : "text-danger")} role="status">{msg.text}</p>}
      </div>
    </Section>
  );
}

function PhaseCard({ id, sec }: { id: number; sec: SectionDef }) {
  const { state } = useStore();
  const t = todayIso();
  const p = PHASES.find((x) => x.id === id)!;
  const cur = phaseOf(t);
  const isNow = cur.kind === "phase" && cur.phase.id === id;
  const s = state.settings[sec.id];
  const wd = buildDay(sec, state, sampleDate(id, false, t), s.wd, { today: t, noCarry: true });
  const we = buildDay(sec, state, sampleDate(id, true, t), s.we, { today: t, noCarry: true });
  const text = sec.phaseText?.[id];
  const list = (bl: typeof wd) => bl.length
    ? bl.map((b) => <li key={b.key} className="flex justify-between gap-4 py-1.5"><span>{b.name.replace(/: CAT \d{4} Slot \d$/, "")}</span><span className="text-muted-foreground tabular-nums whitespace-nowrap">{b.mins} min</span></li>)
    : <li className="py-1.5 text-muted-foreground">Rest</li>;
  return (
    <article className={cn("relative flex flex-col gap-5 overflow-hidden rounded-lg bg-card p-5 sm:p-6", isNow && "before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-highlight")}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="flex items-center gap-2.5 text-heading font-semibold">{p.id}. {p.name}{isNow && <Badge variant="highlight">Now</Badge>}</h3>
        <Meta>{mediumDate(p.start)} to {mediumDate(p.end)}</Meta>
      </div>
      {text && <p className="measure text-base">{text.goal}</p>}
      <div className="grid gap-6 md:grid-cols-2">
        <div><p className="pb-1 text-sm font-medium text-muted-foreground">A typical weekday, {s.wd} min</p><ul className="text-base">{list(wd)}</ul></div>
        <div><p className="pb-1 text-sm font-medium text-muted-foreground">A typical {id >= 2 && id <= 4 ? "Saturday" : "weekend day"}, {s.we} min</p><ul className="text-base">{list(we)}</ul></div>
      </div>
      {text && <p className="measure rounded-md bg-muted px-4 py-3 text-base"><b className="font-semibold">Suggested checkpoint.</b> {text.check}</p>}
    </article>
  );
}

export default function Plan() {
  const t = todayIso();
  const lateStart = phaseOf(t).kind === "phase" && t > PHASES[0].end;
  return (
    <Page>
      <PageHeader title="Plan and time">Five phases to CAT 2027. Each day's timetable is built from the phase you are in and the time you have that day. Change your usual time here, or change a single day on Today.</PageHeader>
      {lateStart && <p className="measure rounded-lg bg-warning-soft px-5 py-4 text-base">Starting after January? You join the plan at the current phase. Spend your first two weeks on the Foundation reading routine alongside it, and use the Learn tab to cover the question types you missed.</p>}
      <TargetCard />
      {LIVE_SECTIONS.map((s) => <TimeCard key={s.id} sec={s} />)}
      <RangeCard />
      <Section title="How the timetable adapts">
        <div className="measure flex flex-col gap-3 text-base">
          <p><b className="font-semibold">Less or more time.</b> Every block has a usual length and a minimum. With less time, low-priority blocks drop out first and the core task stays. With more time, blocks grow to their usual length, then extra blocks are added.</p>
          <p><b className="font-semibold">Mock and paper analysis.</b> Spend 1.5 to 2 times the test time on analysis. For each wrong or skipped question, add an Error log entry with the question type, why the trap worked and the right reasoning.</p>
          <p><b className="font-semibold">Missed days.</b> If you skip a day's core task, it moves to your next session as a catch-up block. Nothing else carries over.</p>
        </div>
      </Section>
      {LIVE_SECTIONS.map((sec) => (
        <Section key={sec.id} title={`${sec.short} phases`}>
          <div className="flex flex-col gap-3">{PHASES.map((p) => <PhaseCard key={p.id} id={p.id} sec={sec} />)}</div>
        </Section>
      ))}
    </Page>
  );
}
