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
