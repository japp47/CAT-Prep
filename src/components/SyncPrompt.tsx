import { Button } from "@/components/ui/button";
import { LinkButton } from "./kit";
import { API_ENABLED, SIGNIN_ENABLED } from "../lib/api";
import { hasProgress } from "../lib/backup";
import { usePref } from "../lib/prefs";
import { useStore } from "../lib/store";
import type { AppState } from "../lib/state";
import { useSyncStatus } from "./SyncNav";

/** Attempts that make "keep this on your other device too" worth asking: real practice, not a first look. */
const NUDGE_AFTER = 5;

/** Which prompt, if any: "invite" on an empty device, "nudge" after real practice, else none. */
export function promptKind(st: AppState, syncOn: boolean, seen: { invite: boolean; nudge: boolean }): "invite" | "nudge" | null {
  if (syncOn) return null;
  if (!hasProgress(st)) return seen.invite ? null : "invite";
  const attempts = st.rcAttempts.length + st.vaAttempts.length + st.crAttempts.length + st.sectionals.length;
  return attempts >= NUDGE_AFTER && !seen.nudge ? "nudge" : null;
}

/**
 * Sync comes up at the two moments it helps (docs: sync UX plan), each at most once and easy to dismiss:
 * - a device with nothing on it: "Already studying on another device?", which leads to linking this one;
 * - after real practice on a device that does not sync: "Study on another device too?".
 * Never a popup, never both, nothing once sync is on.
 */
export default function SyncPrompt({ className }: { className?: string }) {
  const { state } = useStore();
  const s = useSyncStatus();
  const [inviteSeen, setInviteSeen] = usePref("syncInviteSeen", false);
  const [nudgeSeen, setNudgeSeen] = usePref("syncNudgeSeen", false);
  if (!API_ENABLED) return null;

  const kind = promptKind(state, s.phase !== "off", { invite: inviteSeen, nudge: nudgeSeen });
  const card = (title: string, text: string, to: string, action: string, dismiss: () => void) => (
    <div className={"flex flex-col gap-3 rounded-lg bg-card p-5 " + (className ?? "")} role="note">
      <p className="text-base"><b className="font-semibold">{title}</b> {text}</p>
      <div className="flex flex-wrap gap-2">
        <LinkButton to={to} variant="secondary" size="sm">{action}</LinkButton>
        <Button variant="ghost" size="sm" onClick={dismiss}>Not now</Button>
      </div>
    </div>
  );
  if (kind === "invite") return card("Already studying on another device?", "Link this one to bring your progress here. No sign-up.", "/link", "Link this device", () => setInviteSeen(true));
  if (kind === "nudge" && SIGNIN_ENABLED) return card("Keep your progress safe.", "Sign in with Google so a new or wiped phone loses nothing, and your laptop shows the same.", "/signin?then=%2Ftoday", "Sign in", () => setNudgeSeen(true));
  if (kind === "nudge") return card("Study on a phone and a laptop?", "Turn on sync to keep your progress the same on both. No sign-up.", "/settings#sync", "Set up sync", () => setNudgeSeen(true));
  return null;
}
