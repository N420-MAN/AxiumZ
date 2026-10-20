import { motion } from "framer-motion";
import { useLocale } from "../../../i18n/LocaleContext";
import SectionLabel from "../../../components/SectionLabel/SectionLabel";
import Reveal from "../../../components/RevealText/Reveal";

const CARD_STYLES = [
  { top: "border-t-accent", badge: "bg-accent text-ink" },
  { top: "border-t-red", badge: "bg-red text-paper" },
  { top: "border-t-ink", badge: "bg-ink text-paper" },
];

export default function Programmes() {
  const { t } = useLocale();
  const p = t.home.programmes;

  return (
    <section className="relative bg-paper px-4 py-20 text-ink sm:px-6 sm:py-28">
      <div className="pattern-grid-light pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="container-editorial relative !max-w-[74rem] !px-0">
        <Reveal>
          <SectionLabel tone="dark">{p.label}</SectionLabel>
          <h2 className="font-display text-balance mt-5 max-w-lg text-[1.9rem] leading-[1.15] font-extrabold sm:text-[2.6rem]">
            {p.title}
          </h2>
          <p className="mt-5 max-w-md text-[1rem] leading-relaxed text-graphite">{p.body}</p>
        </Reveal>

        <Reveal delay={0.1} className="mt-8 inline-block rounded-full bg-paper-soft px-4 py-1.5 text-[0.78rem] font-semibold tracking-[0.04em] text-graphite">
          {p.system}
        </Reveal>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {p.items.map((item, i) => {
            const style = CARD_STYLES[i % CARD_STYLES.length];
            return (
              <Reveal key={item.index} delay={i * 0.08}>
                <motion.div
                  className={`h-full card-note p-6`}
                >
                  <span className={`font-display flex h-10 w-10 items-center justify-center rounded-full text-[0.9rem] font-extrabold ${style.badge}`}>
                    {item.index}
                  </span>
                  <h3 className="font-display mt-4 text-[1.6rem] font-extrabold">{item.title}</h3>
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-graphite">{item.body}</p>
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
