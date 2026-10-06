import { useLocale } from "../../i18n/LocaleContext";

// A short, quiet reminder shown on the forms that create people, so the
// person entering the data knows it is protected and why it is collected.
export default function PersonalDataNotice({ className = "" }: { className?: string }) {
  const { t } = useLocale();
  return (
    <p className={`flex items-start gap-2 rounded-md bg-gray-50 px-3 py-2 text-[0.74rem] leading-snug text-gray-500 ${className}`}>
      <span aria-hidden="true">🔒</span>
      <span>{t.monEspace.legal.formNotice}</span>
    </p>
  );
}
