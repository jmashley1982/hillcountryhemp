// Suppress non-fatal ResizeObserver loop warnings before Replit's error overlay
// can intercept them. These fire via window.onerror with event.error = null and
// are harmless browser notices, not real errors.
window.addEventListener(
  "error",
  (e) => {
    if (e.message && e.message.includes("ResizeObserver")) {
      e.stopImmediatePropagation();
    }
  },
  true, // capture phase — runs before the Replit plugin's handler
);

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
