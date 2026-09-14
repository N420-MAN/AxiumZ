import { motion } from "framer-motion";
import { useLocale } from "../../../i18n/LocaleContext";
import { pathFor } from "../../../i18n/config";
import SectionLabel from "../../../components/SectionLabel/SectionLabel";
import TextLink from "../../../components/CTA/TextLink";
import Reveal from "../../../components/RevealText/Reveal";

const EASE = [0.16, 1, 0.3, 1] as const;
const CARD_STYLES = [
  { top: "border-t-ink", badge: "bg-ink text-paper" },
  { top: "border-t-red", badge: "bg-red text-paper" },
  { top: "border-t-accent", badge: "bg-accent text-ink" },
  { top: "border-t-ink", badge: "bg-ink text-paper" },
];

export default function Methodologie() {
  const { locale, t } = useLocale();
  const m = t.home.methodologie;

  return (
    <section className="relative bg-paper-soft px-4 py-20 text-ink sm:px-6 sm:py-28">
      <div className="pattern-grid-light pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="container-editorial relative !max-w-[1180px] !px-0">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <Reveal>
            <SectionLabel tone="dark">{m.label}</SectionLabel>
            <h2 className="font-display text-balance mt-5 max-w-lg text-[1.9rem] leading-[1.15] font-extrabold sm:text-[2.6rem]">
              {m.title}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <TextLink to={pathFor(locale, "methodologie")}>{m.link}</TextLink>
          </Reveal>
        </div>

        {/* Process flow */}
        <Reveal delay={0.15} className="mt-10">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            {m.flow.map((step, i) => (
              <div key={step} className="flex items-center gap-3 sm:gap-4">
                <motion.span
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="inline-block rounded-full bg-ink px-5 py-2 text-[0.95rem] font-extrabold text-paper shadow-[0_8px_20px_-6px_rgba(15,42,92,0.5)] sm:text-[1.1rem]"
                >
                  {step}
                </motion.span>
                {i < m.flow.length - 1 && (
                  <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 rotate-90 text-accent sm:rotate-0" fill="none" aria-hidden="true">
                    <path d="M3 10h13M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </Reveal>

        {/* Four pillars */}
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {m.items.map((item, i) => {
            const style = CARD_STYLES[i % CARD_STYLES.length];
            return (
              <Reveal key={item.index} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className={`h-full rounded-2xl border-t-4 bg-paper p-5 shadow-[0_8px_24px_-12px_rgba(15,42,92,0.2)] ${style.top}`}
                >
                  <span className={`font-display flex h-9 w-9 items-center justify-center rounded-full text-[0.85rem] font-extrabold ${style.badge}`}>
                    {item.index}
                  </span>
                  <h3 className="font-display mt-3 text-[1.2rem] font-extrabold">{item.title}</h3>
                  <p className="mt-2 text-[0.9rem] leading-relaxed text-graphite">{item.body}</p>
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
