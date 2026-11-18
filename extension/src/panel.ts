export {}; // a module, so its declarations stay its own
/**
 * The side panel page (F53, D110): a full-size frame of 99ile's `/panel` and a relay. What the background read waits
 * in session storage; once the frame says it is ready, it is posted in, to 99ile's origin only, and dropped. The frame
 * asks for "Show me in the article"; this page marks the lines in the tab that was read, under the same activeTab.
 */
declare const chrome: any; // eslint-disable-line @typescript-eslint/no-explicit-any
declare const __SITE__: string;

const frame = document.getElementById("site") as HTMLIFrameElement;
frame.src = __SITE__ + "/panel";
const SITE = new URL(__SITE__).origin;

let ready = false;
let tabId: number | null = null;
let waiting: unknown = null;

const post = (m: object) => frame.contentWindow?.postMessage({ src: "99ile-ext", ...m }, SITE);

function flush() {
  if (!ready || !waiting) return;
  post(waiting as object);
  waiting = null;
  void chrome.storage.session.remove("pending");
}

function take(p: { msg: unknown; tabId: number } | undefined) {
  if (!p) return;
  waiting = p.msg;
  tabId = p.tabId;
  flush();
}

addEventListener("message", (e: MessageEvent) => {
  if (e.origin !== SITE || e.source !== frame.contentWindow) return;
  const d = e.data as { src?: string; type?: string; lines?: unknown; paras?: unknown };
  if (d?.src !== "99ile-panel") return;
  if (d.type === "ready") { ready = true; flush(); }
  const strings = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((l): l is string => typeof l === "string" && l.length <= 20_000).slice(0, max) : []);
  if (d.type === "highlight") void paint("highlight", strings(d.lines, 4), true);
  if (d.type === "mark") void paint("mark", strings(d.paras, 12), false);
  // Start over, or the set was made: the parts gathered on the page go, and so do their marks.
  if (d.type === "clear-parts" && tabId !== null) {
    void chrome.runtime.sendMessage({ to: "ile99", type: "clear-parts", tabId });
    if ((d as { keepMarks?: unknown }).keepMarks !== true) void paint("mark", [], false);
  }
});

/**
 * Runs the reader's highlight (a deciding line) or mark (the passage in use) in the article beside the panel: the tab
 * that is active in this window, else the one last read. A panel that was closed and opened again forgets which tab it
 * read, and the student is looking at the article anyway.
 */
async function paint(what: "highlight" | "mark", texts: string[], answer: boolean) {
  const id = await beside();
  // An empty mark is allowed: it clears the passage's marks.
  if (id === null || (!texts.length && what !== "mark")) { if (answer) post({ type: "highlighted", ok: false, reason: "tab" }); return; }
  // Once more after a moment on a miss: a page still settling (fonts, late content) can make the first try fail.
  let r = await tryPaint(id, what, texts);
  if (r === "missing" && texts.length) { await new Promise((res) => setTimeout(res, 400)); r = await tryPaint(id, what, texts); }
  if (answer) post({ type: "highlighted", ok: r === "ok", ...(r === "ok" ? {} : { reason: r }) });
  // Chrome would not let 99ile into the page: offer the switch that would, even if it was put off before.
  if (r === "access") void showBar(true);
}

async function beside(): Promise<number | null> {
  try {
    const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (typeof t?.id === "number") return t.id;
  } catch { /* fall back to the tab last read */ }
  return tabId;
}

async function tryPaint(id: number, what: string, texts: string[]): Promise<"ok" | "missing" | "access"> {
  try {
    await chrome.scripting.executeScript({ target: { tabId: id }, files: ["reader.js"] });
    const [res] = await chrome.scripting.executeScript({ target: { tabId: id }, func: (w: string, t: string[]) => (globalThis as any).__ile99[w](t), args: [what, texts] }); // eslint-disable-line @typescript-eslint/no-explicit-any
    return res?.result === true ? "ok" : "missing";
  } catch {
    return "access";
  }
}

void chrome.storage.session.get("pending").then((r: { pending?: { msg: unknown; tabId: number } }) => take(r.pending));
chrome.storage.onChanged.addListener((ch: Record<string, { newValue?: { msg: unknown; tabId: number } }>, area: string) => {
  if (area === "session" && ch.pending?.newValue) take(ch.pending.newValue);
});

// "Add to RC set as you select" (D112): off until the student turns it on here, when Chrome asks them once.
const bar = document.getElementById("bar") as HTMLDivElement;
const ALL = { origins: ["<all_urls>"] };
async function showBar(always = false) {
  const on: boolean = await chrome.permissions.contains(ALL);
  const { selectBarDismissed } = await chrome.storage.local.get("selectBarDismissed");
  bar.classList.toggle("on", !on && (always || !selectBarDismissed));
}
(document.getElementById("yes") as HTMLButtonElement).addEventListener("click", async () => {
  const granted: boolean = await chrome.permissions.request(ALL);
  if (granted) bar.classList.remove("on");
});
(document.getElementById("no") as HTMLButtonElement).addEventListener("click", async () => {
  await chrome.storage.local.set({ selectBarDismissed: true });
  bar.classList.remove("on");
});
void showBar();
