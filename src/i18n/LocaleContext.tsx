import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import type { Dictionary } from "./types";
import fr from "./fr";
import { DEFAULT_LOCALE, type Locale } from "./config";

// French is the default language, so it ships with the app. English is a separate file
// that is only downloaded for visitors who open the /en pages.
let enCache: Dictionary | null = null;

interface LocaleContextValue {
  locale: Locale;
  t: Dictionary;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  t: fr,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { lang } = useParams<{ lang: string }>();
  const locale: Locale = lang === "en" ? "en" : "fr";
  const [en, setEn] = useState<Dictionary | null>(enCache);

  useEffect(() => {
    if (locale !== "en" || enCache) return;
    let cancelled = false;
    import("./en").then((m) => {
      enCache = m.default;
      if (!cancelled) setEn(m.default);
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const t = locale === "en" ? en : fr;

  const value = useMemo<LocaleContextValue | null>(() => (t ? { locale, t } : null), [locale, t]);

  // English dictionary still downloading: show the brand background instead of a flash of French.
  if (!value) return <div className="min-h-screen bg-ink" />;

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
