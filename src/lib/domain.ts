/**
 * The site's address. 99ile.pages.dev was the first home; since 12 Nov 2026 the site lives at 99ile.in and the old
 * address only sends students on. A student's progress is kept per address, so this is a redirect rather than a copy.
 */
export const SITE_URL = "https://99ile.in";
const OLD_HOST = "99ile.pages.dev";

/**
 * Where to send this page, or null when it is already where it belongs. Only the old address itself moves: a preview
 * deployment (`abc123.99ile.pages.dev`), localhost and 99ile.in stay put. Path, query and hash travel with it, so an
 * old reminder email, a shared link or a `?review=` address still opens the same page.
 */
export function movedTo(loc: Pick<Location, "hostname" | "pathname" | "search" | "hash">): string | null {
  return loc.hostname === OLD_HOST ? SITE_URL + loc.pathname + loc.search + loc.hash : null;
}

/** The one address a page is known by, so search engines count 99ile.in and not its old twin. No query, no slash at the end. */
export function canonicalUrl(pathname: string): string {
  const path = pathname.replace(/\/+$/, "");
  return SITE_URL + (path || "/");
}
