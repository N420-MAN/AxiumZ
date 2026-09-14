import { useLocale } from "../../i18n/LocaleContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import PageHero from "../../components/Hero/PageHero";
import Reveal from "../../components/RevealText/Reveal";
import CallBanner from "../../components/CallBanner/CallBanner";

export default function Methodologie() {
  const { t } = useLocale();
  const m = t.methodologiePage;
  usePageMeta(`${t.nav.methodologie} — AxiumZ`, m.hero.body, "methodologie");

  return (
    <>
      <PageHero eyebrow={m.hero.eyebrow} title={m.hero.title} body={m.hero.body} />

      <section className="relative bg-paper px-4 py-24 text-ink sm:px-6 sm:py-32">
        <div className="pattern-grid-light pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="container-editorial !max-w-[1180px] !px-0">
          <Reveal>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
              {m.flow.map((step, i) => (
                <div key={step} className="flex items-center gap-4 sm:gap-6">
                  <span className="font-display text-[2.4rem] leading-none text-ink sm:text-[3.4rem]">
                    {step}
                  </span>
                  {i < m.flow.length - 1 && (
                    <span className="hidden h-px w-16 bg-ink/25 sm:block md:w-28" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </Reveal>

          <div className="mt-20 grid grid-cols-1 gap-x-8 gap-y-12 border-t border-ink/15 pt-12 sm:grid-cols-2 lg:grid-cols-4">
            {m.items.map((item, i) => (
              <Reveal key={item.index} delay={i * 0.08}>
                <span className="font-display text-[0.95rem] text-graphite">{item.index}</span>
                <h3 className="font-display mt-4 text-[1.5rem] font-extrabold">{item.title}</h3>
                <p className="mt-4 text-[0.95rem] leading-relaxed text-graphite">{item.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <CallBanner tone="gold" />
    </>
  );
}
