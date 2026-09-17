import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";

interface Course {
  id: string;
  name: string;
  description: string | null;
  level: string | null;
  status: string;
}

const inputClass =
  "w-full rounded-lg border border-paper/15 bg-paper/[0.04] px-3 py-2 text-[0.9rem] text-paper outline-none focus:border-accent-bright";

export default function CoursesManager({ organizationId }: { organizationId: string }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", level: "" });

  async function load() {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("courses")
      .select("id, name, description, level, status")
      .eq("organization_id", organizationId)
      .order("name");
    if (fetchError) setError(fetchError.message);
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
      setError(insertError.message);
      return;
    }
    setForm({ name: "", description: "", level: "" });
    setShowForm(false);
    setError(null);
    load();
  }

  async function handleDelete(id: string) {
    const { error: deleteError } = await supabase.from("courses").delete().eq("id", id);
    if (deleteError) setError(deleteError.message);
    else load();
  }

  return (
    <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[1.15rem] font-extrabold">Programmes (catalogue)</h3>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-full bg-accent px-4 py-1.5 text-[0.82rem] font-semibold text-ink"
        >
          {showForm ? "Annuler" : "+ Ajouter"}
        </button>
      </div>

      {error && <p className="mt-3 text-[0.82rem] text-red-bright">{error}</p>}

      {showForm && (
        <form onSubmit={handleAdd} className="mt-4 grid grid-cols-1 gap-3 border-t border-paper/10 pt-4 sm:grid-cols-3">
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
            className="sm:col-span-3 rounded-lg bg-ink-soft px-4 py-2 text-[0.88rem] font-semibold text-paper disabled:opacity-60"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      )}

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-[0.85rem] text-mist">Chargement…</p>
        ) : courses.length === 0 ? (
          <p className="text-[0.85rem] text-mist">Aucun programme pour le moment.</p>
        ) : (
          courses.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-paper/10 bg-ink-soft px-4 py-2.5">
              <div>
                <span className="text-[0.9rem] font-medium text-paper">{c.name}</span>
                {c.level && <span className="ml-2 text-[0.8rem] text-mist">({c.level})</span>}
              </div>
              <button type="button" onClick={() => handleDelete(c.id)} className="text-[0.8rem] text-red-bright hover:underline">
                Supprimer
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
