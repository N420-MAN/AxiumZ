import { motion } from "framer-motion";
import { useLocale } from "../../i18n/LocaleContext";
import { BRAND } from "../../data/brand";
import { trackEvent } from "../../lib/analytics";

const EASE = [0.16, 1, 0.3, 1] as const;

interface CallBannerProps {
  tone?: "gold" | "red" | "navy";
}

export default function CallBanner({ tone = "gold" }: CallBannerProps) {
  const { t } = useLocale();
  const c = t.callBanner;

  const bg =
    tone === "gold" ? "bg-accent" : tone === "red" ? "bg-red" : "bg-ink";
  const textColor = "text-paper";

  return (
    <section className={`relative overflow-hidden px-4 py-10 sm:px-6 sm:py-12 ${bg} ${textColor}`}>
      <div className="pattern-diagonal pointer-events-none absolute inset-0 opacity-[0.12]" aria-hidden="true" />
      <div className="container-editorial relative !max-w-[1180px] !px-0">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center"
        >
          <div>
            <h3 className="font-display text-[1.4rem] font-extrabold sm:text-[1.7rem]">{c.title}</h3>
            <p className="mt-2 max-w-md text-[0.92rem] leading-relaxed opacity-90">{c.body}</p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <a
              href={`tel:${BRAND.phoneIntl.replace(/\s/g, "")}`}
              onClick={() => trackEvent("call_click", { source: "call_banner" })}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.88rem] font-medium text-paper transition-opacity hover:opacity-85"
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
              {c.callCta}
            </a>
            <a
              href={BRAND.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("whatsapp_click", { source: "call_banner" })}
              className="inline-flex items-center gap-2 rounded-full border border-paper/40 px-5 py-2.5 text-[0.88rem] font-medium text-paper transition-colors hover:bg-paper/10"
            >
              <svg viewBox="0 0 32 32" className="h-4 w-4" fill="none" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M16.004 3.2c-7.09 0-12.85 5.76-12.85 12.85 0 2.27.6 4.44 1.72 6.36L3.2 28.8l6.56-1.63a12.8 12.8 0 0 0 6.24 1.62h.01c7.09 0 12.85-5.76 12.85-12.85S23.1 3.2 16.004 3.2Zm0 23.36h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-3.9.97 1.04-3.8-.25-.39a10.55 10.55 0 0 1-1.62-5.58c0-5.85 4.76-10.61 10.62-10.61 2.84 0 5.5 1.11 7.5 3.11a10.53 10.53 0 0 1 3.11 7.51c0 5.85-4.76 10.5-10.6 10.5Z"
                />
              </svg>
              {c.whatsappCta}
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
