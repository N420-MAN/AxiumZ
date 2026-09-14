import { useLocale } from "../../i18n/LocaleContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import PageHero from "../../components/Hero/PageHero";
import Reveal from "../../components/RevealText/Reveal";

export default function Privacy() {
  const { t } = useLocale();
  const p = t.privacyPage;
  usePageMeta(`${p.title} — AxiumZ`, p.intro, "privacy");

  return (
    <>
      <PageHero eyebrow={p.eyebrow} title={p.title} body={p.intro} />

      <section className="relative bg-paper px-4 py-20 text-ink sm:px-6 sm:py-28">
        <div className="pattern-grid-light pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="container-editorial relative !max-w-[760px] !px-0">
          <div className="space-y-10">
            {p.sections.map((section, i) => (
              <Reveal key={section.heading} delay={i * 0.05}>
                <h2 className="font-display text-[1.2rem] font-extrabold">{section.heading}</h2>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-graphite">{section.body}</p>
              </Reveal>
            ))}
          </div>

          <Reveal delay={p.sections.length * 0.05} className="mt-14 border-t border-ink/10 pt-6">
            <p className="text-[0.85rem] italic leading-relaxed text-graphite/70">{p.lastUpdated}</p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
