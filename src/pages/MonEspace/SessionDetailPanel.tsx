import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { humanizeError } from "../../lib/humanizeError";
import { useLocale } from "../../i18n/LocaleContext";
import StudentCommentModal from "./StudentCommentModal";

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
  const { t, locale } = useLocale();
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";
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
  const [classId, setClassId] = useState<string | null>(null);
  const [syllabusItems, setSyllabusItems] = useState<{ id: string; title: string }[]>([]);
  const [selectedChapter, setSelectedChapter] = useState("");
  const [savingChapter, setSavingChapter] = useState(false);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [commentTarget, setCommentTarget] = useState<{ id: string; name: string } | null>(null);
  const [homeworkItems, setHomeworkItems] = useState<{ id: string; title: string; due_date: string | null }[]>([]);
  const [newHomeworkTitle, setNewHomeworkTitle] = useState("");
  const [newHomeworkDue, setNewHomeworkDue] = useState("");
  const [savingHomework, setSavingHomework] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: session } = await supabase.from("class_sessions").select("class_id, notes, syllabus_item_id, classes(course_id)").eq("id", sessionId).single();

    if (session) {
      setNotes(session.notes ?? "");
      setSavedNotes(session.notes ?? "");
      setClassId(session.class_id);
      setSelectedChapter(session.syllabus_item_id ?? "");

      const courseId = (session as unknown as { classes: { course_id: string } | null }).classes?.course_id;
      if (courseId) {
        const { data: chapters } = await supabase.from("syllabus_items").select("id, title").eq("course_id", courseId).order("position");
        setSyllabusItems(chapters ?? []);
      }

      const [{ data: enrollData }, { data: attData }] = await Promise.all([
        supabase.from("class_students").select("student_id, students(first_name, last_name)").eq("class_id", session.class_id),
        supabase.from("attendance").select("student_id, status").eq("session_id", sessionId),
      ]);
      setEnrollments((enrollData as unknown as Enrollment[]) ?? []);
      setAttendance(attData ?? []);

      const studentIds = (enrollData ?? []).map((e) => e.student_id);
      if (studentIds.length > 0) {
        const { data: commentRows } = await supabase.from("student_comments").select("student_id").in("student_id", studentIds);
        const counts: Record<string, number> = {};
        for (const row of commentRows ?? []) counts[row.student_id] = (counts[row.student_id] ?? 0) + 1;
        setCommentCounts(counts);
      }

      const { data: hwData } = await supabase
        .from("homework")
        .select("id, title, due_date")
        .eq("class_id", session.class_id)
        .order("due_date", { ascending: true, nullsFirst: false });
      setHomeworkItems(hwData ?? []);
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

  async function markAllPresent() {
    if (enrollments.length === 0) return;
    setMarkingAll(true);
    const rows = enrollments.map((e) => ({ session_id: sessionId, student_id: e.student_id, status: "present" }));
    await supabase.from("attendance").upsert(rows, { onConflict: "session_id,student_id" });
    const { data: attData } = await supabase.from("attendance").select("student_id, status").eq("session_id", sessionId);
    setAttendance(attData ?? []);
    setMarkingAll(false);
  }

  async function handleChapterChange(chapterId: string) {
    setSelectedChapter(chapterId);
    setSavingChapter(true);
    await supabase.from("class_sessions").update({ syllabus_item_id: chapterId || null }).eq("id", sessionId);
    setSavingChapter(false);
  }

  async function saveNotes() {
    setSavingNotes(true);
    setNotesError(null);
    // .select() here is deliberate: an update blocked by RLS returns no
    // error, just zero affected rows — without checking the returned data,
    // that failure is completely silent and the UI would show the note as
    // saved when nothing was actually persisted.
    const { data, error: updateError } = await supabase.from("class_sessions").update({ notes }).eq("id", sessionId).select("notes");
    setSavingNotes(false);
    if (updateError || !data || data.length === 0) {
      setNotesError(updateError ? humanizeError(updateError) : m.saveFailed);
      return;
    }
    setSavedNotes(notes);
  }

  async function handleAddHomework() {
    if (!classId || !newHomeworkTitle.trim()) return;
    setSavingHomework(true);
    const { error: insertError } = await supabase
      .from("homework")
      .insert({ class_id: classId, title: newHomeworkTitle, due_date: newHomeworkDue || null });
    setSavingHomework(false);
    if (!insertError) {
      supabase.functions.invoke("notify-class-content", { body: { classId, title: newHomeworkTitle, type: "assignment" } }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Homework notification failed:", err);
      });
      setNewHomeworkTitle("");
      setNewHomeworkDue("");
      const { data: hwData } = await supabase
        .from("homework")
        .select("id, title, due_date")
        .eq("class_id", classId)
        .order("due_date", { ascending: true, nullsFirst: false });
      setHomeworkItems(hwData ?? []);
    }
  }

  async function handleRemoveHomework(id: string) {
    await supabase.from("homework").delete().eq("id", id);
    setHomeworkItems((prev) => prev.filter((h) => h.id !== id));
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
              <div className="flex items-center justify-between">
                <h3 className="text-[0.85rem] font-semibold text-gray-900">{m.attendance}</h3>
                {canEdit && enrollments.length > 0 && (
                  <button
                    type="button"
                    onClick={markAllPresent}
                    disabled={markingAll}
                    className="text-[0.78rem] text-gray-600 hover:text-gray-900 hover:underline disabled:opacity-50"
                  >
                    {markingAll ? m.marking : m.markAllPresent}
                  </button>
                )}
              </div>
              <div className="mt-2.5 space-y-1.5">
                {enrollments.map((e) => {
                  const record = attendance.find((a) => a.student_id === e.student_id);
                  return (
                    <div key={e.student_id} className="flex items-center justify-between text-[0.87rem]">
                      <span className="flex items-center gap-1.5 text-gray-800">
                        {e.students?.first_name} {e.students?.last_name}
                        {canEdit && (
                          <button
                            type="button"
                            title={t.monEspace.studentComments.tooltip}
                            onClick={() =>
                              setCommentTarget({ id: e.student_id, name: `${e.students?.first_name ?? ""} ${e.students?.last_name ?? ""}`.trim() })
                            }
                            className="relative text-gray-300 hover:text-ink"
                          >
                            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                              <path d="M3 10a6 6 0 0 1 6-6h2a6 6 0 0 1 0 12H7l-3 2v-3.5A6 6 0 0 1 3 10Z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {commentCounts[e.student_id] > 0 && (
                              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-accent" />
                            )}
                          </button>
                        )}
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

            {canEdit && syllabusItems.length > 0 && (
              <div className="mt-4">
                <span className="text-[0.78rem] text-gray-500">{t.monEspace.progress.sessionChapterLabel}</span>
                <select
                  value={selectedChapter}
                  onChange={(e) => handleChapterChange(e.target.value)}
                  disabled={savingChapter}
                  className="mt-1 w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-[0.82rem] outline-none focus:border-gray-400 disabled:opacity-50"
                >
                  <option value="">{t.monEspace.progress.sessionChapterNone}</option>
                  {syllabusItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                  {notesError && <p className="mt-1.5 text-[0.78rem] text-red-600">{notesError}</p>}
                </>
              ) : (
                <p className="mt-2 text-[0.87rem] text-gray-600">{savedNotes || m.nothingLogged}</p>
              )}
            </div>

            <div className="mt-6">
              <h3 className="text-[0.85rem] font-semibold text-gray-900">{t.monEspace.homework.heading}</h3>
              <div className="mt-2 space-y-1.5">
                {homeworkItems.length === 0 && <p className="text-[0.8rem] text-gray-400">{t.monEspace.homework.empty}</p>}
                {homeworkItems.map((hw) => (
                  <div key={hw.id} className="flex flex-wrap items-center justify-between gap-x-2 rounded-md bg-gray-50 px-3 py-2 text-[0.85rem]">
                    <span className="min-w-0 break-words text-gray-800">
                      {hw.title}
                      {hw.due_date && (
                        <span className="ml-1.5 text-[0.76rem] text-gray-400">
                          {t.monEspace.homework.dueOn.replace("{date}", new Date(hw.due_date).toLocaleDateString(dateLocale, { day: "numeric", month: "short" }))}
                        </span>
                      )}
                    </span>
                    {canEdit && (
                      <button type="button" onClick={() => handleRemoveHomework(hw.id)} className="shrink-0 text-[0.76rem] text-red-600 hover:underline">
                        {t.monEspace.gestion.common.delete}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {canEdit && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <input
                    placeholder={t.monEspace.homework.titlePlaceholder}
                    value={newHomeworkTitle}
                    onChange={(e) => setNewHomeworkTitle(e.target.value)}
                    className="min-w-[200px] flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-[0.82rem] outline-none focus:border-gray-400"
                  />
                  <input
                    type="date"
                    value={newHomeworkDue}
                    onChange={(e) => setNewHomeworkDue(e.target.value)}
                    className="rounded-md border border-gray-200 px-2 py-1.5 text-[0.8rem] text-gray-600 outline-none focus:border-gray-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddHomework}
                    disabled={savingHomework || !newHomeworkTitle.trim()}
                    className="rounded-md bg-gradient-to-br from-ink to-ink-soft px-3 py-1.5 text-[0.8rem] font-medium text-paper disabled:opacity-50"
                  >
                    {t.monEspace.homework.add}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {commentTarget && (
        <StudentCommentModal
          studentId={commentTarget.id}
          studentName={commentTarget.name}
          classId={classId}
          onClose={() => setCommentTarget(null)}
          onCommentAdded={() => setCommentCounts((prev) => ({ ...prev, [commentTarget.id]: (prev[commentTarget.id] ?? 0) + 1 }))}
        />
      )}
    </div>
  );
}
