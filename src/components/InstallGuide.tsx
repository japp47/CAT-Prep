import { useEffect, useState, type ReactNode } from "react";
import { Ellipsis, Menu, Share, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { downloadBackup, hasProgress } from "../lib/backup";
import { iosBrowser } from "../lib/pwa";
import { useStore } from "../lib/store";

/**
 * How to install on iPhone and iPad (docs/feature.md, F50). A page there cannot open an install prompt, so this sheet
 * shows the steps with the icons the student will see, worded for the browser in use. Loaded only when opened.
 */
const Icon = ({ children }: { children: ReactNode }) => (
  <span className="inline-grid size-8 shrink-0 place-items-center rounded-md bg-background text-primary align-middle" aria-hidden>{children}</span>
);

function useWide() {
  const q = "(min-width: 640px)";
  const [wide, setWide] = useState(() => typeof matchMedia === "function" && matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q), on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}

export default function InstallGuide({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state } = useStore();
  const wide = useWide();
  const browser = iosBrowser();
  const ipad = !/iphone|ipod/i.test(navigator.userAgent);
  const device = ipad ? "iPad" : "iPhone";
  const progress = hasProgress(state);

  const share: [ReactNode, ReactNode] = browser === "chrome"
    ? [<Share className="size-5" />, <>Tap <b className="font-semibold">Share</b>, to the right of the address bar.</>]
    : browser === "edge" || browser === "firefox" || browser === "other"
      ? [<Menu className="size-5" />, <>Open the browser&rsquo;s menu, then tap <b className="font-semibold">Share</b>.</>]
      : [<Share className="size-5" />, <>Tap <b className="font-semibold">Share</b> {ipad ? "at the top right" : "at the bottom of the screen"}. If you don&rsquo;t see it, tap <Ellipsis className="inline size-5 align-middle" aria-hidden /><span className="sr-only">the More button</span> first.</>];

  const steps: [ReactNode, ReactNode][] = [
    share,
    [<SquarePlus className="size-5" />, <>Choose <b className="font-semibold">Add to Home Screen</b>. Scroll the list down if you don&rsquo;t see it.</>],
    [<span className="text-sm font-bold">99</span>, <>Tap <b className="font-semibold">Add</b>, then open 99ile from your Home Screen.</>],
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={wide ? "right" : "bottom"} aria-describedby="install-guide-desc"
        className={wide ? "w-full gap-0 overflow-y-auto p-0 sm:max-w-md" : "max-h-[92dvh] gap-0 overflow-y-auto rounded-t-xl p-0"}>
        <div className="flex flex-col gap-6 px-5 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6">
          <div className="flex flex-col gap-1.5 pr-10">
            <SheetTitle className="text-heading font-semibold">Install 99ile on your {device}</SheetTitle>
            <SheetDescription id="install-guide-desc" className="text-base text-muted-foreground">
              It opens from your Home Screen like an app and works without internet.
            </SheetDescription>
          </div>

          {progress && (
            <div className="flex flex-col gap-3 rounded-lg bg-warning-soft px-4 py-4">
              <p className="text-base">First, save your progress. On {device} the Home Screen app keeps its own data, so it starts empty. Download a backup, and restore it in the app&rsquo;s Settings.</p>
              <Button variant="secondary" size="sm" className="self-start" onClick={() => downloadBackup(state)}>Download backup</Button>
            </div>
          )}

          <ol className="flex flex-col gap-3">
            {steps.map(([icon, text], i) => (
              <li key={i} className="flex items-start gap-4 rounded-lg bg-card px-4 py-3.5">
                <Icon>{icon}</Icon>
                <p className="pt-1 text-base"><span className="sr-only">Step {i + 1}. </span>{text}</p>
              </li>
            ))}
          </ol>

          <p className="text-sm text-muted-foreground">
            {browser === "safari" ? "Use Safari for this." : "Stay in this browser: each browser on your " + device + " keeps its own copy of your progress."} iPhone and iPad don&rsquo;t let websites install themselves, so it takes these three taps.
          </p>
          <Button variant="ghost" className="self-start" onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
