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

        {/* Process flow — horizontal timeline */}
        <Reveal delay={0.15} className="mt-12">
          <div className="relative flex items-start justify-between sm:max-w-md">
            <div className="absolute left-4 right-4 top-4 h-px bg-ink/15" aria-hidden="true" />
            {m.flow.map((step, i) => (
              <div key={step} className="relative z-10 flex flex-col items-center gap-3">
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.1, ease: EASE }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[0.8rem] font-extrabold text-paper"
                >
                  {i + 1}
                </motion.span>
                <span className="text-[0.85rem] font-extrabold text-ink sm:text-[0.95rem]">{step}</span>
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
                  <h3 className="font-display text-[1.2rem] font-extrabold">{item.title}</h3>
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
