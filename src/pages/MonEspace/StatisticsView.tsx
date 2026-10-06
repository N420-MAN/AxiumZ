import { useEffect, useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "../../lib/supabaseClient";
import { useLocale } from "../../i18n/LocaleContext";
import { CLASS_LABEL_SELECT, classLabel } from "../../lib/programs";

interface GradeRow {
  score: number;
  graded_at: string;
  assessments: { max_score: number; class_id: string } | null;
}
interface AttendanceRow {
  status: string;
  class_sessions: { starts_at: string; class_id: string } | null;
}
interface AverageRow {
  class_id: string;
  average_out_of_20: number;
}

const MONTHS_BACK = 6;

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function StatisticsView() {
  const { t, locale } = useLocale();
  const m = t.monEspace.statistics;
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";

  const [gradeTrend, setGradeTrend] = useState<{ month: string; average: number }[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<{ month: string; rate: number }[]>([]);
  const [classComparison, setClassComparison] = useState<{ name: string; average: number }[]>([]);
  const [satisfaction, setSatisfaction] = useState<{ name: string; average: number; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Teachers only get their own classes back; admins get them all.
      const { data: classRows } = await supabase.from("classes").select(`id, ${CLASS_LABEL_SELECT}`);
      const classNameById: Record<string, string> = {};
      const classIdSet = new Set<string>();
      for (const cl of (classRows as unknown as (Parameters<typeof classLabel>[0] & { id: string })[]) ?? []) {
        classIdSet.add(cl.id);
        classNameById[cl.id] = classLabel(cl);
      }

      // The six-month window ends today.
      const windowEnd = new Date();
      const sinceDate = new Date(windowEnd);
      sinceDate.setMonth(sinceDate.getMonth() - MONTHS_BACK);
      const sinceISO = sinceDate.toISOString();

      const monthBuckets: { key: string; label: string }[] = [];
      for (let i = MONTHS_BACK - 1; i >= 0; i--) {
        const d = new Date(windowEnd);
        d.setMonth(d.getMonth() - i);
        monthBuckets.push({ key: monthKey(d), label: d.toLocaleDateString(dateLocale, { month: "short" }) });
      }

      const [{ data: grades }, { data: attendance }, { data: averages }] = await Promise.all([
        supabase.from("grades").select("score, graded_at, assessments(max_score, class_id)").gte("graded_at", sinceISO),
        supabase.from("attendance").select("status, class_sessions(starts_at, class_id)"),
        supabase.from("student_class_averages").select("class_id, average_out_of_20"),
      ]);

      const gradeBuckets: Record<string, { sum: number; count: number }> = {};
      for (const g of (grades as unknown as GradeRow[]) ?? []) {
        const maxScore = g.assessments?.max_score;
        if (!maxScore || !g.assessments || !classIdSet.has(g.assessments.class_id)) continue;
        const key = monthKey(new Date(g.graded_at));
        if (!gradeBuckets[key]) gradeBuckets[key] = { sum: 0, count: 0 };
        gradeBuckets[key].sum += (g.score / maxScore) * 20;
        gradeBuckets[key].count += 1;
      }
      setGradeTrend(
        monthBuckets.map((b) => ({
          month: b.label,
          average: gradeBuckets[b.key] ? Math.round((gradeBuckets[b.key].sum / gradeBuckets[b.key].count) * 10) / 10 : 0,
        })),
      );

      const attBuckets: Record<string, { present: number; total: number }> = {};
      for (const a of (attendance as unknown as AttendanceRow[]) ?? []) {
        const startsAt = a.class_sessions?.starts_at;
        if (!startsAt || !a.class_sessions || !classIdSet.has(a.class_sessions.class_id) || new Date(startsAt) < sinceDate) continue;
        const key = monthKey(new Date(startsAt));
        if (!attBuckets[key]) attBuckets[key] = { present: 0, total: 0 };
        attBuckets[key].total += 1;
        if (a.status === "present") attBuckets[key].present += 1;
      }
      setAttendanceTrend(
        monthBuckets.map((b) => ({
          month: b.label,
          rate: attBuckets[b.key] ? Math.round((attBuckets[b.key].present / attBuckets[b.key].total) * 1000) / 10 : 0,
        })),
      );

      const classBuckets: Record<string, { sum: number; count: number }> = {};
      for (const a of (averages as unknown as AverageRow[]) ?? []) {
        if (!classIdSet.has(a.class_id)) continue;
        if (!classBuckets[a.class_id]) classBuckets[a.class_id] = { sum: 0, count: 0 };
        classBuckets[a.class_id].sum += a.average_out_of_20;
        classBuckets[a.class_id].count += 1;
      }
      const classIds = Object.keys(classBuckets);
      if (classIds.length > 0) {
        const classNames = classNameById;
        setClassComparison(
          classIds
            .map((id) => ({ name: classNames[id] ?? "—", average: Math.round((classBuckets[id].sum / classBuckets[id].count) * 10) / 10 }))
            .sort((a, b) => b.average - a.average),
        );

        // One RPC call per class — the admin's class list is small (a
        // handful to a few dozen), so this is simpler and safer than a
        // bulk view that would need its own careful per-row admin check.
        const satResults = await Promise.all(
          classIds.map(async (id) => {
            const { data } = await supabase.rpc("get_class_satisfaction", { p_class_id: id });
            const row = data?.[0];
            return { name: classNames[id] ?? "—", average: row?.average_rating ? Number(row.average_rating) : null, count: row?.rating_count ?? 0 };
          }),
        );
        setSatisfaction(
          satResults
            .filter((r): r is { name: string; average: number; count: number } => r.average !== null)
            .sort((a, b) => b.average - a.average),
        );
      } else {
        setClassComparison([]);
        setSatisfaction([]);
      }

      setLoading(false);
    }
    load();
  }, [dateLocale]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
      <h1 className="font-display text-[1.5rem] font-bold text-gray-900">{m.title}</h1>
      <p className="mt-1 text-[0.85rem] text-gray-500">{m.description}</p>

      {loading ? (
        <div className="mt-8 h-64" />
      ) : (
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-[0.9rem] font-semibold text-gray-900">{m.gradeTrendTitle}</h2>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={gradeTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--chart-tick)" }} />
                  <YAxis domain={[0, 20]} tick={{ fontSize: 12, fill: "var(--chart-tick)" }} />
                  <Tooltip formatter={(value) => [`${value}/20`, m.gradeTrendTitle]} />
                  <Line type="monotone" dataKey="average" stroke="var(--chart-navy)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-[0.9rem] font-semibold text-gray-900">{m.attendanceTrendTitle}</h2>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--chart-tick)" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--chart-tick)" }} />
                  <Tooltip formatter={(value) => [`${value}%`, m.attendanceTrendTitle]} />
                  <Line type="monotone" dataKey="rate" stroke="#c8962f" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-[0.9rem] font-semibold text-gray-900">{m.classComparisonTitle}</h2>
            {classComparison.length === 0 ? (
              <p className="mt-3 text-[0.85rem] text-gray-400">{m.noData}</p>
            ) : (
              <div className="mt-3" style={{ height: Math.max(180, classComparison.length * 44) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classComparison} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
                    <XAxis type="number" domain={[0, 20]} tick={{ fontSize: 12, fill: "var(--chart-tick)" }} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12, fill: "#33312b" }} />
                    <Tooltip formatter={(value) => [`${value}/20`, m.classComparisonTitle]} />
                    <Bar dataKey="average" fill="var(--chart-navy)" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-[0.9rem] font-semibold text-gray-900">{t.monEspace.satisfaction.chartTitle}</h2>
            {satisfaction.length === 0 ? (
              <p className="mt-3 text-[0.85rem] text-gray-400">{t.monEspace.satisfaction.noData}</p>
            ) : (
              <div className="mt-3" style={{ height: Math.max(180, satisfaction.length * 44) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={satisfaction} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
                    <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 12, fill: "var(--chart-tick)" }} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12, fill: "#33312b" }} />
                    <Tooltip
                      formatter={(value, _name, props) => [
                        `${value}/5 (${t.monEspace.satisfaction.ratingsCount.replace("{count}", String(props.payload.count))})`,
                        t.monEspace.satisfaction.chartTitle,
                      ]}
                    />
                    <Bar dataKey="average" fill="#c8962f" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
