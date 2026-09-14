import { useLocale } from "../../../i18n/LocaleContext";
import StatBlock from "../../../components/StatBlock/StatBlock";

const ICONS = [
  { badge: "bg-accent-bright text-ink", path: <path d="M4 4.5h6.5v6.5H4V4.5Zm7.5 0H18v6.5h-6.5V4.5ZM4 12.5h6.5V19H4v-6.5Zm7.5 0H18V19h-6.5v-6.5Z" /> },
  { badge: "bg-red-bright text-paper", path: <path d="M11 2.5 3 6.5l8 4 8-4-8-4Zm-6 6V15c0 1.9 2.7 3.5 6 3.5s6-1.6 6-3.5V8.5" /> },
  { badge: "bg-paper text-ink", path: <path d="M11 3v6l4.2 2.4M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" /> },
];

export default function Proof() {
  const { t } = useLocale();

  return (
    <section className="relative border-b border-line-dark bg-ink px-4 py-14 text-paper sm:px-6 sm:py-18">
      <div className="pattern-diagonal pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="container-editorial relative grid !max-w-[1180px] grid-cols-1 gap-6 !px-0 sm:grid-cols-3">
        {t.home.proof.items.map((item, i) => (
          <div key={item.label} className="flex items-center gap-4 rounded-2xl bg-paper/[0.04] p-5">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${ICONS[i % ICONS.length].badge}`}>
              <svg viewBox="0 0 22 22" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                {ICONS[i % ICONS.length].path}
              </svg>
            </span>
            <StatBlock
              value={item.value}
              label={item.label}
              tone="light"
              accentColor={i === 0 ? "gold" : i === 1 ? "red" : "default"}
              compact
            />
          </div>
        ))}
      </div>
    </section>
  );
}
