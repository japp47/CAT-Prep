export {}; // a module, so its declarations stay its own
/**
 * The extension's background (F53, D110, D112). Ways to start, each a click: the toolbar icon, the right-click menu,
 * Alt+Shift+R, and the "Add to RC set" button beside a selection. The panel is opened first, in the same turn as the
 * click (Chrome allows it only then), and the text is gathered after. Selections add up: each one is a part of the
 * same set, until the student starts over, makes the set, or the page changes. What was gathered waits in session
 * storage for the panel, which passes it into 99ile's frame.
 */
declare const chrome: any; // eslint-disable-line @typescript-eslint/no-explicit-any
declare const __SITE__: string;

type Kind = "article" | "word";
interface Article { type: "article"; title: string; site: string; link: string; text: string; selection: boolean }
interface Parts { link: string; texts: string[]; title: string; site: string }

const SELECT_ID = "ile99-select";
const ALL = { origins: ["<all_urls>"] };
const MAX_PARTS = 12;

chrome.runtime.onInstalled.addListener((d: { reason: string }) => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "make", title: "Make an RC set from this", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "word", title: "Add “%s” to my words", contexts: ["selection"] });
  });
  void syncSelectButton();
  // Sign-in happens on the site, once; the welcome page says what the extension does and what it can see.
  if (d.reason === "install") chrome.tabs.create({ url: __SITE__ + "/extension?from=install" });
});
chrome.runtime.onStartup.addListener(() => void syncSelectButton());
chrome.permissions.onAdded.addListener(() => void syncSelectButton());
chrome.permissions.onRemoved.addListener(() => void syncSelectButton());

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });

chrome.action.onClicked.addListener((tab: { id?: number }) => start(tab, "article"));
chrome.commands.onCommand.addListener((cmd: string, tab?: { id?: number }) => { if (cmd === "make-set" && tab) start(tab, "article"); });
chrome.contextMenus.onClicked.addListener((info: { menuItemId: string; selectionText?: string }, tab?: { id?: number }) => {
  if (!tab) return;
  // More than three words is a passage, not a word.
  const many = (info.selectionText ?? "").trim().split(/\s+/).length > 3;
  start(tab, info.menuItemId === "word" && !many ? "word" : "article");
});

// The button beside a selection (select.ts), and the panel starting over or having made its set.
chrome.runtime.onMessage.addListener((m: Record<string, unknown>, sender: { tab?: { id?: number }; id?: string }, reply: (r: unknown) => void) => {
  if (sender.id !== chrome.runtime.id || m?.to !== "ile99") return;
  if (m.type === "clear-parts" && typeof m.tabId === "number") { void chrome.storage.session.remove("parts:" + m.tabId); return; }
  const tabId = sender.tab?.id;
  if (tabId === undefined || (m.type !== "add" && m.type !== "word")) return;
  // Opened in the click's turn when Chrome allows it; when it does not, the button says to click the icon.
  chrome.sidePanel.open({ tabId }).then(() => reply({ opened: true }), () => reply({ opened: false }));
  const s = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
  const base = { title: s(m.title, 200), site: s(m.site, 100), link: s(m.link, 500) };
  if (m.type === "word") void hand(tabId, { type: "word", word: s(m.word, 60), sentence: s(m.sentence, 600), ...base });
  else void addPart(tabId, { type: "article", ...base, text: s(m.text, 200_000), selection: true });
  return true; // the reply comes after the panel opens
});

function start(tab: { id?: number }, kind: Kind) {
  if (tab.id === undefined) return;
  chrome.sidePanel.open({ tabId: tab.id }); // before any await: Chrome needs the click's turn
  void read(tab.id, kind);
}

async function read(tabId: number, kind: Kind) {
  let msg: unknown = { type: "unreadable" };
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["reader.js"] });
    const [res] = await chrome.scripting.executeScript({ target: { tabId }, func: (k: Kind) => (globalThis as any).__ile99.read(k), args: [kind] }); // eslint-disable-line @typescript-eslint/no-explicit-any
    if (res?.result) msg = res.result;
    // From now on this page also gets the button beside a selection, until the student leaves it.
    await chrome.scripting.executeScript({ target: { tabId }, files: ["select.js"] }).catch(() => undefined);
  } catch {
    // Chrome's own pages, the Web Store and the PDF viewer refuse scripts: the panel offers paste instead.
  }
  const a = msg as Partial<Article>;
  if (a.type === "article" && a.selection) return addPart(tabId, a as Article);
  // The whole article, a word or nothing readable: any parts gathered on this tab are set aside.
  if (a.type === "article") await chrome.storage.session.remove("parts:" + tabId);
  await hand(tabId, msg);
}

/** A selection joins the parts already gathered on this page, and the panel gets them all as one passage. */
async function addPart(tabId: number, a: Article) {
  const key = "parts:" + tabId;
  const had: Parts | undefined = (await chrome.storage.session.get(key))[key];
  const same = had && had.link === a.link;
  const texts = [...(same ? had.texts : []), a.text].filter((t) => t.trim()).slice(-MAX_PARTS);
  const parts: Parts = { link: a.link, texts, title: same ? had.title : a.title, site: same ? had.site : a.site };
  await chrome.storage.session.set({ [key]: parts });
  await hand(tabId, { type: "article", title: parts.title, site: parts.site, link: a.link, text: texts.join("\n\n"), selection: true, parts: texts.length });
}

const hand = (tabId: number, msg: unknown) => chrome.storage.session.set({ pending: { msg, tabId, at: Date.now() } });

/** The button runs on every page only while the student has given 99ile access to all sites (they switch it on). */
async function syncSelectButton() {
  const on: boolean = await chrome.permissions.contains(ALL);
  const have = (await chrome.scripting.getRegisteredContentScripts({ ids: [SELECT_ID] })).length > 0;
  if (on && !have) {
    await chrome.scripting.registerContentScripts([{ id: SELECT_ID, js: ["select.js"], matches: ["<all_urls>"], excludeMatches: [__SITE__ + "/*"], runAt: "document_idle", persistAcrossSessions: true }]);
  } else if (!on && have) {
    await chrome.scripting.unregisterContentScripts({ ids: [SELECT_ID] });
  }
}
