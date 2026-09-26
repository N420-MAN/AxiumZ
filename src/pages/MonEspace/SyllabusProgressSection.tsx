import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useLocale } from "../../i18n/LocaleContext";

interface SyllabusItemRow {
  id: string;
  title: string;
  planned_sessions: number | null;
}

export default function SyllabusProgressSection({ classId, courseId }: { classId: string; courseId: string }) {
  const { t } = useLocale();
  const m = t.monEspace.progress;
  const [items, setItems] = useState<SyllabusItemRow[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [realizedCounts, setRealizedCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: syllabusData }, { data: progressData }, { data: sessionData }] = await Promise.all([
      supabase.from("syllabus_items").select("id, title, planned_sessions").eq("course_id", courseId).order("position"),
      supabase.from("class_syllabus_progress").select("syllabus_item_id").eq("class_id", classId),
      supabase.from("class_sessions").select("syllabus_item_id").eq("class_id", classId).not("syllabus_item_id", "is", null).lte("starts_at", new Date().toISOString()),
    ]);
    setItems(syllabusData ?? []);
    setCompletedIds(new Set((progressData ?? []).map((p) => p.syllabus_item_id)));
    const counts: Record<string, number> = {};
    for (const s of sessionData ?? []) {
      if (s.syllabus_item_id) counts[s.syllabus_item_id] = (counts[s.syllabus_item_id] ?? 0) + 1;
    }
    setRealizedCounts(counts);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, courseId]);

  async function toggleItem(itemId: string) {
    const isDone = completedIds.has(itemId);
    if (isDone) {
      await supabase.from("class_syllabus_progress").delete().eq("class_id", classId).eq("syllabus_item_id", itemId);
    } else {
      await supabase.from("class_syllabus_progress").insert({ class_id: classId, syllabus_item_id: itemId });
    }
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (isDone) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div className="mt-4 border-t border-gray-200 pt-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[0.85rem] font-semibold text-gray-900">{m.heading}</h4>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[0.75rem] font-medium text-gray-700">
          {m.countLabel.replace("{done}", String(completedIds.size)).replace("{total}", String(items.length))}
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {items.map((item) => {
          const done = completedIds.has(item.id);
          const realized = realizedCounts[item.id] ?? 0;
          const showProgress = item.planned_sessions !== null && item.planned_sessions > 0;
          const behind = showProgress && !done && realized < (item.planned_sessions as number);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleItem(item.id)}
              title={behind ? m.behindPace : showProgress ? m.onPace : undefined}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8rem] transition-colors ${
                done ? "border-green-200 bg-green-50 text-green-800" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[0.65rem] ${done ? "bg-green-500 text-white" : "border border-gray-300"}`}>
                {done && "✓"}
              </span>
              {item.title}
              {showProgress && (
                <span className={`text-[0.72rem] ${behind ? "text-amber-600" : "text-gray-400"}`}>
                  {m.sessionsProgress.replace("{done}", String(realized)).replace("{planned}", String(item.planned_sessions))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
