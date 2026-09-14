import { motion } from "framer-motion";
import { useLocale } from "../../i18n/LocaleContext";
import { pathFor } from "../../i18n/config";
import { usePageMeta } from "../../hooks/usePageMeta";
import Button from "../../components/CTA/Button";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function NotFound() {
  const { locale, t } = useLocale();
  const n = t.notFoundPage;
  usePageMeta(`${n.eyebrow} — AxiumZ`, n.body, "home", { noindex: true });

  return (
    <section className="grain-texture relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink px-4 py-32 text-center text-paper sm:px-6">
      <div className="pattern-grid-dark pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25"
        style={{ background: "radial-gradient(circle, var(--color-accent-bright) 0%, transparent 68%)", animation: "float-slow 10s ease-in-out infinite" }}
        aria-hidden="true"
      />

      <div className="relative">
        <motion.span
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="font-display block text-[6rem] font-extrabold leading-none text-accent-bright sm:text-[8rem]"
        >
          404
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
          className="font-display text-balance mx-auto mt-4 max-w-md text-[1.7rem] font-extrabold leading-[1.2] sm:text-[2.2rem]"
        >
          {n.title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.22 }}
          className="mx-auto mt-6 max-w-sm text-[1rem] leading-relaxed text-mist"
        >
          {n.body}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.34 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Button to={pathFor(locale, "home")} tone="dark">
            {n.backHome}
          </Button>
          <Button to={pathFor(locale, "contact")} variant="outline" tone="dark">
            {n.contact}
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
