import { motion } from "framer-motion";
import { useLocale } from "../../../i18n/LocaleContext";
import SectionLabel from "../../../components/SectionLabel/SectionLabel";
import Reveal from "../../../components/RevealText/Reveal";

export default function Journey() {
  const { t } = useLocale();
  const j = t.home.journey;

  return (
    <section className="grain-texture relative bg-ink px-4 py-24 text-paper sm:px-6 sm:py-36">
      <div className="pattern-grid-dark pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="container-editorial relative !max-w-[1180px] !px-0">
        <Reveal>
          <SectionLabel tone="light">{j.label}</SectionLabel>
          <h2 className="font-display text-balance mt-6 max-w-lg text-[2.2rem] leading-[1.1] font-extrabold sm:text-[3rem]">
            {j.title}
          </h2>
        </Reveal>

        <div className="relative mt-20 sm:mt-28">
          <div className="absolute left-0 right-0 top-[0.65rem] hidden h-px bg-line-dark sm:block" aria-hidden="true" />
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-4 sm:gap-6">
            {j.items.map((item, i) => {
              const nodeColors = ["bg-accent-bright", "bg-red-bright", "bg-accent-bright", "bg-red-bright"];
              return (
                <Reveal key={item.index} delay={i * 0.1}>
                  <div className="relative">
                    <div className="relative z-10 flex items-center gap-3 sm:block">
                      <motion.span
                        initial={{ scale: 0.6, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.15 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                        className={`flex h-[1.3rem] w-[1.3rem] shrink-0 items-center justify-center rounded-full sm:mb-6 ${nodeColors[i % nodeColors.length]}`}
                      />
                      <span className="font-display text-[0.9rem] text-mist sm:hidden">{item.index}</span>
                    </div>
                    <h3 className="font-display mt-0 text-[1.5rem] font-extrabold sm:mt-0">{item.title}</h3>
                    <p className="mt-3 max-w-[15rem] text-[0.92rem] leading-relaxed text-mist">{item.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
