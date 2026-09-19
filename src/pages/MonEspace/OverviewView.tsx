import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../features/auth/AuthContext";
import { useLocale } from "../../i18n/LocaleContext";

interface ChildOption {
  id: string;
  first_name: string;
  last_name: string;
}
interface UpcomingSession {
  id: string;
  starts_at: string;
  room: string | null;
  classes: { name: string; teachers: { first_name: string; last_name: string; phone: string | null } | null } | null;
}
interface GradeRow {
  id: string;
  score: number;
  assessments: { title: string; max_score: number | null } | null;
}
interface AverageRow {
  class_id: string;
  average_out_of_20: number;
}
interface AttendanceRow {
  id: string;
  status: string;
  class_sessions: { starts_at: string; classes: { name: string } | null } | null;
}
interface NoteRow {
  id: string;
  starts_at: string;
  notes: string | null;
  classes: { name: string } | null;
}

const ATTENDANCE_STYLE: Record<string, string> = {
  present: "bg-green-50 text-green-700",
  absent: "bg-red-50 text-red-600",
  late: "bg-amber-50 text-amber-700",
  excused: "bg-gray-100 text-gray-500",
};

export default function OverviewView() {
  const { memberships } = useAuth();
  const { locale, t } = useLocale();
  const m = t.monEspace.overview;
  const attendanceLabels = t.monEspace.attendanceStatus;
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";
  const isParent = memberships[0]?.role_name === "parent";

  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<UpcomingSession[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [averages, setAverages] = useState<AverageRow[]>([]);
  const [classNames, setClassNames] = useState<Record<string, string>>({});
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);

  // Resolve which student record(s) this viewer can see: their own (student)
  // or their linked children (parent) — RLS already scopes what comes back,
  // this just figures out who to show a switcher for.
  useEffect(() => {
    async function resolveChildren() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      if (isParent) {
        const { data: parentRow } = await supabase.from("parents").select("id").eq("user_id", userData.user.id).maybeSingle();
        if (parentRow) {
          const { data: links } = await supabase
            .from("parent_students")
            .select("student_id, students(id, first_name, last_name)")
            .eq("parent_id", parentRow.id);
          const kids = (links ?? []).map((l) => (l as unknown as { students: ChildOption }).students).filter(Boolean);
          setChildren(kids);
          setSelectedChild(kids[0]?.id ?? null);
        }
      } else {
        const { data: studentRow } = await supabase.from("students").select("id, first_name, last_name").eq("user_id", userData.user.id).maybeSingle();
        if (studentRow) {
          setChildren([studentRow]);
          setSelectedChild(studentRow.id);
        }
      }
    }
    resolveChildren();
  }, [isParent]);

  useEffect(() => {
    if (!selectedChild) return;
    async function load() {
      setLoading(true);
      const now = new Date().toISOString();

      // Two-step on purpose: fetch this student's class_ids first, then query
      // sessions for those classes. A single-query nested filter across two
      // levels of embedded resources is possible in PostgREST, but it's a
      // corner case I couldn't verify against the real REST API from this
      // sandbox (no network access to it) — this shape uses only basic
      // filters I've directly confirmed return the right rows.
      const { data: enrolledClasses } = await supabase.from("class_students").select("class_id").eq("student_id", selectedChild);
      const classIds = (enrolledClasses ?? []).map((c) => c.class_id);

      const [{ data: upcomingData }, { data: gradeData }, { data: attData }, { data: pastData }, { data: avgData }, { data: classNameData }] = await Promise.all([
        classIds.length
          ? supabase
              .from("class_sessions")
              .select("id, starts_at, room, classes(name, teachers(first_name, last_name, phone))")
              .in("class_id", classIds)
              .gte("starts_at", now)
              .order("starts_at")
              .limit(5)
          : Promise.resolve({ data: [] }),
        supabase
          .from("grades")
          .select("id, score, assessments(title, max_score)")
          .eq("student_id", selectedChild)
          .order("graded_at", { ascending: false })
          .limit(5),
        supabase
          .from("attendance")
          .select("id, status, class_sessions(starts_at, classes(name))")
          .eq("student_id", selectedChild)
          .order("marked_at", { ascending: false })
          .limit(5),
        classIds.length
          ? supabase
              .from("class_sessions")
              .select("id, starts_at, notes, classes(name)")
              .in("class_id", classIds)
              .lt("starts_at", now)
              .not("notes", "is", null)
              .order("starts_at", { ascending: false })
              .limit(3)
          : Promise.resolve({ data: [] }),
        supabase.from("student_class_averages").select("class_id, average_out_of_20").eq("student_id", selectedChild),
        classIds.length ? supabase.from("classes").select("id, name").in("id", classIds) : Promise.resolve({ data: [] }),
      ]);

      setAverages(avgData ?? []);
      const nameMap: Record<string, string> = {};
      for (const c of classNameData ?? []) nameMap[c.id] = c.name;
      setClassNames(nameMap);      setUpcoming((upcomingData as unknown as UpcomingSession[]) ?? []);
      setGrades((gradeData as unknown as GradeRow[]) ?? []);
      setAttendance((attData as unknown as AttendanceRow[]) ?? []);
      setNotes((pastData as unknown as NoteRow[]) ?? []);
      setLoading(false);
    }
    load();
  }, [selectedChild]);

  const selectedChildName = children.find((c) => c.id === selectedChild);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-10">
      <h1 className="font-display text-[1.5rem] font-bold text-gray-900">{m.title}</h1>

      {isParent && children.length > 1 && (
        <div className="mt-4 flex gap-2">
          {children.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedChild(c.id)}
              className={`rounded-full px-3.5 py-1.5 text-[0.82rem] font-medium ${
                selectedChild === c.id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {c.first_name} {c.last_name}
            </button>
          ))}
        </div>
      )}
      {isParent && selectedChildName && children.length === 1 && (
        <p className="mt-1 text-[0.88rem] text-gray-500">
          {selectedChildName.first_name} {selectedChildName.last_name}
        </p>
      )}

      {loading ? (
        <div className="mt-8 h-40" />
      ) : (
        <div className="mt-7 grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div>
            <h2 className="text-[0.9rem] font-semibold text-gray-900">{m.upcomingSessions}</h2>
            {upcoming.length === 0 ? (
              <p className="mt-2 text-[0.85rem] text-gray-400">{m.noUpcomingSessions}</p>
            ) : (
              <div className="mt-2.5 space-y-2">
                {upcoming.map((s) => (
                  <div key={s.id} className="rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-[0.85rem] font-medium text-gray-900">{s.classes?.name}</p>
                    {s.classes?.teachers && (
                      <p className="mt-0.5 text-[0.78rem] text-gray-500">
                        {s.classes.teachers.first_name} {s.classes.teachers.last_name}
                        {s.classes.teachers.phone && (
                          <a href={`tel:${s.classes.teachers.phone}`} className="ml-1.5 text-gray-400 hover:text-gray-700 hover:underline">
                            {s.classes.teachers.phone}
                          </a>
                        )}
                      </p>
                    )}
                    <p className="mt-0.5 text-[0.78rem] text-gray-500">
                      {new Date(s.starts_at).toLocaleString(dateLocale, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {s.room ? ` · Salle ${s.room}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-[0.9rem] font-semibold text-gray-900">{m.recentGrades}</h2>
            {averages.length > 0 && (
              <div className="mt-2 space-y-1">
                {averages.map((a) => (
                  <div key={a.class_id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-[0.83rem]">
                    <span className="text-gray-600">{classNames[a.class_id] ?? "—"}</span>
                    <span className="font-semibold text-gray-900">{a.average_out_of_20}/20</span>
                  </div>
                ))}
              </div>
            )}
            {grades.length === 0 ? (
              <p className="mt-2 text-[0.85rem] text-gray-400">{m.noGrades}</p>
            ) : (
              <div className="mt-2.5 space-y-2">
                {grades.map((g) => (
                  <div key={g.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
                    <span className="text-[0.85rem] text-gray-800">{g.assessments?.title}</span>
                    <span className="text-[0.85rem] font-semibold text-gray-900">
                      {g.score}/{g.assessments?.max_score ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <h2 className="text-[0.9rem] font-semibold text-gray-900">{m.recentAttendance}</h2>
            {attendance.length === 0 ? (
              <p className="mt-2 text-[0.85rem] text-gray-400">{m.noAttendance}</p>
            ) : (
              <div className="mt-2.5 space-y-1.5">
                {attendance.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-[0.85rem]">
                    <span className="text-gray-700">
                      {a.class_sessions?.classes?.name} —{" "}
                      {a.class_sessions?.starts_at &&
                        new Date(a.class_sessions.starts_at).toLocaleDateString(dateLocale, { day: "numeric", month: "short" })}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium ${ATTENDANCE_STYLE[a.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {attendanceLabels[a.status as keyof typeof attendanceLabels] ?? a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notes.length > 0 && (
            <div className="sm:col-span-2">
              <h2 className="text-[0.9rem] font-semibold text-gray-900">{m.sessionLogHeading}</h2>
              <div className="mt-2.5 space-y-2">
                {notes.map((n) => (
                  <div key={n.id} className="rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-[0.78rem] text-gray-500">
                      {n.classes?.name} — {new Date(n.starts_at).toLocaleDateString(dateLocale, { day: "numeric", month: "short" })}
                    </p>
                    <p className="mt-1 text-[0.85rem] text-gray-800">{n.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
