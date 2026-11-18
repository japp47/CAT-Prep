import { asParagraphs, sentenceWith, withoutSite } from "./text";

/**
 * The "Add to RC set" button (F53, D112): when the student finishes selecting text, a small button appears beside the
 * selection. Runs on every page only if the student switched it on (Chrome asked them once), else only on a page
 * where they already clicked the 99ile icon or its right-click entry. It watches for a selection and nothing else,
 * and sends nothing until the button is clicked.
 */

declare const chrome: any; // eslint-disable-line @typescript-eslint/no-explicit-any
/**
 * The 99ile logo as SVG markup, inlined at build time: nothing is loaded, so no page's rules can block it, and no file
 * of the extension has to be open to every site.
 */
declare const __LOGO__: string;

const BLOCKS = "p, li, blockquote, h2, h3, h4, pre, figcaption";
/** A passage starts at this many words; one to three words are a word to save. */
const MIN_PASSAGE = 15, MAX_WORD = 3;

const g = globalThis as unknown as { __ile99select?: boolean };
if (!g.__ile99select) {
  g.__ile99select = true;
  start();
}

function start() {
  const host = document.createElement("div");
  host.style.cssText = "all:initial;position:absolute;top:0;left:0;width:0;height:0;z-index:2147483647";
  const root = host.attachShadow({ mode: "closed" });
  root.innerHTML = `<style>
    .b{position:absolute;display:none;align-items:center;gap:8px;padding:8px 12px 8px 9px;border:0;border-radius:8px;cursor:pointer;
      font:600 14px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff;background:#2340C8;white-space:nowrap;
      box-shadow:0 4px 14px rgba(20,26,36,.22)}
    .b:hover{background:#1b33a6}.b:focus-visible{outline:2px solid #FFE15A;outline-offset:2px}
    .b i{display:block;width:18px;height:18px}.b i svg{display:block;width:18px;height:18px}
    .b.note{background:#141A24;cursor:default}
    @media (prefers-reduced-motion:no-preference){.b{transition:opacity .15s ease}}
  </style><button class="b" type="button"><i aria-hidden="true">${__LOGO__}</i><span></span></button>`;
  const btn = root.querySelector("button") as HTMLButtonElement;
  const label = root.querySelector("span") as HTMLSpanElement;
  document.documentElement.appendChild(host);

  let what: { kind: "add" | "word"; data: Record<string, unknown> } | null = null;
  const hide = () => { btn.style.display = "none"; btn.classList.remove("note"); what = null; };

  const show = () => {
    const sel = getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { hide(); return; }
    // Not inside fields the student is typing in.
    const a = sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode?.parentElement;
    if (a?.closest("input, textarea, [contenteditable=''], [contenteditable=true]")) { hide(); return; }
    const flat = sel.toString().replace(/\s+/g, " ").trim();
    const n = flat ? flat.split(" ").length : 0;
    const base = { title: pageTitle().slice(0, 200), site: siteName().slice(0, 100), link: location.href.slice(0, 500) };
    if (n >= MIN_PASSAGE) {
      what = { kind: "add", data: { ...base, text: selectionText(sel) } };
      label.textContent = `Add to RC set · ${n.toLocaleString("en-IN")} words`;
    } else if (n >= 1 && n <= MAX_WORD) {
      const word = flat.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
      if (!word) { hide(); return; }
      const block = (a as Element | null)?.closest(BLOCKS + ", div, td");
      what = { kind: "word", data: { ...base, word: word.slice(0, 60), sentence: block ? sentenceWith(block.textContent ?? "", word) : "" } };
      label.textContent = "Add to my words";
    } else { hide(); return; }
    const rects = sel.getRangeAt(0).getClientRects();
    const r = rects[rects.length - 1] ?? sel.getRangeAt(0).getBoundingClientRect();
    btn.classList.remove("note");
    btn.style.display = "flex";
    const w = btn.offsetWidth, h = btn.offsetHeight;
    const x = Math.min(Math.max(8, r.right - w / 2), innerWidth - w - 8);
    const below = r.bottom + 10 + h < innerHeight;
    // Beside the end of the selection, but always inside the window: a long or keyboard selection can end off-screen.
    const y = Math.min(Math.max(8, below ? r.bottom + 10 : r.top - h - 10), innerHeight - h - 8);
    btn.style.left = `${x + scrollX}px`;
    btn.style.top = `${y + scrollY}px`;
  };

  let timer = 0;
  const later = () => { clearTimeout(timer); timer = window.setTimeout(show, 120); };
  document.addEventListener("mouseup", (e) => { if (e.composedPath().includes(host)) return; later(); }, true);
  document.addEventListener("keyup", (e) => { if (e.key === "Escape") hide(); else if (e.shiftKey || e.key === "Shift") later(); }, true);
  document.addEventListener("mousedown", (e) => { if (!e.composedPath().includes(host)) hide(); }, true);
  document.addEventListener("selectionchange", () => { if (getSelection()?.isCollapsed) hide(); });
  // No hiding on scroll: the button is placed on the page, so it moves with the text, and some sites scroll on their own.

  // The click is the student's: the background opens the panel in the same turn and adds the text to the set.
  btn.addEventListener("click", () => {
    if (!what) return;
    const sent = what;
    chrome.runtime.sendMessage({ to: "ile99", type: sent.kind, ...sent.data }).then((r: { opened?: boolean } | undefined) => {
      if (r && r.opened === false) {
        btn.classList.add("note");
        label.textContent = sent.kind === "word" ? "Added. Click the 99ile icon to see it." : "Added. Click the 99ile icon to see your set.";
        setTimeout(hide, 3500);
      } else hide();
    }).catch(hide);
    if (sent.kind === "add") markSelection();
  });
}

/** The added part, lightly highlighted where it is, at once; the panel marks the exact paragraphs after. */
function markSelection() {
  const H = (globalThis as unknown as { Highlight?: new (...r: Range[]) => { add(r: Range): void } }).Highlight;
  const reg = (CSS as unknown as { highlights?: Map<string, { add(r: Range): void }> }).highlights;
  const sel = getSelection();
  if (!H || !reg || !sel?.rangeCount) return;
  const r = sel.getRangeAt(0).cloneRange();
  const h = reg.get("ile99-used");
  if (h) h.add(r); else reg.set("ile99-used", new H(r));
  if (!document.getElementById("ile99-highlight-style")) {
    const s = document.createElement("style");
    s.id = "ile99-highlight-style";
    s.textContent = "::highlight(ile99-used){background-color:rgba(255,225,90,.32)}::highlight(ile99-proof){background-color:#FFE15A;color:#141A24}";
    document.head.appendChild(s);
  }
  sel.removeAllRanges();
}

function selectionText(sel: Selection): string {
  const box = document.createElement("div");
  for (let i = 0; i < sel.rangeCount; i++) box.appendChild(sel.getRangeAt(i).cloneContents());
  const blocks = [...box.querySelectorAll(BLOCKS)].filter((b) => !b.querySelector(BLOCKS)).map((b) => b.textContent ?? "");
  return (blocks.length > 1 ? asParagraphs(blocks) : asParagraphs(sel.toString().split(/\n+/))).slice(0, 200_000);
}

const siteName = () =>
  document.querySelector<HTMLMetaElement>('meta[property="og:site_name"]')?.content?.trim() || location.hostname.replace(/^www\./, "");
const pageTitle = () => withoutSite(
  document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content?.trim() || document.querySelector("h1")?.textContent?.trim() || document.title,
  location.hostname);
