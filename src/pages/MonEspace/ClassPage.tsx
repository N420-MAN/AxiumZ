import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../features/auth/AuthContext";
import { useLocale } from "../../i18n/LocaleContext";
import { classLabel } from "../../lib/programs";
import SyllabusProgressSection from "./SyllabusProgressSection";
import MaterialsSection from "./MaterialsSection";
import SessionDetailPanel from "./SessionDetailPanel";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  kind: string;
  grade_level: string | null;
  school_name: string | null;
}
interface ClassData {
  id: string;
  name: string;
  capacity: number | null;
  room: string | null;
  rooms: { name: string } | null;
  organization_id: string;
  teacher_id: string | null;
  programs: { name: string; kind: string } | null;
  levels: { name: string } | null;
  teachers: { first_name: string; last_name: string } | null;
  class_students: { status: string; students: Student | null }[];
}
interface SessionRow {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
}
interface AssessmentRow {
  id: string;
  title: string;
  assessment_type: string | null;
  max_score: number;
  assessment_date: string | null;
}

type Tab = "overview" | "students" | "sessions" | "chapters" | "grades" | "docs";

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ClassPage() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { memberships, isSuperAdmin, user } = useAuth();
  const { t, locale } = useLocale();
  const m = t.monEspace.classPage;
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";
  const base = `/${locale}/mon-espace`;
  const primaryRole = isSuperAdmin ? "super_admin" : (memberships[0]?.role_name ?? null);
  const isAdmin = primaryRole === "super_admin" || primaryRole === "center_admin";

  const [cls, setCls] = useState<ClassData | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [avg, setAvg] = useState<Record<string, number>>({});
  const [abs, setAbs] = useState<Record<string, { absences: number; total: number }>>({});
  const [myTeacherId, setMyTeacherId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [openSession, setOpenSession] = useState<SessionRow | null>(null);
  const [rev, setRev] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!classId) return;
    async function load() {
      const { data } = await supabase
        .from("classes")
        .select("id, name, capacity, room, rooms(name), organization_id, teacher_id, programs(name, kind), levels(name), teachers(first_name, last_name), class_students(status, students(id, first_name, last_name, kind, grade_level, school_name))")
        .eq("id", classId)
        .maybeSingle();
      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCls(data as unknown as ClassData);
      const [{ data: sess }, { data: assess }, { data: avgRows }, { data: absRows }] = await Promise.all([
        supabase.from("class_sessions").select("id, starts_at, ends_at, status, notes").eq("class_id", classId).order("starts_at"),
        supabase.from("assessments").select("id, title, assessment_type, max_score, assessment_date").eq("class_id", classId).order("assessment_date", { ascending: false }),
        supabase.from("student_class_averages").select("student_id, average_out_of_20").eq("class_id", classId),
        supabase.from("student_attendance_summary").select("student_id, absences, total_sessions").eq("class_id", classId),
      ]);
      setSessions((sess as SessionRow[]) ?? []);
      setAssessments((assess as AssessmentRow[]) ?? []);
      const a: Record<string, number> = {};
      for (const r of avgRows ?? []) a[r.student_id] = Number(r.average_out_of_20);
      setAvg(a);
      const b: Record<string, { absences: number; total: number }> = {};
      for (const r of absRows ?? []) b[r.student_id] = { absences: Number(r.absences), total: Number(r.total_sessions) };
      setAbs(b);
      setLoading(false);
    }
    load();
  }, [classId, rev]);

  useEffect(() => {
    if (!user) return;
    supabase.from("teachers").select("id").eq("user_id", user.id).maybeSingle().then(({ data }) => setMyTeacherId(data?.id ?? null));
  }, [user]);

  const students = useMemo(
    () =>
      (cls?.class_students ?? [])
        .filter((x) => x.status === "active" && x.students)
        .map((x) => x.students as Student)
        .sort((x, y) => x.last_name.localeCompare(y.last_name) || x.first_name.localeCompare(y.first_name)),
    [cls],
  );

  if (loading) return <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8" />;
  if (notFound || !cls) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
        <p className="text-[0.9rem] text-gray-500">{m.notFound}</p>
      </div>
    );
  }

  const canEdit = isAdmin || (!!myTeacherId && cls.teacher_id === myTeacherId);
  const now = Date.now();
  const nextSession = sessions.find((s) => new Date(s.ends_at).getTime() >= now && s.status !== "cancelled") ?? null;
  const avgs = students.map((s) => avg[s.id]).filter((v) => v !== undefined);
  const classAvg = avgs.length > 0 ? Math.round((avgs.reduce((x, y) => x + y, 0) / avgs.length) * 10) / 10 : null;
  const totalAbs = students.reduce((n, s) => n + (abs[s.id]?.absences ?? 0), 0);
  const totalSess = students.reduce((n, s) => n + (abs[s.id]?.total ?? 0), 0);
  const roomName = cls.rooms?.name ?? cls.room;
  const label = classLabel(cls);

  const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(dateLocale, { weekday: "short", day: "numeric", month: "short" });
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
  const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: m.tabOverview },
    { id: "students", label: m.tabStudents },
    { id: "sessions", label: m.tabSessions },
    { id: "chapters", label: m.tabChapters },
    { id: "grades", label: m.tabGrades },
    { id: "docs", label: m.tabDocs },
  ];

  const sessionTone = (s: SessionRow) =>
    s.status === "cancelled"
      ? "bg-red-50 text-red-700"
      : new Date(s.ends_at).getTime() < now
        ? "bg-green-50 text-green-800"
        : isToday(s.starts_at)
          ? "bg-amber-50 text-amber-800"
          : "bg-blue-50 text-blue-800";
  const sessionTag = (s: SessionRow) =>
    s.status === "cancelled"
      ? t.monEspace.sessionStatus.cancelled
      : new Date(s.ends_at).getTime() < now
        ? t.monEspace.sessionStatus.completed
        : isToday(s.starts_at)
          ? m.today
          : t.monEspace.sessionStatus.scheduled;

  const studentTable = (
    <div className="app-card overflow-x-auto px-5 pb-4 pt-2">
      {students.length === 0 ? (
        <p className="py-6 text-[0.88rem] text-gray-400">{m.noStudents}</p>
      ) : (
        <table className="w-full min-w-[520px] text-left text-[0.88rem]">
          <thead>
            <tr className="text-[0.7rem] uppercase tracking-wider text-gray-400">
              <th className="py-3 pr-3 font-semibold">{m.colStudent}</th>
              <th className="py-3 pr-3 font-semibold">{m.colSchool}</th>
              <th className="py-3 pr-3 font-semibold">{m.colAverage}</th>
              <th className="py-3 font-semibold">{m.colAbsence}</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const a = avg[s.id];
              const ab = abs[s.id];
              return (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="py-2.5 pr-3">
                    <Link to={`${base}/eleve/${s.id}`} className="flex items-center gap-3 font-semibold text-gray-900 hover:text-ink">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[0.72rem] font-bold text-ink">{initialsFrom(`${s.first_name} ${s.last_name}`)}</span>
                      <span className="hover:underline">
                        {s.first_name} {s.last_name}
                      </span>
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3 text-gray-500">{[s.school_name, s.grade_level].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="py-2.5 pr-3 text-gray-700">{a !== undefined ? `${a}/20` : "—"}</td>
                  <td className="py-2.5 text-gray-700">{ab && ab.total > 0 ? `${ab.absences}/${ab.total}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 sm:px-8">
      <button type="button" onClick={() => navigate(-1)} className="mb-3 text-[0.82rem] text-gray-500 hover:text-gray-800 hover:underline">
        {m.back}
      </button>

      <div className="app-card flex flex-wrap items-center justify-between gap-5 p-6 sm:p-7">
        <div className="min-w-0">
          <span className="rounded-full bg-accent-soft px-3 py-1 text-[0.72rem] font-bold text-ink">{cls.programs?.name}</span>
          <h1 className="mt-3 text-[1.7rem] font-extrabold text-gray-900">{[cls.levels?.name, cls.name].filter(Boolean).join(" · ")}</h1>
          <p className="mt-1 text-[0.88rem] text-gray-500">
            {cls.teachers ? `${cls.teachers.first_name} ${cls.teachers.last_name}` : m.noTeacher} · {roomName ? `${m.room} ${roomName}` : m.noRoom}
            {cls.capacity ? ` · ${m.spots.replace("{n}", String(students.length)).replace("{max}", String(cls.capacity))}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            [m.students, String(students.length)],
            [m.average, classAvg !== null ? `${classAvg}/20` : "—"],
            [m.absences, totalSess > 0 ? `${totalAbs}/${totalSess}` : "—"],
          ].map(([k, v]) => (
            <div key={k} className="min-w-[92px] rounded-2xl bg-gray-50 px-4 py-3">
              <p className="text-[0.72rem] text-gray-500">{k}</p>
              <p className="text-[1.25rem] font-extrabold text-gray-900">{v}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-gray-100 p-1.5" role="tablist">
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={`shrink-0 rounded-xl px-4 py-2 text-[0.85rem] transition-colors ${tab === x.id ? "bg-white font-bold text-ink shadow-sm" : "font-medium text-gray-500 hover:text-gray-800"}`}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="app-fade-in mt-5" key={tab}>
        {tab === "overview" && (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-5">
              <div className="app-card p-6">
                <h2 className="text-[1.05rem] font-bold text-gray-900">{m.nextSession}</h2>
                {nextSession ? (
                  <div className="mt-3 rounded-2xl bg-gray-50 p-4">
                    <p className="text-[1rem] font-bold text-gray-900">
                      {isToday(nextSession.starts_at) ? m.today : fmtDay(nextSession.starts_at)} · {fmtTime(nextSession.starts_at)} – {fmtTime(nextSession.ends_at)}
                    </p>
                    <p className="mt-1 text-[0.82rem] text-gray-500">{roomName ? `${m.room} ${roomName}` : m.noRoom}</p>
                    <button type="button" onClick={() => setOpenSession(nextSession)} className="mt-3 rounded-xl bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.82rem] font-semibold text-paper">
                      {m.openSession}
                    </button>
                  </div>
                ) : (
                  <p className="mt-3 text-[0.88rem] text-gray-400">{m.noNextSession}</p>
                )}
              </div>
              <div className="app-card p-6">
                <h2 className="text-[1.05rem] font-bold text-gray-900">{m.chaptersHeading}</h2>
                <SyllabusProgressSection classId={cls.id} />
              </div>
            </div>
            <div className="app-card p-6">
              <h2 className="text-[1.05rem] font-bold text-gray-900">{m.students}</h2>
              <div className="mt-2">
                {students.length === 0 && <p className="text-[0.88rem] text-gray-400">{m.noStudents}</p>}
                {students.map((s) => (
                  <Link key={s.id} to={`${base}/eleve/${s.id}`} className="flex items-center gap-3 border-t border-gray-100 py-2.5 first:border-t-0 hover:opacity-80">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[0.72rem] font-bold text-ink">{initialsFrom(`${s.first_name} ${s.last_name}`)}</span>
                    <span className="min-w-0 flex-1 truncate text-[0.9rem] font-semibold text-gray-900">
                      {s.first_name} {s.last_name}
                    </span>
                    <span className="text-[0.8rem] text-gray-500">{avg[s.id] !== undefined ? `${avg[s.id]}/20` : ""}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "students" && studentTable}

        {tab === "sessions" && (
          <div className="app-card px-5 py-2">
            {sessions.length === 0 ? (
              <p className="py-6 text-[0.88rem] text-gray-400">{m.sessionsEmpty}</p>
            ) : (
              [...sessions].reverse().map((s) => (
                <button key={s.id} type="button" onClick={() => setOpenSession(s)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-100 py-3.5 text-left first:border-t-0">
                  <span className="w-36 shrink-0 text-[0.9rem] font-bold text-gray-900">
                    {fmtDay(s.starts_at)} · {fmtTime(s.starts_at)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[0.84rem] text-gray-500">{s.notes ?? ""}</span>
                  <span className={`rounded-full px-3 py-1 text-[0.72rem] font-semibold ${sessionTone(s)}`}>{sessionTag(s)}</span>
                </button>
              ))
            )}
          </div>
        )}

        {tab === "chapters" && (
          <div className="app-card p-6">
            <SyllabusProgressSection classId={cls.id} />
          </div>
        )}

        {tab === "grades" && (
          <div className="app-card p-6">
            {assessments.length === 0 ? (
              <p className="text-[0.88rem] text-gray-400">{m.assessmentsEmpty}</p>
            ) : (
              <div className="space-y-2.5">
                {assessments.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-gray-50 px-4 py-3">
                    <div>
                      <p className="text-[0.92rem] font-bold text-gray-900">{a.title}</p>
                      <p className="text-[0.78rem] text-gray-500">
                        {[a.assessment_type, `/${a.max_score}`, a.assessment_date ? new Date(a.assessment_date).toLocaleDateString(dateLocale, { day: "numeric", month: "short" }) : null].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {canEdit && (
              <Link to={`${base}/notes`} className="mt-4 inline-block rounded-xl bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.82rem] font-semibold text-paper">
                {m.openGrades}
              </Link>
            )}
          </div>
        )}

        {tab === "docs" && (
          <div className="app-card p-6">
            <MaterialsSection classId={cls.id} organizationId={cls.organization_id} canEdit={canEdit} />
          </div>
        )}
      </div>

      {isAdmin && (
        <Link to={`${base}/gestion/classes`} className="mt-6 inline-block text-[0.82rem] font-medium text-accent-dark hover:underline">
          {m.manageEnrollment} →
        </Link>
      )}

      {openSession && <SessionDetailPanel sessionId={openSession.id} className={label} canEdit={canEdit} canManage={isAdmin} onClose={() => setOpenSession(null)} onChanged={() => setRev((x) => x + 1)} />}
    </div>
  );
}
