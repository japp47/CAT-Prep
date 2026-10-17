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
