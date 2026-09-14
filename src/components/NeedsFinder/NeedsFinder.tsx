import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { ReactElement } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import { pathFor } from "../../i18n/config";
import SectionLabel from "../SectionLabel/SectionLabel";
import Reveal from "../RevealText/Reveal";

const EASE = [0.16, 1, 0.3, 1] as const;
const MotionLink = motion(Link);

const ICONS: Record<string, { path: ReactElement; badge: string; iconColor: string }> = {
  bilingual: {
    badge: "bg-ink",
    iconColor: "text-accent-bright",
    path: <path d="M4 5.5c2.4-1 5-1 7 .6 2-1.6 4.6-1.6 7-.6v11c-2.4-1-5-1-7 .6-2-1.6-4.6-1.6-7-.6v-11Z M11 6.1v11" />,
  },
  mission: {
    badge: "bg-red",
    iconColor: "text-paper",
    path: <path d="M11 3 3 7l8 4 8-4-8-4Z M6 9.5V14c0 1.7 2.2 3 5 3s5-1.3 5-3V9.5 M19 7v6" />,
  },
  language: {
    badge: "bg-accent",
    iconColor: "text-ink",
    path: (
      <path d="M11 2.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z M11 2.5c-2.5 2.3-3.8 5.3-3.8 8.5s1.3 6.2 3.8 8.5c2.5-2.3 3.8-5.3 3.8-8.5s-1.3-6.2-3.8-8.5Z M3.2 11h15.6" />
    ),
  },
  confidence: {
    badge: "bg-ink",
    iconColor: "text-accent-bright",
    path: <path d="M11 3c-4 0-7 3.2-7 7 0 2.8 1.4 4.4 2.8 6 .7.8 1 1.4 1 2.2v1.2h6.4v-1.2c0-.8.3-1.4 1-2.2 1.4-1.6 2.8-3.2 2.8-6 0-3.8-3-7-7-7Z M8.5 21.5h5" />,
  },
};

export default function NeedsFinder() {
  const { locale, t } = useLocale();
  const n = t.needsFinder;

  return (
    <section className="relative bg-paper px-4 py-20 text-ink sm:px-6 sm:py-28">
      <div className="pattern-grid-light pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="container-editorial relative !max-w-[1180px] !px-0">
        <Reveal>
          <SectionLabel tone="dark">{n.label}</SectionLabel>
          <h2 className="font-display text-balance mt-5 max-w-xl text-[1.9rem] font-extrabold leading-[1.15] sm:text-[2.6rem]">
            {n.title}
          </h2>
          <p className="mt-5 max-w-md text-[1rem] leading-relaxed text-graphite">{n.body}</p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {n.items.map((item, i) => {
            const icon = ICONS[item.icon];
            return (
              <Reveal key={item.need} delay={i * 0.06}>
                <MotionLink
                  to={pathFor(locale, item.linkPage)}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="group flex h-full flex-col rounded-2xl border border-ink/10 bg-paper-soft p-6 shadow-[0_8px_24px_-14px_rgba(15,42,92,0.2)]"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${icon.badge}`}>
                    <svg viewBox="0 0 22 22" className={`h-6 w-6 ${icon.iconColor}`} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      {icon.path}
                    </svg>
                  </div>
                  <h3 className="font-display mt-4 text-[1.15rem] font-extrabold leading-tight">{item.need}</h3>
                  <p className="mt-2 flex-1 text-[0.9rem] leading-relaxed text-graphite">{item.body}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-accent group-hover:gap-2.5 transition-all">
                    {item.linkLabel}
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </MotionLink>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
