import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../features/auth/AuthContext";
import { useLocale } from "../../i18n/LocaleContext";
import SessionDetailPanel from "./SessionDetailPanel";

interface SessionRow {
  id: string;
  starts_at: string;
  ends_at: string;
  room: string | null;
  classes: {
    id: string;
    name: string;
    teacher_id: string | null;
    teachers: { user_id: string | null; first_name: string; last_name: string; phone: string | null } | null;
  } | null;
}
interface TeacherOption {
  id: string;
  first_name: string;
  last_name: string;
}
interface ExamMarker {
  id: string;
  title: string;
  assessment_date: string;
  classes: { name: string } | null;
}

const START_HOUR = 8;
const END_HOUR = 21;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

// Same categorical-color idea as the mockup: color means "which class," not
// severity or sequence, so the same class keeps the same color everywhere.
const PALETTE = [
  "bg-amber-50 text-amber-800",
  "bg-blue-50 text-blue-800",
  "bg-green-50 text-green-800",
  "bg-purple-50 text-purple-800",
  "bg-rose-50 text-rose-800",
];
// A darker-toned parallel to PALETTE for the agenda list's small dot
// indicator. Kept as fully-written-out literal class names (not built via
// string manipulation on PALETTE at runtime) because Tailwind's build-time
// scanner only picks up classes it can find as literal text in the source
// — a dynamically-assembled class name can silently fail to compile in.
const DOT_PALETTE = ["bg-amber-400", "bg-blue-400", "bg-green-400", "bg-purple-400", "bg-rose-400"];

