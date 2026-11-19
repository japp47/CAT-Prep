/**
 * After a deploy (20 Nov 2026 hotfix). Every build renames its code files, so a tab opened before a deploy asks for
 * files that are gone and the page breaks ("Failed to fetch dynamically imported module"). The cure is a reload, which
 * fetches the new page and its new files. It happens at most once a minute, so a real outage cannot loop.
 */

const KEY = "cat-prep-reloaded-at";

/** A code file failed to load: the wording differs by browser (Chrome, Firefox, Safari) and by what failed. */
export function isStaleChunk(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : typeof e === "string" ? e : String((e as { message?: unknown })?.message ?? "");
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError|Loading chunk [\w-]+ failed/i.test(msg);
}

/** Reloads the page unless it already did in the last minute. True when it reloads. */
export function reloadOnce(now = Date.now()): boolean {
  try {
    const at = Number(sessionStorage.getItem(KEY) || 0);
    if (now - at < 60_000) return false;
    sessionStorage.setItem(KEY, String(now));
  } catch {
    return false; // without storage there is no guard against a loop: show the error instead
  }
  location.reload();
  return true;
}
