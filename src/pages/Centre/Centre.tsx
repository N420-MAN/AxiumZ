import { useLocale } from "../../i18n/LocaleContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import PageHero from "../../components/Hero/PageHero";
import Reveal from "../../components/RevealText/Reveal";
import CallBanner from "../../components/CallBanner/CallBanner";

export default function Centre() {
  const { t } = useLocale();
  const c = t.centrePage;
  usePageMeta(`${t.nav.centre} — AxiumZ`, c.hero.body, "centre");

  return (
    <>
      <PageHero eyebrow={c.hero.eyebrow} title={c.hero.title} body={c.hero.body} />

      <section className="relative bg-paper px-4 py-24 text-ink sm:px-6 sm:py-32">
        <div className="pattern-grid-light pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="container-editorial !max-w-[1180px] !px-0">
          <div className="grid grid-cols-1 gap-16 md:grid-cols-12">
            <div className="md:col-span-6">
              <Reveal>
                <h2 className="font-display text-[1.8rem] leading-tight font-extrabold sm:text-[2.2rem]">
                  {c.approach.title}
                </h2>
                <p className="mt-6 max-w-md text-[1rem] leading-relaxed text-graphite">{c.approach.body}</p>
              </Reveal>
            </div>
            <div className="md:col-span-6">
              <Reveal delay={0.1}>
                <div className="border-t border-ink/15 pt-8">
                  <span className="font-display text-[0.95rem] text-graphite">{c.approach.number}</span>
                  <h3 className="font-display mt-4 text-[1.5rem] font-extrabold">{c.approach.subtitle}</h3>
                  <p className="mt-4 max-w-sm text-[0.98rem] leading-relaxed text-graphite">{c.approach.text}</p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="grain-texture relative bg-ink px-4 py-24 text-paper sm:px-6 sm:py-32">
        <div className="pattern-grid-dark pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="container-editorial relative !max-w-[1180px] !px-0">
          <Reveal>
            <h2 className="font-display max-w-xl text-[1.8rem] leading-tight font-extrabold sm:text-[2.2rem]">
              {c.values.title}
            </h2>
          </Reveal>
          <div className="mt-16 grid grid-cols-1 gap-10 border-t border-line-dark pt-10 sm:grid-cols-3">
            {c.values.items.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.1}>
                <h3 className="font-display text-[1.3rem] font-extrabold">{item.title}</h3>
                <p className="mt-3 text-[0.94rem] leading-relaxed text-mist">{item.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <CallBanner tone="red" />
    </>
  );
}
