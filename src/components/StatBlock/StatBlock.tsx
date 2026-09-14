import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

interface StatBlockProps {
  value: string;
  label: string;
  tone?: "light" | "dark";
  accentColor?: "gold" | "red" | "default";
  compact?: boolean;
}

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Animates every number found in a string (e.g. "04—08", "100%", "3"),
 * preserving each number's original zero-padding width.
 */
function useCountUp(raw: string, active: boolean) {
  const matches = [...raw.matchAll(/\d+/g)];
  const targets = matches.map((m) => ({ value: parseInt(m[0], 10), width: m[0].length }));
  const [display, setDisplay] = useState(targets.length === 0 ? raw : raw.replace(/\d+/g, (m) => "0".repeat(m.length)));

  useEffect(() => {
    if (!active || targets.length === 0) {
      if (targets.length === 0) setDisplay(raw);
      return;
    }
    const duration = 1100;
    const start = performance.now();
    let frame: number;
    let i = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      i = 0;
      const next = raw.replace(/\d+/g, () => {
        const t = targets[i++];
        const current = Math.round(eased * t.value);
        return String(current).padStart(t.width, "0");
      });
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, raw]);

  return display;
}

export default function StatBlock({ value, label, tone = "light", accentColor = "default", compact = false }: StatBlockProps) {
  const labelColor = tone === "light" ? "text-mist" : "text-graphite";
  const numberColor =
    accentColor === "gold" ? "text-accent-bright" : accentColor === "red" ? "text-red-bright" : "";
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const display = useCountUp(value, inView);
  const numberSize = compact ? "text-[1.9rem] sm:text-[2.2rem]" : "text-[3.2rem] sm:text-[4rem]";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      <div className={`font-display leading-none font-extrabold tabular-nums ${numberSize} ${numberColor}`}>
        {display}
      </div>
      <div className={`mt-2 text-[0.85rem] tracking-[0.03em] ${labelColor}`}>{label}</div>
    </motion.div>
  );
}
