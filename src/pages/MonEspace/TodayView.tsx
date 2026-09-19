import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../features/auth/AuthContext";
import { useLocale } from "../../i18n/LocaleContext";

interface SessionRow {
  id: string;
  starts_at: string;
  ends_at: string;
  room: string | null;
  status: string;
  classes: { name: string; courses: { name: string } | null } | null;
}

const STATUS_STYLE: Record<string, string> = {
  completed: "bg-green-50 text-green-700",
  in_progress: "bg-blue-50 text-blue-700",
  scheduled: "bg-gray-100 text-gray-500",
  cancelled: "bg-red-50 text-red-600",
};

function startOfDayISO(offsetDays = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}

export default function TodayView() {
  const { profile } = useAuth();
  const { locale, t } = useLocale();
  const m = t.monEspace.today;
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [weekCount, setWeekCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const todayStart = startOfDayISO(0);
      const todayEnd = startOfDayISO(1);
      const weekEnd = startOfDayISO(7);

      const [{ data: todaySessions }, { count: weekSessionCount }, { count: students }] = await Promise.all([
        supabase
          .from("class_sessions")
          .select("id, starts_at, ends_at, room, status, classes(name, courses(name))")
          .gte("starts_at", todayStart)
          .lt("starts_at", todayEnd)
          .order("starts_at"),
        supabase.from("class_sessions").select("id", { count: "exact", head: true }).gte("starts_at", todayStart).lt("starts_at", weekEnd),
        supabase.from("class_students").select("student_id", { count: "exact", head: true }),
      ]);

      setSessions((todaySessions as unknown as SessionRow[]) ?? []);
      setWeekCount(weekSessionCount ?? null);
      setStudentCount(students ?? null);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="px-4 py-6 sm:px-8 sm:py-10" />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
      <h1 className="font-display text-[1.5rem] font-bold text-gray-900">
        {m.greeting}
        {profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-1 text-[0.9rem] text-gray-500">
        {new Date().toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" })}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-gradient-to-br from-ink to-ink-soft p-4 text-paper">
          <p className="text-[0.78rem] uppercase tracking-wide text-mist">{m.sessionsToday}</p>
          <p className="mt-2 text-[1.9rem] font-bold">{sessions.length}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-accent to-accent-bright p-4 text-ink">
          <p className="text-[0.78rem] uppercase tracking-wide text-ink/70">{m.students}</p>
          <p className="mt-2 text-[1.9rem] font-bold">{studentCount ?? "—"}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-red to-red-bright p-4 text-paper">
          <p className="text-[0.78rem] uppercase tracking-wide text-paper/75">{m.sessionsThisWeek}</p>
          <p className="mt-2 text-[1.9rem] font-bold">{weekCount ?? "—"}</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-[0.95rem] font-semibold text-gray-900">{m.todayHeading}</h2>
        {sessions.length === 0 ? (
          <p className="mt-3 text-[0.88rem] text-gray-400">{m.noSessionsToday}</p>
        ) : (
          <div className="mt-3 space-y-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="text-[0.9rem] font-medium text-gray-900">
                    {new Date(s.starts_at).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })} —{" "}
                    {s.classes?.name}
                  </p>
                  <p className="mt-0.5 text-[0.8rem] text-gray-500">
                    {s.classes?.courses?.name}
                    {s.room ? ` · ${s.room}` : ""}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[0.75rem] font-medium ${STATUS_STYLE[s.status] ?? STATUS_STYLE.scheduled}`}>
                  {t.monEspace.sessionStatus[s.status as keyof typeof t.monEspace.sessionStatus] ?? s.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
