import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { humanizeError } from "../../lib/humanizeError";
import { useLocale } from "../../i18n/LocaleContext";
import { type ProgramRow, type StructureClass, audienceAllows, enrolledCount, isLanguageProgram } from "../../lib/programs";
import ScheduleSessionsForm from "./ScheduleSessionsForm";
import SyllabusProgressSection from "./SyllabusProgressSection";
import MaterialsSection from "./MaterialsSection";
import PlacementTestModal from "./PlacementTestModal";
import SyllabusModal from "./SyllabusModal";
import { useConfirmDialog } from "./useConfirmDialog";

export interface PersonOption {
  id: string;
  first_name: string;
  last_name: string;
  kind: "eleve" | "stagiaire";
}

export interface WaitingWish {
  id: string;
  student_id: string;
  program_id: string;
  level_id: string | null;
  note: string | null;
  students: { first_name: string; last_name: string; phone: string | null; kind: "eleve" | "stagiaire" } | null;
}

interface Member {
  id: string;
  student_id: string;
  students: { first_name: string; last_name: string; kind: "eleve" | "stagiaire" } | null;
}

interface ClassPanelProps {
  cls: StructureClass;
  /** The class named in full, e.g. "Soutien Mission · 6ème année · maths - classe A". */
  label: string;
  program: ProgramRow | undefined;
  people: PersonOption[];
  waiting: WaitingWish[];
  organizationId: string;
  /** The other classes, to copy chapters from. */
  otherClasses: { id: string; label: string }[];
  onChanged: () => void;
}

const selectClass = "rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[0.85rem] text-gray-900 outline-none focus:border-gray-400";

async function fetchMembers(classId: string): Promise<Member[]> {
  const { data } = await supabase.from("class_students").select("id, student_id, students(first_name, last_name, kind)").eq("class_id", classId);
  return (data as unknown as Member[]) ?? [];
}

