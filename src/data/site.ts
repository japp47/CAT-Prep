/** The public repository. Content problems are reported as GitHub issues until the backend has a feedback inbox. */
export const REPO_URL = "https://github.com/japp47/CAT-Prep";

/** A prefilled "new issue" link for a problem with one question. */
export function reportUrl(what: string, page: string): string {
  const title = "Content problem: " + what;
  const body = [
    "**Question:** " + what,
    "**Page:** " + page,
    "",
    "**What is wrong?** (wrong answer key, unclear option, typo, other)",
    "",
    "**Why?**",
    "",
  ].join("\n");
  return `${REPO_URL}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

/**
 * The Chrome extension's Chrome Web Store listing (F53). Submitted 18 Nov 2026; set STORE_LIVE once Google approves it,
 * and every "Add to Chrome" on the site (components/GetExtension.tsx) and 99ile.in/chrome go to the listing.
 */
export const STORE_ID = "mjgmdkefkachokakimleommdodchkgfo";
export const STORE_URL = `https://chromewebstore.google.com/detail/${STORE_ID}`;
export const STORE_LIVE = false;

/** Where privacy questions, requests and complaints go (the DPDP grievance contact on /privacy). */
export const CONTACT_EMAIL = "99ile.team@gmail.com";

/** The Instagram page, where the build is posted. */
export const INSTAGRAM_HANDLE = "@the99ile";
export const INSTAGRAM_URL = "https://www.instagram.com/the99ile/";

/** A mailto with the subject already written, so a message arrives sorted and nobody has to invent a heading. */
export function mailTo(subject: string, body?: string): string {
  const parts = [`subject=${encodeURIComponent(subject)}`];
  if (body) parts.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${CONTACT_EMAIL}?${parts.join("&")}`;
}
