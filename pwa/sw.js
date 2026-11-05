/* Service worker template. vite.config.ts fills in the version, base path and file list at build time. */
const VERSION = "__VERSION__";
const BASE = "__BASE__";
const FILES = ["__FILES__"];
const CACHE = "cat-prep-" + VERSION;

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
