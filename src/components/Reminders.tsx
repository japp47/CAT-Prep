import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { API_ENABLED } from "../lib/api";
import { DOW, mediumDate } from "../lib/date";
import { browserZone, daysLine, fromClock, loadReminders, pausedUntil, pushHere, pushSupport, saveReminders, spokenTime, toClock, toggleDay, turnOnPush, whereLine, type EmailMode, type ReminderPrefs } from "../lib/notify";
import { usePref } from "../lib/prefs";
import { useReminderPrefs } from "../lib/reminders";
import { loadLedger } from "../lib/sync/ledger";
import { LinkButton, Switch, TextLink } from "./kit";
import { ChannelList, silent } from "./ReminderControls";
import { Card, Row } from "./SettingRows";

/**
 * Study reminders (docs/feature.md F65), redesigned 7 Nov 2026. The card used to ask seven questions at once, each
 * with its own paragraph; on a phone that was five screens of grey text for one decision. Now it opens with the
 * promise in a sentence and one switch, then where reminders go as a row per channel, and keeps the time, days,
 * quiet hours and pause behind a disclosure. The same rows serve the bell panel (components/ReminderPanel.tsx).
 */

const CHANNEL = { push: "a notification", email: "email" } as const;
const WEEK = 7 * 864e5;