export default function ClassPanel({ cls, label, program, people, waiting, organizationId, otherClasses, onChanged }: ClassPanelProps) {
  const { t } = useLocale();
  const st = t.monEspace.structure;
  const m = t.monEspace.gestion.classes;
  const pp = t.monEspace.people;
  const { confirm, dialog } = useConfirmDialog();

  const [members, setMembers] = useState<Member[]>([]);
  const [addId, setAddId] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [copyFrom, setCopyFrom] = useState("");
  const [chaptersKey, setChaptersKey] = useState(0);
  const [showChapters, setShowChapters] = useState(false);
  // Placing someone in a language class opens their placement test; several
  // people at once are walked through one after the other.
  const [placementQueue, setPlacementQueue] = useState<{ studentId: string; studentName: string }[]>([]);

  const refresh = useCallback(async () => {
    setMembers(await fetchMembers(cls.id));
    onChanged();
  }, [cls.id, onChanged]);

  useEffect(() => {
    let cancelled = false;
    fetchMembers(cls.id).then((rows) => {
      if (!cancelled) setMembers(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [cls.id]);

  const isLanguage = isLanguageProgram(program?.kind);
  const memberIds = new Set(members.map((mem) => mem.student_id));
  const eligible = people.filter((p) => !memberIds.has(p.id) && (!program || audienceAllows(program.audience, p.kind)));
  const remaining = cls.capacity !== null ? Math.max(cls.capacity - enrolledCount(cls), 0) : null;

  function afterPlacing(placed: { id: string; name: string }[]) {
    for (const person of placed) {
      // Telling the person and their guardian is best effort: a failed email never undoes the placement.
      supabase.functions.invoke("notify-enrollment", { body: { studentId: person.id, classId: cls.id } }).catch(() => undefined);
    }
    if (isLanguage) setPlacementQueue(placed.map((p) => ({ studentId: p.id, studentName: p.name })));
  }

  async function handleEnroll() {
    const person = people.find((p) => p.id === addId);
    if (!person) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    const { error: insertError } = await supabase.from("class_students").insert({ class_id: cls.id, student_id: person.id });
    setBusy(false);
    if (insertError) {
      setError(humanizeError(insertError));
      return;
    }
    setAddId("");
    afterPlacing([{ id: person.id, name: `${person.first_name} ${person.last_name}` }]);
    await refresh();
  }

  function handleRemove(member: Member) {
    const name = `${member.students?.first_name ?? ""} ${member.students?.last_name ?? ""}`.trim();
    confirm(m.removeConfirm.replace("{name}", name), async () => {
      const { error: removeError } = await supabase.from("class_students").delete().eq("id", member.id);
      setError(removeError ? humanizeError(removeError) : null);
      await refresh();
    });
  }

  async function handlePlaceWaiting() {
    const chosen = waiting.filter((w) => picked.has(w.student_id));
    if (chosen.length === 0) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    const { error: placeError } = await supabase.rpc("place_students_in_class", { p_class_id: cls.id, p_student_ids: chosen.map((w) => w.student_id) });
    setBusy(false);
    if (placeError) {
      setError(humanizeError(placeError));
      return;
    }
    setPicked(new Set());
    setInfo(st.placedOk.replace("{n}", String(chosen.length)));
    afterPlacing(chosen.map((w) => ({ id: w.student_id, name: `${w.students?.first_name ?? ""} ${w.students?.last_name ?? ""}`.trim() })));
    await refresh();
  }

  async function handleCopyChapters() {
    if (!copyFrom) return;
    setBusy(true);
    setError(null);
    const { data, error: copyError } = await supabase.rpc("copy_syllabus", { p_from_class: copyFrom, p_to_class: cls.id });
    setBusy(false);
    if (copyError) {
      setError(humanizeError(copyError));
      return;
    }
    setCopyFrom("");
    setInfo(st.chaptersCopied.replace("{n}", String(data ?? 0)));
    setChaptersKey((k) => k + 1);
  }

  function togglePicked(studentId: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  const overLimit = remaining !== null && picked.size > remaining;

  return (
    <div className="border-t border-gray-200 px-4 py-3">
      {error && <p className="mb-2 text-[0.82rem] text-red-600">{error}</p>}
      {info && <p className="mb-2 text-[0.82rem] text-green-700">{info}</p>}

      <h3 className="text-[0.82rem] font-semibold text-gray-800">
        {st.enrolledTitle} <span className="font-normal text-gray-400">({members.length}{cls.capacity !== null ? `/${cls.capacity}` : ""})</span>
      </h3>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <select value={addId} onChange={(e) => setAddId(e.target.value)} className={`${selectClass} w-auto max-w-full`}>
          <option value="">{m.enrollStudent}</option>
          {eligible.map((p) => (
            <option key={p.id} value={p.id}>
              {p.first_name} {p.last_name} ({p.kind === "eleve" ? pp.eleve : pp.stagiaire})
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!addId || busy}
          onClick={handleEnroll}
          className="rounded-md bg-gradient-to-br from-ink to-ink-soft px-3.5 py-1.5 text-[0.82rem] font-medium text-paper disabled:opacity-50"
        >
          {m.enroll}
        </button>
        {remaining !== null && <span className={`text-[0.76rem] ${remaining === 0 ? "font-medium text-red-600" : "text-gray-500"}`}>{remaining === 0 ? st.full : st.remaining.replace("{n}", String(remaining))}</span>}
      </div>
      <div className="mt-2 space-y-1">
        {members.length === 0 ? (
          <p className="text-[0.82rem] text-gray-400">{m.noEnrollments}</p>
        ) : (
          members.map((member) => (
            <div key={member.id} className="flex items-center justify-between text-[0.85rem]">
              <span className="text-gray-800">
                {member.students?.first_name} {member.students?.last_name}
                <span className="ml-1.5 text-[0.72rem] text-gray-400">{member.students?.kind === "stagiaire" ? pp.stagiaire : pp.eleve}</span>
              </span>
              <button type="button" onClick={() => handleRemove(member)} className="text-[0.78rem] text-red-600 hover:underline">
                {m.remove}
              </button>
            </div>
          ))
        )}
      </div>

      {waiting.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <h3 className="text-[0.82rem] font-semibold text-amber-900">
            {st.waitingTitle} <span className="font-normal">({waiting.length})</span>
          </h3>
          <p className="mt-0.5 text-[0.74rem] text-amber-800">{st.waitingHint}</p>
          <div className="mt-2 space-y-1">
            {waiting.map((w) => (
              <label key={w.id} className="flex cursor-pointer items-center gap-2 text-[0.84rem] text-gray-800">
                <input type="checkbox" checked={picked.has(w.student_id)} onChange={() => togglePicked(w.student_id)} />
                <span>
                  {w.students?.first_name} {w.students?.last_name}
                  {w.note && <span className="ml-1.5 text-gray-500">· {w.note}</span>}
                  {w.students?.phone && <span className="ml-1.5 text-[0.76rem] text-gray-400">{w.students.phone}</span>}
                </span>
              </label>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={picked.size === 0 || busy || overLimit}
              onClick={handlePlaceWaiting}
              className="rounded-md bg-gradient-to-br from-ink to-ink-soft px-3.5 py-1.5 text-[0.82rem] font-medium text-paper disabled:opacity-40"
            >
              {st.placeSelected.replace("{n}", String(picked.size))}
            </button>
            {overLimit && <span className="text-[0.76rem] text-red-600">{st.overLimit.replace("{n}", String(remaining))}</span>}
          </div>
        </div>
      )}

      <ScheduleSessionsForm classId={cls.id} defaultRoomId={cls.room_id} teacherId={cls.teacher_id} organizationId={organizationId} />

      <SyllabusProgressSection key={chaptersKey} classId={cls.id} />
      <button type="button" onClick={() => setShowChapters(true)} className="mt-2 text-[0.8rem] font-medium text-gray-700 hover:underline">
        {st.manageChapters}
      </button>
      {otherClasses.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.8rem] text-gray-500">
          <span>{st.copyChapters}</span>
          <select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className="max-w-[16rem] rounded-md border border-gray-200 bg-white px-2 py-1 text-[0.8rem] text-gray-700">
            <option value="">{st.copyPick}</option>
            {otherClasses.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <button type="button" disabled={!copyFrom || busy} onClick={handleCopyChapters} className="text-[0.78rem] font-medium text-gray-700 hover:underline disabled:opacity-40">
            {st.copyAction}
          </button>
        </div>
      )}

      <MaterialsSection classId={cls.id} organizationId={organizationId} canEdit />

      {dialog}
      {showChapters && (
        <SyllabusModal
          classId={cls.id}
          classLabel={label}
          onClose={() => {
            setShowChapters(false);
            setChaptersKey((k) => k + 1);
          }}
        />
      )}
      {placementQueue.length > 0 && (
        <PlacementTestModal
          key={placementQueue[0].studentId}
          studentId={placementQueue[0].studentId}
          studentName={placementQueue[0].studentName}
          classId={cls.id}
          onClose={() => setPlacementQueue((queue) => queue.slice(1))}
        />
      )}
    </div>
  );
}
