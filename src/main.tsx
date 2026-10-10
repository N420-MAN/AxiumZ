import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Self-hosted fonts (Latin subset, only the weights the site uses): no request to Google.
import "@fontsource/poppins/latin-500.css";
import "@fontsource/poppins/latin-600.css";
import "@fontsource/poppins/latin-700.css";
import "@fontsource/poppins/latin-800.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
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
