import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import AssignmentsPanel from "./AssignmentsPanel";
import MaterialsPanel from "./MaterialsPanel";

interface ClassDetailProps {
  classId: string;
  className: string;
  organizationId: string;
  canEdit: boolean; // true for the class's teacher or an org admin
  onClose: () => void;
}

interface Session {
  id: string;
  starts_at: string;
  status: string;
}
interface Assessment {
  id: string;
  title: string;
  max_score: number;
}
interface Enrollment {
  student_id: string;
  students: { first_name: string; last_name: string } | null;
}
interface AttendanceRow {
  session_id: string;
  student_id: string;
  status: string;
}
interface GradeRow {
  assessment_id: string;
  student_id: string;
  score: number;
}

const ATTENDANCE_OPTIONS = ["present", "absent", "late", "excused"];

export default function ClassDetail({ classId, className, organizationId, canEdit, onClose }: ClassDetailProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [activeAssessment, setActiveAssessment] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    const [sessRes, assessRes, enrollRes, attRes, gradeRes] = await Promise.all([
      supabase.from("class_sessions").select("id, starts_at, status").eq("class_id", classId).order("starts_at", { ascending: false }),
      supabase.from("assessments").select("id, title, max_score").eq("class_id", classId).order("assessment_date", { ascending: false }),
      supabase.from("class_students").select("student_id, students(first_name, last_name)").eq("class_id", classId),
      supabase.from("attendance").select("session_id, student_id, status"),
      supabase.from("grades").select("assessment_id, student_id, score"),
    ]);
    setSessions(sessRes.data ?? []);
    setAssessments(assessRes.data ?? []);
    setEnrollments((enrollRes.data as unknown as Enrollment[]) ?? []);
    setAttendance(attRes.data ?? []);
    setGrades(gradeRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  async function setAttendanceStatus(sessionId: string, studentId: string, status: string) {
    const existing = attendance.find((a) => a.session_id === sessionId && a.student_id === studentId);
    if (existing) {
      await supabase.from("attendance").update({ status }).eq("session_id", sessionId).eq("student_id", studentId);
    } else {
      await supabase.from("attendance").insert({ session_id: sessionId, student_id: studentId, status });
    }
    loadAll();
  }

  async function setGradeScore(assessmentId: string, studentId: string, score: string) {
    const numeric = Number(score);
    if (Number.isNaN(numeric)) return;
    const existing = grades.find((g) => g.assessment_id === assessmentId && g.student_id === studentId);
    if (existing) {
      await supabase.from("grades").update({ score: numeric }).eq("assessment_id", assessmentId).eq("student_id", studentId);
    } else {
      await supabase.from("grades").insert({ assessment_id: assessmentId, student_id: studentId, score: numeric });
    }
    loadAll();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/95 px-4 py-12">
      <div className="w-full max-w-2xl rounded-2xl border border-paper/10 bg-ink-soft p-6">
        <div className="flex items-center justify-between border-b border-paper/10 pb-4">
          <h2 className="font-display text-[1.3rem] font-extrabold text-paper">{className}</h2>
          <button type="button" onClick={onClose} className="text-[0.85rem] text-mist hover:text-paper">
            Fermer
          </button>
        </div>

        {loading ? (
          <p className="mt-6 text-[0.85rem] text-mist">Chargement…</p>
        ) : (
          <>
            <div className="mt-6">
              <h3 className="font-display text-[1rem] font-extrabold text-paper">Séances</h3>
              {sessions.length === 0 ? (
                <p className="mt-2 text-[0.85rem] text-mist">Aucune séance pour le moment.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {sessions.map((s) => (
                    <div key={s.id} className="rounded-lg border border-paper/10 bg-paper/[0.03]">
                      <button
                        type="button"
                        onClick={() => setActiveSession(activeSession === s.id ? null : s.id)}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
                      >
                        <span className="text-[0.88rem] text-paper">{new Date(s.starts_at).toLocaleString("fr-FR")}</span>
                        <span className="text-[0.78rem] text-accent-bright">{activeSession === s.id ? "Fermer" : "Présences"}</span>
                      </button>
                      {activeSession === s.id && (
                        <div className="space-y-1.5 border-t border-paper/10 px-4 py-3">
                          {enrollments.map((e) => {
                            const record = attendance.find((a) => a.session_id === s.id && a.student_id === e.student_id);
                            return (
                              <div key={e.student_id} className="flex items-center justify-between text-[0.85rem]">
                                <span className="text-paper">
                                  {e.students?.first_name} {e.students?.last_name}
                                </span>
                                {canEdit ? (
                                  <select
                                    value={record?.status ?? ""}
                                    onChange={(ev) => setAttendanceStatus(s.id, e.student_id, ev.target.value)}
                                    className="rounded border border-paper/15 bg-paper/[0.04] px-2 py-1 text-[0.8rem] text-paper"
                                  >
                                    <option value="" disabled>
                                      —
                                    </option>
                                    {ATTENDANCE_OPTIONS.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-mist">{record?.status ?? "—"}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8">
              <h3 className="font-display text-[1rem] font-extrabold text-paper">Évaluations</h3>
              {assessments.length === 0 ? (
                <p className="mt-2 text-[0.85rem] text-mist">Aucune évaluation pour le moment.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {assessments.map((a) => (
                    <div key={a.id} className="rounded-lg border border-paper/10 bg-paper/[0.03]">
                      <button
                        type="button"
                        onClick={() => setActiveAssessment(activeAssessment === a.id ? null : a.id)}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
                      >
                        <span className="text-[0.88rem] text-paper">
                          {a.title} <span className="text-mist">/{a.max_score}</span>
                        </span>
                        <span className="text-[0.78rem] text-accent-bright">{activeAssessment === a.id ? "Fermer" : "Notes"}</span>
                      </button>
                      {activeAssessment === a.id && (
                        <div className="space-y-1.5 border-t border-paper/10 px-4 py-3">
                          {enrollments.map((e) => {
                            const record = grades.find((g) => g.assessment_id === a.id && g.student_id === e.student_id);
                            return (
                              <div key={e.student_id} className="flex items-center justify-between text-[0.85rem]">
                                <span className="text-paper">
                                  {e.students?.first_name} {e.students?.last_name}
                                </span>
                                {canEdit ? (
                                  <input
                                    type="number"
                                    step="0.5"
                                    defaultValue={record?.score ?? ""}
                                    onBlur={(ev) => ev.target.value && setGradeScore(a.id, e.student_id, ev.target.value)}
                                    className="w-16 rounded border border-paper/15 bg-paper/[0.04] px-2 py-1 text-[0.8rem] text-paper"
                                  />
                                ) : (
                                  <span className="text-mist">{record?.score ?? "—"}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <AssignmentsPanel classId={classId} canEdit={canEdit} enrollments={enrollments} />
            <MaterialsPanel classId={classId} organizationId={organizationId} canEdit={canEdit} />
          </>
        )}
      </div>
    </div>
  );
}
