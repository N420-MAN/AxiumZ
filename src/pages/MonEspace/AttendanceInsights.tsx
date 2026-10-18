import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useLocale } from "../../i18n/LocaleContext";
import { CLASS_LABEL_SELECT, classLabel } from "../../lib/programs";

interface Row {
  status: string;
  student_id: string;
  students: { first_name: string; last_name: string } | null;
  class_sessions: { starts_at: string; class_id: string; status: string } | null;
}

interface Watch {
  key: string;
  student: string;
  className: string;
  streak: number;
  rate: number;
  total: number;
}

const DAYS = 90;
const STREAK_ALERT = 3;
const RATE_ALERT = 75;

// Attendance over the last 90 days: students worth a phone call, and the
// presence rate of each class. Only sessions that actually took place
// (not cancelled) and that have an attendance mark count.
export default function AttendanceInsights() {
  const { t } = useLocale();
  const m = t.monEspace.statistics;
  const [watch, setWatch] = useState<Watch[]>([]);
  const [classRates, setClassRates] = useState<{ name: string; rate: number; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const since = new Date(Date.now() - DAYS * 86400000).toISOString();
      const { data: classRows } = await supabase.from("classes").select(`id, ${CLASS_LABEL_SELECT}`);
      const names: Record<string, string> = {};
      for (const cl of (classRows as unknown as (Parameters<typeof classLabel>[0] & { id: string })[]) ?? []) {
        names[cl.id] = classLabel(cl);
      }

      const rows: Row[] = [];
      for (let from = 0; ; from += 1000) {
        const { data } = await supabase
          .from("attendance")
          .select("status, student_id, students(first_name, last_name), class_sessions!inner(starts_at, class_id, status)")
          .gte("class_sessions.starts_at", since)
          .range(from, from + 999);
        const page = (data as unknown as Row[]) ?? [];
        rows.push(...page);
        if (page.length < 1000) break;
      }

      const valid = rows.filter((r) => r.class_sessions && r.class_sessions.status !== "cancelled" && r.status !== "excused" && names[r.class_sessions.class_id]);

      const byClass: Record<string, { present: number; total: number }> = {};
      const byPair: Record<string, Row[]> = {};
      for (const r of valid) {
        const cid = r.class_sessions!.class_id;
        byClass[cid] ??= { present: 0, total: 0 };
        byClass[cid].total += 1;
        if (r.status === "present" || r.status === "late") byClass[cid].present += 1;
        const key = `${r.student_id}|${cid}`;
        (byPair[key] ??= []).push(r);
      }

      const alerts: Watch[] = [];
      for (const [key, list] of Object.entries(byPair)) {
        list.sort((a, b) => b.class_sessions!.starts_at.localeCompare(a.class_sessions!.starts_at)); // newest first
        let streak = 0;
        for (const r of list) {
          if (r.status === "absent") streak += 1;
          else break;
        }
        const present = list.filter((r) => r.status === "present" || r.status === "late").length;
        const rate = Math.round((present / list.length) * 100);
        if (streak >= STREAK_ALERT || (list.length >= 4 && rate < RATE_ALERT)) {
          const first = list[0];
          alerts.push({
            key,
            student: first.students ? `${first.students.first_name} ${first.students.last_name}` : "—",
            className: names[first.class_sessions!.class_id],
            streak,
            rate,
            total: list.length,
          });
        }
      }
      alerts.sort((a, b) => b.streak - a.streak || a.rate - b.rate);
      setWatch(alerts);
      setClassRates(
        Object.entries(byClass)
          .map(([id, v]) => ({ name: names[id], rate: Math.round((v.present / v.total) * 100), total: v.total }))
          .sort((a, b) => a.rate - b.rate),
      );
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return null;

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-[0.9rem] font-semibold text-gray-900">{m.watchTitle}</h2>
        <p className="mt-1 text-[0.78rem] text-gray-500">{m.watchHelp}</p>
        {watch.length === 0 ? (
          <p className="mt-3 text-[0.85rem] text-gray-400">{m.watchEmpty}</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100" data-testid="watch-list">
            {watch.map((w) => (
              <li key={w.key} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <p className="text-[0.88rem] font-semibold text-gray-900">{w.student}</p>
                  <p className="text-[0.78rem] text-gray-500">{w.className}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[0.75rem] font-semibold">
                  {w.streak >= STREAK_ALERT && (
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">{m.streakLabel.replace("{count}", String(w.streak))}</span>
                  )}
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">{m.rateLabel.replace("{rate}", String(w.rate))}</span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">{m.sessionsLabel.replace("{count}", String(w.total))}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-[0.9rem] font-semibold text-gray-900">{m.classRatesTitle}</h2>
        {classRates.length === 0 ? (
          <p className="mt-3 text-[0.85rem] text-gray-400">{m.noData}</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {classRates.map((c) => (
              <li key={c.name}>
                <div className="flex justify-between text-[0.82rem]">
                  <span className="font-medium text-gray-800">{c.name}</span>
                  <span className="text-gray-500">{c.rate} % · {m.sessionsLabel.replace("{count}", String(c.total))}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full rounded-full ${c.rate < RATE_ALERT ? "bg-red-400" : "bg-[#c8962f]"}`} style={{ width: `${c.rate}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
