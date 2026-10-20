import { useState } from "react";
import { useLocale } from "../../../i18n/LocaleContext";
import { pathFor } from "../../../i18n/config";
import { BRAND } from "../../../data/brand";
import { trackEvent } from "../../../lib/analytics";
import Button from "../../../components/CTA/Button";
import Marquee from "../../../components/Marquee/Marquee";
import Doodles from "../../../components/Doodles/Doodles";

// Animated notebook hero: Seyès paper, headline with a swept highlighter and a graded test sheet
// that changes with the subject tab.
export default function Hero() {
  const { locale, t } = useLocale();
  const h = t.home.hero;
  const [tab, setTab] = useState(0);
  const sheet = h.sheet.tabs[tab];

  const marqueeItems = [
    t.home.activites.items[0].title.join(" "),
    t.home.activites.items[1].title.join(" "),
    t.home.activites.items[2].title.join(" "),
    `${t.home.proof.items[0].value} ${t.home.proof.items[0].label}`,
    `${t.home.proof.items[2].value} ${t.home.proof.items[2].label}`,
  ];
  const fade = (d: number) => ({ opacity: 0, animation: `fade-up 0.7s ${d}s ease-out forwards` });

  return (
    <>
      <section className="pattern-grid-light relative flex items-center overflow-hidden bg-paper px-4 pt-40 pb-14 text-ink sm:min-h-[calc(100svh-4.4rem)] sm:px-6 sm:pt-36 sm:pb-8 lg:pt-[clamp(9rem,19vh,12rem)]">
        <Doodles variant="hero" />
        <div className="container-editorial relative grid w-full !max-w-[74rem] items-center gap-12 !px-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="min-w-0">
            <p className="font-hand origin-left -rotate-2 text-[1.6rem] leading-tight font-bold text-red sm:whitespace-nowrap sm:text-[1.9rem]" style={fade(0.05)}>{h.eyebrow}</p>

            <h1 className="font-display mt-4 text-[3.5rem] leading-[0.95] font-extrabold tracking-[-0.045em] sm:text-[4.8rem] lg:text-[clamp(3.4rem,10.5vh,5.2rem)]">
              <span className="inline-block" style={fade(0.2)}>{h.headline[0]}</span>
              <br />
              <span className="hl hl-anim">{h.headline[1]}</span>
              <br />
              <span className="relative inline-block" style={fade(0.5)}>
                {h.headline[2]}
                <svg viewBox="0 0 300 40" preserveAspectRatio="none" className="absolute -bottom-3 left-0 h-[0.3em] w-full text-red" fill="none" aria-hidden="true">
                  <path
                    d="M4 26 C 60 6, 120 38, 180 18 S 270 8, 296 22"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeLinecap="round"
                    pathLength={1}
                    style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: "draw-line 1.1s 1.2s ease-in-out forwards" }}
                  />
                </svg>
              </span>
            </h1>

            <p className="mt-[clamp(1rem,3vh,1.75rem)] max-w-xl text-[1.1rem] leading-8 text-[#1b2f57] sm:text-[1.15rem]" style={fade(0.35)}>{h.sub}</p>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4" style={fade(0.5)}>
              <Button to={pathFor(locale, "inscription")} tone="light">
                {h.ctaPrimary}
              </Button>
              <a href="#activites" className="lnk border-b-2 border-ink py-1 text-[0.98rem] font-semibold text-ink">
                {h.ctaSecondary}
              </a>
            </div>

            <a
              href={`tel:${BRAND.phoneIntl.replace(/\s/g, "")}`}
              onClick={() => trackEvent("call_click", { source: "hero" })}
              className="mt-6 inline-flex items-center gap-2.5 text-[0.95rem] font-medium text-[#2c3e66] transition-colors hover:text-red"
              style={fade(0.65)}
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-red" fill="none" aria-hidden="true">
                <path d="M4.5 3.5h2.6l1.2 3.4-1.7 1.4a9.5 9.5 0 0 0 4.6 4.6l1.4-1.7 3.4 1.2v2.6c0 .8-.7 1.4-1.5 1.3C8.9 15.6 4.4 11.1 3.2 5.5c-.1-.8.5-1.5 1.3-1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>
                {h.callPrompt} — <span className="font-semibold text-ink">{BRAND.phoneDisplay}</span>
              </span>
            </a>
          </div>

          <div className="flex min-w-0 flex-col items-center gap-6">
            <div role="group" aria-label={h.sheet.groupLabel} className="flex flex-wrap justify-center gap-2">
              {h.sheet.tabs.map((x, i) => (
                <button
                  key={x.tab}
                  type="button"
                  aria-pressed={tab === i}
                  onClick={() => setTab(i)}
                  className={`rounded-full border-2 border-ink px-4 py-2 text-[0.88rem] font-semibold transition-all hover:-translate-y-0.5 ${tab === i ? "bg-ink text-paper" : "bg-paper text-ink"}`}
                >
                  {x.tab}
                </button>
              ))}
            </div>

            <div
              key={tab}
              className="relative w-full max-w-[26rem] bg-white px-7 pt-9 pb-9 shadow-[0_2px_0_rgba(15,42,92,0.08),0_26px_50px_rgba(15,42,92,0.2)] sm:max-w-[30rem]"
              style={{
                ["--lh" as string]: "2.25rem",
                transform: "rotate(2.5deg)",
                animation: "paper-in 0.8s 0.1s cubic-bezier(.2,.9,.3,1.2) both",
                backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent calc(var(--lh) - 1px), rgba(47,116,196,.28) calc(var(--lh) - 1px), rgba(47,116,196,.28) var(--lh))",
                backgroundPosition: "0 var(--lh)",
              }}
            >
              <span className="absolute -top-3.5 left-1/2 -ml-12 h-7 w-24 -rotate-3 bg-[rgba(241,210,122,0.85)]" aria-hidden="true" />
              <p className="font-hand max-w-[62%] text-[1.9rem] leading-[var(--lh)] text-ink">{sheet.title}</p>
              <div className="mt-[var(--lh)]">
                {sheet.lines.map((l) => (
                  <p key={l} className="font-hand text-[1.8rem] leading-[var(--lh)] text-ink">{l}</p>
                ))}
              </div>
              <p className="font-hand absolute top-5 right-6 text-[3.6rem] leading-none font-bold text-red" style={{ opacity: 0, animation: "stamp-in 0.5s 0.9s cubic-bezier(.2,.9,.3,1) forwards" }}>
                {sheet.grade}
              </p>
              <p className="font-hand mt-[var(--lh)] origin-left -rotate-2 text-[1.9rem] leading-[var(--lh)] font-bold text-red" style={{ opacity: 0, animation: "ink-in 0.6s 1.5s ease-out forwards" }}>
                {sheet.note[0]}
                <br />
                {sheet.note[1]}
              </p>
            </div>
            <span className="text-[0.8rem] text-graphite">{h.sheet.caption}</span>
          </div>
        </div>
      </section>

      <Marquee items={marqueeItems} tone="light" />
    </>
  );
}
