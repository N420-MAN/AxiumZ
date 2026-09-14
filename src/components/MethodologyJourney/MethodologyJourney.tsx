import { motion } from "framer-motion";
import { useLocale } from "../../i18n/LocaleContext";
import SectionLabel from "../SectionLabel/SectionLabel";
import Reveal from "../RevealText/Reveal";

const EASE = [0.16, 1, 0.3, 1] as const;
const STEP_COLORS = ["bg-accent text-ink", "bg-red text-paper", "bg-ink text-paper", "bg-accent text-ink", "bg-red text-paper"];

export default function MethodologyJourney() {
  const { t } = useLocale();
  const m = t.methodologySteps;

  return (
    <section className="grain-texture relative bg-ink px-4 py-20 text-paper sm:px-6 sm:py-28">
      <div className="pattern-grid-dark pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="container-editorial relative !max-w-[1180px] !px-0">
        <Reveal>
          <SectionLabel tone="light">{m.label}</SectionLabel>
          <h2 className="font-display text-balance mt-5 max-w-xl text-[1.9rem] font-extrabold leading-[1.15] sm:text-[2.6rem]">
            {m.title}
          </h2>
          <p className="mt-5 max-w-md text-[1rem] leading-relaxed text-mist">{m.body}</p>
        </Reveal>

        <div className="relative mt-14">
          <div className="absolute left-[27px] top-2 bottom-2 hidden w-px bg-line-dark sm:block lg:left-0 lg:right-0 lg:top-[27px] lg:h-px lg:w-auto lg:bottom-auto" aria-hidden="true" />
          <div className="grid grid-cols-1 gap-8 sm:gap-10 lg:grid-cols-5 lg:gap-6">
            {m.steps.map((step, i) => (
              <Reveal key={step.index} delay={i * 0.08}>
                <div className="relative flex gap-4 lg:flex-col lg:gap-0">
                  <motion.span
                    initial={{ scale: 0.5, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: EASE }}
                    className={`font-display relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[1.1rem] font-extrabold ${STEP_COLORS[i % STEP_COLORS.length]}`}
                  >
                    {step.index}
                  </motion.span>
                  <div className="lg:mt-5">
                    <h3 className="font-display text-[1.15rem] font-extrabold">{step.title}</h3>
                    <p className="mt-2 max-w-[15rem] text-[0.9rem] leading-relaxed text-mist">{step.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
