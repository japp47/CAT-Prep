import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadBackup, hasProgress } from "../lib/backup";
import { iosSafariTab } from "../lib/keep";
import { usePref } from "../lib/prefs";
import { useStore } from "../lib/store";

/**
 * One quiet note for Safari on iPhone and iPad (docs/feature.md, F50). Safari clears a site's data after a week of
 * Safari use without a visit; the Home Screen app keeps it, but starts empty, because iPhone keeps its data apart
 * from Safari. So once there is progress, the note offers a backup to restore in the app. Never a popup.
 */
export default function KeepHint({ className }: { className?: string }) {
  const { state } = useStore();
  const [seen, setSeen] = usePref("iosKeepHint", false);
  if (seen || typeof navigator === "undefined" || !iosSafariTab()) return null;
  const progress = hasProgress(state);
  return (
    <div className={cn("flex flex-col gap-3 rounded-lg bg-muted/60 px-5 py-4", className)} role="note">
      <p className="measure text-base">
        On iPhone and iPad, Safari can clear this site&rsquo;s data if you don&rsquo;t visit for a week. To keep it, tap Share, then <b className="font-semibold">Add to Home Screen</b>, and study from there.
        {progress && <> The Home Screen app starts empty, so download a backup first and restore it in the app&rsquo;s Settings.</>}
      </p>
      <div className="flex flex-wrap gap-2">
        {progress && <Button variant="secondary" size="sm" onClick={() => downloadBackup(state)}>Download backup</Button>}
        <Button variant="ghost" size="sm" onClick={() => setSeen(true)}>Got it</Button>
      </div>
    </div>
  );
}
