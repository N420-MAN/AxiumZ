import { lazy, Suspense, useEffect, useState } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import Hero from "./sections/Hero";
import Proof from "./sections/Proof";
import Positioning from "./sections/Positioning";

const BelowFold = lazy(() => import("./BelowFold"));

// Tall placeholder: keeps the footer far below the fold while the rest of the page loads,
// so nothing visible jumps when the sections arrive.
const Placeholder = () => <div aria-hidden="true" style={{ minHeight: "3200px" }} />;

export default function Home() {
  const { t } = useLocale();
  usePageMeta(t.meta.titleSuffix, t.meta.defaultDescription, "home");

  // Start loading the lower sections only once the first screen has been painted.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: 1200 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setReady(true), 300);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <>
      <Hero />
      <Proof />
      <Positioning />
      {ready ? (
        <Suspense fallback={<Placeholder />}>
          <BelowFold />
        </Suspense>
      ) : (
        <Placeholder />
      )}
    </>
  );
}
