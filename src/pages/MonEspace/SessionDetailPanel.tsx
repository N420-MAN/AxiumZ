import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useLocale } from "../../i18n/LocaleContext";

interface SessionDetailPanelProps {
  sessionId: string;
  className: string;
  canEdit: boolean;
  onClose: () => void;
}

interface Enrollment {
  student_id: string;
  students: { first_name: string; last_name: string } | null;
}
interface AttendanceRow {
  student_id: string;
  status: string;
}

export default function SessionDetailPanel({ sessionId, className, canEdit, onClose }: SessionDetailPanelProps) {
  const { t } = useLocale();
  const m = t.monEspace.sessionDetail;
  const attendanceLabels = t.monEspace.attendanceStatus;
  const ATTENDANCE_OPTIONS = [
    { value: "present", label: attendanceLabels.present },
    { value: "absent", label: attendanceLabels.absent },
    { value: "late", label: attendanceLabels.late },
    { value: "excused", label: attendanceLabels.excused },
  ];

  const [notes, setNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState("");
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);

  async function load() {
    setLoading(true);
    const { data: session } = await supabase.from("class_sessions").select("class_id, notes").eq("id", sessionId).single();

    if (session) {
      setNotes(session.notes ?? "");
      setSavedNotes(session.notes ?? "");

      const [{ data: enrollData }, { data: attData }] = await Promise.all([
        supabase.from("class_students").select("student_id, students(first_name, last_name)").eq("class_id", session.class_id),
        supabase.from("attendance").select("student_id, status").eq("session_id", sessionId),
      ]);
      setEnrollments((enrollData as unknown as Enrollment[]) ?? []);
      setAttendance(attData ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function setStudentStatus(studentId: string, status: string) {
    const existing = attendance.find((a) => a.student_id === studentId);
    if (existing) {
      await supabase.from("attendance").update({ status }).eq("session_id", sessionId).eq("student_id", studentId);
    } else {
      await supabase.from("attendance").insert({ session_id: sessionId, student_id: studentId, status });
    }
    const { data: attData } = await supabase.from("attendance").select("student_id, status").eq("session_id", sessionId);
    setAttendance(attData ?? []);

    if (status === "absent") {
      supabase.functions.invoke("notify-absence", { body: { studentId, sessionId } }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Absence notification failed:", err);
      });
    }
  }

  async function saveNotes() {
    setSavingNotes(true);
    await supabase.from("class_sessions").update({ notes }).eq("id", sessionId);
    setSavedNotes(notes);
    setSavingNotes(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/40 px-4 py-12">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-[1.05rem] font-semibold text-gray-900">{className}</h2>
          <button type="button" onClick={onClose} className="text-[0.85rem] text-gray-400 hover:text-gray-700">
            {m.close}
          </button>
        </div>

        {loading ? (
          <p className="px-6 py-8 text-[0.88rem] text-gray-400">{m.loading}</p>
        ) : (
          <div className="px-6 py-5">
            <div>
              <h3 className="text-[0.85rem] font-semibold text-gray-900">{m.attendance}</h3>
              <div className="mt-2.5 space-y-1.5">
                {enrollments.map((e) => {
                  const record = attendance.find((a) => a.student_id === e.student_id);
                  return (
                    <div key={e.student_id} className="flex items-center justify-between text-[0.87rem]">
                      <span className="text-gray-800">
                        {e.students?.first_name} {e.students?.last_name}
                      </span>
                      {canEdit ? (
                        <select
                          value={record?.status ?? ""}
                          onChange={(ev) => setStudentStatus(e.student_id, ev.target.value)}
                          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[0.82rem] text-gray-700"
                        >
                          <option value="" disabled>
                            {m.pickStatus}
                          </option>
                          {ATTENDANCE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-400">
                          {ATTENDANCE_OPTIONS.find((o) => o.value === record?.status)?.label ?? "—"}
                        </span>
                      )}
                    </div>
                  );
                })}
                {enrollments.length === 0 && <p className="text-[0.85rem] text-gray-400">{m.noStudents}</p>}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-[0.85rem] font-semibold text-gray-900">{m.sessionLogHeading}</h3>
              <p className="mt-0.5 text-[0.76rem] text-gray-400">{m.sessionLogVisibility}</p>
              {canEdit ? (
                <>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder={m.sessionLogPlaceholder}
                    className="mt-2 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-[0.85rem] text-gray-800 outline-none focus:border-gray-400"
                  />
                  <button
                    type="button"
                    onClick={saveNotes}
                    disabled={savingNotes || notes === savedNotes}
                    className="mt-2 rounded-md bg-gradient-to-br from-ink to-ink-soft px-3.5 py-1.5 text-[0.82rem] font-medium text-paper disabled:opacity-40"
                  >
                    {savingNotes ? m.saving : m.save}
                  </button>
                </>
              ) : (
                <p className="mt-2 text-[0.87rem] text-gray-600">{savedNotes || m.nothingLogged}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
