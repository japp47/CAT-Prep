import { createContext, useContext, useSyncExternalStore } from "react";

/**
 * The extension's side panel (F53, D110; docs/design/article-to-rc.md, "The extension"). The panel is an extension
 * page that frames 99ile's `/panel/*` routes, so sign-in, the store and sync are the site's own. The extension reads
 * the article (or a word) after the student's click and posts it into the frame; this file is the only place that
 * listens, and it accepts messages from our own extension ids alone.
 */

/** Our extension's ids: the Chrome Web Store's, and the development build's (pinned by the manifest key in extension/key.txt). */
export const EXTENSION_IDS = ["mjgmdkefkachokakimleommdodchkgfo", "jdbigbpnbadjaphglkhomapjbhajbphe"];
export const EXTENSION_ORIGINS = EXTENSION_IDS.map((id) => "chrome-extension://" + id);

/** True inside the panel's routes: links to the rest of the site open in a tab, bars sit at the panel's own edges. */
export const PanelContext = createContext(false);
export const useInPanel = () => useContext(PanelContext);

/** What the extension sends. `text` is the selection or the page's main text, paragraphs split by blank lines. */
/** parts: how many selections were added up into this passage (D112), when it came from selections. */
export interface ArticleIn { type: "article"; title: string; site: string; link: string; text: string; selection: boolean; parts?: number }
export interface WordIn { type: "word"; word: string; sentence: string; title: string; site: string; link: string }
/** The page could not be read (Chrome's own pages, the PDF viewer, Google Docs): the panel offers paste instead. */
export interface UnreadableIn { type: "unreadable" }
export type Incoming = (ArticleIn | WordIn | UnreadableIn) & { at: number };

const LIMITS = { title: 200, site: 100, link: 500, text: 200_000, word: 60, sentence: 600 };
const str = (v: unknown, max: number) => (typeof v === "string" && v.length <= max ? v : null);

/**
 * Checks a message from the extension and returns what the panel may use, or null. Nothing is trusted: the origin
 * must be ours, every field a string within its limit, and a word one to three words of letters.
 */
export function readMessage(origin: string, data: unknown): Incoming | null {
  if (!EXTENSION_ORIGINS.includes(origin) || !data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (d.src !== "99ile-ext") return null;
  const at = Date.now();
  if (d.type === "unreadable") return { type: "unreadable", at };
  const title = str(d.title ?? "", LIMITS.title), site = str(d.site ?? "", LIMITS.site), link = str(d.link ?? "", LIMITS.link);
  if (title === null || site === null || link === null) return null;
  if (d.type === "article") {
    const text = str(d.text, LIMITS.text);
    if (!text || !text.trim()) return null;
    const parts = typeof d.parts === "number" && Number.isInteger(d.parts) && d.parts >= 1 && d.parts <= 12 ? d.parts : undefined;
    return { type: "article", title: title.trim(), site: site.trim(), link: link.trim(), text, selection: d.selection === true, ...(parts ? { parts } : {}), at };
  }
  if (d.type === "word") {
    const word = str(d.word, LIMITS.word)?.trim().replace(/\s+/g, " ");
    const sentence = str(d.sentence ?? "", LIMITS.sentence);
    if (!word || sentence === null || !/^[\p{L}'’-]+( [\p{L}'’-]+){0,2}$/u.test(word)) return null;
    return { type: "word", word, sentence: sentence.trim().replace(/\s+/g, " "), title: title.trim(), site: site.trim(), link: link.trim(), at };
  }
  return null;
}

// The latest message, shared by the panel's pages. Kept in memory only: the extension holds it until the panel reads it.
let inbox: Incoming | null = null;
const subs = new Set<() => void>();
export function setInbox(m: Incoming | null) { inbox = m; subs.forEach((f) => f()); }
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const useInbox = () => useSyncExternalStore(subscribe, () => inbox, () => null);

/** What the panel asks of the extension. */
/**
 * highlight: the deciding lines of a question, as written in the article; the extension marks them on the page.
 * mark: the paragraphs the set is made from, marked lightly on the page, which is where the student reads them.
 * clear-parts: the selections added up on the page are dropped: with their marks on starting over, keeping them once
 * the set is made (the passage is still read there).
 */
export type Outgoing = { type: "ready" } | { type: "highlight"; lines: string[] } | { type: "mark"; paras: string[] } | { type: "clear-parts"; keepMarks?: boolean };

/** Posts to the extension page around the frame, and only to it. Outside a frame (a normal tab) it does nothing. */
export function toExtension(m: Outgoing, origin = parentOrigin()) {
  if (!origin || window.parent === window) return;
  window.parent.postMessage({ src: "99ile-panel", ...m }, origin);
}

/** The extension page's origin, when this page is framed by one of ours. */
export function parentOrigin(): string | null {
  const a = (location as Location & { ancestorOrigins?: DOMStringList }).ancestorOrigins;
  const o = a && a.length ? a[0] : null;
  return o && EXTENSION_ORIGINS.includes(o) ? o : null;
}
