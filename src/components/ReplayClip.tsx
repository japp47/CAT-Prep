import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Segmented } from "./kit";
import { clipPainter, loadClipFonts, H, W, type ClipTheme } from "./clipDraw";
import { bestWay, makeVideo, type Made, type Way } from "./clipEncode";
import { clipScenes, ENDING, FPS, type ClipEnding } from "../practice/clip";
import type { BoardGroup, ReplayPuzzle, TrailStep } from "../practice/replay";
import type { GridModel } from "../practice/solver";

/**
 * "Make a clip" (F101, docs/design/replay-clips.md): a Replay as a 9:16 video or a picture, made in the browser.
 * Loaded on the first tap, so the Replay page's download does not grow (D94).
 */

const pageTheme = (): ClipTheme => {
  const set = document.documentElement.getAttribute("data-theme");
  if (set === "dark" || set === "light") return set;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};
const megabytes = (b: number) => `${(b / 1048576).toFixed(1)} MB`;
const secsWord = (s: number) => `${Math.round(s)} seconds`;

type Phase = { at: "ready" } | { at: "making"; done: number } | { at: "made"; made: Made; url: string } | { at: "failed"; why: string };

export default function ReplayClip({ p, m, groups, trail, open, onOpenChange }: { p: ReplayPuzzle; m: GridModel; groups: BoardGroup[]; trail: TrailStep[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [ending, setEnding] = useState<ClipEnding>("tease");
  const [theme, setTheme] = useState<ClipTheme>(pageTheme);
  const [phase, setPhase] = useState<Phase>({ at: "ready" });
  const [way, setWay] = useState<Way | null>(null);
  const [fonts, setFonts] = useState(false);
  const still = useRef<HTMLCanvasElement>(null);
  const stop = useRef<AbortController | null>(null);
  const wide = useMemo(() => matchMedia("(min-width: 640px)").matches, []);
  const timing = useMemo(() => clipScenes(p, trail, ending), [p, trail, ending]);
  const link = `${location.host}/practice/replay/${p.id}`;
  const input = { p, m, groups, trail, scenes: timing.scenes, theme, link };

  useEffect(() => { void bestWay(FPS).then(setWay); void loadClipFonts().then(() => setFonts(true)); }, []);
  // The preview: the first step once its cells have settled, which shows what the clip is about.
  useEffect(() => {
    const ctx = still.current?.getContext("2d");
    if (!ctx || !fonts) return;
    const first = timing.scenes[1];
    clipPainter(ctx, input)(first.start + Math.min(first.secs - 0.2, 2.6));
  }, [fonts, ending, theme, timing, phase.at]); // eslint-disable-line react-hooks/exhaustive-deps
  // A new ending or theme means a new clip: drop the old one.
  useEffect(() => { reset(); }, [ending, theme]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { stop.current?.abort(); if (phase.at === "made") URL.revokeObjectURL(phase.url); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function reset() {
    stop.current?.abort();
    setPhase((ph) => { if (ph.at === "made") URL.revokeObjectURL(ph.url); return { at: "ready" }; });
  }

  async function make() {
    if (!way || way.by === "none") return;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    const paint = clipPainter(ctx, input);
    stop.current = new AbortController();
    setPhase({ at: "making", done: 0 });
    try {
      const made = await makeVideo(way, { canvas, paint, frames: timing.frames, fps: FPS, signal: stop.current.signal, onProgress: (done) => setPhase({ at: "making", done }) });
      setPhase({ at: "made", made, url: URL.createObjectURL(made.blob) });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setPhase({ at: "failed", why: (e as Error).message || "The browser stopped making the video." });
    }
  }

  const name = (ext: string) => `99ile-replay-${p.id}${ending === "tease" ? "" : "-answer"}.${ext}`;
  const save = (blob: Blob, file: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = file;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  const picture = () => {
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    clipPainter(canvas.getContext("2d")!, input)(timing.secs - 0.05);
    canvas.toBlob((b) => b && save(b, name("png")), "image/png");
  };
  const made = phase.at === "made" ? phase.made : null;
  const file = made ? new File([made.blob], name(made.kind), { type: made.blob.type }) : null;
  const canShare = !!file && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
  const share = () => { if (file) void navigator.share({ files: [file], title: p.title }).catch(() => undefined); };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) stop.current?.abort(); onOpenChange(o); }}>
      <SheetContent side={wide ? "right" : "bottom"} aria-describedby="clip-desc"
        className={wide ? "w-full gap-0 overflow-y-auto p-0 sm:max-w-md" : "max-h-[94dvh] gap-0 overflow-y-auto rounded-t-xl p-0"}>
        <div className="flex flex-col gap-5 px-5 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6">
          <div className="flex flex-col gap-1.5 pr-10">
            <SheetTitle className="text-heading font-semibold">Make a clip</SheetTitle>
            <SheetDescription id="clip-desc" className="text-base text-muted-foreground">
              This replay as a video for a reel, a story or a friend. Made on this device; nothing is uploaded.
            </SheetDescription>
          </div>

          <div className="flex flex-col gap-3">
            <Segmented value={ending} onChange={setEnding} label="How the clip ends" options={(["tease", "answer"] as ClipEnding[]).map((e) => [e, ENDING[e]] as [ClipEnding, string])} />
            <p className="text-base text-muted-foreground">
              {ending === "tease" ? "It stops one step short, so whoever watches can finish the set on 99ile." : "Every step, down to the one arrangement left."}
            </p>
            <Segmented value={theme} onChange={setTheme} label="Colours" options={[["light", "Light"], ["dark", "Dark"]]} />
          </div>

          <div className="flex flex-col gap-3" aria-live="polite">
            {phase.at === "making" && <>
              <Progress value={Math.round(phase.done * 100)} aria-label="Making the video" />
              <p className="text-base text-muted-foreground">
                Making the video, {Math.round(phase.done * 100)}%.{way?.by === "recorder" ? " This browser records it as it plays, so keep this tab open." : ""}
              </p>
            </>}
            {made && <p className="text-base text-muted-foreground">{secsWord(timing.secs)}, {megabytes(made.blob.size)}, {made.kind === "mp4" ? "MP4" : "WebM (Instagram may not take it; try Chrome or Safari for MP4)"}.</p>}
            {phase.at === "failed" && <p className="text-base text-danger">The video could not be made: {phase.why} The picture still works.</p>}
            {way?.by === "none" && <p className="text-base text-muted-foreground">This browser cannot make videos. Save a picture of the last frame instead, or open this page in Chrome or Safari.</p>}
            {phase.at === "ready" && way && way.by !== "none" && <p className="text-base text-muted-foreground">About {secsWord(timing.secs)} long, 1080 × 1920.</p>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {phase.at === "ready" && way && way.by !== "none" && <Button onClick={() => void make()} disabled={!fonts}>Make the video</Button>}
            {phase.at === "making" && <Button variant="secondary" onClick={reset}>Stop</Button>}
            {made && canShare && <Button onClick={share}>Share</Button>}
            {made && <Button variant={canShare ? "secondary" : "default"} onClick={() => save(made.blob, name(made.kind))}>Save the video</Button>}
            {phase.at === "failed" && <Button variant="secondary" onClick={reset}>Try again</Button>}
            <Button variant={way?.by === "none" ? "default" : "ghost"} onClick={picture} disabled={!fonts}>Save a picture</Button>
          </div>

          {/* The clip itself, on a tray so its edges show against the panel. It never plays by itself. */}
          <div className="rounded-2xl bg-muted p-3">
            {made && phase.at === "made" ? (
              <video src={phase.url} controls playsInline preload="metadata" aria-label={`The clip of ${p.title}`}
                className="mx-auto aspect-[9/16] w-full max-w-60 rounded-lg bg-background" />
            ) : (
              <canvas ref={still} width={W} height={H} role="img" aria-label={`A frame of the clip of ${p.title}`}
                className="mx-auto aspect-[9/16] w-full max-w-60 rounded-lg bg-background" />
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
