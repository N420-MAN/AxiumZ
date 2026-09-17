import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";

interface Material {
  id: string;
  title: string;
  material_type: string;
  external_url: string | null;
}

export default function MaterialsPanel({
  classId,
  organizationId,
  canEdit,
}: {
  classId: string;
  organizationId: string;
  canEdit: boolean;
}) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  async function load() {
    const { data } = await supabase.from("materials").select("id, title, material_type, external_url").eq("class_id", classId);
    setMaterials(data ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    await supabase.from("materials").insert({
      organization_id: organizationId,
      class_id: classId,
      title,
      material_type: "document",
      external_url: url || null,
    });
    setTitle("");
    setUrl("");
    setShowForm(false);
    load();
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[1rem] font-extrabold text-paper">Documents</h3>
        {canEdit && (
          <button type="button" onClick={() => setShowForm((v) => !v)} className="text-[0.78rem] text-accent-bright hover:underline">
            {showForm ? "Annuler" : "+ Ajouter"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mt-3 flex flex-wrap gap-2">
          <input
            required
            placeholder="Titre"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded border border-paper/15 bg-paper/[0.04] px-2 py-1.5 text-[0.82rem] text-paper"
          />
          <input
            placeholder="Lien (optionnel)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 rounded border border-paper/15 bg-paper/[0.04] px-2 py-1.5 text-[0.82rem] text-paper"
          />
          <button type="submit" className="rounded bg-accent px-3 py-1.5 text-[0.8rem] font-semibold text-ink">
            Ajouter
          </button>
        </form>
      )}

      <div className="mt-3 space-y-1.5">
        {materials.length === 0 ? (
          <p className="text-[0.8rem] text-mist">Aucun document.</p>
        ) : (
          materials.map((m) => (
            <div key={m.id} className="text-[0.85rem] text-paper">
              {m.external_url ? (
                <a href={m.external_url} target="_blank" rel="noreferrer" className="text-accent-bright hover:underline">
                  {m.title}
                </a>
              ) : (
                m.title
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
