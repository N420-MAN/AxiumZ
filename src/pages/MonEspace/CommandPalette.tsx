import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useLocale } from "../../i18n/LocaleContext";
import { searchable } from "../../lib/programs";

interface Entry {
  key: string;
  label: string;
  sub: string;
  type: "student" | "stagiaire" | "class" | "teacher";
  to: string;
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const TYPE_STYLE: Record<Entry["type"], string> = {
  student: "bg-blue-50 text-blue-800",
  stagiaire: "bg-purple-50 text-purple-800",
  class: "bg-amber-50 text-amber-800",
  teacher: "bg-rose-50 text-rose-800",
};

/** Global quick finder (Ctrl/Cmd + K): students, classes and, for admins, teachers. */
export default function CommandPalette({ base, isAdmin, onClose }: { base: string; isAdmin: boolean; onClose: () => void }) {
  const { t } = useLocale();
  const s = t.monEspace.shell;
  const navigate = useNavigate();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    let cancelled = false;
    async function load() {
      const [{ data: students }, { data: classes }, teachers] = await Promise.all([
        supabase.from("students").select("id, first_name, last_name, kind, grade_level").order("last_name").limit(1000),
        supabase.from("classes").select("id, name, programs(name), levels(name)").eq("status", "active").limit(500),
        isAdmin ? supabase.from("teachers").select("id, first_name, last_name").order("last_name").limit(300) : Promise.resolve({ data: [] }),
      ]);
      if (cancelled) return;
      const list: Entry[] = [];
      for (const x of students ?? []) {
        list.push({
          key: `s${x.id}`,
          label: `${x.first_name} ${x.last_name}`,
          sub: x.grade_level ?? "",
          type: x.kind === "stagiaire" ? "stagiaire" : "student",
          to: `${base}/eleve/${x.id}`,
        });
      }
      for (const c of (classes as unknown as { id: string; name: string; programs: { name: string } | null; levels: { name: string } | null }[]) ?? []) {
        list.push({ key: `c${c.id}`, label: c.name, sub: [c.programs?.name, c.levels?.name].filter(Boolean).join(" · "), type: "class", to: `${base}/classe/${c.id}` });
      }
      for (const x of (teachers.data as { id: string; first_name: string; last_name: string }[]) ?? []) {
        list.push({ key: `t${x.id}`, label: `${x.first_name} ${x.last_name}`, sub: "", type: "teacher", to: `${base}/gestion/enseignants` });
      }
      setEntries(list);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [base, isAdmin]);

  const results = useMemo(() => {
    const q = searchable(query);
    const pool = q ? entries.filter((e) => searchable(e.label).includes(q) || searchable(e.sub).includes(q)) : entries.filter((e) => e.type === "class").concat(entries.filter((e) => e.type !== "class").slice(0, 5));
    return pool.slice(0, 8);
  }, [entries, query]);

  useEffect(() => setActive(0), [query]);

  function typeLabel(e: Entry) {
    return e.type === "student" ? s.typeStudent : e.type === "stagiaire" ? s.typeStagiaire : e.type === "class" ? s.typeClass : s.typeTeacher;
  }
  function go(e: Entry) {
    onClose();
    navigate(e.to);
  }
  function onKey(ev: React.KeyboardEvent) {
    if (ev.key === "Escape") onClose();
    else if (ev.key === "ArrowDown") {
      ev.preventDefault();
      setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0)));
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (ev.key === "Enter" && results[active]) go(results[active]);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-gray-900/40 px-4 pt-[12vh]" onClick={onClose} role="dialog" aria-modal="true" aria-label={s.searchButton}>
      <div className="app-fade-in w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()} onKeyDown={onKey}>
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
          <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-ink" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="9" cy="9" r="6" />
            <path d="M14 14l4 4" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={s.searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-[1rem] text-gray-900 outline-none placeholder:text-gray-400"
          />
          <button type="button" onClick={onClose} className="hidden rounded-lg border border-gray-200 px-2 py-0.5 text-[0.72rem] text-gray-400 sm:block">
            {s.searchEsc}
          </button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {!query && results.length > 0 && <p className="px-3 pb-1 pt-2 text-[0.7rem] font-semibold uppercase tracking-wider text-gray-400">{s.suggestions}</p>}
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-[0.9rem] text-gray-400">{s.noResult}</p>
          ) : (
            results.map((e, i) => (
              <button
                key={e.key}
                type="button"
                onClick={() => go(e)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ${i === active ? "bg-gray-50" : ""}`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[0.72rem] font-bold text-ink">{e.type === "class" ? "C" : initialsFrom(e.label)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.92rem] font-semibold text-gray-900">{e.label}</span>
                  {e.sub && <span className="block truncate text-[0.76rem] text-gray-500">{e.sub}</span>}
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.72rem] font-semibold ${TYPE_STYLE[e.type]}`}>{typeLabel(e)}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
