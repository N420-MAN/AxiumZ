import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useLocale } from "../../i18n/LocaleContext";

// Thresholds are intentionally simple constants for now, not a configurable
// setting — the goal of this first version is to surface real signal fast,
// not to build a tuning UI before anyone's had a chance to see if these
// defaults are even close to right.
const GRADE_THRESHOLD = 10; // out of 20
const ABSENCE_RATE_THRESHOLD = 25; // percent, over the last 60 days

interface AverageRow {
  student_id: string;
  class_id: string;
  average_out_of_20: number;
}
interface AttendanceRow {
  student_id: string;
  class_id: string;
  absence_rate_pct: number;
}
interface AtRiskEntry {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  lowGrade: number | null;
  highAbsenceRate: number | null;
}

export default function AtRiskPanel() {
  const { t } = useLocale();
  const m = t.monEspace.atRisk;
  const [entries, setEntries] = useState<AtRiskEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: averages }, { data: attendance }] = await Promise.all([
        supabase.from("student_class_averages").select("student_id, class_id, average_out_of_20").lt("average_out_of_20", GRADE_THRESHOLD),
        supabase.from("student_attendance_summary").select("student_id, class_id, absence_rate_pct").gt("absence_rate_pct", ABSENCE_RATE_THRESHOLD),
      ]);

      const avgRows = (averages as AverageRow[]) ?? [];
      const attRows = (attendance as AttendanceRow[]) ?? [];

      const merged = new Map<string, AtRiskEntry>();
      for (const a of avgRows) {
        const key = `${a.student_id}:${a.class_id}`;
        merged.set(key, { studentId: a.student_id, classId: a.class_id, studentName: "", className: "", lowGrade: a.average_out_of_20, highAbsenceRate: null });
      }
      for (const a of attRows) {
        const key = `${a.student_id}:${a.class_id}`;
        const existing = merged.get(key);
        if (existing) existing.highAbsenceRate = a.absence_rate_pct;
        else merged.set(key, { studentId: a.student_id, classId: a.class_id, studentName: "", className: "", lowGrade: null, highAbsenceRate: a.absence_rate_pct });
      }

      const list = Array.from(merged.values());
      if (list.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      const studentIds = Array.from(new Set(list.map((e) => e.studentId)));
      const classIds = Array.from(new Set(list.map((e) => e.classId)));
      const [{ data: students }, { data: classes }] = await Promise.all([
        supabase.from("students").select("id, first_name, last_name").in("id", studentIds),
        supabase.from("classes").select("id, name").in("id", classIds),
      ]);
      const studentNames: Record<string, string> = {};
      for (const s of students ?? []) studentNames[s.id] = `${s.first_name} ${s.last_name}`;
      const classNames: Record<string, string> = {};
      for (const c of classes ?? []) classNames[c.id] = c.name;

      for (const entry of list) {
        entry.studentName = studentNames[entry.studentId] ?? "—";
        entry.className = classNames[entry.classId] ?? "—";
      }
      list.sort((a, b) => a.studentName.localeCompare(b.studentName));

      setEntries(list);
      setLoading(false);
    }
    load();
  }, []);

  if (loading || entries.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-[0.95rem] font-semibold text-gray-900">{m.heading}</h2>
      <p className="mt-0.5 text-[0.78rem] text-gray-500">{m.description}</p>
      <div className="mt-3 space-y-2">
        {entries.map((e) => (
          <div key={`${e.studentId}:${e.classId}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-[0.88rem] font-medium text-gray-900">{e.studentName}</p>
              <p className="mt-0.5 truncate text-[0.78rem] text-gray-500">{e.className}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {e.lowGrade !== null && (
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-[0.75rem] font-medium text-red-700">
                  {e.lowGrade}/20
                </span>
              )}
              {e.highAbsenceRate !== null && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[0.75rem] font-medium text-amber-800">
                  {m.absenceRate.replace("{rate}", String(e.highAbsenceRate))}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
