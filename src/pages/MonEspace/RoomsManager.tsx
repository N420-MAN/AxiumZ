import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { humanizeError } from "../../lib/humanizeError";
import { useLocale } from "../../i18n/LocaleContext";
import { useConfirmDialog } from "./useConfirmDialog";

interface RoomRow {
  id: string;
  name: string;
  capacity: number | null;
  is_active: boolean;
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.9rem] text-gray-900 outline-none focus:border-gray-400";

async function fetchRooms(organizationId: string) {
  const [{ data: roomData, error: roomError }, { data: classData }] = await Promise.all([
    supabase.from("rooms").select("id, name, capacity, is_active").eq("organization_id", organizationId).order("name"),
    supabase.from("classes").select("room_id").eq("organization_id", organizationId).not("room_id", "is", null),
  ]);
  const usage: Record<string, number> = {};
  for (const row of classData ?? []) if (row.room_id) usage[row.room_id] = (usage[row.room_id] ?? 0) + 1;
  return { rooms: (roomData as RoomRow[]) ?? [], usage, error: roomError };
}

export default function RoomsManager({ organizationId }: { organizationId: string }) {
  const { t } = useLocale();
  const rm = t.monEspace.rooms;
  const c = t.monEspace.gestion.common;
  const { confirm, dialog } = useConfirmDialog();

  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", capacity: "" });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", capacity: "" });
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const result = await fetchRooms(organizationId);
    setRooms(result.rooms);
    setUsage(result.usage);
    setError(result.error ? humanizeError(result.error) : null);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    fetchRooms(organizationId).then((result) => {
      if (cancelled) return;
      setRooms(result.rooms);
      setUsage(result.usage);
      setError(result.error ? humanizeError(result.error) : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const { error: insertError } = await supabase.from("rooms").insert({
      organization_id: organizationId,
      name: form.name.trim(),
      capacity: form.capacity ? Number(form.capacity) : null,
    });
    setSaving(false);
    if (insertError) {
      setError(humanizeError(insertError));
      return;
    }
    setForm({ name: "", capacity: "" });
    await load();
  }

  function startEdit(room: RoomRow) {
    setEditingId(room.id);
    setEditForm({ name: room.name, capacity: room.capacity?.toString() ?? "" });
    setError(null);
  }

  async function handleSaveEdit(id: string) {
    setBusyId(id);
    setError(null);
    const { error: updateError } = await supabase
      .from("rooms")
      .update({ name: editForm.name.trim(), capacity: editForm.capacity ? Number(editForm.capacity) : null })
      .eq("id", id);
    setBusyId(null);
    if (updateError) {
      setError(humanizeError(updateError));
      return;
    }
    setEditingId(null);
    await load();
  }

  async function handleToggleActive(room: RoomRow) {
    setBusyId(room.id);
    setError(null);
    const { error: toggleError } = await supabase.from("rooms").update({ is_active: !room.is_active }).eq("id", room.id);
    setBusyId(null);
    if (toggleError) setError(humanizeError(toggleError));
    await load();
  }

  function handleDelete(room: RoomRow) {
    confirm(`${c.delete} « ${room.name} » ?`, async () => {
      setBusyId(room.id);
      setError(null);
      const { error: deleteError } = await supabase.from("rooms").delete().eq("id", room.id);
      setBusyId(null);
      if (deleteError) {
        // A room still used by a class or a session is protected by the database.
        setError(deleteError.code === "23503" ? rm.deleteBlocked : humanizeError(deleteError));
        return;
      }
      await load();
    });
  }

  const linkClass = "text-[0.78rem] text-gray-600 hover:text-gray-900 hover:underline disabled:opacity-50";

  return (
    <div>
      <h2 className="text-[1rem] font-semibold text-gray-900">{rm.title}</h2>
      <p className="mt-0.5 max-w-2xl text-[0.8rem] text-gray-500">{rm.description}</p>

      <form onSubmit={handleAdd} className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
        <input required placeholder={`${rm.namePlaceholder} *`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
        <input
          type="number"
          min="1"
          placeholder={rm.capacityPlaceholder}
          value={form.capacity}
          onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          className={inputClass}
        />
        <button type="submit" disabled={saving} className="rounded-md bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.85rem] font-medium text-paper disabled:opacity-50">
          {saving ? c.saving : rm.add}
        </button>
      </form>

      {error && <p className="mt-3 text-[0.82rem] text-red-600">{error}</p>}

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-[0.85rem] text-gray-400">{c.loading}</p>
        ) : rooms.length === 0 ? (
          <p className="text-[0.85rem] text-gray-400">{rm.empty}</p>
        ) : (
          rooms.map((room) =>
            editingId === room.id ? (
              <div key={room.id} className="grid grid-cols-1 items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-3 sm:grid-cols-[1fr_9rem_auto]">
                <input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputClass} />
                <input
                  type="number"
                  min="1"
                  placeholder={rm.capacityPlaceholder}
                  value={editForm.capacity}
                  onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                  className={inputClass}
                />
                <div className="flex items-center gap-3">
                  <button type="button" disabled={busyId === room.id || !editForm.name.trim()} onClick={() => handleSaveEdit(room.id)} className={`${linkClass} font-medium`}>
                    {c.save}
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className={linkClass}>
                    {c.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <div key={room.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 px-4 py-3 ${room.is_active ? "bg-white" : "bg-gray-50"}`}>
                <div className="min-w-0">
                  <span className={`text-[0.92rem] font-medium ${room.is_active ? "text-gray-900" : "text-gray-400"}`}>{room.name}</span>
                  <span
                    className={`ml-2 rounded-full border px-2 py-0.5 text-[0.7rem] font-medium ${
                      room.is_active ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-gray-100 text-gray-500"
                    }`}
                  >
                    {room.is_active ? rm.active : rm.inactive}
                  </span>
                  <p className="mt-0.5 text-[0.76rem] text-gray-400">
                    {room.capacity ? rm.capacityValue.replace("{n}", String(room.capacity)) : "—"}
                    {usage[room.id] ? ` · ${rm.usedBy.replace("{n}", String(usage[room.id]))}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => startEdit(room)} className={linkClass}>
                    {c.edit}
                  </button>
                  <button type="button" disabled={busyId === room.id} onClick={() => handleToggleActive(room)} className={linkClass}>
                    {room.is_active ? rm.deactivate : rm.reactivate}
                  </button>
                  <button type="button" disabled={busyId === room.id} onClick={() => handleDelete(room)} className="text-[0.78rem] text-red-600 hover:underline disabled:opacity-50">
                    {c.delete}
                  </button>
                </div>
              </div>
            ),
          )
        )}
      </div>
      {dialog}
    </div>
  );
}
