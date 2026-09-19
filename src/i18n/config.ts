export type Locale = "fr" | "en";

export const LOCALES: Locale[] = ["fr", "en"];
export const DEFAULT_LOCALE: Locale = "fr";

export type PageKey =
  | "home"
  | "centre"
  | "activites"
  | "programmes"
  | "methodologie"
  | "contact"
  | "inscription"
  | "monEspace"
  | "privacy"
  | "terms";

/**
 * Slug map: each page key maps to its path segment in each language.
 * "home" has no segment — it is the locale root itself.
 */
export const SLUGS: Record<Locale, Partial<Record<PageKey, string>>> = {
  fr: {
    centre: "centre",
    activites: "activites",
    programmes: "programmes",
    methodologie: "methodologie",
    contact: "contact",
    inscription: "inscription",
    monEspace: "mon-espace",
    privacy: "confidentialite",
    terms: "conditions-generales",
  },
  en: {
    centre: "centre",
    activites: "activites",
    programmes: "programmes",
    methodologie: "methodology",
    contact: "contact",
    inscription: "registration",
    monEspace: "mon-espace",
    privacy: "privacy-policy",
    terms: "terms-of-service",
  },
};

/** Build the absolute path for a given page key + locale. */
export function pathFor(locale: Locale, page: PageKey): string {
  if (page === "home") return `/${locale}`;
  const slug = SLUGS[locale][page];
  return `/${locale}/${slug}`;
}

/** Given a locale and a slug segment, resolve which page key it refers to. */
export function pageForSlug(locale: Locale, slug: string | undefined): PageKey | null {
  if (!slug) return "home";
  const entries = Object.entries(SLUGS[locale]) as [PageKey, string][];
  const found = entries.find(([, s]) => s === slug);
  return found ? found[0] : null;
}

/** Given the current locale + page key, build the equivalent path in the other locale. */
export function switchLocalePath(currentLocale: Locale, page: PageKey): string {
  const target: Locale = currentLocale === "fr" ? "en" : "fr";
  return pathFor(target, page);
}
