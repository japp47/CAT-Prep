import { lazy, StrictMode, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./App";
import { FocusProvider } from "./lib/focus";
import { registerServiceWorker, repairViewport } from "./lib/pwa";
import { StoreProvider } from "./lib/store";
import { API_ENABLED } from "./lib/api";
import { movedTo } from "./lib/domain";
import { whenIdle } from "./lib/idle";
import { takeReminderVisit } from "./lib/notify";
import "./index.css";

// The old address (99ile.pages.dev) only sends students to 99ile.in. Nothing boots there: no service worker, no store.
const moved = movedTo(location);
if (moved) location.replace(moved);
else {
  repairViewport();
  registerServiceWorker();
  if (API_ENABLED) takeReminderVisit();
}

// Sync runs only in builds with the API on, and loads once the browser is idle, never with the first page.
const SyncRunner = API_ENABLED ? lazy(() => import("./components/SyncRunner")) : null;
function Sync() {
  const [ready, setReady] = useState(false);
  useEffect(() => whenIdle(() => setReady(true)), []);
  return SyncRunner && ready ? <Suspense fallback={null}><SyncRunner /></Suspense> : null;
}

if (!moved) createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoreProvider>
      {API_ENABLED && <Sync />}
      <FocusProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </FocusProvider>
    </StoreProvider>
  </StrictMode>,
);
