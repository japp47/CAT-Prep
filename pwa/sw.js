/* Service worker template. vite.config.ts fills in the version, base path and file list at build time. */
const VERSION = "__VERSION__";
const BASE = "__BASE__";
const FILES = ["__FILES__"];
const CACHE = "cat-prep-" + VERSION;
const FONTS = "fonts-cat-prep";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => BASE + f))).then(() => self.skipWaiting()));
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
    // Built files have hashed names, so a cached copy is always the right one.
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
    return;
  }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONTS).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === "opaque") c.put(req, res.clone());
      return res;
    }));
  }
});
