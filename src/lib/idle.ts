/**
 * Runs `f` once the page has loaded, a little time has passed and the browser is idle, so work that can wait
 * (fetching other pages, the menu, the toast code) never competes with what the student is looking at.
 * In this app the load event fires early, before a page's own data arrives, hence the extra delay.
 * Returns a function that cancels it.
 */
export function whenIdle(f: () => void, delay = 2500): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined, idle = 0, done = false;
  const go = () => {
    timer = setTimeout(() => {
      if (done) return;
      // Safari has no requestIdleCallback.
      if ("requestIdleCallback" in window) idle = requestIdleCallback(() => { if (!done) f(); }, { timeout: 4000 });
      else f();
    }, delay);
  };
  if (document.readyState === "complete") go(); else window.addEventListener("load", go, { once: true });
  return () => { done = true; window.removeEventListener("load", go); clearTimeout(timer); if (idle) cancelIdleCallback(idle); };
}
