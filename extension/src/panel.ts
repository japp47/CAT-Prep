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
});

/** Runs the reader's highlight (a deciding line) or mark (the passage in use) in the tab that was read. */
async function paint(what: "highlight" | "mark", texts: string[], answer: boolean) {
  if (tabId === null || !texts.length) { if (answer) post({ type: "highlighted", ok: false }); return; }
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["reader.js"] });
    const [res] = await chrome.scripting.executeScript({ target: { tabId }, func: (w: string, t: string[]) => (globalThis as any).__ile99[w](t), args: [what, texts] }); // eslint-disable-line @typescript-eslint/no-explicit-any
    if (answer) post({ type: "highlighted", ok: res?.result === true });
  } catch {
    if (answer) post({ type: "highlighted", ok: false });
  }
}

void chrome.storage.session.get("pending").then((r: { pending?: { msg: unknown; tabId: number } }) => take(r.pending));
chrome.storage.onChanged.addListener((ch: Record<string, { newValue?: { msg: unknown; tabId: number } }>, area: string) => {
  if (area === "session" && ch.pending?.newValue) take(ch.pending.newValue);
});
