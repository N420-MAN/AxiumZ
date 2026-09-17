import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
// Imported first, before App, so this module's capture of the URL hash
// (see the file for why that timing matters) happens as early as possible.
import "./lib/authFlowCapture";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
