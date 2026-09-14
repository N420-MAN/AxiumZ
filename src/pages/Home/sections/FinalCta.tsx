import { useLocale } from "../../../i18n/LocaleContext";
import { pathFor } from "../../../i18n/config";
import { BRAND } from "../../../data/brand";
import { trackEvent } from "../../../lib/analytics";
import SectionLabel from "../../../components/SectionLabel/SectionLabel";
import Button from "../../../components/CTA/Button";
import Reveal from "../../../components/RevealText/Reveal";

export default function FinalCta() {
  const { locale, t } = useLocale();
  const c = t.home.finalCta;

  return (
      <section id="localisation" className="grain-texture relative overflow-hidden bg-ink px-4 py-28 text-paper sm:px-6 sm:py-40">
        <div className="pattern-grid-dark pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, var(--color-accent-bright) 0%, transparent 70%)", animation: "float-slow 11s ease-in-out infinite" }}
        />
        <div className="container-editorial relative !max-w-[1180px] !px-0">
          <Reveal>
            <SectionLabel tone="light">{c.label}</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display text-balance mt-8 max-w-3xl text-[2.4rem] leading-[1.08] font-extrabold sm:text-[4rem]">
              {c.title}
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 max-w-lg text-[1.02rem] leading-relaxed text-mist">{c.body}</p>
          </Reveal>

          <Reveal delay={0.3} className="mt-12 flex flex-wrap items-center gap-4">
            <Button to={pathFor(locale, "inscription")} tone="dark">
              {c.ctaPrimary}
            </Button>
            <Button
              href={BRAND.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              variant="outline"
              tone="light"
              onClick={() => trackEvent("whatsapp_click", { source: "final_cta" })}
            >
              {c.ctaSecondary}
            </Button>
          </Reveal>

          <Reveal delay={0.4} className="mt-16 border-t border-line-dark pt-8">
            <a
              href={BRAND.whatsappBase}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("whatsapp_click", { source: "final_cta_phone_display" })}
              className="font-display text-[1.6rem] text-paper/90 hover:text-accent-bright sm:text-[2rem]"
            >
              {c.phoneLabel}
            </a>
          </Reveal>
        </div>
      </section>
  );
}
