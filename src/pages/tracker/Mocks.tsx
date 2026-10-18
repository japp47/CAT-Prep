import { MockChart } from "../../components/Chart";
import { Meta, Section, Stat } from "../../components/kit";
import { useStore } from "../../lib/store";
import { sectionByLabel } from "../../sections";
import { targetBand } from "../../practice/percentile";
import { Estimator, TargetNeeds, TargetPicker } from "./Target";

export function Mocks({ sec }: { sec: string }) {
  const { state } = useStore();
  const def = sectionByLabel(sec);
  const varc = sec === "VARC";
  const mocksAsc = state.mocks.map((x, i) => ({ x, i })).filter((o) => o.x.sec === sec)
    .sort((a, b) => (a.x.d < b.x.d ? -1 : a.x.d > b.x.d ? 1 : a.i - b.i)).map((o) => o.x);
  const n = mocksAsc.length;
  const best = mocksAsc.reduce((m, x) => Math.max(m, x.c), 0);
  const last3 = mocksAsc.slice(-3), avg = last3.length ? last3.reduce((a, x) => a + x.c, 0) / last3.length : 0;
  const band: [number, number] = varc ? targetBand(state.targets.varc, def.maxQ) : [Math.round(def.maxQ * 0.55), Math.round(def.maxQ * 0.68)];
  const hit = mocksAsc.filter((x) => x.c >= band[0] && x.w <= 3).length;
  const last = mocksAsc[n - 1];

  return (
    <div className="flex flex-col gap-12">
      {varc && (
        <Section title="Your target" description="The percentile you are aiming for in VARC. The chart below shades the right answers it takes, and Plan shows it too.">
          <div className="flex flex-col gap-4 rounded-lg bg-card p-5 sm:p-6">
            <TargetPicker />
            <TargetNeeds pct={state.targets.varc} />
          </div>
        </Section>
      )}

      <Section title={`${sec} correct answers over time`}>
        <div className="flex flex-col gap-4 rounded-lg bg-card p-5 sm:p-6">
          <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <li className="inline-flex items-center gap-2"><i className="h-2 w-4 rounded-sm bg-primary" />Correct</li>
            <li className="inline-flex items-center gap-2"><i className="h-2 w-4 rounded-sm bg-danger/50" />Wrong MCQ</li>
            <li className="inline-flex items-center gap-2"><i className="h-2 w-4 rounded-sm bg-success/30" />Target, {band[0]} to {band[1]} correct</li>
          </ul>
          <MockChart data={mocksAsc.slice(-20)} max={def.maxQ} band={band} />
          {n ? (
            <div className="flex flex-wrap gap-x-12 gap-y-3">
              <Stat value={n} label="Results" /><Stat value={best} label="Best, correct" /><Stat value={avg.toFixed(1)} label="Last 3, average" /><Stat value={`${hit} of ${n}`} label="On target" />
            </div>
          ) : <Meta>No {sec} results yet. Log a paper or mock in the Log tab, or take a timed sectional in Practice.</Meta>}
          {!varc && <Meta>The {sec} target band is a rough placeholder until the {sec} plan launches.</Meta>}
        </div>
      </Section>

      {varc ? (
        <Section title="Percentile estimator" description="Turns a score into a percentile. Your last logged result is filled in.">
          <Estimator last={last ? { c: last.c, w: last.w } : undefined} />
        </Section>
      ) : (
        <Meta>Percentile tables for {sec} arrive with the {sec} plan.</Meta>
      )}
    </div>
  );
}
