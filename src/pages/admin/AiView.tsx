import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Section, Stat, Tnum } from "../../components/kit";
import { aiPanel, type AiModelStatus, type AiPanel } from "../../lib/admin";

const n = (x: number) => x.toLocaleString("en-IN");
const N = ({ v }: { v: number }) => <Tnum>{n(v)}</Tnum>;
const time = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "");
const TASK: Record<string, string> = { explain: "Explain my mistake", summary: "Summary second opinion" };
const TR = "border-t align-top"; // taste-skill-ignore: rows of a real table

/**
 * AI on the admin page (D102, docs/design/explain-mistake.md, "Models and keys"): which model each task tries first,
 * which are resting after a limit or an error, how many keys work, and the last seven days per model. Counts only.
 * Read-only: the order is changed on Render (AI_EXPLAIN, AI_SUMMARY), the models in server/internal/ai/models.json.
 */
export default function AiView() {
  const [s, setS] = useState<AiPanel | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { void aiPanel().then((r) => (r.ok ? setS(r.data) : setErr(r.message))); }, []);
  if (err) return <p className="text-base" role="alert">{err}</p>;
  if (!s) return <Skeleton className="h-64 w-full" />;
  const r = s.router;
  const byName = new Map((r?.models ?? []).map((m) => [m.name, m]));
  return (
    <div className="flex flex-col gap-8">
      <p className="text-base">
        <b className="font-semibold">{s.on ? "AI is on." : "AI is off on this server."}</b>{" "}
        <span className="text-muted-foreground">{s.on ? `${n(s.usedToday)} of ${n(s.budget)} tokens used today; ${s.perStudent} new answers a student a day.` : "Set AI_ENABLED=1 and the provider's keys on Render."}</span>
      </p>

      {r && (
        <Section title="Models, in the order each task tries them" description="When a model is over its limit it rests for as long as the provider asks, and the next one answers.">
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(r.tasks).map(([task, names]) => (
              <div key={task} className="flex flex-col gap-3 rounded-lg bg-card p-5">
                <h3 className="text-base font-semibold">{TASK[task] ?? task}</h3>
                <ol className="flex flex-col gap-3">
                  {names.map((name, i) => <ModelRow key={name} m={byName.get(name)} name={name} first={i === 0} />)}
                </ol>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">To change the order, set AI_EXPLAIN or AI_SUMMARY on Render (names from server/internal/ai/models.json, comma separated). Render restarts the API with it.</p>
        </Section>
      )}

      {r && (
        <Section title="Keys" description="Shown by count, never by their text. A refused key rests for an hour and the next one is used.">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-lg bg-card p-5 sm:grid-cols-3 sm:p-6">
            {r.providers.filter((p) => p.keysEnv).map((p) => <Stat key={p.name} value={`${p.working} of ${p.keys}`} label={`${p.name} keys working (${p.keysEnv})`} />)}
          </div>
        </Section>
      )}

      <Section title="The last seven days" description="Answered calls, replies the check refused, calls over a limit, and other failures.">
        {s.days.length ? (
          <>
            <div className="overflow-x-auto rounded-lg bg-card max-sm:hidden">
              <table className="w-full text-left text-base">
                <thead><tr>{["Day", "Model", "Answered", "Refused", "Limited", "Failed", "Tokens"].map((h, i) => <th key={h} className={cn("px-4 pt-4 pb-2 text-sm font-medium whitespace-nowrap text-muted-foreground", i > 1 && "text-right")}>{h}</th>)}</tr></thead>
                <tbody>
                  {s.days.map((d) => (
                    <tr key={d.day + d.model} className={TR}>
                      <td className="px-4 py-3 whitespace-nowrap">{d.day.slice(5)}</td>
                      <td className="px-4 py-3">{d.model}</td>
                      {[d.answered, d.refused, d.limited, d.failed, d.tokens].map((v, i) => <td key={i} className="px-4 py-3 text-right"><N v={v} /></td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="flex flex-col gap-px overflow-hidden rounded-lg bg-background sm:hidden">
              {s.days.map((d) => (
                <li key={d.day + d.model} className="flex flex-col gap-0.5 bg-card px-4 py-3.5">
                  <span className="text-base font-semibold">{d.model}, {d.day.slice(5)}</span>
                  <span className="text-base"><N v={d.answered} /> answered, <N v={d.refused} /> refused, <N v={d.limited} /> limited, <N v={d.failed} /> failed</span>
                  <span className="text-base text-muted-foreground"><N v={d.tokens} /> tokens</span>
                </li>
              ))}
            </ul>
          </>
        ) : <p className="rounded-lg bg-card px-5 py-4 text-base text-muted-foreground">No AI calls in the last seven days.</p>}
      </Section>
    </div>
  );
}

function ModelRow({ m, name, first }: { m?: AiModelStatus; name: string; first: boolean }) {
  const state = !m ? "" : m.state === "resting" ? `Resting until ${time(m.until)}` : m.state === "no key" ? "No key set" : first ? "Ready, answers first" : "Ready";
  return (
    <li className="flex flex-col gap-0.5">
      <span className="text-base"><span className="font-medium">{name}</span> <span className="text-muted-foreground">{m?.id}</span></span>
      <span className={cn("text-sm", m?.state === "ready" ? "text-success" : "text-muted-foreground")}>{state}{m?.lastOk ? `, last answer at ${time(m.lastOk)}` : ""}</span>
      {m?.lastError && <span className="text-sm text-muted-foreground">Last problem at {time(m.lastErrorAt)}: {m.lastError}</span>}
    </li>
  );
}
