import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { API_ENABLED, SIGNIN_ENABLED } from "../lib/api";
import { mediumDate } from "../lib/date";
import { browserZone, fromClock, loadReminders, pushSupport, saveReminders, spokenTime, toClock, turnOffPush, turnOnPush, type EmailMode, type ReminderPrefs } from "../lib/notify";
import { usePref } from "../lib/prefs";
import { loadLedger } from "../lib/sync/ledger";
import { startSignIn } from "../lib/sync/runner";
import { LinkButton, Segmented, TextLink } from "./kit";
import { Card, Row } from "./SettingRows";

/**
 * Study reminders (docs/feature.md F65): the Settings card, and the offer after a finished set. The choices live on
 * the server, which sends the reminders; reminders need sync, so the server knows when the student has practised.
 */

type Phase = "no-sync" | "loading" | "unavailable" | "ready";

/** Notifications work only when this browser can show them and the server can send them. */
const pushHere = (p: ReminderPrefs) => (p.pushReady ? pushSupport() : "no");

function useReminders() {
  const syncOn = API_ENABLED && loadLedger().on;
  const [phase, setPhase] = useState<Phase>(syncOn ? "loading" : "no-sync");
  const [prefs, setPrefs] = useState<ReminderPrefs | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!syncOn) return;
    let live = true;
    void loadReminders().then((r) => {
      if (!live) return;
      if (r.ok) { setPrefs(r.data); setPhase("ready"); } else { setMsg(r.message); setPhase("unavailable"); }
    });
    return () => { live = false; };
  }, [syncOn]);
  const save = async (next: ReminderPrefs) => {
    setPrefs(next);
    setMsg(null);
    const r = await saveReminders({ ...next, timeZone: browserZone() });
    if (r.ok) setPrefs(r.data);
    else {
      setMsg(r.message);
      const back = await loadReminders();
      if (back.ok) setPrefs(back.data);
    }
    return r.ok;
  };
  return { phase, prefs, save, msg, setMsg, setPrefs };
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CHANNEL = { push: "a notification", email: "email" } as const;

