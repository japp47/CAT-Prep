// The page Google sign-in returns to reads ?signin=: one of these words, or else a ticket to ask about (B7).

/** What Google sign-in's one-word answers mean, for the student. */
export const SIGNIN_WORDS: Record<string, string> = {
  done: "Signed in. Your progress is saved to your account.",
  cancelled: "Sign-in was cancelled. Nothing changed.",
  failed: "Google sign-in did not work just now. Please try again.",
  expired: "That sign-in took too long. Please try again.",
  unverified: "Google says this account's email is not verified yet. Verify it with Google, then sign in again.",
  busy: "Too many sign-ins from this network. Please try again in an hour.",
  unavailable: "Sign in with Google is not available yet. You can still sync with a code.",
};

/** A return page that stays on this site: a path with one leading slash. */
export const safeBack = (p: string | null) => (p && p.startsWith("/") && !p.startsWith("//") && !p.includes("\\") ? p : "/");

/**
 * Where Google should send the student back. Only /signin and the sync card on You (Settings forwards there) read the
 * ?signin= the server adds, so any other page goes through /signin, which redeems the ticket, asks about this device's
 * progress and then returns to that page (?then=). Before 19 Nov 2026 the extension's welcome, the panel, the article
 * page and the RC player sent Google straight back to themselves, and the ticket was never read: no sign-in.
 */
export function signInNext(back: string): string {
  const path = safeBack(back);
  return /^\/(signin|you|settings)(?=$|[/?#])/.test(path) ? path : "/signin?then=" + encodeURIComponent(path);
}
