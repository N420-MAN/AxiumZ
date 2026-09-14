import { motion } from "framer-motion";
import { useLocale } from "../../i18n/LocaleContext";
import { pathFor } from "../../i18n/config";
import { usePageMeta } from "../../hooks/usePageMeta";
import Button from "../../components/CTA/Button";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function MonEspace() {
  const { locale, t } = useLocale();
  const m = t.monEspacePage;
  usePageMeta(`${m.eyebrow} — AxiumZ`, m.body, "monEspace");

  return (
    <section className="grain-texture relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink px-4 py-32 text-center text-paper sm:px-6">
      <div className="pattern-grid-dark pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, var(--color-accent-bright) 0%, transparent 68%)", animation: "float-slow 10s ease-in-out infinite" }}
        />
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="h-full w-full opacity-70">
          <motion.circle
            cx="720" cy="420" r="220"
            stroke="var(--color-line-dark)" strokeWidth="1" fill="none"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, ease: EASE }}
          />
          <motion.circle
            cx="720" cy="420" r="320"
            stroke="var(--color-accent-bright)" strokeWidth="1" strokeDasharray="3 9" fill="none"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, ease: EASE, delay: 0.15 }}
          />
        </svg>
      </div>

      <div className="relative">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="text-[0.85rem] tracking-[0.05em] text-mist"
        >
          {m.eyebrow}
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
          className="font-display text-balance mx-auto mt-8 max-w-xl text-[2.2rem] leading-[1.15] font-extrabold sm:text-[3.2rem]"
        >
          {m.title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.22 }}
          className="mx-auto mt-6 max-w-sm text-[1rem] leading-relaxed text-mist"
        >
          {m.body}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.34 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-4"
        >
          <Button to={pathFor(locale, "home")} tone="dark">
            {m.backHome}
          </Button>
          <Button to={pathFor(locale, "contact")} variant="outline" tone="light">
            {m.contact}
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
