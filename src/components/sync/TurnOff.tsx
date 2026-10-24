import { useState } from "react";
import { disable } from "@/lib/sync/runner";
import { Confirm } from "@/pages/practice/common";

/**
 * Turning sync off here: keep this device's copy (the usual choice) or clear it. Other devices keep everything.
 * Signed in, it is "Sign out". Used by the sync card in Settings and the account menu in the header.
 */
export default function TurnOff({ open, signedIn, onClose, onDone }: { open: boolean; signedIn: boolean; onClose: () => void; onDone: (note: string) => void }) {
  const [clear, setClear] = useState(false);
  return (
    <Confirm open={open} onOpenChange={(o) => !o && onClose()} title={signedIn ? "Sign out of this device?" : "Turn off sync on this device?"} action={signedIn ? "Sign out" : "Turn off"} cancel="Cancel" danger={clear}
      onAction={async () => { onClose(); await disable(clear); onDone(clear ? (signedIn ? "Signed out, and this device is cleared. Your account keeps everything." : "Sync is off and this device is cleared. Your other devices keep everything.") : (signedIn ? "Signed out of this device. Your progress is still here." : "Sync is off on this device. Your progress is still here.")); }}>
      <span className="flex flex-col gap-3">
        <span>{signedIn ? "Your account and your other devices keep everything. Sign in again any time." : "Your other devices keep syncing and keep everything."}</span>
        <label className="flex items-center gap-3"><input type="checkbox" checked={clear} onChange={(e) => setClear(e.target.checked)} className="size-4 accent-primary" /> Also clear the progress on this device</label>
      </span>
    </Confirm>
  );
}
