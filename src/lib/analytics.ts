// ---------------------------------------------------------------------------
// Google Analytics 4 (GA4) integration.
//
// Events are queued in `dataLayer` straight away; the Google script itself is only
// downloaded after the visitor's first interaction (or 3.5 s), so it never competes
// with the first screen. Google processes the queued events when it loads.
// ---------------------------------------------------------------------------
const GA_MEASUREMENT_ID: string = "G-63TTC9L6F1";

const isConfigured = GA_MEASUREMENT_ID !== "G-XXXXXXXXXX";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let queued = false;
let scriptRequested = false;

/** Creates the in-page queue (no network). Safe to call many times. */
function ensureQueue() {
  if (queued || !isConfigured || typeof window === "undefined") return;
  queued = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag("js", new Date());
  // send_page_view disabled: this is an SPA, we fire page_view manually on route change.
  window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });
}

function loadScript() {
  if (scriptRequested) return;
  scriptRequested = true;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

/** Call once, on app start. Starts the queue now and loads Google's script a little later. */
export function initAnalytics() {
  if (!isConfigured || typeof window === "undefined") return;
  ensureQueue();

  const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "scroll", "touchstart"];
  const start = () => {
    events.forEach((e) => window.removeEventListener(e, start));
    window.clearTimeout(timer);
    loadScript();
  };
  const timer = window.setTimeout(start, 3500);
  events.forEach((e) => window.addEventListener(e, start, { passive: true, once: true }));
}

/** Call on every route change (SPA navigation doesn't trigger a real page load). */
export function trackPageView(path: string, title?: string) {
  if (!isConfigured) return;
  ensureQueue();
  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title,
    page_location: window.location.href,
  });
}

/**
 * Call for the actions that actually matter for this site: WhatsApp clicks,
 * phone clicks, and successful form submissions. These are the "conversions".
 */
export function trackEvent(name: "whatsapp_click" | "call_click" | "form_submit", params?: Record<string, string>) {
  if (!isConfigured) return;
  ensureQueue();
  window.gtag("event", name, params);
}
