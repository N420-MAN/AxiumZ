import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import type { Dictionary } from "./types";
import fr from "./fr";
import en from "./en";
import { DEFAULT_LOCALE, type Locale } from "./config";

const DICTIONARIES: Record<Locale, Dictionary> = { fr, en };

interface LocaleContextValue {
  locale: Locale;
  t: Dictionary;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  t: DICTIONARIES[DEFAULT_LOCALE],
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { lang } = useParams<{ lang: string }>();
  const locale: Locale = lang === "en" ? "en" : "fr";

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, t: DICTIONARIES[locale] }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
