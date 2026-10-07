import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { humanizeError } from "../../lib/humanizeError";
import { useLocale } from "../../i18n/LocaleContext";
import { useStructure } from "../../features/structure/useStructure";
import { type StructureClass, classLabel, enrolledCount, searchable, seatText } from "../../lib/programs";
import FilterBar from "./FilterBar";
import NameInput from "./NameInput";
import ClassPanel, { type PersonOption, type WaitingWish } from "./ClassPanel";
import { useConfirmDialog } from "./useConfirmDialog";

interface TeacherOption {
  id: string;
  first_name: string;
  last_name: string;
}
interface RoomOption {
  id: string;
  name: string;
  capacity: number | null;
  is_active: boolean;
}
interface RefData {
  teachers: TeacherOption[];
  rooms: RoomOption[];
  people: PersonOption[];
  wishes: WaitingWish[];
}

const EMPTY_FORM = { program_id: "", level_id: "", name: "", teacher_id: "", capacity: "", room_id: "" };
const EMPTY_REF: RefData = { teachers: [], rooms: [], people: [], wishes: [] };

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.88rem] text-gray-900 outline-none focus:border-gray-400";

// Everything a class needs besides the structure itself: who could teach it,
// which rooms exist, who could join, and who is waiting for it.
async function fetchRefData(organizationId: string): Promise<RefData> {
  const [teachers, rooms, people, wishes] = await Promise.all([
    supabase.from("teachers").select("id, first_name, last_name").eq("organization_id", organizationId).order("last_name"),
    supabase.from("rooms").select("id, name, capacity, is_active").eq("organization_id", organizationId).order("name"),
    supabase.from("students").select("id, first_name, last_name, kind").eq("organization_id", organizationId).order("last_name"),
    supabase
      .from("class_wishes")
      .select("id, student_id, program_id, level_id, note, students(first_name, last_name, phone, kind)")
      .eq("organization_id", organizationId)
      .is("fulfilled_at", null)
      .order("created_at"),
  ]);
  return {
    teachers: (teachers.data as TeacherOption[]) ?? [],
    rooms: (rooms.data as RoomOption[]) ?? [],
    people: (people.data as PersonOption[]) ?? [],
    wishes: (wishes.data as unknown as WaitingWish[]) ?? [],
  };
}

