import { motion } from "framer-motion";
import { useLocale } from "../../i18n/LocaleContext";
import { BRAND } from "../../data/brand";
import { trackEvent } from "../../lib/analytics";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function StickyMobileBar() {
  const { t } = useLocale();

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.5, ease: EASE }}
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line-light bg-paper shadow-[0_-8px_24px_-12px_rgba(15,42,92,0.25)] sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <a
        href={`tel:${BRAND.phoneIntl.replace(/\s/g, "")}`}
        onClick={() => trackEvent("call_click", { source: "sticky_mobile_bar" })}
        className="flex flex-1 items-center justify-center gap-2 border-r border-line-light bg-red py-3.5 text-[0.92rem] font-semibold text-paper"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
          <path
            d="M4.5 3.5h2.6l1.2 3.4-1.7 1.4a9.5 9.5 0 0 0 4.6 4.6l1.4-1.7 3.4 1.2v2.6c0 .8-.7 1.4-1.5 1.3C8.9 15.6 4.4 11.1 3.2 5.5c-.1-.8.5-1.5 1.3-1.5Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {t.nav.callNow}
      </a>
      <a
        href={BRAND.whatsappUrl}
        target="_blank"
        rel="noreferrer"
        onClick={() => trackEvent("whatsapp_click", { source: "sticky_mobile_bar" })}
        className="flex flex-1 items-center justify-center gap-2 py-3.5 text-[0.92rem] font-semibold text-paper"
        style={{ backgroundColor: "#25D366" }}
      >
        <svg viewBox="0 0 32 32" className="h-4 w-4" fill="none" aria-hidden="true">
          <path
            fill="currentColor"
            d="M16.004 3.2c-7.09 0-12.85 5.76-12.85 12.85 0 2.27.6 4.44 1.72 6.36L3.2 28.8l6.56-1.63a12.8 12.8 0 0 0 6.24 1.62h.01c7.09 0 12.85-5.76 12.85-12.85S23.1 3.2 16.004 3.2Zm0 23.36h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-3.9.97 1.04-3.8-.25-.39a10.55 10.55 0 0 1-1.62-5.58c0-5.85 4.76-10.61 10.62-10.61 2.84 0 5.5 1.11 7.5 3.11a10.53 10.53 0 0 1 3.11 7.51c0 5.85-4.76 10.5-10.6 10.5Z"
          />
        </svg>
        WhatsApp
      </a>
    </motion.div>
  );
}
