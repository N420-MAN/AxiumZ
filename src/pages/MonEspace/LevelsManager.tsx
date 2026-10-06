import { useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { humanizeError } from "../../lib/humanizeError";
import { useLocale } from "../../i18n/LocaleContext";
import { useStructure } from "../../features/structure/useStructure";
import type { LevelRow } from "../../lib/programs";
import { useConfirmDialog } from "./useConfirmDialog";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.9rem] text-gray-900 outline-none focus:border-gray-400";
const linkClass = "text-[0.78rem] text-gray-600 hover:text-gray-900 hover:underline disabled:opacity-40";

export default function LevelsManager({ organizationId }: { organizationId: string }) {
  const { t } = useLocale();
  const lv = t.monEspace.levels;
  const c = t.monEspace.gestion.common;
  const { programs, levels, classes, loading, reload } = useStructure(organizationId);
  const { confirm, dialog } = useConfirmDialog();

  const [pickedProgramId, setPickedProgramId] = useState("");
  const [name, setName] = useState("");
  const [copyFrom, setCopyFrom] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // The programme being worked on: the picked one, else the first.
  const program = programs.find((p) => p.id === pickedProgramId) ?? programs[0] ?? null;
  const programLevels = program
    ? levels.filter((l) => l.program_id === program.id).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
    : [];
  const otherPrograms = programs.filter((p) => p.id !== program?.id && levels.some((l) => l.program_id === p.id));

  // Runs one change, then refreshes. Keeps the error / info lines in sync.
  async function run(action: () => Promise<{ error: unknown; message?: string }>) {
    setBusy(true);
    setError(null);
    setInfo(null);
    const result = await action();
    setBusy(false);
    if (result.error) {
      const code = (result.error as { code?: string }).code;
      setError(code === "23503" ? lv.deleteBlocked : humanizeError(result.error));
    } else if (result.message) {
      setInfo(result.message);
    }
    await reload();
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!program) return;
    await run(async () => {
      const { error: insertError } = await supabase.from("levels").insert({ organization_id: organizationId, program_id: program.id, name: name.trim() });
      if (!insertError) setName("");
      return { error: insertError };
    });
  }

  const handleMove = (level: LevelRow, direction: -1 | 1) =>
    run(async () => ({ error: (await supabase.rpc("move_level", { p_level_id: level.id, p_direction: direction })).error }));

  const handleSaveEdit = (level: LevelRow) =>
    run(async () => {
      const { error: updateError } = await supabase.from("levels").update({ name: editName.trim() }).eq("id", level.id);
      if (!updateError) setEditingId(null);
      return { error: updateError };
    });

  function handleDelete(level: LevelRow) {
    confirm(`${c.delete} « ${level.name} » ?`, () => run(async () => ({ error: (await supabase.from("levels").delete().eq("id", level.id)).error })));
  }

  const handleStarter = () =>
    program
      ? run(async () => {
          const { data, error: starterError } = await supabase.rpc("add_starter_levels", { p_program_id: program.id });
          return { error: starterError, message: starterError ? undefined : lv.copied.replace("{n}", String(data ?? 0)) };
        })
      : undefined;

  const handleCopy = () =>
    program && copyFrom
      ? run(async () => {
          const { data, error: copyError } = await supabase.rpc("copy_levels", { p_from: copyFrom, p_to: program.id });
          if (!copyError) setCopyFrom("");
          return { error: copyError, message: copyError ? undefined : lv.copied.replace("{n}", String(data ?? 0)) };
        })
      : undefined;

  if (loading) return <p className="text-[0.85rem] text-gray-400">{c.loading}</p>;
  if (programs.length === 0) return <p className="text-[0.85rem] text-gray-500">{lv.noPrograms}</p>;

  return (
    <div>
      <h2 className="text-[1rem] font-semibold text-gray-900">{lv.title}</h2>
      <p className="mt-0.5 max-w-2xl text-[0.8rem] text-gray-500">{lv.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="text-[0.8rem] font-medium text-gray-600" htmlFor="levels-program">
          {lv.programmeLabel}
        </label>
        <select
          id="levels-program"
          value={program?.id ?? ""}
          onChange={(e) => {
            setPickedProgramId(e.target.value);
            setEditingId(null);
            setError(null);
            setInfo(null);
          }}
          className={`${inputClass} sm:max-w-xs`}
        >
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {program?.kind === "langues" && (
          <button type="button" disabled={busy} onClick={handleStarter} className="rounded-md border border-gray-200 px-3 py-1.5 text-[0.8rem] text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {lv.starterAdd}
          </button>
        )}
      </div>

      <form onSubmit={handleAdd} className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-[1fr_auto]">
        <input required placeholder={`${lv.namePlaceholder} *`} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        <button type="submit" disabled={busy} className="rounded-md bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.85rem] font-medium text-paper disabled:opacity-50">
          {lv.add}
        </button>
      </form>

      {otherPrograms.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.8rem] text-gray-500">
          <span>{lv.copyFrom}</span>
          <select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[0.8rem] text-gray-700">
            <option value="">{lv.copyPick}</option>
            {otherPrograms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button type="button" disabled={busy || !copyFrom} onClick={handleCopy} className={`${linkClass} font-medium`}>
            {lv.copyAction}
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-[0.82rem] text-red-600">{error}</p>}
      {info && <p className="mt-3 text-[0.82rem] text-green-700">{info}</p>}

      <div className="mt-4 space-y-1.5">
        {programLevels.length === 0 ? (
          <p className="text-[0.85rem] text-gray-400">{lv.empty}</p>
        ) : (
          programLevels.map((level, index) => {
            const used = classes.filter((cl) => cl.level_id === level.id).length;
            return (
              <div key={level.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5">
                {editingId === level.id ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <input required value={editName} onChange={(e) => setEditName(e.target.value)} className={`${inputClass} sm:max-w-xs`} />
                    <button type="button" disabled={busy || !editName.trim()} onClick={() => handleSaveEdit(level)} className={`${linkClass} font-medium`}>
                      {c.save}
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className={linkClass}>
                      {c.cancel}
                    </button>
                  </div>
                ) : (
                  <div className="min-w-0">
                    <span className="text-[0.9rem] font-medium text-gray-900">{level.name}</span>
                    {used > 0 && <span className="ml-2 text-[0.76rem] text-gray-400">{lv.usedBy.replace("{n}", String(used))}</span>}
                  </div>
                )}
                {editingId !== level.id && (
                  <div className="flex items-center gap-3">
                    <button type="button" disabled={busy || index === 0} onClick={() => handleMove(level, -1)} className={linkClass} aria-label={lv.moveUp}>
                      ▲
                    </button>
                    <button type="button" disabled={busy || index === programLevels.length - 1} onClick={() => handleMove(level, 1)} className={linkClass} aria-label={lv.moveDown}>
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(level.id);
                        setEditName(level.name);
                      }}
                      className={linkClass}
                    >
                      {c.edit}
                    </button>
                    <button type="button" disabled={busy} onClick={() => handleDelete(level)} className="text-[0.78rem] text-red-600 hover:underline disabled:opacity-50">
                      {c.delete}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      {dialog}
    </div>
  );
}