export function RemindersCard() {
  const { phase, prefs, save, msg, setMsg, setPrefs } = useReminders();
  const [busy, setBusy] = useState(false);
  // Students never see a feature the server has not switched on; a development build says why it is missing.
  if (!API_ENABLED || (phase === "unavailable" && !import.meta.env.DEV)) return null;
  return (
    <Card title="Reminders" id="reminders">
      {phase === "no-sync" && (
        <Row title="Study reminders" hint="A reminder on days you haven't practised yet, by notification or email. They need sync, so we know when you've practised on any device and stay quiet then.">
          <LinkButton to="/you#sync" variant="secondary">Turn on sync</LinkButton>
        </Row>
      )}
      {phase === "loading" && <p className="text-base text-muted-foreground">Loading your reminders…</p>}
      {phase === "unavailable" && <p role="status" className="rounded-lg bg-warning-soft px-4 py-3 text-base">Shown in development only: the API answered &ldquo;{msg}&rdquo; Run the API from this branch (<b className="font-semibold">make run</b> in server/); students do not see this card until it answers.</p>}
      {phase === "ready" && prefs && (
        <>
          <Row title="Study reminders" hint={prefs.on
            ? <>Around {spokenTime(prefs.at)}, only on days you haven&rsquo;t practised yet. One a day at most{prefs.lastSent ? <>; the last went {mediumDate(prefs.lastSent.at.slice(0, 10))} by {CHANNEL[prefs.lastSent.channel]}</> : null}.</>
            : "A reminder at a time you pick, only on days you haven't practised yet. One a day at most, and never on the day you turn them on."}>
            <Segmented label="Study reminders" value={prefs.on ? "on" : "off"} options={[["on", "On"], ["off", "Off"]]}
              onChange={async (v) => {
                const on = v === "on";
                // A tap is the only moment a browser lets us ask for notifications, so turning reminders on asks here.
                let note: string | null = null;
                if (on && !prefs.thisDevice && pushHere(prefs) === "yes") {
                  const p = await turnOnPush();
                  if (!p.ok) note = p.message;
                }
                const fresh = on ? await loadReminders() : null;
                await save({ ...(fresh?.ok ? fresh.data : prefs), on });
                if (note) setMsg(note);
              }} />
          </Row>
          {prefs.on && (
            <>
              <Row title="Time" hint="Reminders come within about 15 minutes of it.">
                <Input type="time" step={900} className="w-36" aria-label="Reminder time" value={toClock(prefs.at)}
                  onChange={(e) => { const m = fromClock(e.target.value); if (m != null) void save({ ...prefs, at: m }); }} />
              </Row>
              <Row title="Days" hint="No reminders on the days you leave out.">
                <div role="group" aria-label="Reminder days" className="inline-flex flex-wrap gap-1 rounded-lg bg-secondary p-1">
                  {DAYS.map((d, i) => {
                    const on = prefs.days.includes(i);
                    return (
                      <button key={d} type="button" aria-pressed={on} onClick={() => void save({ ...prefs, days: on ? prefs.days.filter((x) => x !== i) : [...prefs.days, i].sort() })}
                        className={cn("min-h-10 rounded-md px-3 text-base font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", on ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </Row>
              <PushRow prefs={prefs} busy={busy} onChange={async (turnOn) => {
                setBusy(true);
                setMsg(null);
                if (turnOn) { const p = await turnOnPush(); if (!p.ok) setMsg(p.message); } else await turnOffPush();
                const fresh = await loadReminders();
                if (fresh.ok) setPrefs(fresh.data);
                setBusy(false);
              }} />
              <EmailRow prefs={prefs} onChange={(email) => void save({ ...prefs, email })} />
              <Row title="Quiet hours" hint="Nothing arrives between these times.">
                <div className="flex flex-wrap items-center gap-2">
                  <Input type="time" step={900} className="w-36" aria-label="Quiet from" value={toClock(prefs.quietFrom)} onChange={(e) => { const m = fromClock(e.target.value); if (m != null) void save({ ...prefs, quietFrom: m }); }} />
                  <span className="text-base text-muted-foreground">to</span>
                  <Input type="time" step={900} className="w-36" aria-label="Quiet until" value={toClock(prefs.quietTo)} onChange={(e) => { const m = fromClock(e.target.value); if (m != null) void save({ ...prefs, quietTo: m }); }} />
                </div>
              </Row>
              <Row title="Pause" hint={prefs.pausedUntil && new Date(prefs.pausedUntil) > new Date() ? `Paused until ${mediumDate(prefs.pausedUntil.slice(0, 10))}.` : "A week off, for exams or a trip. Reminders start again by themselves."}>
                {prefs.pausedUntil && new Date(prefs.pausedUntil) > new Date()
                  ? <Button variant="secondary" onClick={() => void save({ ...prefs, pausedUntil: null })}>Resume now</Button>
                  : <Button variant="secondary" onClick={() => void save({ ...prefs, pausedUntil: new Date(Date.now() + 7 * 864e5).toISOString() })}>Pause for a week</Button>}
              </Row>
            </>
          )}
          {msg && <p role="status" className="rounded-lg bg-warning-soft px-4 py-3 text-base">{msg}</p>}
        </>
      )}
    </Card>
  );
}

function PushRow({ prefs, busy, onChange }: { prefs: ReminderPrefs; busy: boolean; onChange: (on: boolean) => void }) {
  if (!prefs.pushReady) return <Row title="Notifications here" hint="Notifications are not switched on yet. Email reminders work.">{null}</Row>;
  const support = pushSupport();
  const others = prefs.pushDevices - (prefs.thisDevice ? 1 : 0);
  const also = others > 0 ? ` Also on ${others} other ${others === 1 ? "device" : "devices"}.` : "";
  if (prefs.thisDevice) {
    return <Row title="Notifications here" hint={"Notifications are on here." + also}><Button variant="secondary" disabled={busy} onClick={() => onChange(false)}>Turn off here</Button></Row>;
  }
  if (support === "install") {
    return <Row title="Notifications here" hint={<>On iPhone and iPad, notifications work once 99ile is on your Home Screen. <TextLink to="/settings#install">How to add it</TextLink>.{also}</>}>{null}</Row>;
  }
  if (support === "no") return <Row title="Notifications here" hint={"This browser can't show notifications. Email works anywhere." + also}>{null}</Row>;
  return <Row title="Notifications here" hint={"A notification on this phone or computer." + also}><Button variant="secondary" disabled={busy} onClick={() => onChange(true)}>Turn on here</Button></Row>;
}

function EmailRow({ prefs, onChange }: { prefs: ReminderPrefs; onChange: (m: EmailMode) => void }) {
  if (!prefs.emailAddress) {
    return (
      <Row title="By email" hint="Email needs Google sign-in, so we have an address to write to.">
        {SIGNIN_ENABLED ? <Button variant="secondary" onClick={() => startSignIn("/settings#reminders")}>Sign in with Google</Button> : null}
      </Row>
    );
  }
  const hint = prefs.emailState === "bounced" && prefs.email === "off"
    ? <>Emails to {prefs.emailAddress} came back, so email stopped. Choose again to try once more.</>
    : prefs.email === "daily" ? <>Every reminder day, to {prefs.emailAddress}.</>
    : prefs.email === "missed" ? <>To {prefs.emailAddress}, after 2, 5 and 12 days without practice; then we stop until you&rsquo;re back.</>
    : <>We can write to {prefs.emailAddress} when you miss days.</>;
  return (
    <Row title="By email" hint={hint}>
      <Segmented label="Email reminders" value={prefs.email} onChange={onChange}
        options={[["off", "Off"], ["missed", "When I miss days"], ["daily", "Every reminder day"]]} />
    </Row>
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

