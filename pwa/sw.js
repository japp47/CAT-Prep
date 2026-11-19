/* Service worker template. vite.config.ts fills in the version, base path and file list at build time. */
const VERSION = "__VERSION__";
const BASE = "__BASE__";
const FILES = ["__FILES__"];
const CACHE = "cat-prep-" + VERSION;

/**
 * A page where a code file or stylesheet should be: what the host sends for a missing file, and what a cache kept by
 * mistake during a deploy (20 Nov 2026). Never stored and never served.
 */
const wrong = (url, res) => /\.(m?js|css)$/.test(url.pathname) && (res.headers.get("content-type") || "").includes("text/html");

// Each file straight from the network (not the browser's cache) and checked. One bad file fails the install: the
// version before stays, and the browser tries again on a later visit.
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(FILES.map(async (f) => {
    const url = new URL(BASE + f, self.location.origin);
    const res = await fetch(url, { cache: "reload" });
    if (!res.ok || wrong(url, res)) throw new Error("Not ready: " + f);
    await c.put(url, res);
  }))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("cat-prep-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // Pages: try the network for the newest version, fall back to the cached app shell.
    if (req.mode === "navigate") {
      e.respondWith(fetch(req).catch(() => caches.match(BASE + "index.html")));
      return;
    }
    // Built files have hashed names, so a cached copy is the right one, unless it is a page in place of code. A page
    // from the network is asked for once more past the browser's cache; still a page, the load fails (and the site
    // reloads once, lib/reload.ts) rather than running a page as code.
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit && !wrong(url, hit)) return hit;
      let res = await fetch(req);
      if (wrong(url, res)) res = await fetch(req, { cache: "reload" });
      return wrong(url, res) ? Response.error() : res;
    })());
    return;
  }
});

// Study reminders (docs/design/notifications.md §8): the server sends {title, body, url, tag}; a newer reminder
// replaces an older one with the same tag. A tap opens the page it names, on this site only.
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { /* not ours: show a plain notice */ }
  e.waitUntil(self.registration.showNotification(d.title || "99ile", {
    body: d.body || "",
    tag: d.tag || "reminder",
    icon: BASE + "icon-192.png",
    data: { url: d.url || BASE + "today" },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  let url = BASE + "today";
  try {
    const u = new URL(e.notification.data && e.notification.data.url, self.location.origin);
    if (u.origin === self.location.origin) url = u.href;
  } catch { /* keep Today */ }
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => new URL(c.url).origin === self.location.origin && "focus" in c);
    if (open) return open.navigate(url).then((c) => (c || open).focus());
    return self.clients.openWindow(url);
  }));
});
