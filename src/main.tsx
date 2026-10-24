import { lazy, StrictMode, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./App";
import { FocusProvider } from "./lib/focus";
import { registerServiceWorker, repairViewport } from "./lib/pwa";
import { StoreProvider } from "./lib/store";
import { API_ENABLED } from "./lib/api";
import { whenIdle } from "./lib/idle";
import "./index.css";

repairViewport();
registerServiceWorker();

// Sync runs only in builds with the API on, and loads once the browser is idle, never with the first page.
const SyncRunner = API_ENABLED ? lazy(() => import("./components/SyncRunner")) : null;
function Sync() {
  const [ready, setReady] = useState(false);
  useEffect(() => whenIdle(() => setReady(true)), []);
  return SyncRunner && ready ? <Suspense fallback={null}><SyncRunner /></Suspense> : null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoreProvider>
      {API_ENABLED && <Sync />}
      <FocusProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </FocusProvider>
    </StoreProvider>
  </StrictMode>,
);
