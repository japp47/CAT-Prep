import { useEffect, useState } from "react";

/** Registers the offline service worker. Production builds only: in dev it would cache stale modules. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js").catch(() => { /* the site still works online */ });
  });
}

/**
 * True when a touch phone lays the page out at desktop width (about 980 px) although the viewport tag asks for the
 * device width. Seen in the installed app after Google sign-in: the app leaves its window for Google and, coming
 * back, the browser sometimes ignores the viewport tag until a reload. Tablets are never matched: their screens are
 * as wide as the desktop layout.
 */
export function wrongViewport(width: number, screenW: number, screenH: number, coarse: boolean): boolean {
  return coarse && width >= 960 && width > Math.max(screenW, screenH) + 1;
}

const REPAIRED = "99ile-viewport-reload";

/**
 * Puts a phone back in the mobile layout when wrongViewport says it is not: first by setting the viewport tag again,
 * which makes the browser read it; if that is not enough, by one reload (never twice within a minute, so it cannot loop).
 */
export function repairViewport() {
  if (typeof window === "undefined" || typeof matchMedia !== "function") return;
  const wrong = () => wrongViewport(document.documentElement.clientWidth, screen.width, screen.height, matchMedia("(pointer: coarse)").matches);
  const check = () => {
    if (!wrong()) return;
    const tag = document.querySelector('meta[name="viewport"]');
    const content = tag?.getAttribute("content");
    if (tag && content) { tag.setAttribute("content", content + ", minimum-scale=1"); tag.setAttribute("content", content); }
    setTimeout(() => {
      if (!wrong()) return;
      try {
        // Not twice within a minute: a page that stays wide after a reload is not this bug, so it must never loop.
        if (Date.now() - Number(sessionStorage.getItem(REPAIRED) ?? 0) < 60_000) return;
        sessionStorage.setItem(REPAIRED, String(Date.now()));
      } catch { return; }
      location.reload();
    }, 300);
  };
  check();
  // Coming back to a page kept in memory (back, or returning to the app) runs no scripts again.
  window.addEventListener("pageshow", (e) => { if (e.persisted) check(); });
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

/**
 * iPhone, iPod or iPad. iPad Safari asks for desktop sites by default and calls itself a Mac, so a Mac user agent
 * with a touch screen counts as an iPad (Macs have no touch screen).
 */
export function appleMobile(ua = navigator.userAgent, touch = navigator.maxTouchPoints ?? 0) {
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && touch > 1);
}

/**
 * Which browser on an iPhone or iPad. All use Safari's engine, but each keeps its own copy of a site's data, and
 * Chrome, Edge and Firefox name themselves in the user agent. Since iOS 16.4 each can add a site to the Home Screen.
 */
export type IosBrowser = "safari" | "chrome" | "edge" | "firefox" | "other";
export function iosBrowser(ua = navigator.userAgent): IosBrowser {
  if (/crios/i.test(ua)) return "chrome";
  if (/edgios/i.test(ua)) return "edge";
  if (/fxios/i.test(ua)) return "firefox";
  return /safari/i.test(ua) && !/opios|gsa\//i.test(ua) ? "safari" : "other";
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
  const ios = typeof navigator !== "undefined" && appleMobile();
  return {
    installed: standalone(),
    canPrompt: !!deferred,
    ios,
    browser: ios ? iosBrowser() : null,
    prompt: async () => {
      if (!deferred) return;
      await deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      notify();
    },
  };
}
