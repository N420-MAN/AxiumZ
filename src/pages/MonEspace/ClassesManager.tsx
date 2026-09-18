import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { humanizeError } from "../../lib/humanizeError";
import { useConfirmDialog } from "./useConfirmDialog";
import ScheduleSessionsForm from "./ScheduleSessionsForm";

interface Course {
  id: string;
  name: string;
}
interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
}
interface Student {
  id: string;
  first_name: string;
  last_name: string;
}
interface ClassRow {
  id: string;
  name: string;
  room: string | null;
  courses: { name: string } | null;
  teachers: { first_name: string; last_name: string } | null;
}
interface Enrollment {
  student_id: string;
  students: { first_name: string; last_name: string } | null;
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.9rem] text-gray-900 outline-none focus:border-gray-400";
const selectClass = inputClass;

export default function ClassesManager({ organizationId }: { organizationId: string }) {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Record<string, Enrollment[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();
  const [form, setForm] = useState({ name: "", course_id: "", teacher_id: "", room: "" });
  const [enrollStudentId, setEnrollStudentId] = useState("");

  async function loadAll() {
    setLoading(true);
    const [{ data: classData, error: classError }, { data: courseData }, { data: teacherData }, { data: studentData }] =
      await Promise.all([
        supabase
          .from("classes")
          .select("id, name, room, courses(name), teachers(first_name, last_name)")
          .eq("organization_id", organizationId)
          .order("name"),
        supabase.from("courses").select("id, name").eq("organization_id", organizationId).order("name"),
        supabase.from("teachers").select("id, first_name, last_name").eq("organization_id", organizationId).order("last_name"),
        supabase.from("students").select("id, first_name, last_name").eq("organization_id", organizationId).order("last_name"),
      ]);

    if (classError) setError(humanizeError(classError));
    else setError(null);
    setClasses((classData as unknown as ClassRow[]) ?? []);
    setCourses(courseData ?? []);
    setTeachers(teacherData ?? []);
    setStudents(studentData ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  async function loadEnrollments(classId: string) {
    const { data } = await supabase.from("class_students").select("student_id, students(first_name, last_name)").eq("class_id", classId);
    setEnrollments((prev) => ({ ...prev, [classId]: (data as unknown as Enrollment[]) ?? [] }));
  }

  function toggleExpand(classId: string) {
    if (expanded === classId) {
      setExpanded(null);
      return;
    }
    setExpanded(classId);
    if (!enrollments[classId]) loadEnrollments(classId);
  }

  async function handleAddClass(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error: insertError } = await supabase.from("classes").insert({
      organization_id: organizationId,
      name: form.name,
      course_id: form.course_id,
      teacher_id: form.teacher_id || null,
      room: form.room || null,
    });
    setSaving(false);
    if (insertError) {
      setError(humanizeError(insertError));
      return;
    }
    setForm({ name: "", course_id: "", teacher_id: "", room: "" });
    setShowForm(false);
    setError(null);
    loadAll();
  }

  async function handleDeleteClass(id: string) {
    const { error: deleteError } = await supabase.from("classes").delete().eq("id", id);
    if (deleteError) setError(humanizeError(deleteError));
    else loadAll();
  }

  async function handleEnroll(classId: string) {
    if (!enrollStudentId) return;
    const { error: enrollError } = await supabase.from("class_students").insert({ class_id: classId, student_id: enrollStudentId });
    if (enrollError) {
      setError(humanizeError(enrollError));
      return;
    }
    setEnrollStudentId("");
    loadEnrollments(classId);
  }

  async function handleUnenroll(classId: string, studentId: string) {
    const { error: unenrollError } = await supabase.from("class_students").delete().eq("class_id", classId).eq("student_id", studentId);
    if (unenrollError) setError(humanizeError(unenrollError));
    else loadEnrollments(classId);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[1rem] font-semibold text-gray-900">Classes</h3>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-gray-900 px-3.5 py-1.5 text-[0.82rem] font-medium text-white"
        >
          {showForm ? "Annuler" : "+ Ajouter"}
        </button>
      </div>

      {error && <p className="mt-3 text-[0.82rem] text-red-600">{error}</p>}

      {showForm && (
        <form onSubmit={handleAddClass} className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
          <input
            required
            placeholder="Nom de la classe"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
          />
          <input placeholder="Salle" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} className={inputClass} />
          <select
            required
            value={form.course_id}
            onChange={(e) => setForm({ ...form, course_id: e.target.value })}
            className={selectClass}
          >
            <option value="">Programme…</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} className={selectClass}>
            <option value="">Enseignant (optionnel)…</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.first_name} {t.last_name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={saving}
            className="sm:col-span-2 rounded-md bg-gray-900 px-4 py-2 text-[0.85rem] font-medium text-white disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      )}

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-[0.85rem] text-gray-400">Chargement…</p>
        ) : classes.length === 0 ? (
          <p className="text-[0.85rem] text-gray-400">Aucune classe pour le moment.</p>
        ) : (
          classes.map((cls) => (
            <div key={cls.id} className="rounded-md border border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between px-4 py-2.5">
                <button type="button" onClick={() => toggleExpand(cls.id)} className="text-left">
                  <span className="text-[0.9rem] font-medium text-gray-900">{cls.name}</span>
                  <span className="ml-2 text-[0.8rem] text-gray-500">
                    {cls.courses?.name} {cls.teachers ? `— ${cls.teachers.first_name} ${cls.teachers.last_name}` : "(sans enseignant)"}
                  </span>
                </button>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => toggleExpand(cls.id)} className="text-[0.8rem] text-gray-600 hover:text-gray-900 hover:underline">
                    {expanded === cls.id ? "Fermer" : "Élèves"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      confirm(
                        `Supprimer la classe "${cls.name}" ? Les inscriptions, séances, présences, évaluations, notes, devoirs et documents liés à cette classe seront également supprimés. Cette action est irréversible.`,
                        () => handleDeleteClass(cls.id),
                      )
                    }
                    className="text-[0.8rem] text-red-600 hover:underline"
                  >
                    Supprimer
                  </button>
                </div>
              </div>

              {expanded === cls.id && (
                <div className="border-t border-gray-200 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <select value={enrollStudentId} onChange={(e) => setEnrollStudentId(e.target.value)} className={`${selectClass} w-auto`}>
                      <option value="">Inscrire un élève…</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.first_name} {s.last_name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleEnroll(cls.id)}
                      className="rounded-md bg-gray-900 px-3 py-2 text-[0.82rem] font-medium text-white"
                    >
                      Inscrire
                    </button>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {(enrollments[cls.id] ?? []).length === 0 ? (
                      <p className="text-[0.8rem] text-gray-400">Aucun élève inscrit.</p>
                    ) : (
                      enrollments[cls.id].map((e) => (
                        <div key={e.student_id} className="flex items-center justify-between text-[0.85rem]">
                          <span className="text-gray-800">
                            {e.students?.first_name} {e.students?.last_name}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              confirm(`Retirer ${e.students?.first_name} de cette classe ? Son historique de notes et présences sera conservé.`, () =>
                                handleUnenroll(cls.id, e.student_id),
                              )
                            }
                            className="text-[0.78rem] text-red-600 hover:underline"
                          >
                            Retirer
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <ScheduleSessionsForm classId={cls.id} defaultRoom={cls.room} organizationId={organizationId} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
      {dialog}
    </div>
  );
}
