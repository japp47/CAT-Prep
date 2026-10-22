/**
 * Cloudflare Turnstile: a quick bot check before sync is turned on (server/internal/turnstile checks the token).
 * The script loads only when someone taps "Turn on sync", and most people never see a challenge
 * ("interaction-only"). Without a site key (development) there is no check.
 */
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface Turnstile {
  render: (el: HTMLElement, o: Record<string, unknown>) => string;
  remove: (id: string) => void;
}

let script: Promise<Turnstile> | null = null;
function load(): Promise<Turnstile> {
  script ??= new Promise<Turnstile>((ok, fail) => {
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.onload = () => { const t = (window as unknown as { turnstile?: Turnstile }).turnstile; if (t) ok(t); else fail(new Error("turnstile missing")); };
    s.onerror = () => fail(new Error("turnstile did not load"));
    document.head.appendChild(s);
  }).catch((e) => { script = null; throw e; });
  return script;
}

/** Runs the check inside `el` and resolves with its token, or "" when there is no site key. Rejects on failure. */
export async function botToken(el: HTMLElement): Promise<string> {
  if (!SITE_KEY) return "";
  const ts = await load();
  return new Promise<string>((ok, fail) => {
    let id = "";
    const done = (f: () => void) => { f(); setTimeout(() => { try { ts.remove(id); } catch { /* already gone */ } }, 0); };
    const timer = setTimeout(() => done(() => fail(new Error("timeout"))), 60_000);
    id = ts.render(el, {
      sitekey: SITE_KEY,
      action: "sync-on",
      appearance: "interaction-only",
      callback: (token: string) => { clearTimeout(timer); done(() => ok(token)); },
      "error-callback": () => { clearTimeout(timer); done(() => fail(new Error("check failed"))); },
      "expired-callback": () => { clearTimeout(timer); done(() => fail(new Error("expired"))); },
    });
  });
}
