import { supabase } from "./supabaseClient";

// Our own, cookie-free counter for the public site: it feeds the "Visites du site"
// page in Mon Espace. It stores no IP address and no personal data. A visitor is a
// random id that lives only in the browser tab (sessionStorage) and disappears when
// the tab is closed, so it counts visits, not people.

export type SiteEvent = "pageview" | "inscription_click" | "whatsapp_click" | "call_click" | "pack_choose" | "form_submit";

const KEY = "axz-visit";

function visitorId(): string {
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, "");
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

function device(): "mobile" | "tablet" | "desktop" {
  const w = window.innerWidth;
  return w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop";
}

function referrerName(): string {
  try {
    if (!document.referrer) return "";
    const host = new URL(document.referrer).hostname.replace(/^www\./, "");
    if (host === window.location.hostname.replace(/^www\./, "")) return "";
    for (const known of ["google", "bing", "instagram", "facebook", "tiktok", "youtube", "whatsapp", "linkedin", "yahoo", "duckduckgo"]) {
      if (host.includes(known)) return known;
    }
    return host;
  } catch {
    return "";
  }
}

const isBot = () => typeof navigator === "undefined" || navigator.webdriver === true || /bot|crawl|spider|headless|lighthouse/i.test(navigator.userAgent);

/** Fire and forget: a failure here must never be visible to the visitor. */
export function trackSite(event: SiteEvent, label?: string) {
  try {
    if (typeof window === "undefined" || isBot()) return;
    const path = window.location.pathname;
    if (path.includes("/mon-espace")) return;
    const visitor = visitorId();
    if (!visitor) return;
    void Promise.resolve(
      supabase.rpc("track_site_event", {
        p_visitor: visitor,
        p_event: event,
        p_path: path,
        p_label: label ?? null,
        p_referrer: referrerName() || null,
        p_device: device(),
      }),
    ).catch(() => undefined);
  } catch {
    /* ignore */
  }
}

/** Counts a click on any link to the registration page, wherever it sits. Call once at start. */
export function initSiteStats() {
  if (typeof document === "undefined") return;
  document.addEventListener(
    "click",
    (e) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      const href = a?.getAttribute("href") ?? "";
      if (/\/(inscription|registration)(\?|$|\/)/.test(href)) trackSite("inscription_click", window.location.pathname);
    },
    { capture: true },
  );
}
