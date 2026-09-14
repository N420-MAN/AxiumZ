import { Link } from "react-router-dom";
import { useLocale } from "../../i18n/LocaleContext";
import { switchLocalePath, type PageKey } from "../../i18n/config";

interface LanguageSwitcherProps {
  page: PageKey;
  className?: string;
}

export default function LanguageSwitcher({ page, className = "" }: LanguageSwitcherProps) {
  const { locale } = useLocale();
  const target = switchLocalePath(locale, page);

  return (
    <Link
      to={target}
      className={`inline-flex items-center gap-1.5 text-[0.8rem] font-medium tracking-[0.04em] ${className}`}
      aria-label={locale === "fr" ? "Switch to English" : "Passer en français"}
    >
      <span className={locale === "fr" ? "opacity-100" : "opacity-40"}>FR</span>
      <span className="opacity-30">/</span>
      <span className={locale === "en" ? "opacity-100" : "opacity-40"}>EN</span>
    </Link>
  );
}
