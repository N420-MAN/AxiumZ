import { useEffect } from "react";
import { useLocale } from "../i18n/LocaleContext";
import { pathFor, type PageKey } from "../i18n/config";
import { BRAND } from "../data/brand";

const SITE_ORIGIN = "https://axiumz.com";

function setMetaTag(attr: "name" | "property", key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLinkTag(rel: string, href: string, hreflang?: string) {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    if (hreflang) el.setAttribute("hreflang", hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function setJsonLd(id: string, data: Record<string, unknown> | null) {
  let el = document.querySelector(`script[data-jsonld="${id}"]`);
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.setAttribute("type", "application/ld+json");
    el.setAttribute("data-jsonld", id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/** Sets title, description, canonical + hreflang alternates, the html lang attribute, and (on the homepage) local-business JSON-LD. */
export function usePageMeta(title: string, description: string, page: PageKey = "home") {
  const { locale } = useLocale();

  useEffect(() => {
    document.title = title;
    document.documentElement.lang = locale;

    setMetaTag("name", "description", description);
    setMetaTag("property", "og:title", title);
    setMetaTag("property", "og:description", description);
    setMetaTag("property", "og:locale", locale === "fr" ? "fr_FR" : "en_US");
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", title);
    setMetaTag("name", "twitter:description", description);

    const frPath = pathFor("fr", page);
    const enPath = pathFor("en", page);
    const currentPath = pathFor(locale, page);

    setLinkTag("canonical", `${SITE_ORIGIN}${currentPath}`);
    setLinkTag("alternate", `${SITE_ORIGIN}${frPath}`, "fr");
    setLinkTag("alternate", `${SITE_ORIGIN}${enPath}`, "en");

    // Local-business structured data, only on the homepage (one org identity per site).
    if (page === "home") {
      setJsonLd("organization", {
        "@context": "https://schema.org",
        "@type": "EducationalOrganization",
        name: BRAND.name,
        url: SITE_ORIGIN,
        telephone: BRAND.phoneIntl,
        description,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Casablanca",
          addressCountry: "MA",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: BRAND.coordinates.lat,
          longitude: BRAND.coordinates.lng,
        },
        areaServed: "Casablanca",
        sameAs: [],
      });
    } else {
      setJsonLd("organization", null);
    }
  }, [title, description, locale, page]);
}

