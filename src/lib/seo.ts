import { SITE_URL } from "./domain";

/**
 * What a search engine is told about the site (12 Nov 2026). Only pages that read the same for everyone are listed:
 * the personal ones (Today, Progress, History, the error log, Settings) are empty shells until a student's own data
 * fills them, so listing them would only teach search to show blank pages.
 */
const STATIC_PATHS = ["/", "/varc", "/dilr", "/practice", "/guides", "/exams", "/updates", "/stories", "/roadmap", "/contact", "/privacy"];

/**
 * Guides left out of the list. The owner's decision (memory: not targeting CAT 2026 takers) is that nothing is built or
 * promoted around the current exam; its guide still opens for anyone who finds it, but is not offered to search.
 */
const NOT_LISTED = new Set(["last-25-days"]);

/** Every address worth indexing: the fixed pages, then one per guide. */
export const publicPaths = (guideIds: string[]): string[] => [...STATIC_PATHS, ...guideIds.filter((id) => !NOT_LISTED.has(id)).map((id) => "/guides/" + id)];

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** sitemap.xml for the given paths. No <lastmod>: a date that is not kept true is worse than none. */
export const sitemapXml = (paths: string[]): string =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  paths.map((p) => `  <url><loc>${xml(SITE_URL + p)}</loc></url>\n`).join("") +
  `</urlset>\n`;

/**
 * A page description for a result snippet: one line, whitespace collapsed, cut at a word before 160 characters (the
 * length search results show), and closed with a full stop so a cut never ends mid-thought.
 */
export function describe(text: string, max = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return /[.!?]$/.test(t) ? t : t + ".";
  const cut = t.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,;:.\-–—]+$/, "") + "…";
}

/** What a guide says about itself in a search result: its own summary, how long it is, and where it lives. */
export const guideDescription = (g: { summary: string; minutes: number }): string =>
  describe(`${g.summary.replace(/[.\s]+$/, "")}. A ${g.minutes}-minute read on 99ile, the free CAT study space.`);
