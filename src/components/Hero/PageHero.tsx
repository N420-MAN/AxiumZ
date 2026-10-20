import type { ReactNode } from "react";
import { motion } from "framer-motion";
import SectionLabel from "../SectionLabel/SectionLabel";
import Doodles from "../Doodles/Doodles";

const EASE = [0.16, 1, 0.3, 1] as const;

// Each page has its own "school object" so the site does not look the same everywhere:
//  cahier = ruled notebook page · cover = navy notebook cover · graph = graph paper with ruler
//  coupon = price tag / voucher · chalk = blackboard · mail = airmail envelope · form = enrolment form · plain = legal
export type HeroVariant = "cahier" | "cover" | "graph" | "coupon" | "chalk" | "mail" | "form" | "plain";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  body: string;
  variant?: HeroVariant;
}

const CHALK = "var(--color-paper)";

function Decor({ variant }: { variant: HeroVariant }): ReactNode {
  switch (variant) {
    case "cahier":
      return <Doodles />;
    case "cover":
      return (
        <>
          {/* spine with binding holes + gold stitching */}
          <div className="absolute inset-y-0 left-0 hidden w-24 border-r-2 border-dashed border-accent/60 bg-black/15 sm:block" aria-hidden="true">
            {[12, 38, 64, 88].map((t) => (
              <span key={t} className="absolute left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-paper/90 shadow-inner" style={{ top: `${t}%` }} />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-4 hidden rounded-md border-2 border-accent/50 sm:inset-6 sm:block sm:left-28" aria-hidden="true" />
          <span className="font-hand absolute right-[6%] bottom-[12%] hidden rotate-[-8deg] text-[6rem] font-bold text-accent/25 md:block" aria-hidden="true">A+</span>
        </>
      );
    case "graph":
      return (
        <>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(47,116,196,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(47,116,196,.16) 1px, transparent 1px), linear-gradient(rgba(47,116,196,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(47,116,196,.08) 1px, transparent 1px)",
              backgroundSize: "120px 120px, 120px 120px, 24px 24px, 24px 24px",
            }}
            aria-hidden="true"
          />
          {/* axes + curve */}
          <svg className="pointer-events-none absolute right-[4%] top-[22%] hidden h-[55%] w-[34%] text-ink/25 lg:block" viewBox="0 0 400 300" fill="none" aria-hidden="true">
            <path d="M20 280V20M20 280H390" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M20 250C90 240 120 150 200 130S330 40 385 30" stroke="#b83e3d" strokeWidth="5" strokeLinecap="round" />
            {[1, 2, 3].map((i) => (
              <circle key={i} cx={20 + i * 95} cy={250 - i * 62} r="9" fill="#c8962f" />
            ))}
          </svg>
          {/* ruler */}
          <div
            className="absolute inset-x-0 bottom-0 h-8 border-t-2 border-ink bg-[#f1d27a]/70"
            style={{ backgroundImage: "repeating-linear-gradient(90deg, #0f2a5c 0 1.5px, transparent 1.5px 12px), repeating-linear-gradient(90deg, #0f2a5c 0 2px, transparent 2px 60px)", backgroundSize: "100% 40%, 100% 70%", backgroundRepeat: "no-repeat", backgroundPosition: "0 0" }}
            aria-hidden="true"
          />
        </>
      );
    case "coupon":
      return (
        <>
          <div className="pointer-events-none absolute inset-x-4 bottom-8 top-28 hidden rounded-2xl border-[3px] border-dashed border-ink/25 sm:inset-x-8 sm:block lg:inset-x-[5%]" aria-hidden="true" />
          <svg className="pointer-events-none absolute right-[9%] top-[26%] hidden h-44 w-44 rotate-12 md:block" viewBox="0 0 120 120" fill="none" aria-hidden="true">
            <path d="M14 60 52 14h54v54L68 106 14 60Z" fill="#b83e3d" />
            <circle cx="88" cy="34" r="7" fill="#fbf8f2" />
            <text x="40" y="76" fontSize="30" fontWeight="800" fill="#fbf8f2" fontFamily="Bricolage Grotesque, sans-serif">−%</text>
          </svg>
          <span className="font-hand absolute right-[22%] bottom-[16%] hidden rotate-[-6deg] text-[3rem] font-bold text-ink/25 lg:block" aria-hidden="true">MAD</span>
        </>
      );
    case "chalk":
      return (
        <>
          <div className="pointer-events-none absolute inset-0 opacity-[0.35]" style={{ background: "radial-gradient(ellipse at 20% 10%, rgba(255,255,255,.18), transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(255,255,255,.1), transparent 50%)" }} aria-hidden="true" />
          <div className="pointer-events-none absolute inset-3 rounded-md border-[10px] border-[#6b4a2b] sm:inset-5" style={{ boxShadow: "inset 0 0 0 2px rgba(0,0,0,.25)" }} aria-hidden="true" />
          <svg className="pointer-events-none absolute right-[7%] top-[24%] hidden h-[48%] w-[30%] lg:block" viewBox="0 0 360 220" fill="none" stroke={CHALK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" aria-hidden="true">
            <circle cx="40" cy="110" r="26" />
            <path d="M68 110h70m-14-12 14 12-14 12" />
            <rect x="150" y="84" width="52" height="52" rx="6" />
            <path d="M206 110h70m-14-12 14 12-14 12" />
            <path d="M290 150l24-80 24 80M298 128h32" />
          </svg>
          <span className="font-hand absolute left-[8%] bottom-[10%] hidden text-[2.6rem] font-bold text-paper/40 md:block" aria-hidden="true">x² + y² = r²</span>
        </>
      );
    case "mail":
      return (
        <>
          <div className="absolute inset-x-0 bottom-0 h-4" style={{ backgroundImage: "repeating-linear-gradient(-45deg, #b83e3d 0 22px, transparent 22px 34px, #2f74c4 34px 56px, transparent 56px 68px)" }} aria-hidden="true" />
          <div className="absolute inset-x-0 top-0 h-3" style={{ backgroundImage: "repeating-linear-gradient(-45deg, #b83e3d 0 22px, transparent 22px 34px, #2f74c4 34px 56px, transparent 56px 68px)" }} aria-hidden="true" />
          <div className="doodle !opacity-100 hidden md:block" style={{ right: "7%", top: "24%", ["--r" as string]: "5deg" }} aria-hidden="true">
            <div className="flex h-36 w-28 flex-col items-center justify-center border-[6px] border-dotted border-paper bg-accent-soft text-ink shadow-[0_8px_0_rgba(15,42,92,.15)] outline outline-2 outline-ink/30">
              <span className="font-display text-[2.4rem] leading-none font-extrabold">AZ</span>
              <span className="font-hand text-[1.2rem] font-bold text-red">Casa</span>
            </div>
          </div>
          <svg className="pointer-events-none absolute right-[17%] top-[34%] hidden h-14 w-44 text-red/40 lg:block" viewBox="0 0 180 56" fill="none" aria-hidden="true">
            <circle cx="28" cy="28" r="22" stroke="currentColor" strokeWidth="3" />
            <path d="M66 14h108M66 28h108M66 42h108" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </>
      );
    case "form":
      return (
        <>
          <div className="pointer-events-none absolute right-[5%] top-[36%] hidden w-[26%] max-w-[22rem] space-y-5 lg:block" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4" style={{ transform: `translateX(${i % 2 ? 14 : 0}px)` }}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border-2 border-ink/70 bg-paper">
                  <svg viewBox="0 0 20 20" className="h-6 w-6 text-red" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: `draw-line 0.6s ${0.5 + i * 0.35}s ease-out forwards` }} pathLength={1}>
                    <path d="M3 10.5 8 15.5 17 4.5" />
                  </svg>
                </span>
                <span className="h-0 flex-1 border-b-2 border-dotted border-ink/40" />
              </div>
            ))}
          </div>
          <span className="font-hand absolute left-[2%] top-[34%] hidden rotate-[-6deg] text-[4rem] font-bold text-red/30 xl:block" aria-hidden="true">N°</span>
        </>
      );
    default:
      return null;
  }
}