export default function ClassesManager({ organizationId }: { organizationId: string }) {
  const { t } = useLocale();
  const m = t.monEspace.gestion.classes;
  const st = t.monEspace.structure;
  const rm = t.monEspace.rooms;
  const c = t.monEspace.gestion.common;
  const structure = useStructure(organizationId);
  const { programs, levels, classes, loading } = structure;
  const reloadStructure = structure.reload;
  const { confirm, dialog } = useConfirmDialog();

  const [ref, setRef] = useState<RefData>(EMPTY_REF);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [programFilter, setProgramFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const f = t.monEspace.filters;
  const [search, setSearch] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [seatFilter, setSeatFilter] = useState("");
  const [sortBy, setSortBy] = useState("name");

  useEffect(() => {
    let cancelled = false;
    fetchRefData(organizationId).then((data) => {
      if (!cancelled) setRef(data);
    });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  // Used after any change inside an opened class (people placed, waiting list...).
  const reloadAll = useCallback(async () => {
    const [data] = await Promise.all([fetchRefData(organizationId), reloadStructure()]);
    setRef(data);
  }, [organizationId, reloadStructure]);

  const programById = new Map(programs.map((p) => [p.id, p]));
  const levelById = new Map(levels.map((l) => [l.id, l]));
  const labelFor = (cl: StructureClass) => classLabel({ name: cl.name, programs: programById.get(cl.program_id), levels: levelById.get(cl.level_id) });

  const openPrograms = programs.filter((p) => p.is_active || p.id === form.program_id);
  const formLevels = levels.filter((l) => l.program_id === form.program_id).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  const filterLevels = levels.filter((l) => l.program_id === programFilter).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  const editingClass = classes.find((cl) => cl.id === editingId);
  // The database freezes programme and niveau once a class has people.
  const editingHasPeople = editingClass ? enrolledCount(editingClass) > 0 : false;
  const roomChoices = ref.rooms.filter((r) => r.is_active || r.id === form.room_id);
  const selectedRoom = ref.rooms.find((r) => r.id === form.room_id);
  const roomTooSmall = Boolean(selectedRoom?.capacity && form.capacity && Number(form.capacity) > selectedRoom.capacity);

  const waitingFor = (cl: StructureClass) => ref.wishes.filter((w) => w.program_id === cl.program_id && (w.level_id === null || w.level_id === cl.level_id)).length;
  const isFullClass = (cl: StructureClass) => cl.capacity !== null && enrolledCount(cl) >= cl.capacity;
  const seatsLeft = (cl: StructureClass) => (cl.capacity === null ? Number.POSITIVE_INFINITY : cl.capacity - enrolledCount(cl));
  const fillRatio = (cl: StructureClass) => (cl.capacity ? enrolledCount(cl) / cl.capacity : -1);
  const query = searchable(search);
  const visibleClasses = classes
    .filter((cl) => {
      const teacherName = cl.teachers ? `${cl.teachers.first_name} ${cl.teachers.last_name}` : "";
      return (
        (!programFilter || cl.program_id === programFilter) &&
        (!levelFilter || cl.level_id === levelFilter) &&
        (!query || searchable(`${labelFor(cl)} ${teacherName}`).includes(query)) &&
        (!teacherFilter || (teacherFilter === "none" ? cl.teacher_id === null : cl.teacher_id === teacherFilter)) &&
        (!roomFilter || (roomFilter === "none" ? cl.room_id === null : cl.room_id === roomFilter)) &&
        (!seatFilter ||
          (seatFilter === "full" && isFullClass(cl)) ||
          (seatFilter === "open" && !isFullClass(cl)) ||
          (seatFilter === "waiting" && waitingFor(cl) > 0))
      );
    })
    .sort((a, b) => {
      const byName = labelFor(a).localeCompare(labelFor(b));
      if (sortBy === "fullest") return fillRatio(b) - fillRatio(a) || byName;
      if (sortBy === "fewest") return seatsLeft(a) - seatsLeft(b) || byName;
      if (sortBy === "waiting") return waitingFor(b) - waitingFor(a) || byName;
      if (sortBy === "newest") return b.created_at.localeCompare(a.created_at) || byName;
      return byName;
    });

  function openAddForm() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, program_id: programFilter, level_id: levelFilter });
    setError(null);
    setShowForm(true);
  }

  function openEditForm(cl: StructureClass) {
    setEditingId(cl.id);
    setForm({
      program_id: cl.program_id,
      level_id: cl.level_id,
      name: cl.name,
      teacher_id: cl.teacher_id ?? "",
      capacity: cl.capacity?.toString() ?? "",
      room_id: cl.room_id ?? "",
    });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      program_id: form.program_id,
      level_id: form.level_id,
      name: form.name.trim(),
      teacher_id: form.teacher_id || null,
      capacity: form.capacity ? Number(form.capacity) : null,
      room_id: form.room_id || null,
    };
    const { error: saveError } = editingId
      ? await supabase.from("classes").update(payload).eq("id", editingId)
      : await supabase.from("classes").insert({ organization_id: organizationId, ...payload });
    setSaving(false);
    if (saveError) {
      setError(humanizeError(saveError));
      return;
    }
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    await reloadAll();
  }

  function handleDelete(cl: StructureClass) {
    confirm(m.deleteConfirm.replace("{name}", labelFor(cl)), async () => {
      const { error: deleteError } = await supabase.from("classes").delete().eq("id", cl.id);
      setError(deleteError ? humanizeError(deleteError) : null);
      if (expanded === cl.id) setExpanded(null);
      await reloadAll();
    });
  }

  const noStructure = !loading && (programs.length === 0 || levels.length === 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[1rem] font-semibold text-gray-900">{m.title}</h2>
        {!noStructure && (
          <button
            type="button"
            onClick={() => (showForm ? setShowForm(false) : openAddForm())}
            className="rounded-md bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.85rem] font-medium text-paper"
          >
            {showForm ? c.cancel : `+ ${c.add}`}
          </button>
        )}
      </div>

      {noStructure && <p className="mt-3 text-[0.85rem] text-gray-500">{st.needStructure}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
          <select
            required
            disabled={editingHasPeople}
            value={form.program_id}
            onChange={(e) => setForm({ ...form, program_id: e.target.value, level_id: "" })}
            className={`${inputClass} disabled:bg-gray-100 disabled:text-gray-500`}
            aria-label={st.programmeLabel}
          >
            <option value="">{`${st.programmeLabel} *`}</option>
            {openPrograms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            required
            disabled={editingHasPeople || !form.program_id}
            value={form.level_id}
            onChange={(e) => setForm({ ...form, level_id: e.target.value })}
            className={`${inputClass} disabled:bg-gray-100 disabled:text-gray-500`}
            aria-label={st.niveauLabel}
          >
            <option value="">{`${st.niveauLabel} *`}</option>
            {formLevels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <NameInput required placeholder={`${st.classNamePlaceholder} *`} value={form.name} onChange={(v) => setForm({ ...form, name: v })} items={classes.filter((cl) => cl.level_id === form.level_id).map((cl) => ({ id: cl.id, name: cl.name }))} excludeId={editingId ?? undefined} inputClassName={inputClass} />
          <select value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} className={inputClass} aria-label={m.pickTeacherOptional}>
            <option value="">{m.pickTeacherOptional}</option>
            {ref.teachers.map((tc) => (
              <option key={tc.id} value={tc.id}>
                {tc.first_name} {tc.last_name}
              </option>
            ))}
          </select>
          <input type="number" min="1" placeholder={m.capacityPlaceholder} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className={inputClass} />
          <div>
            <select value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })} className={inputClass} aria-label={rm.pickRoom}>
              <option value="">{rm.noRoom}</option>
              {roomChoices.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.capacity ? ` (${r.capacity})` : ""}
                  {r.is_active ? "" : ` ${rm.inactiveSuffix}`}
                </option>
              ))}
            </select>
            {roomTooSmall && selectedRoom?.capacity && (
              <p className="mt-1 text-[0.74rem] text-amber-700">{rm.capacityWarning.replace("{n}", form.capacity).replace("{max}", String(selectedRoom.capacity))}</p>
            )}
          </div>
          <button type="submit" disabled={saving} className="rounded-md bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.85rem] font-medium text-paper disabled:opacity-50 sm:col-span-3">
            {saving ? c.saving : editingId ? c.saveEdits : c.save}
          </button>
        </form>
      )}

      {error && <p className="mt-3 text-[0.82rem] text-red-600">{error}</p>}

      {!noStructure && (
        <FilterBar
          search={search}
          onSearch={setSearch}
          placeholder={f.searchClasses}
          selects={[
            { key: "program", label: st.programmeLabel, value: programFilter, onChange: (v) => { setProgramFilter(v); setLevelFilter(""); }, options: [{ value: "", label: st.allProgrammes }, ...programs.map((p) => ({ value: p.id, label: p.name }))] },
            { key: "level", label: st.niveauLabel, value: levelFilter, onChange: setLevelFilter, disabled: !programFilter, options: [{ value: "", label: st.allNiveaux }, ...filterLevels.map((l) => ({ value: l.id, label: l.name }))] },
            { key: "teacher", label: f.allTeachers, value: teacherFilter, onChange: setTeacherFilter, options: [{ value: "", label: f.allTeachers }, { value: "none", label: f.noTeacher }, ...ref.teachers.map((tc) => ({ value: tc.id, label: `${tc.first_name} ${tc.last_name}` }))] },
            { key: "room", label: f.allRooms, value: roomFilter, onChange: setRoomFilter, options: [{ value: "", label: f.allRooms }, { value: "none", label: f.noRoom }, ...ref.rooms.map((r) => ({ value: r.id, label: r.name }))] },
            { key: "seats", label: f.allSeats, value: seatFilter, onChange: setSeatFilter, options: [{ value: "", label: f.allSeats }, { value: "full", label: f.seatsFull }, { value: "open", label: f.seatsOpen }, { value: "waiting", label: f.stateWaiting }] },
          ]}
          sort={{
            value: sortBy,
            onChange: setSortBy,
            options: [
              { value: "name", label: f.sortName },
              { value: "fullest", label: f.sortMostFull },
              { value: "fewest", label: f.sortFewestSeats },
              { value: "waiting", label: f.sortMostWaiting },
              { value: "newest", label: f.sortNewest },
            ],
          }}
          shown={visibleClasses.length}
          total={classes.length}
          onClear={() => {
            setSearch("");
            setProgramFilter("");
            setLevelFilter("");
            setTeacherFilter("");
            setRoomFilter("");
            setSeatFilter("");
          }}
        />
      )}

      <div className="mt-3 space-y-2">
        {loading ? (
          <p className="text-[0.85rem] text-gray-400">{c.loading}</p>
        ) : visibleClasses.length === 0 ? (
          !noStructure && <p className="text-[0.85rem] text-gray-400">{classes.length > 0 ? f.noMatch : m.empty}</p>
        ) : (
          visibleClasses.map((cl) => {
            const waiting = ref.wishes.filter((w) => w.program_id === cl.program_id && (w.level_id === null || w.level_id === cl.level_id));
            const full = cl.capacity !== null && enrolledCount(cl) >= cl.capacity;
            return (
              <div key={cl.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <button type="button" onClick={() => setExpanded(expanded === cl.id ? null : cl.id)} className="min-w-0 flex-1 text-left">
                    <span className="text-[0.92rem] font-medium text-gray-900">{labelFor(cl)}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.74rem]">
                      <span className={`rounded-full border px-2 py-0.5 font-medium ${full ? "border-red-200 bg-red-50 text-red-700" : "border-gray-200 bg-gray-50 text-gray-600"}`}>
                        {full ? st.full : `${seatText(cl)} ${st.enrolledWord}`}
                      </span>
                      {waiting.length > 0 && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-amber-800">{st.waitingCount.replace("{n}", String(waiting.length))}</span>
                      )}
                      <span className="text-gray-400">{cl.teachers ? `${cl.teachers.first_name} ${cl.teachers.last_name}` : m.noTeacher}</span>
                    </span>
                    {cl.capacity !== null && (
                      <span className="mt-1.5 block h-1.5 w-full max-w-[14rem] overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
                        <span
                          className={`block h-full rounded-full ${full ? "bg-red-500" : fillRatio(cl) >= 0.8 ? "bg-amber-500" : "bg-accent"}`}
                          style={{ width: `${Math.min(100, Math.round(fillRatio(cl) * 100))}%` }}
                        />
                      </span>
                    )}
                  </button>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => openEditForm(cl)} className="text-[0.78rem] text-gray-600 hover:underline">
                      {c.edit}
                    </button>
                    <button type="button" onClick={() => handleDelete(cl)} className="text-[0.78rem] text-red-600 hover:underline">
                      {c.delete}
                    </button>
                    <button type="button" onClick={() => setExpanded(expanded === cl.id ? null : cl.id)} className="text-[0.78rem] text-gray-500 hover:underline">
                      {expanded === cl.id ? m.close : st.open}
                    </button>
                  </div>
                </div>
                {expanded === cl.id && (
                  <ClassPanel
                    cls={cl}
                    label={labelFor(cl)}
                    program={programById.get(cl.program_id)}
                    people={ref.people}
                    waiting={waiting}
                    organizationId={organizationId}
                    otherClasses={classes.filter((o) => o.id !== cl.id).map((o) => ({ id: o.id, label: labelFor(o) }))}
                    onChanged={reloadAll}
                  />
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
