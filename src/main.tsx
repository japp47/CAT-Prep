import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./App";
import { FocusProvider } from "./lib/focus";
import { registerServiceWorker } from "./lib/pwa";
import { StoreProvider } from "./lib/store";
import "./index.css";

registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoreProvider>
      <FocusProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </FocusProvider>
    </StoreProvider>
  </StrictMode>,
);
