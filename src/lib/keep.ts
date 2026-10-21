import { appleMobile } from "./pwa";

/**
 * Keeping progress on this device (docs/feature.md, F50). Browsers may clear a site's data when space runs low,
 * and Safari on iPhone clears it after 7 days of Safari use without a visit, unless 99ile is on the Home Screen.
 */

/** Asks the browser to keep this site's data. Quiet: browsers decide without a prompt, or say no. */
export async function askToKeep(): Promise<boolean> {
  try {
    const s = navigator.storage;
    if (!s?.persist) return false;
    return (await s.persisted?.()) || (await s.persist());
  } catch {
    return false;
  }
}

/** Safari on iPhone or iPad, as a tab rather than the Home Screen app. Chrome and Firefox on iOS say so in the user agent. */
export function iosSafariTab(ua = navigator.userAgent, touch = navigator.maxTouchPoints, standalone = (navigator as { standalone?: boolean }).standalone === true) {
  return appleMobile(ua, touch) && !standalone && /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
}

/** How much 99ile keeps in this browser's storage, in bytes (storage counts characters, two bytes each). */
export function storedBytes(): number {
  let n = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("cat-prep")) n += (k.length + (localStorage.getItem(k)?.length ?? 0)) * 2;
    }
  } catch { /* blocked */ }
  return n;
}

export const MB = 1024 * 1024;
/** Most browsers give a site about 5 MB here. Show the size from 2 MB, warn from 4 MB. */
export const SHOW_SIZE = 2 * MB, WARN_SIZE = 4 * MB;
