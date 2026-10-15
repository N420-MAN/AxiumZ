import { useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { humanizeError } from "../../lib/humanizeError";
import { useLocale } from "../../i18n/LocaleContext";
import { useStructure } from "../../features/structure/useStructure";
import { isLanguageProgram } from "../../lib/programs";
import { useConfirmDialog } from "./useConfirmDialog";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.9rem] text-gray-900 outline-none focus:border-gray-400";
const linkClass = "text-[0.78rem] text-gray-600 hover:text-gray-900 hover:underline disabled:opacity-40";

// Specialties hang under a programme AND a niveau (Soutien Mission > Terminale > Sciences maths).
// Language programmes never need them, so they are not offered here.
export default function SpecialtiesManager({ organizationId }: { organizationId: string }) {
  const { t } = useLocale();
  const sp = t.monEspace.specialties;
  const c = t.monEspace.gestion.common;
  const { programs, levels, classes, specialties, loading, reload } = useStructure(organizationId);
  const { confirm, dialog } = useConfirmDialog();

  const [programId, setProgramId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schoolPrograms = programs.filter((p) => !isLanguageProgram(p.kind));
  const program = schoolPrograms.find((p) => p.id === programId) ?? schoolPrograms[0] ?? null;
  const programLevels = program ? levels.filter((l) => l.program_id === program.id).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)) : [];
  const level = programLevels.find((l) => l.id === levelId) ?? programLevels[0] ?? null;
  const items = level ? specialties.filter((s) => s.level_id === level.id) : [];
  const usedCount = (id: string) => classes.filter((cl) => cl.specialty_ids.includes(id)).length;

  async function run(action: () => Promise<{ error: unknown }>) {
    setBusy(true);
    setError(null);
    const { error: actionError } = await action();
    setBusy(false);
    if (actionError) {
      const code = (actionError as { code?: string }).code;
      setError(code === "23503" ? sp.deleteBlocked : humanizeError(actionError));
    }
    await reload();
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!program || !level) return;
    await run(async () => {
      const { error: insertError } = await supabase.from("specialties").insert({ organization_id: organizationId, program_id: program.id, level_id: level.id, name: name.trim() });
      if (!insertError) setName("");
      return { error: insertError };
    });
  }

  if (loading) return <p className="text-[0.85rem] text-gray-400">{c.loading}</p>;
  if (schoolPrograms.length === 0) return <p className="text-[0.85rem] text-gray-500">{sp.noPrograms}</p>;

  return (
    <div>
      <h2 className="text-[1rem] font-semibold text-gray-900">{sp.title}</h2>
      <p className="mt-0.5 max-w-2xl text-[0.8rem] text-gray-500">{sp.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="text-[0.8rem] font-medium text-gray-600" htmlFor="spec-program">
          {sp.programmeLabel}
        </label>
        <select
          id="spec-program"
          value={program?.id ?? ""}
          onChange={(e) => {
            setProgramId(e.target.value);
            setLevelId("");
            setEditingId(null);
            setError(null);
          }}
          className={`${inputClass} sm:max-w-xs`}
        >
          {schoolPrograms.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <label className="text-[0.8rem] font-medium text-gray-600" htmlFor="spec-level">
          {sp.niveauLabel}
        </label>
        <select
          id="spec-level"
          value={level?.id ?? ""}
          onChange={(e) => {
            setLevelId(e.target.value);
            setEditingId(null);
            setError(null);
          }}
          disabled={programLevels.length === 0}
          className={`${inputClass} sm:max-w-xs`}
        >
          {programLevels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      {programLevels.length === 0 ? (
        <p className="mt-4 text-[0.85rem] text-gray-500">{sp.noLevels}</p>
      ) : (
        <>
          <form onSubmit={handleAdd} className="mt-4 flex max-w-xl flex-wrap gap-2">
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={sp.namePlaceholder} className={`${inputClass} flex-1`} />
            <button type="submit" disabled={busy || !name.trim()} className="rounded-md bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.85rem] font-medium text-paper disabled:opacity-50">
              + {c.add}
            </button>
          </form>

          {error && <p className="mt-3 text-[0.82rem] text-red-600">{error}</p>}

          <div className="mt-4 max-w-xl space-y-2">
            {items.length === 0 && <p className="text-[0.85rem] text-gray-400">{sp.empty}</p>}
            {items.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3">
                {editingId === s.id ? (
                  <form
                    className="flex flex-1 flex-wrap gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run(async () => {
                        const { error: updateError } = await supabase.from("specialties").update({ name: editName.trim() }).eq("id", s.id);
                        if (!updateError) setEditingId(null);
                        return { error: updateError };
                      });
                    }}
                  >
                    <input required value={editName} onChange={(e) => setEditName(e.target.value)} className={`${inputClass} flex-1`} />
                    <button type="submit" disabled={busy} className={linkClass}>
                      {c.save}
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className={linkClass}>
                      {c.cancel}
                    </button>
                  </form>
                ) : (
                  <>
                    <div>
                      <span className="text-[0.92rem] font-medium text-gray-900">{s.name}</span>
                      <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[0.72rem] text-gray-600">{sp.usedBy.replace("{n}", String(usedCount(s.id)))}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className={linkClass}
                        onClick={() => {
                          setEditingId(s.id);
                          setEditName(s.name);
                        }}
                      >
                        {c.edit}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="text-[0.78rem] text-red-600 hover:underline disabled:opacity-40"
                        onClick={() => confirm(`${c.delete} « ${s.name} » ?`, () => run(async () => ({ error: (await supabase.from("specialties").delete().eq("id", s.id)).error })))}
                      >
                        {c.delete}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      {dialog}
    </div>
  );
}
