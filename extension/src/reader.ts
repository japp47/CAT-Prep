import { Readability } from "@mozilla/readability";
import { asParagraphs, locate, sentenceWith } from "./text";

/**
 * Runs in the student's tab, and only after their click (activeTab): reads the article or the selection, finds a
 * saved word's sentence, and marks deciding lines for "Show me in the article". Nothing here runs on its own and
 * nothing is sent anywhere; the background script passes what it returns to 99ile's panel.
 */

type Kind = "article" | "word";
const BLOCKS = "p, li, blockquote, h2, h3, h4, pre, figcaption";
/** Fewer words than this from Readability means the page is not really readable (a canvas, a viewer, an app). */
const MIN_PAGE_WORDS = 80;
const MIN_SELECTION_WORDS = 30;

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const siteName = () =>
  document.querySelector<HTMLMetaElement>('meta[property="og:site_name"]')?.content?.trim() || location.hostname.replace(/^www\./, "");
const pageTitle = () =>
  document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content?.trim() || document.querySelector("h1")?.textContent?.trim() || document.title;

/** The selection's blocks, as paragraphs; a selection inside one block comes back as itself. */
function selectionText(sel: Selection): string {
  const box = document.createElement("div");
  for (let i = 0; i < sel.rangeCount; i++) box.appendChild(sel.getRangeAt(i).cloneContents());
  const blocks = [...box.querySelectorAll(BLOCKS)].filter((b) => !b.querySelector(BLOCKS)).map((b) => b.textContent ?? "");
  return blocks.length > 1 ? asParagraphs(blocks) : asParagraphs(sel.toString().split(/\n+/));
}

function readArticle() {
  const sel = getSelection();
  const chosen = sel && !sel.isCollapsed ? selectionText(sel) : "";
  const base = { title: pageTitle().slice(0, 200), site: siteName().slice(0, 100), link: location.href.slice(0, 500) };
  if (wordCount(chosen) >= MIN_SELECTION_WORDS) return { type: "article", ...base, text: chosen, selection: true };
  const doc = document.cloneNode(true) as Document;
  const art = new Readability(doc, { charThreshold: 300 }).parse();
  if (!art?.content) return chosen ? { type: "article", ...base, text: chosen, selection: true } : { type: "unreadable" };
  // An inert document: nothing in it loads or runs, and it never touches the page.
  const box = new DOMParser().parseFromString(art.content, "text/html").body;
  const blocks = [...box.querySelectorAll(BLOCKS)].filter((b) => !b.querySelector(BLOCKS)).map((b) => b.textContent ?? "");
  const text = asParagraphs(blocks.length ? blocks : (art.textContent ?? "").split(/\n+/));
  if (wordCount(text) < MIN_PAGE_WORDS) return chosen ? { type: "article", ...base, text: chosen, selection: true } : { type: "unreadable" };
  return { type: "article", ...base, title: (art.title || base.title).slice(0, 200), site: (art.siteName || base.site).slice(0, 100), text, selection: false };
}

function readWord() {
  const sel = getSelection();
  const word = (sel?.toString() ?? "").replace(/\s+/g, " ").trim().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
  const node = sel?.anchorNode;
  const block = (node instanceof Element ? node : node?.parentElement)?.closest(BLOCKS + ", div, td");
  const sentence = block ? sentenceWith(block.textContent ?? "", word) : "";
  return { type: "word", word: word.slice(0, 60), sentence, title: pageTitle().slice(0, 200), site: siteName().slice(0, 100), link: location.href.slice(0, 500) };
}

/** The page's visible text, with the text node and offset behind each character, to turn a match into a Range. */
function pageText() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest("script, style, noscript, [hidden], [aria-hidden=true]") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes: { node: Text; from: number }[] = [];
  let text = "";
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    nodes.push({ node: n as Text, from: text.length });
    text += (n as Text).data;
  }
  const at = (i: number) => {
    let lo = 0, hi = nodes.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (nodes[mid].from <= i) lo = mid; else hi = mid - 1; }
    return { node: nodes[lo].node, offset: i - nodes[lo].from };
  };
  return { text, at };
}

const STYLE_ID = "ile99-highlight-style";
/** The passage in use, lightly; a deciding line, in the highlighter's full yellow and on top of it. */
const STYLE = "::highlight(ile99-used){background-color:rgba(255,225,90,.32)}::highlight(ile99-proof){background-color:#FFE15A;color:#141A24}";

/** Marks each text on the page under `name` and scrolls to the first. True when at least one was found. */
function paint(texts: string[], name: "ile99-used" | "ile99-proof", max: number): boolean {
  type Hl = { priority: number };
  const H = (globalThis as unknown as { Highlight?: new (...r: Range[]) => Hl }).Highlight;
  const registry = (CSS as unknown as { highlights?: Map<string, Hl> }).highlights;
  if (!H || !registry) return false;
  const { text, at } = pageText();
  const ranges: Range[] = [];
  for (const t of texts.slice(0, max)) {
    const hit = locate(text, t);
    if (!hit) continue;
    const a = at(hit[0]), b = at(hit[1] - 1);
    const r = document.createRange();
    r.setStart(a.node, a.offset);
    r.setEnd(b.node, b.offset + 1);
    ranges.push(r);
  }
  registry.delete(name);
  if (!ranges.length) return false;
  const h = new H(...ranges);
  h.priority = name === "ile99-proof" ? 1 : 0;
  registry.set(name, h);
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = STYLE;
    document.head.appendChild(s);
  }
  const el = ranges[0].startContainer.parentElement;
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  el?.scrollIntoView({ block: name === "ile99-proof" ? "center" : "start", behavior: calm ? "auto" : "smooth" });
  return true;
}

(globalThis as unknown as { __ile99: unknown }).__ile99 = {
  read: (kind: Kind) => (kind === "word" ? readWord() : readArticle()),
  /** A question's deciding lines, for "Show me in the article". */
  highlight: (lines: string[]) => paint(lines, "ile99-proof", 4),
  /** The paragraphs the set is made from: the passage, read on the page itself. */
  mark: (paras: string[]) => paint(paras, "ile99-used", 12),
};
