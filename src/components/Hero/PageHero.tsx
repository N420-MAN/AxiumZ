import { motion } from "framer-motion";
import SectionLabel from "../SectionLabel/SectionLabel";

const EASE = [0.16, 1, 0.3, 1] as const;

interface PageHeroProps {
  eyebrow: string;
  title: string;
  body: string;
}

export default function PageHero({ eyebrow, title, body }: PageHeroProps) {
  return (
    <section className="grain-texture relative overflow-hidden bg-ink px-4 pt-40 pb-24 text-paper sm:px-6 sm:pt-48 sm:pb-32 xl:pt-52">
      <div className="pattern-grid-dark pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 top-10 h-80 w-80 rounded-full opacity-25"
        style={{ background: "radial-gradient(circle, var(--color-accent-bright) 0%, transparent 70%)", animation: "float-slow 9s ease-in-out infinite" }}
      />
      <div className="container-editorial relative !max-w-[1180px] !px-0">
        <SectionLabel tone="light">{eyebrow}</SectionLabel>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
          className="font-display text-balance mt-6 max-w-3xl text-[2.6rem] leading-[1.08] font-extrabold sm:text-[3.6rem]"
        >
          {title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.25 }}
          className="mt-8 max-w-xl text-[1.05rem] leading-relaxed text-mist"
        >
          {body}
        </motion.p>
      </div>
    </section>
  );
}