function startOfWeek(offsetWeeks: number) {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday + offsetWeeks * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function CalendarView() {
  const { isSuperAdmin, memberships } = useAuth();
  const { locale, t } = useLocale();
  const m = t.monEspace.calendar;
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";
  const primaryRole = isSuperAdmin ? "super_admin" : (memberships[0]?.role_name ?? null);
  const isAdmin = primaryRole === "super_admin" || primaryRole === "center_admin";
  const orgId = memberships[0]?.organization_id;

  const [weekOffset, setWeekOffset] = useState(0);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [exams, setExams] = useState<ExamMarker[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSession, setOpenSession] = useState<SessionRow | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");

  const weekStart = startOfWeek(weekOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  // The teacher filter only makes sense for admins overseeing the whole
  // center — a teacher or student never needs to filter by teacher, since
  // RLS already scopes what they see to their own classes.
  useEffect(() => {
    if (!isAdmin || !orgId) return;
    supabase
      .from("teachers")
      .select("id, first_name, last_name")
      .eq("organization_id", orgId)
      .order("last_name")
      .then(({ data }) => setTeachers(data ?? []));
  }, [isAdmin, orgId]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const rangeEnd = new Date(weekStart);
      rangeEnd.setDate(rangeEnd.getDate() + 7);
      const weekEndStr = rangeEnd.toISOString().slice(0, 10);
      const weekStartStr = weekStart.toISOString().slice(0, 10);

      const [{ data }, { data: examData }] = await Promise.all([
        supabase
          .from("class_sessions")
          .select("id, starts_at, ends_at, room, classes(id, name, teacher_id, teachers(user_id, first_name, last_name, phone))")
          .gte("starts_at", weekStart.toISOString())
          .lt("starts_at", rangeEnd.toISOString())
          .order("starts_at"),
        supabase
          .from("assessments")
          .select("id, title, assessment_date, classes(name)")
          .gte("assessment_date", weekStartStr)
          .lt("assessment_date", weekEndStr)
          .not("assessment_date", "is", null),
      ]);
      setSessions((data as unknown as SessionRow[]) ?? []);
      setExams((examData as unknown as ExamMarker[]) ?? []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  const examsByDay = useMemo(() => {
    const map: Record<number, ExamMarker[]> = {};
    for (const exam of exams) {
      const dayIdx = (new Date(`${exam.assessment_date}T12:00:00`).getDay() + 6) % 7;
      
      if (!map[dayIdx]) map[dayIdx] = [];
      map[dayIdx].push(exam);
    }
    return map;
  }, [exams]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (teacherFilter && s.classes?.teacher_id !== teacherFilter) return false;
      if (roomFilter && s.room !== roomFilter) return false;
      return true;
    });
  }, [sessions, teacherFilter, roomFilter]);

  const availableRooms = useMemo(() => {
    const rooms = new Set<string>();
    for (const s of sessions) if (s.room) rooms.add(s.room);
    return Array.from(rooms).sort();
  }, [sessions]);

  // Shared index computation so the grid block and the agenda dot for the
  // same class always agree on which color they're using.
  const classColorIndex = (classId: string | undefined) => {
    if (!classId) return 0;
    let hash = 0;
    for (const c of classId) hash = (hash * 31 + c.charCodeAt(0)) % PALETTE.length;
    return hash;
  };
  const classColor = (classId: string | undefined) => PALETTE[classColorIndex(classId)];
  const classDotColor = (classId: string | undefined) => DOT_PALETTE[classColorIndex(classId)];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[1.5rem] font-bold text-gray-900">{m.title}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w - 1)}
            className="rounded-md border border-gray-200 px-2.5 py-1 text-[0.8rem] text-gray-600 hover:bg-gray-50"
          >
            {m.previous}
          </button>
          <span className="px-1 text-[0.82rem] text-gray-500">
            {weekStart.toLocaleDateString(dateLocale, { day: "numeric", month: "short" })} –{" "}
            {weekEnd.toLocaleDateString(dateLocale, { day: "numeric", month: "short" })}
          </span>
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w + 1)}
            className="rounded-md border border-gray-200 px-2.5 py-1 text-[0.8rem] text-gray-600 hover:bg-gray-50"
          >
            {m.next}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isAdmin && (
            <select
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[0.8rem] text-gray-700"
            >
              <option value="">Tous les enseignants</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name}
                </option>
              ))}
            </select>
          )}
          {availableRooms.length > 1 && (
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[0.8rem] text-gray-700"
            >
              <option value="">Toutes les salles</option>
              {availableRooms.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center rounded-md border border-gray-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`rounded px-2.5 py-1 text-[0.78rem] font-medium ${viewMode === "grid" ? "bg-gradient-to-br from-ink to-ink-soft text-paper" : "text-gray-600"}`}
          >
            Grille
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`rounded px-2.5 py-1 text-[0.78rem] font-medium ${viewMode === "list" ? "bg-gradient-to-br from-ink to-ink-soft text-paper" : "text-gray-600"}`}
          >
            Liste
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 h-96" />
      ) : viewMode === "grid" ? (
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <div className="grid min-w-[840px] grid-cols-[52px_repeat(7,1fr)]">
            <div className="border-b border-gray-100" />
            {m.dayLabels.map((label, i) => {
              const isToday = new Date().toDateString() === new Date(weekStart.getTime() + i * 86400000).toDateString();
              return (
                <div
                  key={label}
                  className={`border-b border-l border-gray-100 py-2 text-center text-[0.78rem] font-medium ${
                    isToday ? "bg-accent-soft/40 text-ink" : "text-gray-500"
                  }`}
                >
                  {label}
                  {examsByDay[i]?.map((exam) => (
                    <div key={exam.id} className="mx-1 mt-1 truncate rounded bg-red-50 px-1 py-0.5 text-[0.68rem] font-medium text-red-700" title={exam.title}>
                      📝 {exam.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <div className="relative grid min-w-[840px] grid-cols-[52px_repeat(7,1fr)]" style={{ gridAutoRows: "44px" }}>
            {HOURS.map((h, i) => (
              <div key={h} className="border-t border-gray-100 px-1.5 py-0.5 text-[0.7rem] text-gray-400" style={{ gridColumn: 1, gridRow: i + 1 }}>
                {h}h
              </div>
            ))}
            {Array.from({ length: 7 }, (_, dayIdx) => (
              <div
                key={dayIdx}
                style={{ gridColumn: dayIdx + 2, gridRow: `1 / ${HOURS.length + 1}` }}
                className="border-t border-l border-gray-100"
              />
            ))}

            {filteredSessions.map((s) => {
              const start = new Date(s.starts_at);
              const end = new Date(s.ends_at);
              const dayIdx = (start.getDay() + 6) % 7; // Monday = 0
              
              const startRow = start.getHours() - START_HOUR + start.getMinutes() / 60 + 1;
              const endRow = end.getHours() - START_HOUR + end.getMinutes() / 60 + 1;
              if (startRow < 1 || startRow > HOURS.length + 1) return null;

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setOpenSession(s)}
                  style={{ gridColumn: dayIdx + 2, gridRow: `${startRow} / ${endRow}` }}
                  className={`m-0.5 overflow-hidden rounded-md p-1.5 text-left text-[0.72rem] leading-tight transition-opacity hover:opacity-80 ${classColor(s.classes?.id)}`}
                >
                  <p className="font-medium">{s.classes?.name}</p>
                  <p className="opacity-80">
                    {start.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })}
                    {s.room ? ` · ${s.room}` : ""}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {m.dayLabels.map((label, dayIdx) => {
            const dayDate = new Date(weekStart.getTime() + dayIdx * 86400000);
            const daySessions = filteredSessions
              .filter((s) => (new Date(s.starts_at).getDay() + 6) % 7 === dayIdx)
              .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
            const dayExams = examsByDay[dayIdx] ?? [];
            if (daySessions.length === 0 && dayExams.length === 0) return null;
            return (
              <div key={label}>
                <h3 className="text-[0.82rem] font-semibold text-gray-900">
                  {label} <span className="font-normal text-gray-400">{dayDate.toLocaleDateString(dateLocale, { day: "numeric", month: "short" })}</span>
                </h3>
                <div className="mt-1.5 space-y-1.5">
                  {dayExams.map((exam) => (
                    <div key={exam.id} className="flex items-center gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[0.83rem] text-red-800">
                      <span>📝</span>
                      <span className="font-medium">{exam.title}</span>
                      <span className="text-red-600">— {exam.classes?.name}</span>
                    </div>
                  ))}
                  {daySessions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setOpenSession(s)}
                      className="flex w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-left hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${classDotColor(s.classes?.id)}`} />
                        <span className="text-[0.85rem] font-medium text-gray-900">{s.classes?.name}</span>
                        {s.classes?.teachers && (
                          <span className="flex items-center gap-1.5 text-[0.78rem] text-gray-500">
                            {s.classes.teachers.first_name} {s.classes.teachers.last_name}
                            {s.classes.teachers.phone && (
                              <a href={`tel:${s.classes.teachers.phone}`} onClick={(e) => e.stopPropagation()} className="text-gray-400 hover:text-gray-700 hover:underline">
                                {s.classes.teachers.phone}
                              </a>
                            )}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[0.78rem] text-gray-500">
                        <span>
                          {new Date(s.starts_at).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })}–
                          {new Date(s.ends_at).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {s.room && <span>{s.room}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {filteredSessions.length === 0 && exams.length === 0 && <p className="text-[0.85rem] text-gray-400">Aucune séance cette semaine.</p>}
        </div>
      )}

      {openSession && (
        <SessionDetailPanel
          sessionId={openSession.id}
          className={openSession.classes?.name ?? ""}
          canEdit={isSuperAdmin || primaryRole === "center_admin" || openSession.classes?.teachers?.user_id === currentUserId}
          onClose={() => setOpenSession(null)}
        />
      )}
    </div>
  );
}
