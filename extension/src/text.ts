/**
 * Text helpers for the extension (F53, D110), kept free of the page and of Chrome so they can be tested: turning
 * blocks of a page into paragraphs the site's clean-up keeps apart, finding a word's sentence, and finding a deciding
 * line on the page again, whatever the page did to its spaces, quotes and dashes.
 */

/** Blocks of text as paragraphs separated by a blank line, which is what the site's clean-up splits on. */
export function asParagraphs(blocks: string[]): string {
  return blocks.map((b) => b.replace(/\s+/g, " ").trim()).filter((b) => b.split(" ").length >= 3).join("\n\n");
}

/** The sentence of `text` that holds `word`, or the start of the text when none does. At most 600 characters. */
export function sentenceWith(text: string, word: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const parts = flat.match(/[^.!?]+[.!?]+["'”’)]*|[^.!?]+$/g) ?? [flat];
  const w = word.toLowerCase();
  const hit = parts.find((p) => p.toLowerCase().includes(w)) ?? parts[0] ?? "";
  return hit.trim().slice(0, 600);
}

/**
 * Letters and digits only, lower-cased, with the index in the original string of each one kept, so a line typed with
 * straight quotes still finds the page's curly ones, and a line split across elements still matches.
 */
export function keyOf(s: string): { key: string; at: number[] } {
  let key = "";
  const at: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (/[\p{L}\p{N}]/u.test(c)) { key += c.toLowerCase(); at.push(i); }
  }
  return { key, at };
}

/**
 * Where `line` sits in `page`: [start, end) in the page's own characters, or null. Matches on letters and digits
 * alone; a line's start and end are looked for separately, so an edit in the middle (a footnote mark) still matches.
 */
export function locate(page: string, line: string): [number, number] | null {
  const p = keyOf(page), l = keyOf(line).key;
  if (l.length < 12) return null;
  const head = l.slice(0, Math.min(60, l.length));
  const start = p.key.indexOf(head);
  if (start < 0) return null;
  const tail = l.slice(-Math.min(40, l.length));
  const end = p.key.indexOf(tail, start);
  const last = end >= 0 && end - start <= l.length * 1.5 ? end + tail.length - 1 : start + head.length - 1;
  return [p.at[start], p.at[last] + 1];
}

/**
 * A page title without the site's name after it: "The origins of the state | Aeon Essays" becomes the first part. Cut
 * only after a "|", or when the part after a dash names the site, so "Self-control – a short history" stays whole.
 */
export function withoutSite(title: string, site = ""): string {
  const t = title.replace(/\s+/g, " ").trim();
  const m = t.match(/^(.{12,}?)\s+([|–—·-])\s+([^|–—·]{2,40})$/);
  if (!m) return t;
  const name = site.toLowerCase().replace(/^www\./, "").split(".")[0];
  const tail = m[3].toLowerCase();
  return m[2] === "|" || (name.length >= 3 && (tail.includes(name) || name.includes(tail.replace(/\s+/g, "")))) ? m[1].trim() : t;
}
