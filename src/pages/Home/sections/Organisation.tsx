import { useLocale } from "../../../i18n/LocaleContext";
import { pathFor } from "../../../i18n/config";
import SectionLabel from "../../../components/SectionLabel/SectionLabel";
import TextLink from "../../../components/CTA/TextLink";
import Reveal from "../../../components/RevealText/Reveal";

export default function Organisation() {
  const { locale, t } = useLocale();
  const o = t.home.organisation;

  return (
    <section className="relative overflow-hidden bg-ink px-4 py-20 text-paper sm:px-6 sm:py-28">
      <div className="pattern-grid-dark pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-25"
        style={{ background: "radial-gradient(circle, var(--color-accent-bright) 0%, transparent 70%)", animation: "float-slow 10s ease-in-out infinite" }}
      />
      <div className="container-editorial relative !max-w-[1180px] !px-0">
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-12">
          <div className="md:col-span-7">
            <Reveal>
              <SectionLabel tone="light">{o.label}</SectionLabel>
              <h2 className="font-display text-balance mt-6 max-w-md text-[1.8rem] leading-[1.15] font-extrabold sm:text-[2.2rem]">
                {o.title}
              </h2>
              <p className="mt-6 max-w-md text-[0.98rem] leading-relaxed text-mist">{o.body}</p>
              <div className="mt-6">
                <TextLink to={pathFor(locale, "centre")}>{o.link}</TextLink>
              </div>
            </Reveal>
          </div>

          <div className="md:col-span-5">
            <Reveal delay={0.1}>
              <div className="flex gap-10">
                {o.stats.map((s) => (
                  <div key={s.label}>
                    <div className="font-display text-[2.2rem] leading-none">{s.value}</div>
                    <div className="mt-2 text-[0.8rem] text-mist">{s.label}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
