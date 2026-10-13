import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useLocale } from "../../i18n/LocaleContext";

interface Person {
  key: string;
  id: string;
  name: string;
  role: "eleve" | "stagiaire" | "parent" | "superviseur" | "teacher";
  sub: string;
}

const BADGE: Record<Person["role"], string> = {
  eleve: "bg-blue-50 text-blue-800",
  stagiaire: "bg-purple-50 text-purple-800",
  parent: "bg-green-50 text-green-800",
  superviseur: "bg-teal-50 text-teal-800",
  teacher: "bg-amber-50 text-amber-800",
};

export default function PeopleDirectory({ organizationId }: { organizationId: string }) {
  const { t, locale } = useLocale();
  const g = t.monEspace.gestion;
  const base = `/${locale}/mon-espace`;
  const [people, setPeople] = useState<Person[]>([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Person["role"] | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [s, p, te] = await Promise.all([
        supabase.from("students").select("id, first_name, last_name, kind, school_name, grade_level").eq("organization_id", organizationId).limit(2000),
        supabase.from("parents").select("id, first_name, last_name, kind, phone").eq("organization_id", organizationId).limit(2000),
        supabase.from("teachers").select("id, first_name, last_name, specialization").eq("organization_id", organizationId).limit(500),
      ]);
      const list: Person[] = [];
      for (const r of s.data ?? []) list.push({ key: `s${r.id}`, id: r.id, name: `${r.first_name} ${r.last_name}`, role: r.kind === "stagiaire" ? "stagiaire" : "eleve", sub: [r.school_name, r.kind === "eleve" ? r.grade_level : null].filter(Boolean).join(" · ") });
      for (const r of p.data ?? []) list.push({ key: `p${r.id}`, id: r.id, name: `${r.first_name} ${r.last_name}`, role: r.kind === "superviseur" ? "superviseur" : "parent", sub: r.phone ?? "" });
      for (const r of te.data ?? []) list.push({ key: `t${r.id}`, id: r.id, name: `${r.first_name} ${r.last_name}`, role: "teacher", sub: r.specialization ?? "" });
      list.sort((a, b) => a.name.localeCompare(b.name));
      setPeople(list);
      setLoading(false);
    }
    load();
  }, [organizationId]);

  const label: Record<Person["role"], string> = {
    eleve: t.monEspace.people.eleves,
    stagiaire: t.monEspace.people.stagiaires,
    parent: t.monEspace.guardian.parents,
    superviseur: t.monEspace.guardian.supervisors,
    teacher: g.teachersTitle,
  };
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return people.filter((x) => (role === "all" || x.role === role) && (!n || x.name.toLowerCase().includes(n)));
  }, [people, q, role]);
  const roles = Object.keys(label) as Person["role"][];

  return (
    <div className="app-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={g.searchPeople}
          className="min-w-[200px] flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[0.88rem] outline-none focus:border-ink"
        />
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setRole("all")} className={`rounded-full px-3 py-1.5 text-[0.78rem] font-semibold ${role === "all" ? "bg-ink text-paper" : "bg-gray-100 text-gray-600"}`}>
            {g.allPeople} · {people.length}
          </button>
          {roles.map((r) => (
            <button key={r} type="button" onClick={() => setRole(r)} className={`rounded-full px-3 py-1.5 text-[0.78rem] font-semibold ${role === r ? "bg-ink text-paper" : "bg-gray-100 text-gray-600"}`}>
              {label[r]} · {people.filter((x) => x.role === r).length}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {loading ? null : shown.length === 0 ? (
          <p className="py-6 text-[0.88rem] text-gray-400">—</p>
        ) : (
          shown.map((x) => {
            const inner = (
              <>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[0.72rem] font-bold text-ink">
                  {x.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.9rem] font-semibold text-gray-900">{x.name}</span>
                  {x.sub && <span className="block truncate text-[0.76rem] text-gray-500">{x.sub}</span>}
                </span>
                <span className={`rounded-full px-3 py-0.5 text-[0.7rem] font-semibold ${BADGE[x.role]}`}>{label[x.role]}</span>
              </>
            );
            const cls = "flex items-center gap-3 border-t border-gray-100 py-2.5 first:border-t-0";
            return x.role === "eleve" || x.role === "stagiaire" ? (
              <Link key={x.key} to={`${base}/eleve/${x.id}`} className={`${cls} hover:opacity-80`}>
                {inner}
              </Link>
            ) : (
              <div key={x.key} className={cls}>
                {inner}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
