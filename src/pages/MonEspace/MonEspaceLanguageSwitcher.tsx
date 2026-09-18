import { useLocation, useNavigate } from "react-router-dom";
import { useLocale } from "../../i18n/LocaleContext";

export default function MonEspaceLanguageSwitcher() {
  const { locale } = useLocale();
  const location = useLocation();
  const navigate = useNavigate();

  function switchTo(target: "fr" | "en") {
    if (target === locale) return;
    // Mon Espace's sub-paths (aujourdhui, planning, etc.) are identical in
    // both languages — unlike the marketing site's localized slugs — so
    // switching is just swapping the leading /fr or /en segment in place.
    const newPath = location.pathname.replace(/^\/(fr|en)/, `/${target}`);
    navigate(newPath, { replace: true });
  }

  return (
    <div className="flex items-center gap-1 text-[0.78rem] font-medium text-gray-400">
      <button
        type="button"
        onClick={() => switchTo("fr")}
        className={locale === "fr" ? "text-gray-900" : "hover:text-gray-600"}
      >
        FR
      </button>
      <span>/</span>
      <button
        type="button"
        onClick={() => switchTo("en")}
        className={locale === "en" ? "text-gray-900" : "hover:text-gray-600"}
      >
        EN
      </button>
    </div>
  );
}
