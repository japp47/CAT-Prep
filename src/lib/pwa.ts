import { useEffect, useState } from "react";

/** Registers the offline service worker. Production builds only: in dev it would cache stale modules. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js").catch(() => { /* the site still works online */ });
  });
}

/** Chrome and Edge fire this when the site can be installed. Not in the DOM types yet. */
interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((f) => f());

// Listen from the start: the event can fire before any page that offers the button has mounted.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as InstallPrompt; notify(); });
  window.addEventListener("appinstalled", () => { deferred = null; notify(); });
}

const standalone = () =>
  typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);

/** What the install section can offer on this device. */
export function useInstall() {
  const [, render] = useState(0);
  useEffect(() => {
    const f = () => render((n) => n + 1);
    listeners.add(f);
    return () => { listeners.delete(f); };
  }, []);
  const ios = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  return {
    installed: standalone(),
    canPrompt: !!deferred,
    ios,
    prompt: async () => {
      if (!deferred) return;
      await deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      notify();
    },
  };
}
