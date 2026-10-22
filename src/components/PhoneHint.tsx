import { useLocale } from "../i18n/LocaleContext";

/** The phone formats the site accepts, shown under every phone field. */
export default function PhoneHint({ className = "" }: { className?: string }) {
  const { t } = useLocale();
  return <p className={`mt-1 text-[0.72rem] leading-snug text-gray-500 ${className}`}>{t.validation.phoneFormats}</p>;
}
