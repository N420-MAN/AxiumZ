import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { uploadMaterialFile, getMaterialSignedUrl } from "../../lib/materialUpload";
import { useLocale } from "../../i18n/LocaleContext";

interface MaterialRow {
  id: string;
  title: string;
  file_url: string | null;
  external_url: string | null;
}

export default function MaterialsSection({ classId, organizationId, canEdit }: { classId: string; organizationId: string; canEdit: boolean }) {
  const { t } = useLocale();
  const m = t.monEspace.materials;
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("materials").select("id, title, file_url, external_url").eq("class_id", classId).order("created_at", { ascending: false });
    setMaterials(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  async function handleSave() {
    if (!title.trim() || (!pendingFile && !link.trim())) {
      setError(m.needTitleAndSource);
      return;
    }
    setSaving(true);
    setError(null);

    let filePath: string | null = null;
    if (pendingFile) {
      const result = await uploadMaterialFile(classId, pendingFile);
      if ("error" in result) {
        setSaving(false);
        setError(result.error === "too_large" ? m.fileTooLarge : result.error === "invalid_type" ? m.fileInvalidType : m.fileTooLarge);
        return;
      }
      filePath = result.path;
    }

    const { error: insertError } = await supabase.from("materials").insert({
      organization_id: organizationId,
      class_id: classId,
      title,
      material_type: filePath ? "file" : "link",
      file_url: filePath,
      external_url: filePath ? null : link,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    supabase.functions.invoke("notify-class-content", { body: { classId, title, type: "material" } }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("Material notification failed:", err);
    });
    setTitle("");
    setLink("");
    setPendingFile(null);
    setShowForm(false);
    load();
  }

  async function handleDelete(material: MaterialRow) {
    if (material.file_url) {
      await supabase.storage.from("course-materials").remove([material.file_url]);
    }
    await supabase.from("materials").delete().eq("id", material.id);
    load();
  }

  async function handleOpen(material: MaterialRow) {
    if (material.external_url) {
      window.open(material.external_url, "_blank", "noopener,noreferrer");
      return;
    }
    if (material.file_url) {
      setOpeningId(material.id);
      const url = await getMaterialSignedUrl(material.file_url);
      setOpeningId(null);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="mt-5 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[0.88rem] font-semibold text-gray-900">{m.heading}</h3>
        {canEdit && (
          <button type="button" onClick={() => setShowForm((v) => !v)} className="text-[0.78rem] text-gray-600 hover:text-gray-900 hover:underline">
            {showForm ? t.monEspace.gestion.common.cancel : m.add}
          </button>
        )}
      </div>

      {showForm && (
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          <input
            placeholder={m.titlePlaceholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-[0.85rem] outline-none focus:border-gray-400"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-[0.8rem] text-gray-600 hover:bg-gray-50"
            >
              {pendingFile ? pendingFile.name : m.uploadFile}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                setPendingFile(e.target.files?.[0] ?? null);
                setLink("");
              }}
            />
            <span className="text-[0.76rem] text-gray-400">{m.orLink}</span>
            <input
              placeholder={m.linkPlaceholder}
              value={link}
              onChange={(e) => {
                setLink(e.target.value);
                setPendingFile(null);
              }}
              className="min-w-[160px] flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-[0.82rem] outline-none focus:border-gray-400"
            />
          </div>
          {error && <p className="text-[0.8rem] text-red-600">{error}</p>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-gradient-to-br from-ink to-ink-soft px-3.5 py-1.5 text-[0.82rem] font-medium text-paper disabled:opacity-50"
          >
            {saving ? m.saving : t.monEspace.gestion.common.save}
          </button>
        </div>
      )}

      <div className="mt-3 space-y-1.5">
        {loading ? (
          <p className="text-[0.8rem] text-gray-400">{t.monEspace.gestion.common.loading}</p>
        ) : materials.length === 0 ? (
          <p className="text-[0.8rem] text-gray-400">{m.empty}</p>
        ) : (
          materials.map((mat) => (
            <div key={mat.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-gray-50 px-3 py-2">
              <span className="min-w-0 break-words text-[0.85rem] text-gray-800">{mat.title}</span>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpen(mat)}
                  disabled={openingId === mat.id}
                  className="text-[0.78rem] text-gray-600 hover:text-gray-900 hover:underline disabled:opacity-50"
                >
                  {m.open}
                </button>
                {canEdit && (
                  <button type="button" onClick={() => handleDelete(mat)} className="text-[0.76rem] text-red-600 hover:underline">
                    {t.monEspace.gestion.common.delete}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
