import { useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { humanizeError } from "../../lib/humanizeError";
import { useLocale } from "../../i18n/LocaleContext";
import NameInput from "./NameInput";
import { useStructure } from "../../features/structure/useStructure";
import type { Audience, ProgramKind, ProgramRow } from "../../lib/programs";
import { useConfirmDialog } from "./useConfirmDialog";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.9rem] text-gray-900 outline-none focus:border-gray-400";
const linkClass = "text-[0.78rem] text-gray-600 hover:text-gray-900 hover:underline disabled:opacity-50";

export default function ProgramsManager({ organizationId }: { organizationId: string }) {
  const { t } = useLocale();
  const pg = t.monEspace.programs;
  const c = t.monEspace.gestion.common;
  const { programs, levels, classes, loading, reload } = useStructure(organizationId);
  const { confirm, dialog } = useConfirmDialog();

  const [form, setForm] = useState<{ kind: ProgramKind; audience: Audience; name: string; starter: boolean }>({
    kind: "scolaire",
    audience: "eleves",
    name: "",
    starter: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; kind: ProgramKind; audience: Audience }>({ name: "", kind: "scolaire", audience: "both" });
  const [busyId, setBusyId] = useState<string | null>(null);

  const kindLabel: Record<ProgramKind, string> = { scolaire: pg.kindScolaire, langues: pg.kindLangues };
  const audienceLabel: Record<Audience, string> = { eleves: pg.audienceEleves, stagiaires: pg.audienceStagiaires, both: pg.audienceBoth };

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const { data, error: insertError } = await supabase
      .from("programs")
      .insert({ organization_id: organizationId, name: form.name.trim(), kind: form.kind, audience: form.audience })
      .select("id")
      .single();
    if (insertError || !data) {
      setSaving(false);
      setError(humanizeError(insertError));
      return;
    }
    // A language programme starts with the CEFR levels in one go.
    if (form.kind === "langues" && form.starter) {
      const { error: starterError } = await supabase.rpc("add_starter_levels", { p_program_id: data.id });
      if (starterError) setError(humanizeError(starterError));
    }
    setSaving(false);
    setForm({ ...form, name: "" });
    await reload();
  }

  function startEdit(program: ProgramRow) {
    setEditingId(program.id);
    setEditForm({ name: program.name, kind: program.kind, audience: program.audience });
    setError(null);
  }

  async function handleSaveEdit(program: ProgramRow) {
    setBusyId(program.id);
    setError(null);
    const { error: updateError } = await supabase
      .from("programs")
      .update({ name: editForm.name.trim(), kind: editForm.kind, audience: editForm.audience })
      .eq("id", program.id);
    setBusyId(null);
    if (updateError) {
      setError(humanizeError(updateError));
      return;
    }
    setEditingId(null);
    await reload();
  }

  async function handleToggleActive(program: ProgramRow) {
    setBusyId(program.id);
    setError(null);
    const { error: toggleError } = await supabase.from("programs").update({ is_active: !program.is_active }).eq("id", program.id);
    setBusyId(null);
    if (toggleError) setError(humanizeError(toggleError));
    await reload();
  }

  function handleDelete(program: ProgramRow) {
    confirm(`${c.delete} « ${program.name} » ?`, async () => {
      setBusyId(program.id);
      setError(null);
      const { error: deleteError } = await supabase.from("programs").delete().eq("id", program.id);
      setBusyId(null);
      if (deleteError) {
        // Classes or waiting-list requests still use it: protected by the database.
        setError(deleteError.code === "23503" ? pg.deleteBlocked : humanizeError(deleteError));
        return;
      }
      await reload();
    });
  }

  return (
    <div>
      <h2 className="text-[1rem] font-semibold text-gray-900">{pg.title}</h2>
      <p className="mt-0.5 max-w-2xl text-[0.8rem] text-gray-500">{pg.description}</p>

      <form onSubmit={handleAdd} className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-4">
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as ProgramKind })} className={inputClass} aria-label={pg.kindLabel}>
          <option value="scolaire">{pg.kindScolaire}</option>
          <option value="langues">{pg.kindLangues}</option>
        </select>
        <NameInput required placeholder={`${pg.namePlaceholder} *`} value={form.name} onChange={(v) => setForm({ ...form, name: v })} items={programs.map((p) => ({ id: p.id, name: p.name }))} inputClassName={inputClass} />
        <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value as Audience })} className={inputClass} aria-label={pg.audienceLabel}>
          <option value="eleves">{pg.audienceEleves}</option>
          <option value="stagiaires">{pg.audienceStagiaires}</option>
          <option value="both">{pg.audienceBoth}</option>
        </select>
        <button type="submit" disabled={saving} className="rounded-md bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.85rem] font-medium text-paper disabled:opacity-50">
          {saving ? c.saving : pg.add}
        </button>
        {form.kind === "langues" && (
          <label className="flex items-center gap-2 text-[0.8rem] text-gray-600 sm:col-span-4">
            <input type="checkbox" checked={form.starter} onChange={(e) => setForm({ ...form, starter: e.target.checked })} />
            {pg.withStarter}
          </label>
        )}
      </form>

      {error && <p className="mt-3 text-[0.82rem] text-red-600">{error}</p>}

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-[0.85rem] text-gray-400">{c.loading}</p>
        ) : programs.length === 0 ? (
          <p className="text-[0.85rem] text-gray-400">{pg.empty}</p>
        ) : (
          programs.map((program) => {
            const classCount = classes.filter((cl) => cl.program_id === program.id).length;
            const levelCount = levels.filter((lv) => lv.program_id === program.id).length;
            if (editingId === program.id) {
              return (
                <div key={program.id} className="grid grid-cols-1 items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-3 sm:grid-cols-[10rem_1fr_11rem_auto]">
                  <div>
                    <select
                      value={editForm.kind}
                      disabled={classCount > 0}
                      onChange={(e) => setEditForm({ ...editForm, kind: e.target.value as ProgramKind })}
                      className={`${inputClass} disabled:bg-gray-100 disabled:text-gray-500`}
                      aria-label={pg.kindLabel}
                    >
                      <option value="scolaire">{pg.kindScolaire}</option>
                      <option value="langues">{pg.kindLangues}</option>
                    </select>
                    {classCount > 0 && <p className="mt-0.5 text-[0.68rem] text-gray-400">{pg.typeLocked}</p>}
                  </div>
                  <NameInput required value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v })} items={programs.map((p) => ({ id: p.id, name: p.name }))} excludeId={program.id} inputClassName={inputClass} />
                  <select value={editForm.audience} onChange={(e) => setEditForm({ ...editForm, audience: e.target.value as Audience })} className={inputClass} aria-label={pg.audienceLabel}>
                    <option value="eleves">{pg.audienceEleves}</option>
                    <option value="stagiaires">{pg.audienceStagiaires}</option>
                    <option value="both">{pg.audienceBoth}</option>
                  </select>
                  <div className="flex items-center gap-3">
                    <button type="button" disabled={busyId === program.id || !editForm.name.trim()} onClick={() => handleSaveEdit(program)} className={`${linkClass} font-medium`}>
                      {c.save}
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className={linkClass}>
                      {c.cancel}
                    </button>
                  </div>
                </div>
              );
            }
            return (
              <div key={program.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 px-4 py-3 ${program.is_active ? "bg-white" : "bg-gray-50"}`}>
                <div className="min-w-0">
                  <span className={`text-[0.92rem] font-medium ${program.is_active ? "text-gray-900" : "text-gray-400"}`}>{program.name}</span>
                  <span className="ml-2 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[0.7rem] font-medium text-amber-800">{kindLabel[program.kind]}</span>
                  <span className="ml-1.5 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[0.7rem] font-medium text-blue-800">{audienceLabel[program.audience]}</span>
                  {!program.is_active && <span className="ml-1.5 rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[0.7rem] font-medium text-gray-500">{pg.inactive}</span>}
                  <p className="mt-0.5 text-[0.76rem] text-gray-400">{pg.usedBy.replace("{classes}", String(classCount)).replace("{levels}", String(levelCount))}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => startEdit(program)} className={linkClass}>
                    {c.edit}
                  </button>
                  <button type="button" disabled={busyId === program.id} onClick={() => handleToggleActive(program)} className={linkClass}>
                    {program.is_active ? pg.deactivate : pg.reactivate}
                  </button>
                  <button type="button" disabled={busyId === program.id} onClick={() => handleDelete(program)} className="text-[0.78rem] text-red-600 hover:underline disabled:opacity-50">
                    {c.delete}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
      {dialog}
    </div>
  );
}
