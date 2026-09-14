import { motion } from "framer-motion";
import { useLocale } from "../../../i18n/LocaleContext";
import SectionLabel from "../../../components/SectionLabel/SectionLabel";
import Reveal from "../../../components/RevealText/Reveal";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function Progress() {
  const { t } = useLocale();
  const p = t.home.progress;

  return (
    <section className="relative bg-paper px-4 py-24 text-ink sm:px-6 sm:py-36">
      <div className="pattern-grid-light pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="container-editorial !max-w-[1180px] !px-0">
        <div className="grid grid-cols-1 gap-16 md:grid-cols-12 md:items-center">
          <div className="md:col-span-5">
            <Reveal>
              <SectionLabel tone="dark">{p.label}</SectionLabel>
              <h2 className="font-display text-balance mt-6 text-[2rem] leading-[1.15] font-extrabold sm:text-[2.6rem]">
                {p.title}
              </h2>
              <p className="mt-6 max-w-sm text-[0.98rem] leading-relaxed text-graphite">{p.body}</p>
              <p className="mt-6 text-[0.78rem] italic leading-relaxed text-graphite/70">{p.disclaimer}</p>
            </Reveal>
          </div>

          <div className="md:col-span-7">
            <Reveal delay={0.15}>
              <div className="rounded-2xl border border-ink/10 bg-ink p-8 text-paper sm:p-10">
                <div className="flex items-center justify-between">
                  <span className="text-[0.85rem] text-mist">{p.panelLabel}</span>
                  <span className="rounded-full border border-line-dark px-3 py-1 text-[0.72rem] text-mist">
                    {p.panelStatus}
                  </span>
                </div>

                <div className="mt-8 space-y-6">
                  {p.metrics.map((metric, i) => (
                    <div key={metric.label}>
                      <div className="flex items-center justify-between text-[0.88rem]">
                        <span className="text-paper/90">{metric.label}</span>
                        <span className="text-mist">{metric.value}%</span>
                      </div>
                      <div className="mt-2.5 h-[3px] w-full overflow-hidden rounded-full bg-paper/10">
                        <motion.div
                          className="h-full rounded-full bg-accent-bright"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${metric.value}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.1, ease: EASE, delay: 0.2 + i * 0.15 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-line-dark pt-6">
                  <div>
                    <div className="text-[0.78rem] text-mist">{p.nextSession}</div>
                    <div className="mt-1 text-[0.95rem]">{p.nextSessionValue}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[0.85rem] text-paper/90">{p.badge}</div>
                    <div className="mt-1 text-[0.75rem] text-mist">{p.badgeSub}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
