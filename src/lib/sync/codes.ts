/**
 * Link and recovery codes as people type and scan them (same rules as server/internal/codes): Crockford base32,
 * no I, L, O or U; case, spaces and dashes do not matter; I and L count as 1, O as 0.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const LINK_LEN = 8;
export const RECOVERY_LEN = 16;

/** The code without dashes, or "" when it is not a code of `len` characters. */
export function normalizeCode(s: string, len: number): string {
  let out = "";
  for (const ch of s.toUpperCase()) {
    if (ch === " " || ch === "-" || ch === "\t") continue;
    const c = ch === "I" || ch === "L" ? "1" : ch === "O" ? "0" : ch;
    if (!ALPHABET.includes(c)) return "";
    out += c;
  }
  return out.length === len ? out : "";
}

/** ABCD-EFGH. */
export const formatCode = (code: string) => code.match(/.{1,4}/g)?.join("-") ?? code;

/** The link a QR holds: the code is in the fragment, so it never reaches a server log. */
export const linkUrl = (origin: string, base: string, code: string) => origin + base + "link#" + code;

/**
 * Reads a scanned QR. Only our own link (this site's origin, path /link, a valid code in the fragment) is accepted:
 * any other QR, such as a payment code or another site, gives null.
 */
export function parseLink(text: string, origin: string, base = "/"): string | null {
  let u: URL;
  try { u = new URL(text.trim()); } catch { return null; }
  if (u.origin !== origin || u.pathname !== base + "link") return null;
  return normalizeCode(decodeURIComponent(u.hash.slice(1)), LINK_LEN) || null;
}
