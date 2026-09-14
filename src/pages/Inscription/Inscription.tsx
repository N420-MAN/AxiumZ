import { useLocale } from "../../i18n/LocaleContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { BRAND } from "../../data/brand";
import { trackEvent } from "../../lib/analytics";
import PageHero from "../../components/Hero/PageHero";
import Reveal from "../../components/RevealText/Reveal";
import InscriptionForm from "../../components/InscriptionForm/InscriptionForm";

export default function Inscription() {
  const { t } = useLocale();
  const p = t.inscriptionPage;
  usePageMeta(`${t.nav.inscription} — AxiumZ`, p.hero.body, "inscription");

  return (
    <>
      <PageHero eyebrow={p.hero.eyebrow} title={p.hero.title} body={p.hero.body} />

      <section className="grain-texture relative bg-ink px-4 pb-16 pt-4 text-paper sm:px-6">
        <div className="pattern-grid-dark pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="container-editorial relative !max-w-[1180px] !px-0">
          <div className="grid grid-cols-1 gap-x-8 gap-y-10 border-t border-line-dark pt-12 sm:grid-cols-2 lg:grid-cols-4">
            {p.steps.map((step, i) => (
              <Reveal key={step.index} delay={i * 0.08}>
                <span className="font-display text-[0.95rem] text-mist">{step.index}</span>
                <h3 className="font-display mt-4 text-[1.3rem] font-extrabold">{step.title}</h3>
                <p className="mt-3 text-[0.92rem] leading-relaxed text-mist">{step.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-paper px-4 py-20 text-ink sm:px-6 sm:py-28">
        <div className="pattern-grid-light pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="container-editorial relative !max-w-[820px] !px-0">
          <Reveal>
            <InscriptionForm />
          </Reveal>
        </div>
      </section>

      <section className="grain-texture relative border-t border-line-dark bg-ink px-4 py-16 text-paper sm:px-6 sm:py-20">
        <div className="pattern-grid-dark pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="container-editorial relative !max-w-[1180px] !px-0 text-center">
          <Reveal>
            <p className="text-[0.95rem] text-mist">{p.ctaBody}</p>
            <a
              href={BRAND.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("whatsapp_click", { source: "inscription_page" })}
              className="mt-4 inline-block text-[1rem] font-medium text-paper underline decoration-paper/30 underline-offset-4 hover:text-accent-bright hover:decoration-accent-bright"
            >
              {p.ctaButton}
            </a>
          </Reveal>
        </div>
      </section>
    </>
  );
}
