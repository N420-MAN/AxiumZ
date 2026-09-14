import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale } from "../../i18n/LocaleContext";
import { pageForSlug, pathFor, type PageKey } from "../../i18n/config";
import { useScrolled } from "../../hooks/useScrolled";
import LanguageSwitcher from "../LanguageSwitcher/LanguageSwitcher";
import { BRAND } from "../../data/brand";
import logo from "../../assets/images/axiumz-logo.png";
import logoFooter from "../../assets/images/axiumz-logo-footer.png";
import { trackEvent } from "../../lib/analytics";

const EASE = [0.16, 1, 0.3, 1] as const;

const PHONE_ICON_PATH =
  "M4.5 3.5h2.6l1.2 3.4-1.7 1.4a9.5 9.5 0 0 0 4.6 4.6l1.4-1.7 3.4 1.2v2.6c0 .8-.7 1.4-1.5 1.3C8.9 15.6 4.4 11.1 3.2 5.5c-.1-.8.5-1.5 1.3-1.5Z";

export default function Navigation() {
  const { locale, t } = useLocale();
  const { slug } = useParams<{ slug: string }>();
  const scrolled = useScrolled(20);
  const [open, setOpen] = useState(false);

  const currentPage = pageForSlug(locale, slug) ?? "home";

  const links: { page: PageKey; label: string }[] = [
    { page: "centre", label: t.nav.centre },
    { page: "activites", label: t.nav.activites },
    { page: "programmes", label: t.nav.programmes },
    { page: "methodologie", label: t.nav.methodologie },
    { page: "contact", label: t.nav.contact },
  ];

  return (
    <>
      {/* Utility bar — always-visible call prompt, like Cap Mission's top strip */}
      <div className="fixed inset-x-0 top-0 z-50 hidden h-9 items-center justify-center bg-red text-paper xl:flex">
        <div className="container-editorial flex !max-w-[1180px] items-center justify-end gap-6 !px-0 text-[0.8rem]">
          <a
            href={`tel:${BRAND.phoneIntl.replace(/\s/g, "")}`}
            onClick={() => trackEvent("call_click", { source: "utility_bar" })}
            className="flex items-center gap-1.5 whitespace-nowrap font-medium transition-opacity hover:opacity-80"
          >
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" fill="none" aria-hidden="true">
              <path d={PHONE_ICON_PATH} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t.nav.callNow} — {BRAND.phoneDisplay}
          </a>
          <span className="h-3.5 w-px bg-paper/30" aria-hidden="true" />
          <Link to={pathFor(locale, "monEspace")} className="whitespace-nowrap font-medium transition-opacity hover:opacity-80">
            {t.nav.monEspace}
          </Link>
          <span className="h-3.5 w-px bg-paper/30" aria-hidden="true" />
          <LanguageSwitcher page={currentPage} className="text-paper" />
        </div>
      </div>

      <header className="fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-4 sm:px-6 sm:pt-5 xl:top-9">
        <motion.nav
          animate={{
            paddingBlock: scrolled ? 10 : 14,
            boxShadow: scrolled
              ? "0 12px 32px -16px rgba(11,10,13,0.35)"
              : "0 4px 20px -18px rgba(11,10,13,0.2)",
          }}
          transition={{ duration: 0.4, ease: EASE }}
          className="flex w-full max-w-[1180px] items-center justify-between gap-4 rounded-full border border-black/[0.06] bg-paper/95 px-4 backdrop-blur-md sm:px-6"
        >
          <Link to={pathFor(locale, "home")} className="flex shrink-0 items-center" aria-label="AxiumZ — accueil">
            <img src={logo} alt="AxiumZ" className="h-11 w-auto sm:h-12" />
          </Link>

          <ul className="hidden items-center gap-5 xl:flex">
            {links.map((link) => (
              <li key={link.page} className="whitespace-nowrap">
                <Link
                  to={pathFor(locale, link.page)}
                  className={`font-display relative text-[0.95rem] font-semibold tracking-[0.01em] text-ink/80 transition-colors hover:text-ink ${
                    currentPage === link.page ? "text-ink" : ""
                  }`}
                >
                  {link.label}
                  {currentPage === link.page && (
                    <span className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-accent" />
                  )}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden shrink-0 items-center gap-4 xl:flex">
            <Link
              to={pathFor(locale, "inscription")}
              className="font-display whitespace-nowrap rounded-full bg-ink px-5 py-2.5 text-[0.9rem] font-semibold tracking-[0.01em] text-paper transition-colors hover:bg-accent"
            >
              {t.nav.inscription}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 shrink-0 flex-col items-center justify-center gap-[5px] xl:hidden"
            aria-label={t.nav.menu}
          >
            <span className="h-px w-5 bg-ink" />
            <span className="h-px w-5 bg-ink" />
          </button>
        </motion.nav>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="fixed inset-0 z-[60] flex flex-col bg-ink px-6 pt-6 pb-10 text-paper xl:hidden"
          >
            <div className="flex items-center justify-between">
              <img src={logoFooter} alt="AxiumZ" className="h-11 w-auto" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.nav.close}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-paper/20"
              >
                <span className="relative block h-4 w-4">
                  <span className="absolute left-1/2 top-1/2 h-px w-5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-paper" />
                  <span className="absolute left-1/2 top-1/2 h-px w-5 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-paper" />
                </span>
              </button>
            </div>

            <nav className="mt-12 flex flex-1 flex-col justify-center gap-1">
              {links.map((link, i) => (
                <motion.div
                  key={link.page}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.08 * i, ease: EASE }}
                >
                  <Link
                    to={pathFor(locale, link.page)}
                    onClick={() => setOpen(false)}
                    className="font-display block py-2.5 text-[2.1rem] leading-[1.05] font-extrabold text-paper"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08 * links.length, ease: EASE }}
              >
                <Link
                  to={pathFor(locale, "monEspace")}
                  onClick={() => setOpen(false)}
                  className="font-display block py-2.5 text-[2.1rem] leading-[1.05] font-extrabold text-mist"
                >
                  {t.nav.monEspace}
                </Link>
              </motion.div>
            </nav>

            <a
              href={`tel:${BRAND.phoneIntl.replace(/\s/g, "")}`}
              onClick={() => trackEvent("call_click", { source: "mobile_menu" })}
              className="mb-4 flex items-center justify-center gap-2.5 rounded-full border border-red bg-red/10 py-3.5 text-[0.95rem] font-medium text-paper"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                <path d={PHONE_ICON_PATH} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {BRAND.phoneDisplay}
            </a>

            <div className="flex items-center justify-between border-t border-paper/10 pt-6">
              <LanguageSwitcher page={currentPage} className="text-paper" />
              <Link
                to={pathFor(locale, "inscription")}
                onClick={() => setOpen(false)}
                className="font-display rounded-full bg-paper px-6 py-2.5 text-[0.9rem] font-semibold tracking-[0.01em] text-ink"
              >
                {t.nav.inscription}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
