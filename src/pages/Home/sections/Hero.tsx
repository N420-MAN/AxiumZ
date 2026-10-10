import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "../../../i18n/LocaleContext";
import { pathFor } from "../../../i18n/config";
import { BRAND } from "../../../data/brand";
import { trackEvent } from "../../../lib/analytics";
import Button from "../../../components/CTA/Button";
import Marquee from "../../../components/Marquee/Marquee";
import SolarSystem from "./SolarSystem";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function Hero() {
  const { locale, t } = useLocale();
  const h = t.home.hero;
  const sectionRef = useRef<HTMLDivElement>(null);

  // Pause the decorative animations (planets, glow) while the hero is scrolled out of view.
  const [offscreen, setOffscreen] = useState(false);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, 120]);

  const marqueeItems = [
    t.home.activites.items[0].title.join(" "),
    t.home.activites.items[1].title.join(" "),
    t.home.activites.items[2].title.join(" "),
    `${t.home.proof.items[0].value} ${t.home.proof.items[0].label}`,
    `${t.home.proof.items[2].value} ${t.home.proof.items[2].label}`,
  ];

  return (
    <>
      <section
        ref={sectionRef}
        className={`${offscreen ? "hero-paused " : ""}grain-texture relative min-h-dvh overflow-hidden bg-ink px-4 pt-36 pb-[calc(4.75rem+env(safe-area-inset-bottom)+2rem)] text-paper sm:min-h-0 sm:px-6 sm:pt-44 sm:pb-20 xl:pt-48`}
      >
        {/* Fine architectural grid — fills negative space without photography */}
        <div className="pattern-grid-dark pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />

        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ y: parallaxY }}
          aria-hidden="true"
        >
          <div
            className="absolute right-[-8%] top-[8%] h-[420px] w-[420px] rounded-full opacity-[0.35] sm:right-[2%] sm:h-[520px] sm:w-[520px]"
            style={{
              background:
                "radial-gradient(circle at 32% 28%, var(--color-accent) 0%, transparent 62%)",
              animation: "float-slow 9s ease-in-out infinite",
            }}
          />
          <SolarSystem className="absolute right-[-4%] top-[10%] h-[380px] w-[380px] opacity-80 sm:right-[6%] sm:h-[460px] sm:w-[460px]" />
        </motion.div>

        <div className="container-editorial relative !max-w-[1180px] !px-0">
          <p className="text-[0.85rem] tracking-[0.04em] text-mist">{h.eyebrow}</p>

          <h1 className="font-display mt-6 text-[2.6rem] leading-[1.1] font-extrabold sm:text-[4.4rem] md:text-[5.4rem]">
            {h.headline.map((line, i) => (
              <span key={line} className="block overflow-hidden">
                <motion.span
                  className="block"
                  initial={{ y: "110%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 0.45, ease: EASE, delay: i * 0.06 }}
                >
                  {i === 1 ? <span className="text-accent-bright">{line}</span> : line}
                </motion.span>
              </span>
            ))}
          </h1>

          {/* Visible from the first paint: this paragraph is the page's largest text block. */}
          <p className="mt-8 max-w-md text-[1.02rem] leading-relaxed text-mist sm:max-w-lg">{h.sub}</p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Button to={pathFor(locale, "inscription")} tone="dark">
              {h.ctaPrimary}
            </Button>
            <a
              href="#activites"
              className="text-[0.95rem] font-medium text-paper/85 underline decoration-paper/30 decoration-1 underline-offset-4 transition-colors hover:text-paper hover:decoration-accent-bright"
            >
              {h.ctaSecondary}
            </a>
          </div>

          <a
            href={`tel:${BRAND.phoneIntl.replace(/\s/g, "")}`}
            onClick={() => trackEvent("call_click", { source: "hero" })}
            className="mt-6 flex items-center gap-2.5 text-[0.9rem] font-medium text-mist transition-colors hover:text-red-bright"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-red" fill="none" aria-hidden="true">
              <path
                d="M4.5 3.5h2.6l1.2 3.4-1.7 1.4a9.5 9.5 0 0 0 4.6 4.6l1.4-1.7 3.4 1.2v2.6c0 .8-.7 1.4-1.5 1.3C8.9 15.6 4.4 11.1 3.2 5.5c-.1-.8.5-1.5 1.3-1.5Z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>
              {h.callPrompt} — <span className="text-paper">{BRAND.phoneDisplay}</span>
            </span>
          </a>
        </div>
      </section>

      <Marquee items={marqueeItems} tone="light" />
    </>
  );
}
