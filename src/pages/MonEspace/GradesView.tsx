import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../features/auth/AuthContext";
import { humanizeError } from "../../lib/humanizeError";
import { useConfirmDialog } from "./useConfirmDialog";
import { useLocale } from "../../i18n/LocaleContext";

interface ClassOption {
  id: string;
  name: string;
  courses: { name: string } | null;
}
interface Assessment {
  id: string;
  title: string;
  assessment_type: string;
  max_score: number;
  weight: number;
  assessment_date: string | null;
}
interface Enrollment {
  student_id: string;
  students: { first_name: string; last_name: string } | null;
}
interface GradeRow {
  student_id: string;
  score: number;
}
interface AverageRow {
  student_id: string;
  average_out_of_20: number;
  grade_count: number;
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.85rem] text-gray-900 outline-none focus:border-gray-400";

export default function GradesView() {
  const { t } = useLocale();
  const m = t.monEspace.gestion.grades;
  const c = t.monEspace.gestion.common;
  const TYPE_LABELS: Record<string, string> = { quiz: m.typeQuiz, test: m.typeTest, exam: m.typeExam, project: m.typeProject, oral: m.typeOral };
  const { isSuperAdmin, memberships } = useAuth();
  const primaryRole = isSuperAdmin ? "super_admin" : (memberships[0]?.role_name ?? null);
  const isAdmin = primaryRole === "super_admin" || primaryRole === "center_admin";
  const orgId = memberships[0]?.organization_id;
  const { confirm, dialog } = useConfirmDialog();

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [averages, setAverages] = useState<AverageRow[]>([]);
  const [activeAssessment, setActiveAssessment] = useState<string | null>(null);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", assessment_type: "test", max_score: "20", weight: "1", assessment_date: "" });

  async function loadClasses() {
    setLoading(true);
    let query = supabase.from("classes").select("id, name, courses(name)");
    if (isAdmin && orgId) query = query.eq("organization_id", orgId);
    // Non-admin (teacher): RLS already scopes this to only their own
    // classes — no explicit filter needed, same principle used throughout
    // this platform ("My Classes" queries that don't branch by role).
    const { data } = await query.order("name");
    setClasses((data as unknown as ClassOption[]) ?? []);
    setLoading(false);
    if (data && data.length > 0 && !selectedClass) setSelectedClass(data[0].id);
  }

  useEffect(() => {
    loadClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function loadClassData(classId: string) {
    const [{ data: assessmentData }, { data: enrollData }, { data: avgData }] = await Promise.all([
      supabase.from("assessments").select("id, title, assessment_type, max_score, weight, assessment_date").eq("class_id", classId).order("assessment_date", { ascending: false }),
      supabase.from("class_students").select("student_id, students(first_name, last_name)").eq("class_id", classId),
      supabase.from("student_class_averages").select("student_id, average_out_of_20, grade_count").eq("class_id", classId),
    ]);
    setAssessments(assessmentData ?? []);
    setEnrollments((enrollData as unknown as Enrollment[]) ?? []);
    setAverages(avgData ?? []);
  }

  useEffect(() => {
    if (selectedClass) loadClassData(selectedClass);
  }, [selectedClass]);

  async function loadGrades(assessmentId: string) {
    const { data } = await supabase.from("grades").select("student_id, score").eq("assessment_id", assessmentId);
    setGrades(data ?? []);
  }

  function toggleAssessment(id: string) {
    if (activeAssessment === id) {
      setActiveAssessment(null);
      return;
    }
    setActiveAssessment(id);
    loadGrades(id);
  }

  async function handleAddAssessment(e: FormEvent) {
    e.preventDefault();
    if (!selectedClass) return;
    setSaving(true);
    const { error: insertError } = await supabase.from("assessments").insert({
      class_id: selectedClass,
      title: form.title,
      assessment_type: form.assessment_type,
      max_score: Number(form.max_score),
      weight: Number(form.weight),
      assessment_date: form.assessment_date || null,
    });
    setSaving(false);
    if (insertError) {
      setError(humanizeError(insertError));
      return;
    }
    setForm({ title: "", assessment_type: "test", max_score: "20", weight: "1", assessment_date: "" });
    setShowForm(false);
    setError(null);
    loadClassData(selectedClass);
  }

  async function handleDeleteAssessment(id: string) {
    const { error: deleteError } = await supabase.from("assessments").delete().eq("id", id);
    if (deleteError) setError(humanizeError(deleteError));
    else {
      setActiveAssessment(null);
      if (selectedClass) loadClassData(selectedClass);
    }
  }

  async function setScore(assessmentId: string, studentId: string, scoreStr: string) {
    const score = Number(scoreStr);
    if (Number.isNaN(score) || scoreStr === "") return;
    const existing = grades.find((g) => g.student_id === studentId);
    const { error: gradeError } = existing
      ? await supabase.from("grades").update({ score }).eq("assessment_id", assessmentId).eq("student_id", studentId)
      : await supabase.from("grades").insert({ assessment_id: assessmentId, student_id: studentId, score });
    if (gradeError) {
      setError(humanizeError(gradeError));
      return;
    }
    setError(null);
    loadGrades(assessmentId);
    if (selectedClass) loadClassData(selectedClass);
  }

  const currentClass = classes.find((c) => c.id === selectedClass);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
      <h1 className="font-display text-[1.5rem] font-bold text-gray-900">{m.title}</h1>

      {loading ? (
        <div className="mt-6 h-40" />
      ) : classes.length === 0 ? (
        <p className="mt-4 text-[0.88rem] text-gray-400">{m.noClasses}</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {classes.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedClass(c.id)}
                className={`rounded-full px-3.5 py-1.5 text-[0.82rem] font-medium ${
                  selectedClass === c.id ? "bg-gradient-to-br from-ink to-ink-soft text-paper" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {error && <p className="mt-3 text-[0.82rem] text-red-600">{error}</p>}

          <div className="mt-5 flex items-center justify-between">
            <h2 className="text-[0.95rem] font-semibold text-gray-900">{currentClass?.courses?.name}</h2>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="rounded-md bg-gradient-to-br from-ink to-ink-soft px-3.5 py-1.5 text-[0.82rem] font-medium text-paper"
            >
              {showForm ? c.cancel : m.newAssessment}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleAddAssessment} className="mt-3 grid grid-cols-2 gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 sm:grid-cols-4">
              <input required placeholder={m.titlePlaceholder} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`col-span-2 ${inputClass}`} />
              <select value={form.assessment_type} onChange={(e) => setForm({ ...form, assessment_type: e.target.value })} className={inputClass}>
                {Object.entries(TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <input type="date" value={form.assessment_date} onChange={(e) => setForm({ ...form, assessment_date: e.target.value })} className={inputClass} />
              <label className="block">
                <span className="text-[0.72rem] text-gray-500">{m.maxScore}</span>
                <input type="number" min="1" value={form.max_score} onChange={(e) => setForm({ ...form, max_score: e.target.value })} className={`mt-0.5 ${inputClass}`} />
              </label>
              <label className="block">
                <span className="text-[0.72rem] text-gray-500">{m.weight}</span>
                <input type="number" min="0.5" step="0.5" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className={`mt-0.5 ${inputClass}`} />
              </label>
              <button type="submit" disabled={saving} className="col-span-2 rounded-md bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.82rem] font-medium text-paper disabled:opacity-50 sm:col-span-4">
                {saving ? c.saving : m.createAssessment}
              </button>
            </form>
          )}

          <div className="mt-4 space-y-2">
            {assessments.length === 0 ? (
              <p className="text-[0.85rem] text-gray-400">{m.noAssessments}</p>
            ) : (
              assessments.map((a) => (
                <div key={a.id} className="rounded-md border border-gray-200 bg-white">
                  <button type="button" onClick={() => toggleAssessment(a.id)} className="flex w-full items-center justify-between px-4 py-2.5 text-left">
                    <span className="text-[0.88rem] font-medium text-gray-900">
                      {a.title} <span className="text-[0.76rem] font-normal text-gray-400">— {TYPE_LABELS[a.assessment_type]} · /{a.max_score} · coef. {a.weight}</span>
                    </span>
                    <span className="text-[0.78rem] text-gray-500">{activeAssessment === a.id ? m.close : m.grade}</span>
                  </button>
                  {activeAssessment === a.id && (
                    <div className="space-y-1.5 border-t border-gray-100 px-4 py-3">
                      {enrollments.map((e) => {
                        const record = grades.find((g) => g.student_id === e.student_id);
                        return (
                          <div key={e.student_id} className="flex items-center justify-between text-[0.85rem]">
                            <span className="text-gray-800">{e.students?.first_name} {e.students?.last_name}</span>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max={a.max_score}
                              defaultValue={record?.score ?? ""}
                              onBlur={(ev) => ev.target.value && setScore(a.id, e.student_id, ev.target.value)}
                              className="w-16 rounded border border-gray-200 px-2 py-1 text-[0.8rem]"
                            />
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => confirm(m.deleteAssessmentConfirm.replace("{name}", a.title), () => handleDeleteAssessment(a.id))}
                        className="mt-2 text-[0.76rem] text-red-600 hover:underline"
                      >
                        {m.deleteAssessment}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {enrollments.length > 0 && (
            <div className="mt-6">
              <h3 className="text-[0.85rem] font-semibold text-gray-900">{m.averages}</h3>
              <div className="mt-2 space-y-1">
                {enrollments.map((e) => {
                  const avg = averages.find((a) => a.student_id === e.student_id);
                  return (
                    <div key={e.student_id} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 text-[0.85rem]">
                      <span className="text-gray-700">{e.students?.first_name} {e.students?.last_name}</span>
                      <span className="font-medium text-gray-900">{avg ? `${avg.average_out_of_20}/20` : "—"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
      {dialog}
    </div>
  );
}
