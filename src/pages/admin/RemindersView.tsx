import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Field, Section, Stat, Tnum } from "../../components/kit";
import { NativeSelect } from "../../components/Select";
import { markBounced, REMINDER_KIND, reminderStats, sendTestReminder, type ReminderStats } from "../../lib/admin";

const n = (x: number) => x.toLocaleString("en-IN");
/** A count in even-width digits; Tnum keeps the comma its own width ("1,204", not "1 ,204"). */
const N = ({ v }: { v: number }) => <Tnum>{n(v)}</Tnum>;
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");
const TR = "border-t align-top"; // taste-skill-ignore: rows of a real table

/**
 * Study reminders on the admin page (F65 R2, D97, docs/design/notifications.md §15.3): how they are set up, who has
 * what switched on, and the last 14 days, as counts; and, for admins, a test of any wording to your own inbox and the
 * fallback for a bounce Google did not name.
 */
export default function RemindersView({ canManage }: { canManage: boolean }) {
  const [s, setS] = useState<ReminderStats | null>(null);
  const [err, setErr] = useState("");
  const load = () => void reminderStats().then((r) => (r.ok ? setS(r.data) : setErr(r.message)));
  useEffect(load, []);
  if (err) return <p className="text-base" role="alert">{err}</p>;
  if (!s) return <Skeleton className="h-64 w-full" />;
  const u = s.setup;
  const status = !u.worker ? "The reminder job is not running on this server." : u.dry ? "Dry run: the job plans and renders, and sends nothing." : "The job is running and sending.";
  const on = [u.email && "email", u.push && "push", u.bounceCheck && "the bounce check"].filter(Boolean).join(", ");
  const kinds = s.kinds ?? [];
  return (
    <div className="flex flex-col gap-8">
      <p className="text-base">
        <b className="font-semibold">{status}</b>{" "}
        <span className="text-muted-foreground">{on ? `On: ${on}.` : "No channel is on."} {n(s.emailsLastDay)} of {n(u.emailCap)} emails used in the last day.</span>
      </p>

      <Section title="Students">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-lg bg-card p-5 sm:grid-cols-3 sm:p-6">
          {([[s.students.remindersOn, "Reminders on"], [s.students.weeklyOn, "Weekly review on"], [s.students.emailOn, "Email on"],
            [s.students.pushDevices, "Devices with push"], [s.students.paused, "Paused"], [s.students.bounced, "Email bounced"]] as [number, string][])
            .map(([v, l]) => <Stat key={l} value={n(v)} label={l} />)}
        </div>
      </Section>

      <Section title="The last 14 days" description="Practised means practice within two hours of a message that was sent.">
        {kinds.length ? (
          <>
          <div className="overflow-x-auto rounded-lg bg-card max-sm:hidden">
            <table className="w-full text-left text-base">
              <thead><tr>{["Message", "By", "Sent", "Skipped", "Failed", "Practised"].map((h, i) => <th key={h} className={cn("px-4 pt-4 pb-2 text-sm font-medium whitespace-nowrap text-muted-foreground", i > 1 && "text-right")}>{h}</th>)}</tr></thead>
              <tbody>
                {kinds.map((k) => (
                  <tr key={k.kind + k.channel} className={TR}>
                    <td className="px-4 py-3">{REMINDER_KIND[k.kind] ?? k.kind}</td>
                    <td className="px-4 py-3">{k.channel === "email" ? "Email" : "Push"}</td>
                    <td className="px-4 py-3 text-right"><N v={k.sent} /></td>
                    <td className="px-4 py-3 text-right"><N v={k.skipped} /></td>
                    <td className="px-4 py-3 text-right"><N v={k.failed} /></td>
                    <td className="px-4 py-3 text-right whitespace-nowrap"><N v={k.practised} /> <span className="text-muted-foreground">({pct(k.practised, k.sent)})</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* A phone: one short entry a row, as the site's other wide tables do. */}
          <ul className="flex flex-col gap-px overflow-hidden rounded-lg bg-background sm:hidden">
            {kinds.map((k) => (
              <li key={k.kind + k.channel} className="flex flex-col gap-0.5 bg-card px-4 py-3.5">
                <span className="text-base font-semibold">{REMINDER_KIND[k.kind] ?? k.kind}, by {k.channel}</span>
                <span className="text-base"><N v={k.sent} /> sent, <N v={k.skipped} /> skipped, <N v={k.failed} /> failed</span>
                <span className="text-base text-muted-foreground"><N v={k.practised} /> practised ({pct(k.practised, k.sent)})</span>
              </li>
            ))}
          </ul>
          </>
        ) : <p className="rounded-lg bg-card px-5 py-4 text-base text-muted-foreground">No reminders in the last 14 days.</p>}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-lg bg-card p-5">
            <h3 className="text-base font-semibold">Sent each day</h3>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-base">
              {(s.days ?? []).map((d) => <li key={d.day} className="flex justify-between gap-3"><span className="text-muted-foreground">{d.day.slice(5)}</span><N v={d.sent} /></li>)}
            </ul>
          </div>
          <div className="flex flex-col gap-2 rounded-lg bg-card p-5">
            <h3 className="text-base font-semibold">Why messages were skipped</h3>
            {s.skips?.length ? (
              <ul className="flex flex-col gap-1 text-base">{s.skips.map((k) => <li key={k.reason} className="flex justify-between gap-3"><span>{k.reason}</span><N v={k.n} /></li>)}</ul>
            ) : <p className="text-base text-muted-foreground">None skipped.</p>}
          </div>
        </div>
      </Section>

      <Section title="Bounces and unsubscribes" description="Bounces over 30 days, read from the team inbox's label; unsubscribes over 14 days, from email links.">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-lg bg-card p-5 sm:grid-cols-4 sm:p-6">
          <Stat value={n(s.bounces.read)} label="Bounces read" />
          <Stat value={n(s.bounces.matched)} label="Matched a student" />
          <Stat value={n(s.unsubscribes.reminders)} label="Left reminder email" />
          <Stat value={n(s.unsubscribes.weekly)} label="Left the weekly review" />
        </div>
      </Section>

      {canManage && <TestSend wordings={s.wordings ?? []} />}
      {canManage && <MarkBounced onDone={load} />}
    </div>
  );
}

/** Any wording, with sample figures, to your own address and devices; marked "Test:". */
function TestSend({ wordings }: { wordings: { kind: string; ids: string[] }[] }) {
  const [kind, setKind] = useState(wordings[0]?.kind ?? "");
  const ids = wordings.find((w) => w.kind === kind)?.ids ?? [];
  const [id, setId] = useState(ids[0] ?? "");
  const [busy, setBusy] = useState(false);
  if (!wordings.length) return (
    <Section title="Send me a test"><p className="text-base text-muted-foreground">Neither email nor push is set up on this server, so a test cannot be sent from here.</p></Section>
  );
  const send = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await sendTestReminder(kind, id || ids[0]);
    setBusy(false);
    if (r.ok) toast(`Sent by ${r.data.channels.join(" and ")} to ${r.data.to}.`);
    else toast(r.message);
  };
  return (
    <Section title="Send me a test" description="Any wording with sample figures, to your own address and devices, marked Test. At most ten an hour.">
      <form onSubmit={send} className="flex flex-col gap-4 rounded-lg bg-card p-5 sm:flex-row sm:items-end sm:p-6">
        <Field label="Message" className="sm:w-56">
          <NativeSelect value={kind} onChange={(e) => { const k = e.target.value; setKind(k); setId(wordings.find((w) => w.kind === k)?.ids[0] ?? ""); }}>
            {wordings.map((w) => <option key={w.kind} value={w.kind}>{REMINDER_KIND[w.kind] ?? w.kind}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Wording" className="sm:w-56">
          <NativeSelect value={id || ids[0]} onChange={(e) => setId(e.target.value)}>{ids.map((x) => <option key={x}>{x}</option>)}</NativeSelect>
        </Field>
        <Button type="submit" disabled={busy}>{busy ? "Sending…" : "Send me a test"}</Button>
      </form>
    </Section>
  );
}

/** The fallback when a bounce did not name the address: email stops for that student until they turn it on again. */
function MarkBounced({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const mark = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await markBounced(email);
    setBusy(false);
    if (!r.ok) { toast(r.message); return; }
    toast(r.data.marked ? "Marked. Email stops for that student until they turn it on again." : "No student with reminder email uses that address.");
    if (r.data.marked) { setEmail(""); onDone(); }
  };
  return (
    <Section title="Mark an address bounced" description="Only when a bounce in the team inbox did not name the address. The audit log keeps the count, not the address.">
      <form onSubmit={mark} className="flex flex-col gap-4 rounded-lg bg-card p-5 sm:flex-row sm:items-end sm:p-6">
        <Field label="Address that bounced" className="sm:flex-1">
          <Input type="email" required autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        </Field>
        <Button type="submit" variant="secondary" disabled={busy || !email.includes("@")}>Mark bounced</Button>
      </form>
    </Section>
  );
}
