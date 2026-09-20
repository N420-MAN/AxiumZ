import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../features/auth/AuthContext";
import { useLocale } from "../../i18n/LocaleContext";
import { humanizeError } from "../../lib/humanizeError";

interface Announcement {
  id: string;
  title: string;
  content: string;
  class_id: string | null;
  target_roles: string[] | null;
  target_student_id: string | null;
  target_teacher_id: string | null;
  target_parent_id: string | null;
  created_at: string;
  created_by_name: string | null;
  created_by_role: string | null;
  classes: { name: string } | null;
}
interface ClassOption {
  id: string;
  name: string;
}
interface StudentOption {
  id: string;
  first_name: string;
  last_name: string;
}

type Scope = "org" | "class" | "students";

export default function AnnouncementsView() {
  const { isSuperAdmin, memberships } = useAuth();
  const { locale, t } = useLocale();
  const m = t.monEspace.announcements;
  const ROLE_OPTIONS = [
    { value: "student", label: m.roleStudents },
    { value: "parent", label: m.roleParents },
    { value: "teacher", label: m.roleTeachers },
    { value: "admin", label: m.roleAdmins }, // expands to center_admin + super_admin on submit
  ];
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";
  const primaryRole = isSuperAdmin ? "super_admin" : (memberships[0]?.role_name ?? null);
  const isAdmin = primaryRole === "super_admin" || primaryRole === "center_admin";
  const isTeacher = primaryRole === "teacher";
  const orgId = memberships[0]?.organization_id;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [myClasses, setMyClasses] = useState<ClassOption[]>([]);
  const [myStudents, setMyStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("org");
  const [form, setForm] = useState({ title: "", content: "", classId: "" });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("announcements")
      .select("id, title, content, class_id, target_roles, target_student_id, target_teacher_id, target_parent_id, created_at, created_by_name, created_by_role, classes(name)")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(humanizeError(fetchError));
      setAnnouncements([]);
    } else {
      setAnnouncements((data as unknown as Announcement[]) ?? []);
    }

    if (isTeacher) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: teacherRow } = await supabase.from("teachers").select("id").eq("user_id", userData.user.id).maybeSingle();
        if (teacherRow) {
          const { data: classData } = await supabase.from("classes").select("id, name").eq("teacher_id", teacherRow.id);
          setMyClasses(classData ?? []);
          const classIds = (classData ?? []).map((c) => c.id);
          if (classIds.length > 0) {
            const { data: enrollData } = await supabase
              .from("class_students")
              .select("student_id, students(id, first_name, last_name)")
              .in("class_id", classIds);
            const seen = new Map<string, StudentOption>();
            for (const e of (enrollData as unknown as { students: StudentOption | null }[]) ?? []) {
              if (e.students) seen.set(e.students.id, e.students);
            }
            setMyStudents(Array.from(seen.values()));
          }
        }
      }
    } else if (isAdmin && orgId) {
      const { data: classData } = await supabase.from("classes").select("id, name").eq("organization_id", orgId);
      setMyClasses(classData ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleRole(value: string) {
    setSelectedRoles((prev) => (prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value]));
  }
  function toggleStudent(id: string) {
    setSelectedStudents((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function notifyEmail(announcementId: string) {
    supabase.functions.invoke("send-announcement-email", { body: { announcementId } }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("Announcement email notification failed:", err);
    });
  }

  async function handlePost(e: FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setSaving(true);
    setError(null);

    // "Admins" in the UI expands to both role names the database actually uses.
    const expandedRoles = selectedRoles.flatMap((r) => (r === "admin" ? ["center_admin", "super_admin"] : [r]));

    if (scope === "students" && isTeacher) {
      if (selectedStudents.length === 0) {
        setSaving(false);
        setError(m.chooseAtLeastOneStudent);
        return;
      }
      // One announcement per selected student — each is its own
      // individually-scoped, individually-visible message, not a single
      // row shared across several people.
      const results = await Promise.all(
        selectedStudents.map((studentId) =>
          supabase
            .from("announcements")
            .insert({ organization_id: orgId, target_student_id: studentId, title: form.title, content: form.content, published_at: new Date().toISOString() })
            .select("id")
            .single(),
        ),
      );
      const failed = results.find((r) => r.error);
      setSaving(false);
      if (failed?.error) {
        setError(humanizeError(failed.error));
        return;
      }
      for (const r of results) if (r.data) notifyEmail(r.data.id);
    } else {
      const payload: Record<string, unknown> = {
        organization_id: orgId,
        title: form.title,
        content: form.content,
        published_at: new Date().toISOString(),
      };
      if (scope === "class") payload.class_id = form.classId;
      else if (scope === "org" && expandedRoles.length > 0) payload.target_roles = expandedRoles;

      const { data: inserted, error: insertError } = await supabase.from("announcements").insert(payload).select("id").single();
      setSaving(false);
      if (insertError) {
        setError(humanizeError(insertError));
        return;
      }
      if (inserted) notifyEmail(inserted.id);
    }

    setForm({ title: "", content: "", classId: "" });
    setSelectedRoles([]);
    setSelectedStudents([]);
    setShowForm(false);
    load();
  }

  const canPost = isAdmin || isTeacher;

  function roleLabel(role: string | null): string {
    if (role === "student") return m.roleStudents;
    if (role === "parent") return m.roleParents;
    if (role === "teacher") return m.roleTeachers;
    if (role === "center_admin" || role === "super_admin") return m.roleAdmins;
    return role ?? "";
  }

  function describeTarget(a: Announcement): string {
    if (a.classes) return a.classes.name;
    if (a.target_student_id || a.target_teacher_id || a.target_parent_id) return m.individualMessage;
    if (a.target_roles && a.target_roles.length > 0) {
      const labels = a.target_roles.map((r) => (r === "center_admin" || r === "super_admin" ? m.roleAdmins : ROLE_OPTIONS.find((o) => o.value === r)?.label ?? r));
      return Array.from(new Set(labels)).join(", ");
    }
    return m.wholeOrg;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[1.5rem] font-bold text-gray-900">{m.title}</h1>
        {canPost && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-gradient-to-br from-ink to-ink-soft px-3.5 py-1.5 text-[0.82rem] font-medium text-paper"
          >
            {showForm ? m.cancelButton : m.newButton}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handlePost} className="mt-5 rounded-lg border border-gray-200 bg-white p-5">
          <input
            required
            placeholder={m.titlePlaceholder}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-[0.9rem] outline-none focus:border-gray-400"
          />
          <textarea
            required
            placeholder={m.messagePlaceholder}
            rows={3}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            className="mt-2.5 w-full rounded-md border border-gray-200 px-3 py-2 text-[0.9rem] outline-none focus:border-gray-400"
          />

          <div className="mt-3 flex gap-1.5">
            {isAdmin && (
              <button type="button" onClick={() => setScope("org")} className={`rounded-full px-3 py-1 text-[0.78rem] font-medium ${scope === "org" ? "bg-gradient-to-br from-ink to-ink-soft text-paper" : "bg-gray-100 text-gray-600"}`}>
                {m.scopeOrg}
              </button>
            )}
            <button type="button" onClick={() => setScope("class")} className={`rounded-full px-3 py-1 text-[0.78rem] font-medium ${scope === "class" ? "bg-gradient-to-br from-ink to-ink-soft text-paper" : "bg-gray-100 text-gray-600"}`}>
              {isAdmin ? m.scopeOneClass : m.scopeMyClass}
            </button>
            {isTeacher && (
              <button type="button" onClick={() => setScope("students")} className={`rounded-full px-3 py-1 text-[0.78rem] font-medium ${scope === "students" ? "bg-gradient-to-br from-ink to-ink-soft text-paper" : "bg-gray-100 text-gray-600"}`}>
                {m.scopeStudents}
              </button>
            )}
          </div>

          {scope === "org" && isAdmin && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-[0.8rem] text-gray-700">
                  <input type="checkbox" checked={selectedRoles.includes(opt.value)} onChange={() => toggleRole(opt.value)} />
                  {opt.label}
                </label>
              ))}
              <span className="self-center text-[0.75rem] text-gray-400">{selectedRoles.length === 0 ? m.noRoleSelectionMeansEveryone : ""}</span>
            </div>
          )}

          {scope === "class" && (
            <select
              required
              value={form.classId}
              onChange={(e) => setForm({ ...form, classId: e.target.value })}
              className="mt-2.5 w-full rounded-md border border-gray-200 px-3 py-2 text-[0.88rem] text-gray-700"
            >
              <option value="">{m.pickClass}</option>
              {myClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {scope === "students" && isTeacher && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {myStudents.length === 0 ? (
                <p className="text-[0.8rem] text-gray-400">{m.noStudentsInClasses}</p>
              ) : (
                myStudents.map((s) => (
                  <label key={s.id} className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-[0.8rem] text-gray-700">
                    <input type="checkbox" checked={selectedStudents.includes(s.id)} onChange={() => toggleStudent(s.id)} />
                    {s.first_name} {s.last_name}
                  </label>
                ))
              )}
            </div>
          )}

          {error && <p className="mt-2 text-[0.82rem] text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="mt-3 rounded-md bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.85rem] font-medium text-paper disabled:opacity-50"
          >
            {saving ? m.publishing : m.publishButton}
          </button>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {error && !showForm && <p className="text-[0.85rem] text-red-600">{error}</p>}
        {loading ? (
          <p className="text-[0.88rem] text-gray-400">{m.loading}</p>
        ) : announcements.length === 0 ? (
          <p className="text-[0.88rem] text-gray-400">{m.none}</p>
        ) : (
          announcements.map((a) => (
            <div key={a.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[0.92rem] font-semibold text-gray-900">{a.title}</h3>
                <span className="text-[0.75rem] text-gray-400">{describeTarget(a)}</span>
              </div>
              <p className="mt-1.5 text-[0.87rem] text-gray-600">{a.content}</p>
              <p className="mt-2 text-[0.72rem] text-gray-400">
                {a.created_by_name && `${m.sentBy.replace("{name}", a.created_by_name).replace("{role}", roleLabel(a.created_by_role))} · `}
                {new Date(a.created_at).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
