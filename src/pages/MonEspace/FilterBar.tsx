import { useLocale } from "../../i18n/LocaleContext";

export interface FilterSelect {
  key: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}

const controlClass =
  "rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[0.82rem] text-gray-700 outline-none focus:border-gray-400 disabled:opacity-50";

/**
 * Search + filters + sort for the Programmes / Niveaux / Classes lists:
 * one row of controls, a "shown of total" counter and a clear button that
 * only appears when something is active. Filters reset on every visit.
 */
export default function FilterBar({
  search,
  onSearch,
  placeholder,
  selects,
  sort,
  shown,
  total,
  onClear,
}: {
  search: string;
  onSearch: (value: string) => void;
  placeholder: string;
  selects: FilterSelect[];
  sort?: { value: string; onChange: (value: string) => void; options: { value: string; label: string }[] };
  shown: number;
  total: number;
  onClear: () => void;
}) {
  const { t } = useLocale();
  const f = t.monEspace.filters;
  const active = search.trim() !== "" || selects.some((s) => s.value !== "");

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className={`${controlClass} min-w-[11rem] flex-1 sm:max-w-xs`}
        />
        {selects.map((s) => (
          <select key={s.key} value={s.value} disabled={s.disabled} onChange={(e) => s.onChange(e.target.value)} className={controlClass} aria-label={s.label}>
            {s.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}
        {sort && (
          <label className="ml-auto flex items-center gap-1.5 text-[0.78rem] text-gray-500">
            {f.sortLabel}
            <select value={sort.value} onChange={(e) => sort.onChange(e.target.value)} className={controlClass}>
              {sort.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[0.76rem] text-gray-400">
        <span>{f.count.replace("{shown}", String(shown)).replace("{total}", String(total))}</span>
        {active && (
          <button type="button" onClick={onClear} className="font-medium text-gray-600 hover:text-gray-900 hover:underline">
            {f.clear}
          </button>
        )}
      </div>
    </div>
  );
}
