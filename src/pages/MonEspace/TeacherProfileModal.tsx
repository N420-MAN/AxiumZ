import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../features/auth/AuthContext";
import { useLocale } from "../../i18n/LocaleContext";
import TeacherAvatar from "./TeacherAvatar";

interface TeacherProfileModalProps {
  teacherId: string;
  name: string;
  avatarUrl?: string | null;
  bio?: string | null;
  phone?: string | null;
  onClose: () => void;
}

interface SessionDuration {
  starts_at: string;
  ends_at: string;
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default function TeacherProfileModal({ teacherId, name, avatarUrl, bio, phone, onClose }: TeacherProfileModalProps) {
  const { t } = useLocale();
  const m = t.monEspace.teacherProfile;
  const { isSuperAdmin, memberships } = useAuth();
  const isAdmin = isSuperAdmin || memberships.some((mem) => mem.role_name === "center_admin");

  const [period, setPeriod] = useState<"week" | "month">("week");
  const [hours, setHours] = useState<number | null>(null);
  const [classCount, setClassCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    async function loadAdminData() {
      setLoadingAdmin(true);
      const since = (period === "week" ? startOfWeek(new Date()) : startOfMonth(new Date())).toISOString();
      const now = new Date().toISOString();

      const [{ data: periodSessions }, { data: classRows }, { count: totalSessionCount }] = await Promise.all([
        supabase
          .from("class_sessions")
          .select("starts_at, ends_at, classes!inner(teacher_id)")
          .eq("classes.teacher_id", teacherId)
          .gte("starts_at", since)
          .lte("starts_at", now),
        supabase.from("classes").select("id").eq("teacher_id", teacherId),
        supabase
          .from("class_sessions")
          .select("id, classes!inner(teacher_id)", { count: "exact", head: true })
          .eq("classes.teacher_id", teacherId)
          .lte("starts_at", now),
      ]);

      const totalMs = ((periodSessions as unknown as SessionDuration[]) ?? []).reduce(
        (sum, s) => sum + (new Date(s.ends_at).getTime() - new Date(s.starts_at).getTime()),
        0,
      );
      setHours(Math.round((totalMs / (1000 * 60 * 60)) * 10) / 10);
      setClassCount(classRows?.length ?? 0);
      setSessionCount(totalSessionCount ?? 0);
      setLoadingAdmin(false);
    }
    loadAdminData();
  }, [isAdmin, teacherId, period]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/50 px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="relative h-24 bg-gradient-to-br from-ink via-ink-soft to-accent">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
          >
            ✕
          </button>
        </div>

        <div className="px-6 pb-6">
          <div className="-mt-12 flex justify-center">
            <TeacherAvatar avatarUrl={avatarUrl} name={name} size={96} className="border-4 border-white shadow-md" />
          </div>

          <h2 className="mt-3 text-center font-display text-[1.15rem] font-bold text-gray-900">{name}</h2>

          <p className="mt-3 text-center text-[0.88rem] leading-relaxed text-gray-600">{bio || m.noBio}</p>

          {phone && (
            <a
              href={`tel:${phone}`}
              className="mt-5 flex items-center justify-center gap-2 rounded-full bg-gradient-to-br from-ink to-ink-soft px-5 py-2.5 text-[0.88rem] font-medium text-paper"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                <path d="M3.5 3A1.5 1.5 0 0 0 2 4.5v.5c0 7.18 5.82 13 13 13h.5a1.5 1.5 0 0 0 1.5-1.5v-2.2a1.5 1.5 0 0 0-1.2-1.47l-2.7-.54a1.5 1.5 0 0 0-1.47.42l-.8.8a10.03 10.03 0 0 1-4.83-4.83l.8-.8a1.5 1.5 0 0 0 .42-1.47l-.54-2.7A1.5 1.5 0 0 0 5.7 3H3.5Z" />
              </svg>
              {phone}
            </a>
          )}

          {isAdmin && (
            <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-[0.8rem] font-semibold text-gray-700">{m.hoursHeading}</h3>
                <div className="flex overflow-hidden rounded-full border border-gray-200 text-[0.72rem]">
                  <button
                    type="button"
                    onClick={() => setPeriod("week")}
                    className={`px-2.5 py-1 ${period === "week" ? "bg-ink text-paper" : "bg-white text-gray-600"}`}
                  >
                    {m.hoursThisWeek}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriod("month")}
                    className={`px-2.5 py-1 ${period === "month" ? "bg-ink text-paper" : "bg-white text-gray-600"}`}
                  >
                    {m.hoursThisMonth}
                  </button>
                </div>
              </div>
              <p className="mt-1.5 text-[1.3rem] font-bold text-gray-900">
                {loadingAdmin ? "…" : m.hoursValue.replace("{hours}", String(hours ?? 0))}
              </p>

              <div className="mt-3 border-t border-gray-200 pt-3">
                <h3 className="text-[0.8rem] font-semibold text-gray-700">{m.historyHeading}</h3>
                <p className="mt-1 text-[0.8rem] text-gray-600">{m.classesTaught.replace("{count}", String(classCount))}</p>
                <p className="mt-0.5 text-[0.8rem] text-gray-600">{m.sessionsGiven.replace("{count}", String(sessionCount))}</p>
              </div>

              <p className="mt-3 text-[0.7rem] italic text-gray-400">{m.adminOnlyNote}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
