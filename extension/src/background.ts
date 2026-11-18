export {}; // a module, so its declarations stay its own
/**
 * The extension's background (F53, D110). Three ways to start, each a click Chrome itself shows, so each grants
 * activeTab for that tab only: the toolbar icon, the right-click menu and Alt+Shift+R. The panel is opened first, in
 * the same turn as the click (Chrome allows it only then), and the tab is read after. What was read waits in session
 * storage for the panel, which passes it into 99ile's frame.
 */
declare const chrome: any; // eslint-disable-line @typescript-eslint/no-explicit-any
declare const __SITE__: string;

type Kind = "article" | "word";

chrome.runtime.onInstalled.addListener((d: { reason: string }) => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "make", title: "Make an RC set from this", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "word", title: "Add “%s” to my words", contexts: ["selection"] });
  });
  // Sign-in happens on the site, once; the welcome page says what the extension does and what it can see.
  if (d.reason === "install") chrome.tabs.create({ url: __SITE__ + "/extension" });
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });

chrome.action.onClicked.addListener((tab: { id?: number }) => start(tab, "article"));
chrome.commands.onCommand.addListener((cmd: string, tab?: { id?: number }) => { if (cmd === "make-set" && tab) start(tab, "article"); });
chrome.contextMenus.onClicked.addListener((info: { menuItemId: string; selectionText?: string }, tab?: { id?: number }) => {
  if (!tab) return;
  // More than three words is a passage, not a word.
  const many = (info.selectionText ?? "").trim().split(/\s+/).length > 3;
  start(tab, info.menuItemId === "word" && !many ? "word" : "article");
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
  } catch {
    // Chrome's own pages, the Web Store and the PDF viewer refuse scripts: the panel offers paste instead.
  }
  await chrome.storage.session.set({ pending: { msg, tabId, at: Date.now() } });
}
