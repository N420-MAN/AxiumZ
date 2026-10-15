import { Link } from "react-router-dom";
import { useLocale } from "../../i18n/LocaleContext";
import { slotText } from "../../lib/programs";
import { useStructure } from "../../features/structure/useStructure";
import { seatText, isFull } from "../../lib/programs";

export default function StructureTree({ organizationId }: { organizationId: string }) {
  const { t, locale } = useLocale();
  const g = t.monEspace.gestion;
  const base = `/${locale}/mon-espace`;
  const { programs, levels, classes, loading } = useStructure(organizationId);

  if (loading) return null;
  if (programs.length === 0) return <p className="text-[0.9rem] text-gray-400">{g.treeEmpty}</p>;

  return (
    <div>
      <p className="mb-4 text-[0.82rem] text-gray-500">{g.treeHint}</p>
      <div className="grid gap-5 lg:grid-cols-2">
        {programs.map((p) => {
          const pl = levels.filter((l) => l.program_id === p.id).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
          return (
            <div key={p.id} className="app-card p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[1.05rem] font-extrabold text-gray-900">{p.name}</h2>
                <span className="rounded-full bg-accent-soft px-3 py-0.5 text-[0.7rem] font-bold text-ink">{classes.filter((c) => c.program_id === p.id).length}</span>
              </div>
              {pl.length === 0 && <p className="mt-3 text-[0.82rem] text-gray-400">—</p>}
              {pl.map((l) => {
                const cl = classes.filter((c) => c.level_id === l.id);
                return (
                  <div key={l.id} className="mt-4">
                    <p className="text-[0.72rem] font-bold uppercase tracking-wider text-gray-400">{l.name}</p>
                    {cl.length === 0 ? (
                      <p className="mt-1 text-[0.8rem] text-gray-400">{g.noClassesInLevel}</p>
                    ) : (
                      <div className="mt-1.5 space-y-1.5">
                        {cl.map((c) => (
                          <Link key={c.id} to={`${base}/classe/${c.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-2.5 hover:bg-gray-100">
                            <span className="min-w-0">
                              <span className="block truncate text-[0.88rem] font-semibold text-gray-900">{c.name}</span>
                              <span className="block truncate text-[0.74rem] text-gray-500">{[c.subject, c.teachers ? `${c.teachers.first_name} ${c.teachers.last_name}` : g.noTeacher, ...[...c.slots].sort((a, b) => a.weekday - b.weekday).map((sl) => slotText(sl, locale))].filter(Boolean).join(" · ")}</span>
                            </span>
                            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.72rem] font-semibold ${isFull(c) ? "bg-red-50 text-red-700" : "bg-white text-gray-700"}`}>{seatText(c)}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
