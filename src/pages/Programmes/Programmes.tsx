import { useLocale } from "../../i18n/LocaleContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import PageHero from "../../components/Hero/PageHero";
import Reveal from "../../components/RevealText/Reveal";
import CallBanner from "../../components/CallBanner/CallBanner";

export default function Programmes() {
  const { t } = useLocale();
  const p = t.programmesPage;
  usePageMeta(`${t.nav.programmes} — AxiumZ`, p.hero.body, "programmes");

  return (
    <>
      <PageHero eyebrow={p.hero.eyebrow} title={p.hero.title} body={p.hero.body} />

      <section className="relative bg-paper px-4 py-24 text-ink sm:px-6 sm:py-32">
        <div className="pattern-grid-light pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="container-editorial !max-w-[1180px] !px-0">
          <Reveal className="text-[0.78rem] tracking-[0.06em] text-graphite">{p.system}</Reveal>

          <div className="mt-6 grid grid-cols-1 gap-0 border-t border-ink/15 sm:grid-cols-3">
            {p.items.map((item, i) => (
              <Reveal
                key={item.index}
                delay={i * 0.08}
                className={`border-b border-ink/15 py-12 sm:py-16 ${i > 0 ? "sm:border-l sm:pl-10" : ""}`}
              >
                <span className="font-display text-[0.95rem] text-graphite">{item.index}</span>
                <h2 className="font-display mt-5 text-[2.4rem] font-extrabold">{item.title}</h2>
                <p className="mt-5 max-w-[16rem] text-[0.98rem] leading-relaxed text-graphite">
                  {item.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <CallBanner tone="red" />
    </>
  );
}
