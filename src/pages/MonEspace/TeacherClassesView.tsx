import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useLocale } from "../../i18n/LocaleContext";
import { classLabel } from "../../lib/programs";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  kind: string;
  grade_level: string | null;
  school_name: string | null;
}
interface ClassItem {
  id: string;
  name: string;
  capacity: number | null;
  room: string | null;
  rooms: { name: string } | null;
  programs: { name: string } | null;
  levels: { name: string } | null;
  class_students: { status: string; students: Student | null }[];
}
interface Averages {
  [key: string]: number;
}
interface Absence {
  [key: string]: { absences: number; total: number };
}

export default function TeacherClassesView() {
  const { t, locale } = useLocale();
  const m = t.monEspace.teacherClasses;
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [next, setNext] = useState<Record<string, string>>({});
  const [avg, setAvg] = useState<Averages>({});
  const [abs, setAbs] = useState<Absence>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      const { data: me } = await supabase.from("teachers").select("id").eq("user_id", uid).maybeSingle();
      if (!me) {
        setLoading(false);
        return;
      }
      const { data: rows } = await supabase
        .from("classes")
        .select("id, name, capacity, room, rooms(name), programs(name), levels(name), class_students(status, students(id, first_name, last_name, kind, grade_level, school_name))")
        .eq("teacher_id", me.id)
        .eq("status", "active")
        .order("name");
      const list = (rows as unknown as ClassItem[]) ?? [];
      setClasses(list);
      if (list.length > 0) {
        const ids = list.map((c) => c.id);
        const [{ data: sess }, { data: avgRows }, { data: absRows }] = await Promise.all([
          supabase.from("class_sessions").select("class_id, starts_at").in("class_id", ids).gte("starts_at", new Date().toISOString()).neq("status", "cancelled").order("starts_at"),
          supabase.from("student_class_averages").select("student_id, class_id, average_out_of_20").in("class_id", ids),
          supabase.from("student_attendance_summary").select("student_id, class_id, absences, total_sessions").in("class_id", ids),
        ]);
        const n: Record<string, string> = {};
        for (const s of sess ?? []) if (!n[s.class_id]) n[s.class_id] = s.starts_at;
        setNext(n);
        const a: Averages = {};
        for (const r of avgRows ?? []) a[`${r.class_id}:${r.student_id}`] = Number(r.average_out_of_20);
        setAvg(a);
        const b: Absence = {};
        for (const r of absRows ?? []) b[`${r.class_id}:${r.student_id}`] = { absences: Number(r.absences), total: Number(r.total_sessions) };
        setAbs(b);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-10 sm:px-8" />;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale, { weekday: "short", day: "numeric", month: "short" }) +
    " · " +
    new Date(iso).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      <h1 className="text-[1.6rem] font-extrabold text-gray-900">{m.title}</h1>
      <p className="mt-1 text-[0.88rem] text-gray-500">{m.intro}</p>

      {classes.length === 0 ? (
        <p className="mt-8 text-[0.9rem] text-gray-400">{m.empty}</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {classes.map((c) => {
            const students = c.class_students.filter((x) => x.status === "active" && x.students).map((x) => x.students as Student);
            const avgs = students.map((s) => avg[`${c.id}:${s.id}`]).filter((v) => v !== undefined);
            const classAvg = avgs.length > 0 ? Math.round((avgs.reduce((x, y) => x + y, 0) / avgs.length) * 10) / 10 : null;
            const totalAbs = students.reduce((n, s) => n + (abs[`${c.id}:${s.id}`]?.absences ?? 0), 0);
            return (
              <Link key={c.id} to={`/${locale}/mon-espace/classe/${c.id}`} className="app-card block p-5 transition-transform hover:-translate-y-0.5">
                <span className="rounded-full bg-accent-soft px-3 py-1 text-[0.7rem] font-bold text-ink">{c.programs?.name}</span>
                <p className="mt-3 truncate text-[1.1rem] font-extrabold text-gray-900">{classLabel(c)}</p>
                <p className="mt-1 text-[0.8rem] text-gray-500">
                  {(students.length === 1 ? m.studentsOne : m.students).replace("{n}", String(students.length))}
                  {c.capacity ? ` / ${c.capacity}` : ""}
                  {(c.rooms?.name ?? c.room) ? ` · ${m.room} ${c.rooms?.name ?? c.room}` : ""}
                </p>
                <p className="mt-0.5 text-[0.8rem] text-gray-500">{next[c.id] ? m.nextSession.replace("{date}", fmt(next[c.id])) : m.noNextSession}</p>
                <div className="mt-4 flex gap-2">
                  <span className="rounded-xl bg-gray-50 px-3 py-1.5 text-[0.78rem] font-semibold text-gray-700">{classAvg !== null ? `${classAvg}/20` : "—"}</span>
                  <span className="rounded-xl bg-gray-50 px-3 py-1.5 text-[0.78rem] font-semibold text-gray-700">{totalAbs} abs.</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
