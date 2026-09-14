import { useLocale } from "../../../i18n/LocaleContext";
import { pathFor } from "../../../i18n/config";
import SectionLabel from "../../../components/SectionLabel/SectionLabel";
import TextLink from "../../../components/CTA/TextLink";
import Reveal from "../../../components/RevealText/Reveal";

export default function Positioning() {
  const { locale, t } = useLocale();
  const p = t.home.positioning;

  return (
    <section id="centre" className="relative bg-accent-soft px-4 py-24 text-ink sm:px-6 sm:py-36">
      <div className="pattern-grid-light pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="container-editorial relative !max-w-[1180px] !px-0">
        <div className="grid grid-cols-1 gap-16 md:grid-cols-12">
          <div className="md:col-span-7">
            <Reveal>
              <SectionLabel tone="dark">{p.label}</SectionLabel>
              <h2 className="font-display text-balance mt-6 max-w-lg text-[2.2rem] leading-[1.1] font-extrabold sm:text-[3rem]">
                {p.title}
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-8 max-w-md text-[1.02rem] leading-relaxed text-graphite">{p.body}</p>
            </Reveal>
            <Reveal delay={0.2} className="mt-8">
              <TextLink to={pathFor(locale, "centre")}>{p.link}</TextLink>
            </Reveal>
          </div>

          <div className="md:col-span-5 md:pt-4">
            <Reveal delay={0.15}>
              <div className="border-t border-ink/15 pt-8">
                <span className="font-display text-[0.95rem] text-graphite">{p.approachNumber}</span>
                <h3 className="font-display mt-4 text-[1.6rem] leading-tight font-extrabold">{p.approachTitle}</h3>
                <p className="mt-4 max-w-sm text-[0.98rem] leading-relaxed text-graphite">{p.approachBody}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
