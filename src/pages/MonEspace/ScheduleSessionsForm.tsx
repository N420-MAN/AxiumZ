import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { humanizeError } from "../../lib/humanizeError";
import { useConfirmDialog } from "./useConfirmDialog";

interface SessionRow {
  id: string;
  starts_at: string;
  ends_at: string;
  room: string | null;
}

const DAY_OPTIONS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
];

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.85rem] text-gray-900 outline-none focus:border-gray-400";

// Every date between start and end (inclusive) that falls on the given
// weekday (0 = Sunday ... 6 = Saturday, matching Date.getDay()).
function datesForWeekday(startDate: string, endDate: string, weekday: number): Date[] {
  const dates: Date[] = [];
  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  while (current.getDay() !== weekday) {
    current.setDate(current.getDate() + 1);
  }
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  return dates;
}

export default function ScheduleSessionsForm({ classId, defaultRoom, organizationId }: { classId: string; defaultRoom: string | null; organizationId: string }) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { confirm, dialog } = useConfirmDialog();
  const [form, setForm] = useState({
    weekday: 1,
    startTime: "14:00",
    endTime: "16:00",
    room: defaultRoom ?? "",
    startDate: "",
    endDate: "",
  });

  async function load() {
    setLoading(true);
    const [{ data: sessionData }, { data: termData }] = await Promise.all([
      supabase.from("class_sessions").select("id, starts_at, ends_at, room").eq("class_id", classId).order("starts_at"),
      supabase.from("academic_terms").select("start_date, end_date").eq("organization_id", organizationId).eq("is_current", true).maybeSingle(),
    ]);
    setSessions(sessionData ?? []);
    if (termData) {
      setForm((f) => ({ ...f, startDate: f.startDate || termData.start_date, endDate: f.endDate || termData.end_date }));
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  function computeDates(): Date[] {
    if (!form.startDate || !form.endDate) return [];
    return datesForWeekday(form.startDate, form.endDate, form.weekday);
  }

  async function createSessions(dates: Date[]) {
    setSaving(true);
    setError(null);
    const rows = dates.map((d) => {
      const dateStr = d.toISOString().slice(0, 10);
      return {
        class_id: classId,
        starts_at: new Date(`${dateStr}T${form.startTime}:00`).toISOString(),
        ends_at: new Date(`${dateStr}T${form.endTime}:00`).toISOString(),
        room: form.room || null,
      };
    });
    const { error: insertError } = await supabase.from("class_sessions").insert(rows);
    setSaving(false);
    if (insertError) {
      setError(humanizeError(insertError));
      return;
    }
    setShowForm(false);
    load();
  }

  function handleSubmit() {
    const dates = computeDates();
    if (dates.length === 0) {
      setError("Aucune date ne correspond à cette période et ce jour de la semaine.");
      return;
    }
    const dayLabel = DAY_OPTIONS.find((d) => d.value === form.weekday)?.label;
    confirm(
      `Créer ${dates.length} séance${dates.length > 1 ? "s" : ""} le ${dayLabel} de ${form.startTime} à ${form.endTime}, du ${new Date(form.startDate).toLocaleDateString("fr-FR")} au ${new Date(form.endDate).toLocaleDateString("fr-FR")} ?`,
      () => createSessions(dates),
    );
  }

  const previewCount = showForm ? computeDates().length : 0;

  return (
    <div className="mt-4 border-t border-gray-200 pt-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[0.85rem] font-semibold text-gray-900">Séances programmées ({sessions.length})</h4>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="text-[0.78rem] text-gray-600 hover:text-gray-900 hover:underline">
          {showForm ? "Annuler" : "+ Planifier"}
        </button>
      </div>

      {error && <p className="mt-2 text-[0.78rem] text-red-600">{error}</p>}

      {showForm && (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 sm:grid-cols-3">
          <select value={form.weekday} onChange={(e) => setForm({ ...form, weekday: Number(e.target.value) })} className={inputClass}>
            {DAY_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className={inputClass} />
          <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className={inputClass} />
          <input placeholder="Salle" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} className={inputClass} />
          <label className="col-span-1">
            <span className="text-[0.72rem] text-gray-500">Du</span>
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={`mt-0.5 ${inputClass}`} />
          </label>
          <label className="col-span-1">
            <span className="text-[0.72rem] text-gray-500">Au</span>
            <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={`mt-0.5 ${inputClass}`} />
          </label>

          <div className="col-span-2 flex items-center gap-3 sm:col-span-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || previewCount === 0}
              className="rounded-md bg-gray-900 px-3.5 py-1.5 text-[0.8rem] font-medium text-white disabled:opacity-50"
            >
              {saving ? "Création…" : `Créer ${previewCount || ""} séance${previewCount > 1 ? "s" : ""}`}
            </button>
            {form.startDate && form.endDate && previewCount === 0 && (
              <span className="text-[0.75rem] text-gray-400">Aucune date sur cette période.</span>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 space-y-1">
        {loading ? (
          <p className="text-[0.78rem] text-gray-400">Chargement…</p>
        ) : sessions.length === 0 ? (
          <p className="text-[0.78rem] text-gray-400">Aucune séance planifiée.</p>
        ) : (
          sessions.slice(0, 8).map((s) => (
            <div key={s.id} className="flex items-center justify-between text-[0.78rem] text-gray-600">
              <span>
                {new Date(s.starts_at).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} —{" "}
                {new Date(s.starts_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
              {s.room && <span className="text-gray-400">{s.room}</span>}
            </div>
          ))
        )}
        {sessions.length > 8 && <p className="text-[0.75rem] text-gray-400">+ {sessions.length - 8} autres — voir le Planning.</p>}
      </div>
      {dialog}
    </div>
  );
}
