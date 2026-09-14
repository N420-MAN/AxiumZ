import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale } from "../../i18n/LocaleContext";
import SectionLabel from "../SectionLabel/SectionLabel";
import Reveal from "../RevealText/Reveal";

const EASE = [0.16, 1, 0.3, 1] as const;

interface FAQItemProps {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}

function FAQItem({ question, answer, open, onToggle }: FAQItemProps) {
  return (
    <div className={`overflow-hidden rounded-2xl border transition-colors ${open ? "border-accent bg-paper" : "border-ink/10 bg-paper-soft"}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
      >
        <span className="font-display text-[1rem] font-semibold text-ink sm:text-[1.05rem]">{question}</span>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          viewBox="0 0 16 16"
          className="h-4 w-4 shrink-0 text-accent"
          fill="none"
        >
          <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <p className="px-5 pb-5 text-[0.95rem] leading-relaxed text-graphite sm:px-6">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface FAQAccordionProps {
  className?: string;
}

export default function FAQAccordion({ className = "" }: FAQAccordionProps) {
  const { t } = useLocale();
  const f = t.faq;
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className={`relative bg-paper-soft px-4 py-20 text-ink sm:px-6 sm:py-28 ${className}`}>
      <div className="pattern-grid-light pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="container-editorial relative !max-w-[820px] !px-0">
        <Reveal>
          <SectionLabel tone="dark">{f.label}</SectionLabel>
          <h2 className="font-display text-balance mt-5 text-[1.9rem] font-extrabold leading-[1.15] sm:text-[2.4rem]">
            {f.title}
          </h2>
        </Reveal>

        <div className="mt-10 space-y-3">
          {f.items.map((item, i) => (
            <Reveal key={item.question} delay={i * 0.05}>
              <FAQItem
                question={item.question}
                answer={item.answer}
                open={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
