// ---------------------------------------------------------------------------
// Google Analytics 4 (GA4) integration.
//
// SETUP: replace the placeholder below with your real GA4 Measurement ID
// (looks like "G-XXXXXXXXXX"). You get this from analytics.google.com after
// creating a property for axiumz.com. Until you do, analytics is a safe
// no-op — the site works normally, nothing is sent anywhere.
// ---------------------------------------------------------------------------
const GA_MEASUREMENT_ID: string = "G-63TTC9L6F1";

const isConfigured = GA_MEASUREMENT_ID !== "G-XXXXXXXXXX";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let initialized = false;

/** Injects the GA4 script and initializes tracking. Call once, on app start. */
export function initAnalytics() {
  if (initialized || !isConfigured || typeof window === "undefined") return;
  initialized = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag("js", new Date());
  // send_page_view disabled: this is an SPA, we fire page_view manually on route change.
  window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });
}

/** Call on every route change (SPA navigation doesn't trigger a real page load). */
export function trackPageView(path: string, title?: string) {
  if (!isConfigured || typeof window.gtag !== "function") return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title,
    page_location: window.location.href,
  });
}

/**
 * Call for the actions that actually matter for this site: WhatsApp clicks,
 * phone clicks, and successful form submissions. These are the "conversions"
 * — see the explanation in chat for how to mark them as Conversions in GA4.
 */
export function trackEvent(name: "whatsapp_click" | "call_click" | "form_submit", params?: Record<string, string>) {
  if (!isConfigured || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}
