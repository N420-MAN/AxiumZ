import { Link } from "react-router-dom";
import { useLocale } from "../../i18n/LocaleContext";
import { pathFor } from "../../i18n/config";
import { BRAND } from "../../data/brand";
import logoFooter from "../../assets/images/axiumz-logo-footer.png";

export default function Footer() {
  const { locale, t } = useLocale();

  return (
    <footer className="border-t border-line-dark bg-ink px-4 pt-20 pb-8 text-paper sm:px-6">
      <div className="container-editorial !max-w-[1180px] !px-0">
        <div className="grid grid-cols-1 gap-14 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <img src={logoFooter} alt="AxiumZ" className="h-9 w-auto opacity-95" />
            <p className="mt-6 max-w-xs text-[0.95rem] leading-relaxed text-mist">
              {t.footer.tagline}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a
                href={BRAND.facebookUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-paper/15 text-paper/80 transition-colors hover:border-paper/40 hover:text-paper"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M13.5 21v-7.8h2.6l.4-3h-3v-1.9c0-.87.24-1.46 1.5-1.46h1.6V4.14C15.9 4.06 15 4 13.94 4c-2.2 0-3.7 1.34-3.7 3.8v2.4H7.6v3h2.64V21h3.26Z" />
                </svg>
              </a>
              <a
                href={BRAND.instagramUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-paper/15 text-paper/80 transition-colors hover:border-paper/40 hover:text-paper"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
                  <circle cx="12" cy="12" r="3.8" />
                  <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-[0.78rem] tracking-[0.06em] text-mist">{t.footer.activitesTitle}</h3>
            <ul className="mt-5 space-y-3 text-[0.92rem]">
              <li>
                <a href="#localisation" className="text-paper/85 hover:text-paper">
                  {t.footer.location}
                </a>
              </li>
              <li>
                <Link to={pathFor(locale, "activites")} className="text-paper/85 hover:text-paper">
                  {t.home.activites.items[0].title.join(" ")}
                </Link>
              </li>
              <li>
                <Link to={pathFor(locale, "activites")} className="text-paper/85 hover:text-paper">
                  {t.home.activites.items[1].title.join(" ")}
                </Link>
              </li>
              <li>
                <Link to={pathFor(locale, "activites")} className="text-paper/85 hover:text-paper">
                  {t.home.activites.items[2].title.join(" ")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[0.78rem] tracking-[0.06em] text-mist">{t.footer.infoTitle}</h3>
            <ul className="mt-5 space-y-3 text-[0.92rem]">
              <li>
                <Link to={pathFor(locale, "programmes")} className="text-paper/85 hover:text-paper">
                  {t.nav.programmes}
                </Link>
              </li>
              <li>
                <Link to={pathFor(locale, "methodologie")} className="text-paper/85 hover:text-paper">
                  {t.nav.methodologie}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[0.78rem] tracking-[0.06em] text-mist">{t.footer.contactTitle}</h3>
            <ul className="mt-5 space-y-3 text-[0.92rem]">
              <li>
                <Link to={pathFor(locale, "contact")} className="text-paper/85 hover:text-paper">
                  {t.footer.contactLink}
                </Link>
              </li>
              <li>
                <Link to={pathFor(locale, "inscription")} className="text-paper/85 hover:text-paper">
                  {t.footer.inscriptionLink}
                </Link>
              </li>
              <li>
                <a href={BRAND.whatsappBase} target="_blank" rel="noreferrer" className="text-paper/85 hover:text-paper">
                  {BRAND.phoneDisplay}
                </a>
              </li>
              <li>
                <a href={`mailto:${BRAND.publicEmail}`} className="text-paper/85 hover:text-paper">
                  {BRAND.publicEmail}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-line-dark pt-6 text-[0.8rem] text-mist sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {BRAND.year} {BRAND.name}. {t.footer.rights}
          </p>
          <div className="flex items-center gap-5">
            <Link to={pathFor(locale, "privacy")} className="text-mist hover:text-paper">
              {t.footer.privacyLink}
            </Link>
            <Link to={pathFor(locale, "terms")} className="text-mist hover:text-paper">
              {t.footer.termsLink}
            </Link>
            <span className="text-mist/70">{BRAND.address}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