const SURFACE: Record<HeroVariant, string> = {
  cahier: "pattern-grid-light bg-paper text-ink border-b-[3px] border-ink",
  cover: "bg-ink text-paper border-b-[6px] border-accent",
  graph: "bg-paper text-ink border-b-0",
  coupon: "bg-accent-soft text-ink border-b-[3px] border-ink",
  chalk: "bg-[#12335f] text-paper border-b-[6px] border-[#6b4a2b]",
  mail: "pattern-grid-light bg-paper text-ink",
  form: "pattern-grid-light bg-paper text-ink border-b-[3px] border-ink",
  plain: "bg-paper text-ink border-b-[3px] border-ink",
};

export default function PageHero({ eyebrow, title, body, variant = "cahier" }: PageHeroProps) {
  const words = title.trim().split(/\s+/);
  const last = words.pop() ?? "";
  const head = words.join(" ");
  const dark = variant === "cover" || variant === "chalk";
  const left = variant === "cover" ? "sm:pl-24 lg:pl-28" : "";
  const lastClass =
    variant === "cover" ? "rounded-sm bg-accent px-[0.12em] text-ink" : variant === "chalk" ? "text-accent-bright underline decoration-wavy decoration-accent-bright/60 underline-offset-[0.12em]" : variant === "coupon" ? "rounded-sm bg-red px-[0.12em] text-paper" : "hl hl-anim";
  const chalkFont = variant === "chalk" ? "font-hand !font-bold !tracking-normal" : "";

  return (
    <section className={`relative overflow-hidden px-4 pt-[7.5rem] pb-16 sm:px-6 sm:pt-48 sm:pb-28 xl:pt-52 ${SURFACE[variant]}`}>
      <Decor variant={variant} />
      <div className={`container-editorial relative !max-w-[74rem] !px-0 ${left}`}>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
          {variant === "cover" ? (
            <span className="font-hand inline-block -rotate-2 rounded-sm bg-paper px-5 py-1.5 text-[1.6rem] leading-none font-bold text-red shadow-[3px 3px 0 rgba(0,0,0,.25)] sm:text-[1.9rem]">{eyebrow}</span>
          ) : (
            <SectionLabel tone={dark ? "light" : "dark"}>{eyebrow}</SectionLabel>
          )}
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
          className={`font-display text-balance mt-5 max-w-3xl text-[2.7rem] leading-[1] font-extrabold tracking-[-0.035em] sm:text-[4.2rem] ${chalkFont} ${variant === "chalk" ? "sm:text-[4.8rem]" : ""}`}
        >
          {head && <>{head} </>}
          <span className={lastClass}>{last}</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.25 }}
          className={`mt-8 max-w-xl text-[1.1rem] leading-relaxed sm:text-[1.2rem] ${dark ? "text-paper/85" : "text-[#1b2f57]"}`}
        >
          {body}
        </motion.p>
      </div>
    </section>
  );
}
