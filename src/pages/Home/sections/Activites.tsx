import { motion } from "framer-motion";
import { useLocale } from "../../../i18n/LocaleContext";
import SectionLabel from "../../../components/SectionLabel/SectionLabel";
import Reveal from "../../../components/RevealText/Reveal";

const EASE = [0.16, 1, 0.3, 1] as const;

const CARDS = [
  {
    badge: "bg-ink",
    icon: "text-accent-bright",
    top: "border-t-ink",
    icon_path: <path d="M4 5.5c2.4-1 5-1 7 .6 2-1.6 4.6-1.6 7-.6v11c-2.4-1-5-1-7 .6-2-1.6-4.6-1.6-7-.6v-11Z M11 6.1v11" />,
  },
  {
    badge: "bg-red",
    icon: "text-paper",
    top: "border-t-red",
    icon_path: <path d="M11 3 3 7l8 4 8-4-8-4Z M6 9.5V14c0 1.7 2.2 3 5 3s5-1.3 5-3V9.5 M19 7v6" />,
  },
  {
    badge: "bg-accent",
    icon: "text-ink",
    top: "border-t-accent",
    icon_path: (
      <path d="M11 2.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z M11 2.5c-2.5 2.3-3.8 5.3-3.8 8.5s1.3 6.2 3.8 8.5c2.5-2.3 3.8-5.3 3.8-8.5s-1.3-6.2-3.8-8.5Z M3.2 11h15.6" />
    ),
  },
];

export default function Activites() {
  const { t } = useLocale();
  const a = t.home.activites;

  return (
    <section id="activites" className="relative bg-paper-soft px-4 py-20 text-ink sm:px-6 sm:py-28">
      <div className="pattern-grid-light pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="container-editorial relative !max-w-[1180px] !px-0">
        <Reveal>
          <SectionLabel tone="dark">{a.label}</SectionLabel>
          <h2 className="font-display text-balance mt-5 max-w-xl text-[1.9rem] leading-[1.15] font-extrabold sm:text-[2.6rem]">
            {a.title}
          </h2>
          <p className="mt-5 max-w-md text-[1rem] leading-relaxed text-graphite">{a.body}</p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {a.items.map((item, i) => {
            const card = CARDS[i % CARDS.length];
            return (
              <Reveal key={item.index} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className={`h-full rounded-2xl border-t-4 bg-paper p-6 shadow-[0_8px_24px_-12px_rgba(15,42,92,0.25)] ${card.top}`}
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${card.badge}`}>
                    <svg viewBox="0 0 22 22" className={`h-6 w-6 ${card.icon}`} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      {card.icon_path}
                    </svg>
                  </div>
                  <h3 className="font-display mt-5 text-[1.35rem] font-extrabold leading-tight">
                    {item.title[0]} {item.title[1]}
                  </h3>
                  <p className="mt-3 text-[0.92rem] leading-relaxed text-graphite">{item.body}</p>
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
