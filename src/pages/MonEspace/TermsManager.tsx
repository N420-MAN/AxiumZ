import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { humanizeError } from "../../lib/humanizeError";

export interface Term {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.9rem] text-gray-900 outline-none focus:border-gray-400";

export default function TermsManager({ organizationId }: { organizationId: string }) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", start_date: "", end_date: "", is_current: true });

  async function load() {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("academic_terms")
      .select("id, name, start_date, end_date, is_current")
      .eq("organization_id", organizationId)
      .order("start_date", { ascending: false });
    if (fetchError) setError(humanizeError(fetchError));
    else setTerms(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (form.is_current) {
      await supabase.from("academic_terms").update({ is_current: false }).eq("organization_id", organizationId).eq("is_current", true);
    }

    const { error: insertError } = await supabase.from("academic_terms").insert({
      organization_id: organizationId,
      name: form.name,
      start_date: form.start_date,
      end_date: form.end_date,
      is_current: form.is_current,
    });

    setSaving(false);
    if (insertError) {
      setError(humanizeError(insertError));
      return;
    }
    setForm({ name: "", start_date: "", end_date: "", is_current: true });
    setShowForm(false);
    load();
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[1rem] font-semibold text-gray-900">Périodes académiques</h3>
          <p className="mt-0.5 text-[0.78rem] text-gray-500">Définit les dates de début/fin utilisées pour planifier les séances.</p>
        </div>
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
        <form onSubmit={handleAdd} className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
          <input
            required
            placeholder="Nom (ex : Semestre 1 2026-2027)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={`sm:col-span-2 ${inputClass}`}
          />
          <label className="block">
            <span className="text-[0.78rem] text-gray-500">Début</span>
            <input
              required
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="block">
            <span className="text-[0.78rem] text-gray-500">Fin</span>
            <input
              required
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="flex items-center gap-2 text-[0.85rem] text-gray-700 sm:col-span-2">
            <input type="checkbox" checked={form.is_current} onChange={(e) => setForm({ ...form, is_current: e.target.checked })} />
            Période actuelle
          </label>
          <button
            type="submit"
            disabled={saving}
            className="sm:col-span-2 rounded-md bg-gray-900 px-4 py-2 text-[0.85rem] font-medium text-white disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      )}

      <div className="mt-4 space-y-1.5">
        {loading ? (
          <p className="text-[0.85rem] text-gray-400">Chargement…</p>
        ) : terms.length === 0 ? (
          <p className="text-[0.85rem] text-gray-400">Aucune période définie.</p>
        ) : (
          terms.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-[0.85rem]">
              <span className="text-gray-800">
                {t.name}
                <span className="ml-2 text-gray-400">
                  {new Date(t.start_date).toLocaleDateString("fr-FR")} – {new Date(t.end_date).toLocaleDateString("fr-FR")}
                </span>
              </span>
              {t.is_current && <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[0.72rem] font-medium text-green-700">Actuelle</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
