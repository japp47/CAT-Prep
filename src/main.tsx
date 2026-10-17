import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { FocusProvider } from "./lib/focus";
import { registerServiceWorker } from "./lib/pwa";
import { StoreProvider } from "./lib/store";
import "./index.css";

registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <StoreProvider>
        <FocusProvider>
          <App />
        </FocusProvider>
      </StoreProvider>
    </BrowserRouter>
  </StrictMode>,
);
