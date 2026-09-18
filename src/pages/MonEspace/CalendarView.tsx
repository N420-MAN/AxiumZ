import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../features/auth/AuthContext";
import { useLocale } from "../../i18n/LocaleContext";
import SessionDetailPanel from "./SessionDetailPanel";

interface SessionRow {
  id: string;
  starts_at: string;
  ends_at: string;
  room: string | null;
  classes: { id: string; name: string; teacher_id: string | null; teachers: { user_id: string | null } | null } | null;
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

  const [weekOffset, setWeekOffset] = useState(0);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSession, setOpenSession] = useState<SessionRow | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const weekStart = startOfWeek(weekOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const rangeEnd = new Date(weekStart);
      rangeEnd.setDate(rangeEnd.getDate() + 7);
      const { data } = await supabase
        .from("class_sessions")
        .select("id, starts_at, ends_at, room, classes(id, name, teacher_id, teachers(user_id))")
        .gte("starts_at", weekStart.toISOString())
        .lt("starts_at", rangeEnd.toISOString())
        .order("starts_at");
      setSessions((data as unknown as SessionRow[]) ?? []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  // Stable color per class id, not per array position, so a class doesn't
  // change color when other sessions load in a different order.
  const classColor = (classId: string | undefined) => {
    if (!classId) return PALETTE[0];
    let hash = 0;
    for (const c of classId) hash = (hash * 31 + c.charCodeAt(0)) % PALETTE.length;
    return PALETTE[hash];
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      <div className="flex items-center justify-between">
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

      {loading ? (
        <div className="mt-6 h-96" />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <div className="grid min-w-[720px] grid-cols-[52px_repeat(6,1fr)]">
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
                </div>
              );
            })}
          </div>
          <div className="relative grid min-w-[720px] grid-cols-[52px_repeat(6,1fr)]" style={{ gridAutoRows: "44px" }}>
            {HOURS.map((h, i) => (
              <div key={h} className="border-t border-gray-100 px-1.5 py-0.5 text-[0.7rem] text-gray-400" style={{ gridColumn: 1, gridRow: i + 1 }}>
                {h}h
              </div>
            ))}
            {Array.from({ length: 6 }, (_, dayIdx) => (
              <div
                key={dayIdx}
                style={{ gridColumn: dayIdx + 2, gridRow: `1 / ${HOURS.length + 1}` }}
                className="border-t border-l border-gray-100"
              />
            ))}

            {sessions.map((s) => {
              const start = new Date(s.starts_at);
              const end = new Date(s.ends_at);
              const dayIdx = (start.getDay() + 6) % 7; // Monday = 0
              if (dayIdx > 5) return null; // Sunday sessions won't fit this Mon–Sat grid
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
