import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { humanizeError } from "../../lib/humanizeError";
import { useLocale } from "../../i18n/LocaleContext";

interface SyllabusItem {
  id: string;
  title: string;
  position: number;
  start_date: string | null;
  end_date: string | null;
  objectives: string | null;
  planned_sessions: number | null;
}

interface SyllabusModalProps {
  courseId: string;
  courseName: string;
  onClose: () => void;
}

const detailInputClass = "w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-[0.8rem] outline-none focus:border-gray-400";

export default function SyllabusModal({ courseId, courseName, onClose }: SyllabusModalProps) {
  const { t } = useLocale();
  const m = t.monEspace.syllabus;
  const [items, setItems] = useState<SyllabusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailForm, setDetailForm] = useState({ start_date: "", end_date: "", objectives: "", planned_sessions: "" });
  const [savingDetails, setSavingDetails] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("syllabus_items")
      .select("id, title, position, start_date, end_date, objectives, planned_sessions")
      .eq("course_id", courseId)
      .order("position");
    setItems(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const nextPosition = items.length > 0 ? Math.max(...items.map((i) => i.position)) + 1 : 1;
    const { error: insertError } = await supabase.from("syllabus_items").insert({ course_id: courseId, title: newTitle, position: nextPosition });
    setSaving(false);
    if (insertError) {
      setError(humanizeError(insertError));
      return;
    }
    setNewTitle("");
    load();
  }

  async function handleDelete(id: string) {
    await supabase.from("syllabus_items").delete().eq("id", id);
    load();
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const a = items[index];
    const b = items[targetIndex];
    await Promise.all([
      supabase.from("syllabus_items").update({ position: b.position }).eq("id", a.id),
      supabase.from("syllabus_items").update({ position: a.position }).eq("id", b.id),
    ]);
    load();
  }

  function toggleExpand(item: SyllabusItem) {
    if (expandedId === item.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(item.id);
    setDetailForm({
      start_date: item.start_date ?? "",
      end_date: item.end_date ?? "",
      objectives: item.objectives ?? "",
      planned_sessions: item.planned_sessions?.toString() ?? "",
    });
  }

  async function handleSaveDetails(id: string) {
    setSavingDetails(true);
    await supabase
      .from("syllabus_items")
      .update({
        start_date: detailForm.start_date || null,
        end_date: detailForm.end_date || null,
        objectives: detailForm.objectives || null,
        planned_sessions: detailForm.planned_sessions ? Number(detailForm.planned_sessions) : null,
      })
      .eq("id", id);
    setSavingDetails(false);
    setExpandedId(null);
    load();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-[1rem] font-semibold text-gray-900">{m.title.replace("{name}", courseName)}</h2>
          <button type="button" onClick={onClose} className="text-[0.85rem] text-gray-400 hover:text-gray-700">
            {t.monEspace.gestion.classes.close}
          </button>
        </div>
        <p className="mt-2 text-[0.78rem] text-gray-500">{m.description}</p>

        <div className="mt-3 max-h-80 space-y-1.5 overflow-y-auto">
          {loading ? (
            <p className="text-[0.85rem] text-gray-400">{t.monEspace.gestion.common.loading}</p>
          ) : items.length === 0 ? (
            <p className="text-[0.85rem] text-gray-400">{m.empty}</p>
          ) : (
            items.map((item, index) => (
              <div key={item.id} className="rounded-md bg-gray-50">
                <div className="flex flex-wrap items-center justify-between gap-x-2 px-3 py-2">
                  <button type="button" onClick={() => toggleExpand(item)} className="min-w-0 break-words text-left text-[0.85rem] text-gray-800 hover:underline">
                    {item.title}
                    {item.planned_sessions && <span className="ml-1.5 text-[0.72rem] text-gray-400">({item.planned_sessions} {m.sessionsUnit})</span>}
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => handleMove(index, -1)} disabled={index === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-30">
                      ↑
                    </button>
                    <button type="button" onClick={() => handleMove(index, 1)} disabled={index === items.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-30">
                      ↓
                    </button>
                    <button type="button" onClick={() => handleDelete(item.id)} className="ml-1 text-[0.78rem] text-red-600 hover:underline">
                      {t.monEspace.gestion.common.delete}
                    </button>
                  </div>
                </div>

                {expandedId === item.id && (
                  <div className="space-y-2 border-t border-gray-200 px-3 py-3">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-[0.7rem] text-gray-500">{m.startDate}</span>
                        <input
                          type="date"
                          value={detailForm.start_date}
                          onChange={(e) => setDetailForm({ ...detailForm, start_date: e.target.value })}
                          className={`mt-0.5 ${detailInputClass}`}
                        />
                      </label>
                      <label className="block">
                        <span className="text-[0.7rem] text-gray-500">{m.endDate}</span>
                        <input
                          type="date"
                          value={detailForm.end_date}
                          onChange={(e) => setDetailForm({ ...detailForm, end_date: e.target.value })}
                          className={`mt-0.5 ${detailInputClass}`}
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-[0.7rem] text-gray-500">{m.plannedSessions}</span>
                      <input
                        type="number"
                        min="1"
                        value={detailForm.planned_sessions}
                        onChange={(e) => setDetailForm({ ...detailForm, planned_sessions: e.target.value })}
                        className={`mt-0.5 ${detailInputClass}`}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[0.7rem] text-gray-500">{m.objectives}</span>
                      <textarea
                        value={detailForm.objectives}
                        onChange={(e) => setDetailForm({ ...detailForm, objectives: e.target.value })}
                        rows={2}
                        className={`mt-0.5 ${detailInputClass}`}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSaveDetails(item.id)}
                      disabled={savingDetails}
                      className="rounded-md bg-gradient-to-br from-ink to-ink-soft px-3 py-1.5 text-[0.8rem] font-medium text-paper disabled:opacity-50"
                    >
                      {savingDetails ? t.monEspace.gestion.common.saving : t.monEspace.gestion.common.save}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAdd} className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
          <input
            required
            placeholder={m.newItemPlaceholder}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-[0.88rem] outline-none focus:border-gray-400"
          />
          <button
            type="submit"
            disabled={saving}
            className="shrink-0 rounded-md bg-gradient-to-br from-ink to-ink-soft px-3.5 py-2 text-[0.82rem] font-medium text-paper disabled:opacity-50"
          >
            {t.monEspace.gestion.common.add}
          </button>
        </form>
        {error && <p className="mt-2 text-[0.82rem] text-red-600">{error}</p>}
      </div>
    </div>
  );
}
