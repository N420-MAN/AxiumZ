import { useLocale } from "../../i18n/LocaleContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import PageHero from "../../components/Hero/PageHero";
import Reveal from "../../components/RevealText/Reveal";
import CallBanner from "../../components/CallBanner/CallBanner";

export default function Activites() {
  const { t } = useLocale();
  const a = t.activitesPage;
  usePageMeta(`${t.nav.activites} — AxiumZ`, a.hero.body, "activites");

  return (
    <>
      <PageHero eyebrow={a.hero.eyebrow} title={a.hero.title} body={a.hero.body} />

      <section className="relative bg-paper px-4 py-24 text-ink sm:px-6 sm:py-32">
        <div className="pattern-grid-light pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="container-editorial !max-w-[1180px] !px-0 divide-y divide-ink/10 border-t border-ink/10">
          {a.items.map((item, i) => (
            <Reveal key={item.index} delay={i * 0.06}>
              <div
                className={`grid grid-cols-1 items-start gap-6 py-14 sm:py-20 md:grid-cols-12 ${
                  i % 2 === 1 ? "md:text-right" : ""
                }`}
              >
                <div className={`md:col-span-2 ${i % 2 === 1 ? "md:order-3" : ""}`}>
                  <span
                    className={`font-display inline-flex h-9 w-9 items-center justify-center rounded-full text-[0.85rem] font-extrabold ${
                      ["bg-ink text-paper", "bg-red text-paper", "bg-accent text-ink"][i % 3]
                    }`}
                  >
                    {item.index}
                  </span>
                </div>
                <div className={`md:col-span-4 ${i % 2 === 1 ? "md:order-2" : ""}`}>
                  <h2 className="font-display text-[2rem] leading-[1.05] font-extrabold sm:text-[2.6rem]">
                    {item.title}
                  </h2>
                </div>
                <div className={`md:col-span-6 ${i % 2 === 1 ? "md:order-1" : ""}`}>
                  <p className="text-[1rem] leading-relaxed text-graphite md:ml-auto md:max-w-md">
                    {item.body}
                  </p>
                  <p className="mt-4 text-[0.92rem] leading-relaxed text-graphite/80 md:ml-auto md:max-w-md">
                    {item.detail}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <CallBanner tone="gold" />
    </>
  );
}
