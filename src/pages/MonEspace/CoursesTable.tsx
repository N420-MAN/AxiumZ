import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { humanizeError } from "../../lib/humanizeError";
import { useConfirmDialog } from "./useConfirmDialog";

interface CourseRow {
  id: string;
  name: string;
  level: string | null;
  description: string | null;
}
interface ClassAggRow {
  id: string;
  course_id: string;
  class_students: { count: number }[];
}

type SortKey = "name" | "classes" | "students";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.9rem] text-gray-900 outline-none focus:border-gray-400";

export default function CoursesTable({ organizationId }: { organizationId: string }) {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [classAgg, setClassAgg] = useState<Record<string, { classCount: number; studentCount: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", level: "", description: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  async function load() {
    setLoading(true);
    const [{ data: courseData, error: courseError }, { data: classData }] = await Promise.all([
      supabase.from("courses").select("id, name, level, description").eq("organization_id", organizationId),
      supabase.from("classes").select("id, course_id, class_students(count)").eq("organization_id", organizationId),
    ]);
    if (courseError) setError(humanizeError(courseError));
    else setError(null);
    setCourses(courseData ?? []);

    const agg: Record<string, { classCount: number; studentCount: number }> = {};
    for (const cls of (classData as unknown as ClassAggRow[]) ?? []) {
      if (!agg[cls.course_id]) agg[cls.course_id] = { classCount: 0, studentCount: 0 };
      agg[cls.course_id].classCount += 1;
      agg[cls.course_id].studentCount += cls.class_students?.[0]?.count ?? 0;
    }
    setClassAgg(agg);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = courses;
    if (q) rows = rows.filter((c) => c.name.toLowerCase().includes(q) || (c.level ?? "").toLowerCase().includes(q));
    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "classes") cmp = (classAgg[a.id]?.classCount ?? 0) - (classAgg[b.id]?.classCount ?? 0);
      else cmp = (classAgg[a.id]?.studentCount ?? 0) - (classAgg[b.id]?.studentCount ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [courses, search, sortKey, sortDir, classAgg]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  function openAddForm() {
    setEditingId(null);
    setForm({ name: "", level: "", description: "" });
    setShowForm(true);
  }

  function openEditForm(c: CourseRow) {
    setEditingId(c.id);
    setForm({ name: c.name, level: c.level ?? "", description: c.description ?? "" });
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { name: form.name, level: form.level || null, description: form.description || null };
    const { error: saveError } = editingId
      ? await supabase.from("courses").update(payload).eq("id", editingId)
      : await supabase.from("courses").insert({ organization_id: organizationId, ...payload });
    setSaving(false);
    if (saveError) {
      setError(humanizeError(saveError));
      return;
    }
    setForm({ name: "", level: "", description: "" });
    setEditingId(null);
    setShowForm(false);
    setError(null);
    load();
  }

  async function handleDelete(id: string) {
    const { error: deleteError } = await supabase.from("courses").delete().eq("id", id);
    if (deleteError) setError(humanizeError(deleteError));
    else load();
  }

  const SortHeader = ({ label, sortKeyValue }: { label: string; sortKeyValue: SortKey }) => (
    <button type="button" onClick={() => toggleSort(sortKeyValue)} className="flex items-center gap-1 text-[0.75rem] font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-900">
      {label}
      {sortKey === sortKeyValue && <span>{sortDir === "asc" ? "↑" : "↓"}</span>}
    </button>
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
        <div>
          <h2 className="text-[1.1rem] font-semibold text-gray-900">Programmes</h2>
          <p className="mt-0.5 text-[0.8rem] text-gray-500">{courses.length} au total</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Rechercher un programme…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 rounded-md border border-gray-200 px-3 py-1.5 text-[0.85rem] outline-none focus:border-gray-400"
          />
          <button type="button" onClick={() => (showForm ? setShowForm(false) : openAddForm())} className="rounded-md bg-gray-900 px-3.5 py-1.5 text-[0.82rem] font-medium text-white">
            {showForm ? "Annuler" : "+ Ajouter"}
          </button>
        </div>
      </div>

      {error && <p className="px-5 pt-3 text-[0.82rem] text-red-600">{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 border-b border-gray-100 p-5 sm:grid-cols-3">
          <input required placeholder="Nom du programme" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          <input placeholder="Niveau (ex: Terminale)" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className={inputClass} />
          <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
          <button type="submit" disabled={saving} className="sm:col-span-3 rounded-md bg-gray-900 px-4 py-2 text-[0.85rem] font-medium text-white disabled:opacity-50">
            {saving ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Enregistrer"}
          </button>
        </form>
      )}

      <div className="overflow-x-auto">
        {loading ? (
          <p className="p-5 text-[0.85rem] text-gray-400">Chargement…</p>
        ) : filteredSorted.length === 0 ? (
          <p className="p-5 text-[0.85rem] text-gray-400">{search ? "Aucun résultat." : "Aucun programme pour le moment."}</p>
        ) : (
          <table className="w-full min-w-[560px] text-left text-[0.85rem]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-2.5"><SortHeader label="Nom" sortKeyValue="name" /></th>
                <th className="px-3 py-2.5 text-[0.75rem] font-semibold uppercase tracking-wide text-gray-500">Niveau</th>
                <th className="px-3 py-2.5"><SortHeader label="Classes actives" sortKeyValue="classes" /></th>
                <th className="px-3 py-2.5"><SortHeader label="Élèves au total" sortKeyValue="students" /></th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filteredSorted.map((c) => {
                const agg = classAgg[c.id] ?? { classCount: 0, studentCount: 0 };
                return (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-2.5 font-medium text-gray-900">{c.name}</td>
                    <td className="px-3 py-2.5 text-gray-500">{c.level ?? "—"}</td>
                    <td className="px-3 py-2.5 text-gray-700">{agg.classCount}</td>
                    <td className="px-3 py-2.5 text-gray-700">{agg.studentCount}</td>
                    <td className="px-5 py-2.5 text-right">
                      <button type="button" onClick={() => openEditForm(c)} className="mr-3 text-[0.78rem] text-gray-600 hover:text-gray-900 hover:underline">
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          confirm(
                            `Supprimer le programme "${c.name}" ? Toutes les classes de ce programme seront également supprimées, ainsi que les inscriptions, séances, présences et notes associées. Cette action est irréversible.`,
                            () => handleDelete(c.id),
                          )
                        }
                        className="text-[0.78rem] text-red-600 hover:underline"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {dialog}
    </div>
  );
}