export function RemindersCard() {
  const r = useReminderPrefs();
  const { phase, prefs, msg } = r;
  // The time lives behind the disclosure, and the time in the sentence above opens it and lands on the field.
  const [open, setOpen] = usePref("reminderDetails", false);
  const time = useRef<HTMLInputElement>(null);
  // The field is inside the disclosure, so the focus waits for the open state to put it on the page.
  const wanted = useRef(false);
  const editTime = () => { if (open) time.current?.focus(); else { wanted.current = true; setOpen(true); } };
  useEffect(() => {
    if (!open || !wanted.current) return;
    wanted.current = false;
    time.current?.focus();
  }, [open]);
  // Students never see a feature the server has not switched on; a development build says why it is missing.
  if (!API_ENABLED || (phase === "unavailable" && !import.meta.env.DEV)) return null;
  const paused = prefs && pausedUntil(prefs);
  const where = prefs && whereLine(prefs);
  return (
    <Card title="Study reminders" id="reminders">
      {phase === "no-sync" && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <p className="measure text-read text-foreground/85">A nudge on days you haven&rsquo;t practised, by notification or email. They need sync, so we know when you have practised on any device and stay quiet then.</p>
          <LinkButton to="/you#sync" variant="secondary" className="shrink-0">Turn on sync</LinkButton>
        </div>
      )}
      {phase === "loading" && <p className="text-base text-muted-foreground">Loading your reminders…</p>}
      {phase === "unavailable" && <p role="status" className="rounded-lg bg-warning-soft px-4 py-3 text-base">Shown in development only: the API answered &ldquo;{msg}&rdquo; Run the API from this branch (<b className="font-semibold">make run</b> in server/); students do not see this card until it answers.</p>}

      {phase === "ready" && prefs && (
        <>
          <div className="flex items-start justify-between gap-4 sm:gap-8">
            <div className="flex min-w-0 flex-col gap-1.5">
              {prefs.on ? (
                <p className="measure text-pretty text-read text-foreground/85">
                  Around{" "}
                  <button type="button" onClick={editTime} aria-label={`Change the time, now ${spokenTime(prefs.at)}`}
                    className="rounded-md bg-foreground/[0.06] px-1.5 font-semibold text-foreground transition-colors hover:bg-foreground/[0.12] active:bg-foreground/[0.18] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none">
                    {spokenTime(prefs.at)}
                  </button>
                  , {daysLine(prefs.days)}, if you haven&rsquo;t practised yet.
                </p>
              ) : (
                <p className="measure text-pretty text-read text-foreground/85">One nudge a day, at a time you pick, only on days you haven&rsquo;t practised. Never on the day you turn them on.</p>
              )}
              {prefs.on && where && <p className="text-sm text-muted-foreground">Going to {where}.</p>}
            </div>
            <Switch label="Study reminders" checked={prefs.on} onChange={(on) => void r.setOn(on)} />
          </div>

          {prefs.on && paused && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-highlight-soft px-4 py-3 text-base" role="status">
              Paused until {mediumDate(paused.slice(0, 10))}.
              <button type="button" onClick={() => void r.save({ ...prefs, pausedUntil: null })}
                className="font-semibold underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">Resume now</button>
            </p>
          )}
          {prefs.on && silent(prefs) && <p className="rounded-lg bg-warning-soft px-4 py-3 text-base" role="status">Nothing will arrive yet. Turn on this device, or email, below.</p>}

          {prefs.on && (
            <>
              <ChannelList r={r} prefs={prefs} />
              <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col gap-4">
                <CollapsibleTrigger className="flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-md text-base font-medium text-foreground/80 transition-colors hover:text-foreground active:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none">
                  Time, days and quiet hours
                  <ChevronDown className={cn("size-4 transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
                </CollapsibleTrigger>
                {/* The house settings row (components/SettingRows.tsx): what it is on the left, its control on the
                    right, the same shape as "How it looks and works" lower down the page. It replaced a grid of
                    labelled fields that read as a form pasted into the card. */}
                <CollapsibleContent className="flex flex-col gap-5 pb-1">
                  <Row title="Time" hint="Reminders arrive within about 15 minutes of it.">
                    <Input ref={time} type="time" step={900} className="w-36" aria-label="Reminder time" value={toClock(prefs.at)}
                      onChange={(e) => { const m = fromClock(e.target.value); if (m != null) void r.save({ ...prefs, at: m }); }} />
                  </Row>
                  <Row title="Days" hint={prefs.days.length === 1 ? "At least one day. To stop reminders, turn them off above." : "No reminders on the days you leave out."}>
                    <div role="group" aria-label="Days reminders can arrive" className="grid grid-cols-7 gap-1 rounded-lg bg-secondary p-1 sm:inline-flex sm:w-fit">
                      {DOW.map((day, i) => {
                        const on = prefs.days.includes(i);
                        const next = toggleDay(prefs.days, i);
                        return (
                          <button key={day} type="button" aria-pressed={on} aria-disabled={next ? undefined : true}
                            onClick={() => { if (next) void r.save({ ...prefs, days: next }); }}
                            className={cn("min-h-11 rounded-md text-base font-normal transition-[color,background-color,transform] active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none sm:px-3",
                              on ? "bg-card font-semibold text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}>
                            <span aria-hidden>{day.slice(0, 3)}</span><span className="sr-only">{day}</span>
                          </button>
                        );
                      })}
                    </div>
                  </Row>
                  <Row title="Quiet hours" hint="Nothing arrives between these times.">
                    {/* A native time input is wider than it looks, so the pair shares the row and shrinks instead of wrapping. */}
                      <div className="flex w-full max-w-sm items-center gap-2">
                      <Input type="time" step={900} className="min-w-0 flex-1 sm:w-36 sm:flex-none" aria-label="Quiet from" value={toClock(prefs.quietFrom)} onChange={(e) => { const m = fromClock(e.target.value); if (m != null) void r.save({ ...prefs, quietFrom: m }); }} />
                      <span className="text-base text-muted-foreground">to</span>
                      <Input type="time" step={900} className="min-w-0 flex-1 sm:w-36 sm:flex-none" aria-label="Quiet until" value={toClock(prefs.quietTo)} onChange={(e) => { const m = fromClock(e.target.value); if (m != null) void r.save({ ...prefs, quietTo: m }); }} />
                    </div>
                  </Row>
                  {!paused && (
                    <Row title="Pause" hint="A week off, for exams or a trip. Reminders start again by themselves.">
                      <Button variant="secondary" onClick={() => void r.save({ ...prefs, pausedUntil: new Date(Date.now() + WEEK).toISOString() })}>Pause for a week</Button>
                    </Row>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          {prefs.lastSent && <p className="text-sm text-muted-foreground">The last reminder went {mediumDate(prefs.lastSent.at.slice(0, 10))} by {CHANNEL[prefs.lastSent.channel]}.</p>}
          {msg && <p role="status" className="rounded-lg bg-warning-soft px-4 py-3 text-base">{msg}</p>}
        </>
      )}
    </Card>
  );
}

/**
 * The offer to turn reminders on (F65): on a set's result screen, and on Today once the student has practised that
 * day; never on arrival. "Not now" waits three more finished sets, and it is asked three times at most, wherever it
 * shows; Settings always has the switch. On Today it shows only with sync on, where the sign-in nudge does not.
 */
export function ReminderOffer({ place = "result" }: { place?: "result" | "today" }) {
  const [offer, setOffer] = usePref<{ state: "new" | "declined" | "done"; declines: number; sets: number }>("reminderOffer", { state: "new", declines: 0, sets: 0 });
  const [phase, setPhase] = useState<"ask" | "working" | "done" | "hidden">("ask");
  const [note, setNote] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<ReminderPrefs | null>(null);
  const syncOn = API_ENABLED && loadLedger().on;
  const due = API_ENABLED && offer.state !== "done" && offer.declines < 3 && (offer.declines === 0 || offer.sets >= 3);

  // Each result screen is one finished set; a decline waits for three of them.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (place === "result" && offer.state === "declined") setOffer({ ...offer, sets: offer.sets + 1 }); }, []);
  useEffect(() => {
    if (!due || !syncOn) return;
    let live = true;
    void loadReminders().then((r) => {
      if (!live) return;
      if (!r.ok) setPhase("hidden");
      else if (r.data.on) { setOffer({ ...offer, state: "done" }); setPhase("hidden"); } else setPrefs(r.data);
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [due, syncOn]);

  if (!due && phase !== "done") return null;
  if (place === "today" && !syncOn) return null;
  if (phase === "hidden" || (syncOn && !prefs && phase !== "done")) return null;
  const notNow = () => { setOffer({ state: "declined", declines: offer.declines + 1, sets: 0 }); setPhase("hidden"); };

  if (phase === "done") {
    return <p role="status" className="rounded-lg bg-success-soft px-5 py-4 text-base">{note ?? "Reminders are on."} Change them in <TextLink to="/settings#reminders">Settings</TextLink>.</p>;
  }
  const at = prefs ? spokenTime(prefs.at) : "7:30 pm";
  const support = prefs ? pushHere(prefs) : pushSupport();
  const byEmail = support !== "yes" && !!prefs?.emailAddress;
  if (prefs && support === "no" && !byEmail) return null; // nothing this student can turn on from here
  const turnOn = async () => {
    if (!prefs) return;
    setPhase("working");
    let push = false;
    if (support === "yes") {
      const p = await turnOnPush();
      push = p.ok;
      if (!p.ok) setNote(p.message);
    }
    // Email only from its own button, which says so: a tap on "Remind me" is consent to notifications alone.
    const next = { ...prefs, on: true, email: byEmail ? ("missed" as EmailMode) : prefs.email };
    if (!push && next.email === "off") { setPhase("ask"); return; }
    const ok = await saveReminders({ ...next, timeZone: browserZone() });
    if (ok.ok) {
      setOffer({ ...offer, state: "done" });
      setNote(push ? `Reminders are on, around ${at} on days you haven't practised.` : `We'll email ${prefs.emailAddress} if you miss two days.`);
      setPhase("done");
    } else { setNote(ok.message); setPhase("ask"); }
  };
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-muted/60 px-5 py-4" role="note">
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold">Practise again tomorrow?</p>
        <p className="measure text-base text-muted-foreground">
          {!syncOn ? "Reminders need sync, so we know when you've practised and stay quiet then."
            : byEmail ? `We can email ${prefs!.emailAddress} if you miss two days in a row. Nothing else.`
            : support === "install" ? "On iPhone and iPad, reminders work once 99ile is on your Home Screen."
            : `We'll remind you around ${at}, only if you haven't practised by then.`}
        </p>
      </div>
      {note && <p className="text-base">{note}</p>}
      <div className="flex flex-wrap gap-2">
        {!syncOn ? <LinkButton to="/you#sync" variant="secondary" size="sm">Turn on sync</LinkButton>
          : support === "install" && !byEmail ? <LinkButton to="/settings#install" variant="secondary" size="sm">How to add it</LinkButton>
          : <Button variant="secondary" size="sm" disabled={phase === "working"} onClick={() => void turnOn()}>{byEmail ? "Email me if I miss days" : "Remind me"}</Button>}
        <Button variant="ghost" size="sm" onClick={notNow}>Not now</Button>
      </div>
    </div>
  );
}

/**
 * Right after Google sign-in (F65): the one moment we have an address and the student's attention. One line, one
 * button that says exactly what it turns on; "No thanks" is remembered on this device.
 */
export function EmailOffer() {
  const [seen, setSeen] = usePref("emailOfferSeen", false);
  const [prefs, setPrefs] = useState<ReminderPrefs | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (seen) return;
    let live = true;
    void loadReminders().then((r) => { if (live && r.ok) setPrefs(r.data); });
    return () => { live = false; };
  }, [seen]);
  if (done) return <p role="status" className="rounded-lg bg-success-soft px-5 py-4 text-base">{done} Change it in <TextLink to="/settings#reminders">Settings</TextLink>.</p>;
  if (seen || !prefs?.emailAddress || prefs.email !== "off") return null;
  const yes = async () => {
    setBusy(true);
    const r = await saveReminders({ ...prefs, on: true, email: "missed", timeZone: browserZone() });
    setBusy(false);
    if (r.ok) { setSeen(true); setDone(`We'll email ${prefs.emailAddress} if you miss two days in a row.`); }
  };
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-muted/60 px-5 py-4" role="note">
      <p className="measure text-base"><span className="font-semibold">Want an email if you miss two days?</span> We&rsquo;d write to {prefs.emailAddress} after 2, 5 and 12 days without practice, then stop. Nothing else.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => void yes()}>Email me if I miss days</Button>
        <Button variant="ghost" size="sm" onClick={() => setSeen(true)}>No thanks</Button>
      </div>
    </div>
  );
}
