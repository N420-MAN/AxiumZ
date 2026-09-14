import { useLocale } from "../../i18n/LocaleContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { BRAND } from "../../data/brand";
import { trackEvent } from "../../lib/analytics";
import PageHero from "../../components/Hero/PageHero";
import Button from "../../components/CTA/Button";
import Reveal from "../../components/RevealText/Reveal";
import FAQAccordion from "../../components/FAQ/FAQAccordion";

export default function Contact() {
  const { t } = useLocale();
  const c = t.contactPage;
  usePageMeta(`${t.nav.contact} — AxiumZ`, c.hero.body, "contact");

  return (
    <>
      <PageHero eyebrow={c.hero.eyebrow} title={c.hero.title} body={c.hero.body} />

      <section className="relative bg-paper px-4 py-20 text-ink sm:px-6 sm:py-28">
        <div className="pattern-grid-light pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="container-editorial !max-w-[1180px] !px-0">
          <Reveal>
            <div className="flex flex-col items-start justify-between gap-8 border-b border-ink/15 pb-12 sm:flex-row sm:items-end">
              <div>
                <h2 className="font-display text-[1.8rem] font-extrabold sm:text-[2.2rem]">{c.formTitle}</h2>
                <a
                  href={BRAND.whatsappBase}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackEvent("whatsapp_click", { source: "contact_page_phone_display" })}
                  className="font-display mt-4 block text-[1.8rem] text-ink hover:text-accent sm:text-[2.2rem]"
                >
                  {c.phoneLabel}
                </a>
                <a href={`mailto:${BRAND.publicEmail}`} className="mt-2 block text-[1rem] text-graphite hover:text-accent">
                  {BRAND.publicEmail}
                </a>
              </div>
              <Button
                href={BRAND.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                tone="light"
                onClick={() => trackEvent("whatsapp_click", { source: "contact_page" })}
              >
                {c.whatsappCta}
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="localisation" className="grain-texture relative bg-ink px-4 py-24 text-paper sm:px-6 sm:py-32">
        <div className="pattern-grid-dark pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="container-editorial relative !max-w-[1180px] !px-0">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:items-end">
            <div className="md:col-span-5">
              <Reveal>
                <span className="text-[0.8rem] tracking-[0.04em] text-mist">{c.locationLabel}</span>
                <h2 className="font-display mt-6 text-[1.8rem] leading-tight font-extrabold sm:text-[2.2rem]">
                  {c.locationTitle}
                </h2>
                <p className="mt-6 max-w-sm text-[0.98rem] leading-relaxed text-mist">{c.locationBody}</p>
                <p className="mt-4 max-w-sm text-[0.95rem] font-semibold text-paper">{BRAND.address}</p>
                <a
                  href={BRAND.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-block text-[0.95rem] font-medium text-paper underline decoration-paper/30 underline-offset-4 hover:text-accent-bright hover:decoration-accent-bright"
                >
                  {c.mapCta}
                </a>
              </Reveal>
            </div>
            <div className="md:col-span-7">
              <Reveal delay={0.15}>
                <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line-dark grayscale sm:aspect-[16/10]">
                  <iframe
                    title="AxiumZ — localisation"
                    src={BRAND.mapsEmbedUrl}
                    className="h-full w-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <FAQAccordion />
    </>
  );
}
