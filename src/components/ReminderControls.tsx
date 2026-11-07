import type { ReactNode } from "react";
import { Bell, CalendarRange, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIGNIN_ENABLED } from "../lib/api";
import { pushHere, type EmailMode, type ReminderPrefs } from "../lib/notify";
import type { Reminders } from "../lib/reminders";
import { startSignIn } from "../lib/sync/runner";
import { Segmented, Switch, TextLink } from "./kit";

/**
 * The parts the Settings card (components/Reminders.tsx) and the bell panel (components/ReminderPanel.tsx) share, so
 * one redesign reaches both: where reminders go, as one row per channel with a switch, and the sentence above them.
 */

/** One channel: what it is, where it stands in a short line, and its switch. Set apart by tone, not by a border. */
export function ChannelRow({ icon, title, state, control, children }: {
  icon: ReactNode; title: string; state?: ReactNode; control?: ReactNode; children?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-background p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-card text-primary [&_svg]:size-5" aria-hidden>{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1 py-1">
        <span className="text-base font-semibold">{title}</span>
        {state && <span className="text-sm text-muted-foreground">{state}</span>}
        {children}
      </div>
      {/* The slot is held open even with no control in it, so a row without a switch keeps the same text column
          as the rows with one and they read as one list rather than three differently shaped blocks. */}
      <div className="-mr-1 flex w-12 shrink-0 justify-end">{control}</div>
    </div>
  );
}

function PushRow({ r, prefs, onLink }: { r: Reminders; prefs: ReminderPrefs; onLink?: () => void }) {
  const support = pushHere(prefs);
  const others = Math.max(0, prefs.pushDevices - (prefs.thisDevice ? 1 : 0));
  const also = others ? ` Also on ${others} other ${others === 1 ? "device" : "devices"}.` : "";
  // pushReady is the server saying whether it holds a VAPID key (notify/handler.go). Without one no student can ever
  // switch this on, so the row follows the card's own rule: students never see a feature the server has not switched
  // on, and a development build says why it is missing (`go run ./cmd/notify -vapid` makes the pair).
  if (!prefs.pushReady) {
    if (!import.meta.env.DEV) return null;
    return (
      <ChannelRow icon={<Bell />} title="On this device"
        state={<>Shown in development only: the server has no push key, so no one can turn this on. Make a pair with <b className="font-semibold text-foreground">go run ./cmd/notify -vapid</b>.</>} />
    );
  }
  const state = prefs.thisDevice ? "A notification arrives here." + also
    : support === "install" ? <>On iPhone and iPad, once 99ile is on your Home Screen. <TextLink to="/settings#install" onClick={onLink}>How to add it</TextLink>.{also}</>
    : support === "no" ? "This browser can't show notifications. Email works anywhere." + also
    : "A notification on this phone or computer." + also;
  // pushReady is settled above, so what is left is whether this browser can show one.
  const can = support === "yes" || prefs.thisDevice;
  return (
    <ChannelRow icon={<Bell />} title="On this device" state={state}
      control={can ? <Switch label="Reminders on this device" checked={prefs.thisDevice} disabled={r.busy} onChange={(on) => void r.setPush(on)} /> : null} />
  );
}

function EmailRow({ r, prefs }: { r: Reminders; prefs: ReminderPrefs }) {
  if (!prefs.emailAddress) {
    // No switch to offer yet, and a lone "Sign in" button in the switch's place made the row a different shape
    // from its neighbours. The action goes in the sentence instead, where it reads as the next step.
    return (
      <ChannelRow icon={<Mail />} title="By email"
        state={<>We need an address to write to.{SIGNIN_ENABLED && <> <button type="button" onClick={() => startSignIn("/settings#reminders")}
          className="font-medium text-primary underline underline-offset-4 decoration-primary/40 transition-colors hover:decoration-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none">Sign in with Google</button></>}</>} />
    );
  }
  const on = prefs.email !== "off";
  const bounced = prefs.emailState === "bounced" && !on;
  const state = bounced ? <>Emails to {prefs.emailAddress} came back, so email stopped. Turn it on to try once more.</>
    : on ? <>To {prefs.emailAddress}.</>
    : <>We can write to {prefs.emailAddress}.</>;
  return (
    <ChannelRow icon={<Mail />} title="By email" state={state}
      control={<Switch label="Reminders by email" checked={on} onChange={(next) => void r.save({ ...prefs, email: next ? "missed" : "off" })} />}>
      {/* A phone leaves the row about 220px, where the two choices wrap: there they become two full-width lines. */}
      {on && (
        <Segmented className="mt-1 max-sm:w-full max-sm:[&>button]:flex-1" label="When to email" value={prefs.email as Exclude<EmailMode, "off">}
          options={[["missed", "If I miss days"], ["daily", "Every day"]]}
          onChange={(email) => void r.save({ ...prefs, email })} />
      )}
    </ChannelRow>
  );
}

/** Where reminders go. The weekly review is its own email, so it has its own switch (F65). */
export function ChannelList({ r, prefs, onLink, className }: { r: Reminders; prefs: ReminderPrefs; onLink?: () => void; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <PushRow r={r} prefs={prefs} onLink={onLink} />
      <EmailRow r={r} prefs={prefs} />
      {prefs.emailAddress && (
        <ChannelRow icon={<CalendarRange />} title="Weekly review" state="A Sunday email with your week in numbers."
          control={<Switch label="Weekly review email" checked={prefs.weekly} onChange={(weekly) => void r.save({ ...prefs, weekly })} />} />
      )}
    </div>
  );
}

/** Reminders are on but nothing is switched on, so nothing would arrive. Said plainly, where the switches are. */
export const silent = (p: ReminderPrefs) => p.on && !p.thisDevice && p.pushDevices === 0 && p.email === "off";
