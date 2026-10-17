import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../features/auth/AuthContext";
import { useLocale } from "../../i18n/LocaleContext";
import AtRiskPanel from "./AtRiskPanel";
import SessionDetailPanel from "./SessionDetailPanel";

interface SessionRow {
  id: string;
  starts_at: string;
  ends_at: string;
  room: string | null;
  status: string;
  class_id: string;
  classes: { name: string; programs: { name: string } | null; levels: { name: string } | null } | null;
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
  const { profile, memberships, isSuperAdmin, isAssistant } = useAuth();
  const isAdminRole = isSuperAdmin || memberships.some((x) => x.role_name === "center_admin");
  const isAdmin = isAdminRole || isAssistant; // reception sees the whole centre
  const { locale, t } = useLocale();
  const m = t.monEspace.today;
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [weekCount, setWeekCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [rev, setRev] = useState(0);
  const [center, setCenter] = useState<{ teachers: number; classes: number; waiting: number; unlinked: number } | null>(null);

  useEffect(() => {
    async function load() {
      const todayStart = startOfDayISO(0);
      const todayEnd = startOfDayISO(1);
      const weekEnd = startOfDayISO(7);

      const [{ data: todaySessions }, { count: weekSessionCount }, { count: students }] = await Promise.all([
        supabase
          .from("class_sessions")
          .select("id, class_id, starts_at, ends_at, room, status, classes(name, programs(name), levels(name))")
          .gte("starts_at", todayStart)
          .lt("starts_at", todayEnd)
          .order("starts_at"),
        supabase.from("class_sessions").select("id", { count: "exact", head: true }).gte("starts_at", todayStart).lt("starts_at", weekEnd),
        supabase.from("class_students").select("student_id", { count: "exact", head: true }),
      ]);

      if (isAdmin) {
        const [te, cl, wi, un] = await Promise.all([
          supabase.from("teachers").select("id", { count: "exact", head: true }),
          supabase.from("classes").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("class_wishes").select("id", { count: "exact", head: true }).is("fulfilled_at", null),
          supabase.rpc("list_unlinked_placement_results"),
        ]);
        setCenter({ teachers: te.count ?? 0, classes: cl.count ?? 0, waiting: wi.count ?? 0, unlinked: Array.isArray(un.data) ? un.data.length : 0 });
      }
      setSessions((todaySessions as unknown as SessionRow[]) ?? []);
      setWeekCount(weekSessionCount ?? null);
      setStudentCount(students ?? null);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rev]);


  if (loading) return <div className="px-4 py-6 sm:px-8 sm:py-10" />;

  const nowMs = Date.now();
  const live = sessions.find((x) => x.status !== "cancelled" && new Date(x.starts_at).getTime() <= nowMs && new Date(x.ends_at).getTime() >= nowMs);
  const hero = live ?? sessions.find((x) => x.status !== "cancelled" && new Date(x.starts_at).getTime() > nowMs) ?? null;
  const tm = (iso: string) => new Date(iso).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
  const title = (x: SessionRow) => [x.classes?.levels?.name, x.classes?.name].filter(Boolean).join(" · ");
  const openSess = sessions.find((x) => x.id === openId) ?? null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      <h1 className="text-[1.7rem] font-extrabold text-gray-900">
        {m.greeting}
        {profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-1 text-[0.9rem] capitalize text-gray-500">
        {new Date().toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" })}
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl bg-gradient-to-br from-ink to-ink-soft p-7 text-paper shadow-lg">
          {hero ? (
            <>
              <p className="text-[0.72rem] font-bold uppercase tracking-widest text-accent-bright">{live ? m.inProgress : m.nextUp}</p>
              <p className="mt-3 text-[1.8rem] font-extrabold leading-tight">{title(hero)}</p>
              <p className="mt-1.5 text-[0.9rem] text-paper/75">
                {tm(hero.starts_at)} – {tm(hero.ends_at)}
                {hero.room ? ` · ${hero.room}` : ""} · {hero.classes?.programs?.name}
              </p>
              <button type="button" onClick={() => setOpenId(hero.id)} className="mt-5 rounded-xl bg-accent px-5 py-2.5 text-[0.88rem] font-bold text-ink hover:bg-accent-bright">
                {m.openSession}
              </button>
            </>
          ) : (
            <p className="py-6 text-[1.1rem] font-semibold">{sessions.length === 0 ? m.freeDay : m.noSessionsToday}</p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          {[
            [m.sessionsToday, sessions.length],
            [m.students, studentCount ?? "—"],
            [m.sessionsThisWeek, weekCount ?? "—"],
          ].map(([k, v]) => (
            <div key={String(k)} className="app-card px-5 py-4">
              <p className="text-[0.72rem] text-gray-500">{k}</p>
              <p className="text-[1.6rem] font-extrabold text-gray-900">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {isAdmin && center && (
        <div className="mt-5">
          <h2 className="mb-2 text-[1.05rem] font-bold text-gray-900">{m.centerHeading}</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              [m.statTeachers, center.teachers, "gestion/enseignants"],
              [m.statClasses, center.classes, "gestion/structure"],
              [m.statWaiting, center.waiting, "gestion/eleves"],
              [m.statUnlinked, center.unlinked, "gestion/eleves"],
            ].map(([k, v, to]) => (
              <Link key={String(k)} to={`/${locale}/mon-espace/${to}`} className="app-card px-5 py-4 transition-transform hover:-translate-y-0.5">
                <p className="text-[0.74rem] text-gray-500">{k}</p>
                <p className="text-[1.6rem] font-extrabold text-gray-900">{v}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="app-card mt-5 p-6">
        <h2 className="text-[1.05rem] font-bold text-gray-900">{m.todayHeading}</h2>
        {sessions.length === 0 ? (
          <p className="mt-3 text-[0.88rem] text-gray-400">{m.noSessionsToday}</p>
        ) : (
          <div className="mt-3">
            {sessions.map((s) => (
              <button key={s.id} type="button" onClick={() => setOpenId(s.id)} className="flex w-full items-center gap-4 border-t border-gray-100 py-3 text-left first:border-t-0">
                <span className="w-24 shrink-0 text-[0.88rem] font-bold text-gray-900">{tm(s.starts_at)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.92rem] font-semibold text-gray-900">{title(s)}</span>
                  <span className="block truncate text-[0.78rem] text-gray-500">
                    {s.classes?.programs?.name}
                    {s.room ? ` · ${s.room}` : ""}
                  </span>
                </span>
                <span className={`rounded-full px-3 py-1 text-[0.72rem] font-semibold ${STATUS_STYLE[s.status] ?? STATUS_STYLE.scheduled}`}>
                  {t.monEspace.sessionStatus[s.status as keyof typeof t.monEspace.sessionStatus] ?? s.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <AtRiskPanel />

      {openSess && <SessionDetailPanel sessionId={openSess.id} className={title(openSess)} canEdit={!isAssistant} canManage={isAdminRole} onClose={() => setOpenId(null)} onChanged={() => setRev((x) => x + 1)} />}
    </div>
  );
}
