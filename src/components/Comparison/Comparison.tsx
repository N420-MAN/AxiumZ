import { motion } from "framer-motion";
import { useLocale } from "../../i18n/LocaleContext";
import SectionLabel from "../SectionLabel/SectionLabel";
import Reveal from "../RevealText/Reveal";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function Comparison() {
  const { t } = useLocale();
  const c = t.comparison;

  return (
    <section className="grain-texture relative bg-ink px-4 py-20 text-paper sm:px-6 sm:py-28">
      <div className="pattern-grid-dark pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="container-editorial relative !max-w-[900px] !px-0">
        <Reveal>
          <SectionLabel tone="light">{c.label}</SectionLabel>
          <h2 className="font-display text-balance mt-5 text-[1.9rem] font-extrabold leading-[1.15] sm:text-[2.4rem]">
            {c.title}
          </h2>
        </Reveal>

        <div className="mt-10 overflow-hidden rounded-2xl border border-line-dark">
          <div className="grid grid-cols-2">
            <div className="border-b border-r border-line-dark bg-paper/[0.04] px-4 py-3 text-center sm:px-6">
              <span className="text-[0.85rem] font-semibold text-mist">{c.withoutLabel}</span>
            </div>
            <div className="border-b border-line-dark bg-accent px-4 py-3 text-center sm:px-6">
              <span className="text-[0.85rem] font-semibold text-ink">{c.withLabel}</span>
            </div>
          </div>

          {c.rows.map((row, i) => (
            <div key={i} className="grid grid-cols-2">
              <Reveal delay={i * 0.05} className="flex items-start gap-2.5 border-b border-r border-line-dark px-4 py-4 sm:px-6">
                <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0 text-mist/60" fill="none" aria-hidden="true">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <span className="text-[0.88rem] leading-snug text-mist sm:text-[0.92rem]">{row.without}</span>
              </Reveal>
              <Reveal delay={i * 0.05 + 0.03} className="flex items-start gap-2.5 border-b border-line-dark bg-accent/[0.06] px-4 py-4 sm:px-6">
                <motion.svg
                  initial={{ scale: 0.5, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 + 0.1, ease: EASE }}
                  viewBox="0 0 16 16"
                  className="mt-0.5 h-4 w-4 shrink-0 text-accent-bright"
                  fill="none"
                >
                  <path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </motion.svg>
                <span className="text-[0.88rem] font-medium leading-snug text-paper sm:text-[0.92rem]">{row.with}</span>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
