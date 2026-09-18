import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { humanizeError } from "../../lib/humanizeError";
import { useConfirmDialog } from "./useConfirmDialog";

interface Course {
  id: string;
  name: string;
  description: string | null;
  level: string | null;
  status: string;
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.9rem] text-gray-900 outline-none focus:border-gray-400";

export default function CoursesManager({ organizationId }: { organizationId: string }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();
  const [form, setForm] = useState({ name: "", description: "", level: "" });

  async function load() {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("courses")
      .select("id, name, description, level, status")
      .eq("organization_id", organizationId)
      .order("name");
    if (fetchError) setError(humanizeError(fetchError));
    else setCourses(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error: insertError } = await supabase.from("courses").insert({
      organization_id: organizationId,
      name: form.name,
      description: form.description || null,
      level: form.level || null,
    });
    setSaving(false);
    if (insertError) {
      setError(humanizeError(insertError));
      return;
    }
    setForm({ name: "", description: "", level: "" });
    setShowForm(false);
    setError(null);
    load();
  }

  async function handleDelete(id: string) {
    const { error: deleteError } = await supabase.from("courses").delete().eq("id", id);
    if (deleteError) setError(humanizeError(deleteError));
    else load();
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[1rem] font-semibold text-gray-900">Programmes (catalogue)</h3>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-gray-900 px-3.5 py-1.5 text-[0.82rem] font-medium text-white"
        >
          {showForm ? "Annuler" : "+ Ajouter"}
        </button>
      </div>

      {error && <p className="mt-3 text-[0.82rem] text-red-600">{error}</p>}

      {showForm && (
        <form onSubmit={handleAdd} className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-3">
          <input
            required
            placeholder="Nom du programme"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
          />
          <input
            placeholder="Niveau (ex: Terminale)"
            value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value })}
            className={inputClass}
          />
          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={saving}
            className="sm:col-span-3 rounded-md bg-gray-900 px-4 py-2 text-[0.85rem] font-medium text-white disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      )}

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-[0.85rem] text-gray-400">Chargement…</p>
        ) : courses.length === 0 ? (
          <p className="text-[0.85rem] text-gray-400">Aucun programme pour le moment.</p>
        ) : (
          courses.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-2.5">
              <div>
                <span className="text-[0.9rem] font-medium text-gray-900">{c.name}</span>
                {c.level && <span className="ml-2 text-[0.8rem] text-gray-500">({c.level})</span>}
              </div>
              <button
                type="button"
                onClick={() =>
                  confirm(
                    `Supprimer le programme "${c.name}" ? Toutes les classes de ce programme seront également supprimées, ainsi que les inscriptions, séances, présences et notes associées. Cette action est irréversible.`,
                    () => handleDelete(c.id),
                  )
                }
                className="text-[0.8rem] text-red-600 hover:underline"
              >
                Supprimer
              </button>
            </div>
          ))
        )}
      </div>
      {dialog}
    </div>
  );
}
