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

/** The address of the code file that failed, from the error's message, when it names one on this site. */
export function staleUrl(e: unknown): string | undefined {
  const msg = e instanceof Error ? e.message : String((e as { message?: unknown })?.message ?? e ?? "");
  const m = /https?:\/\/[^\s'"]+\.(?:m?js|css)\b/.exec(msg);
  if (!m) return undefined;
  try { return new URL(m[0]).origin === location.origin ? m[0] : undefined; } catch { return undefined; }
}

/**
 * Reloads the page unless it already did in the last minute. True when it reloads. With the failed file's address,
 * it first fetches that file past the browser's cache, so a wrong copy kept there is replaced before the reload.
 */
export function reloadOnce(now = Date.now(), url?: string): boolean {
  try {
    const at = Number(sessionStorage.getItem(KEY) || 0);
    if (now - at < 60_000) return false;
    sessionStorage.setItem(KEY, String(now));
  } catch {
    return false; // without storage there is no guard against a loop: show the error instead
  }
  const go = () => location.reload();
  if (url) fetch(url, { cache: "reload" }).then(go, go);
  else go();
  return true;
}
