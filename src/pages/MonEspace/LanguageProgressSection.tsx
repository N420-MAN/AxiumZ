import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "../../lib/supabaseClient";
import { useLocale } from "../../i18n/LocaleContext";

interface TimelinePoint {
  date: string;
  label: string;
  total: number;
  writing: number;
  speaking: number;
  listening: number;
  reading: number;
  isPlacement: boolean;
}
interface LanguageClassInfo {
  classId: string;
  className: string;
}

export default function LanguageProgressSection({ studentId, languageClasses }: { studentId: string; languageClasses: LanguageClassInfo[] }) {
  const { t, locale } = useLocale();
  const ls = t.monEspace.languageScoring;
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";
  const [timelines, setTimelines] = useState<Record<string, TimelinePoint[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const result: Record<string, TimelinePoint[]> = {};

      for (const cls of languageClasses) {
        const [{ data: placement }, { data: examGrades }] = await Promise.all([
          supabase
            .from("placement_tests")
            .select("tested_at, score_writing, score_speaking, score_listening, score_reading, score_total")
            .eq("student_id", studentId)
            .eq("class_id", cls.classId)
            .maybeSingle(),
          supabase
            .from("grades")
            .select("score, score_writing, score_speaking, score_listening, score_reading, assessments!inner(title, assessment_date, class_id)")
            .eq("student_id", studentId)
            .eq("assessments.class_id", cls.classId)
            .not("score_writing", "is", null),
        ]);

        const points: TimelinePoint[] = [];
        if (placement) {
          points.push({
            date: placement.tested_at,
            label: "", // resolved fresh at render time via isPlacement, so a language switch can't leave this stale
            total: placement.score_total,
            writing: placement.score_writing,
            speaking: placement.score_speaking,
            listening: placement.score_listening,
            reading: placement.score_reading,
            isPlacement: true,
          });
        }
        for (const g of (examGrades as unknown as { score: number; score_writing: number; score_speaking: number; score_listening: number; score_reading: number; assessments: { title: string; assessment_date: string | null } }[]) ?? []) {
          points.push({
            date: g.assessments.assessment_date ?? "",
            label: g.assessments.title,
            total: g.score,
            writing: g.score_writing,
            speaking: g.score_speaking,
            listening: g.score_listening,
            reading: g.score_reading,
            isPlacement: false,
          });
        }
        points.sort((a, b) => (a.date < b.date ? -1 : 1));
        result[cls.classId] = points;
      }

      setTimelines(result);
      setLoading(false);
    }
    load();
  }, [studentId, languageClasses]);

  if (languageClasses.length === 0) return null;

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-[0.85rem] font-semibold text-gray-900">{ls.progressHeading}</h2>

      {loading ? (
        <p className="mt-2 text-[0.85rem] text-gray-400">{t.monEspace.gestion.common.loading}</p>
      ) : (
        languageClasses.map((cls) => {
          const points = timelines[cls.classId] ?? [];
          if (points.length === 0) {
            return (
              <div key={cls.classId} className="mt-3 first:mt-2">
                <p className="text-[0.8rem] font-medium text-gray-700">{cls.className}</p>
                <p className="mt-1 text-[0.8rem] text-gray-400">{ls.progressEmpty}</p>
              </div>
            );
          }
          const chartData = points.map((p) => ({
            ...p,
            dateLabel: p.date ? new Date(p.date).toLocaleDateString(dateLocale, { day: "numeric", month: "short" }) : "—",
          }));
          return (
            <div key={cls.classId} className="mt-4 first:mt-2">
              <p className="text-[0.8rem] font-medium text-gray-700">{cls.className}</p>

              <div className="mt-2" style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: "var(--chart-tick)" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--chart-tick)" }} />
                    <Tooltip
                      formatter={(value) => [`${value}/100`, ls.totalLabel]}
                      labelFormatter={(_label, payload) => {
                        const point = payload?.[0]?.payload;
                        return point ? (point.isPlacement ? ls.placementPoint : point.label) : "";
                      }}
                    />
                    <Line type="monotone" dataKey="total" stroke="#c8962f" strokeWidth={2.5} dot={{ r: 4, fill: "#c8962f" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-2 space-y-1.5">
                {points.map((p, i) => (
                  <div key={i} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-md bg-gray-50 px-3 py-1.5 text-[0.78rem]">
                    <span className={`font-medium ${p.isPlacement ? "text-amber-700" : "text-gray-700"}`}>
                      {p.isPlacement ? ls.placementPoint : p.label}
                    </span>
                    <span className="text-gray-500">
                      {ls.writing} {p.writing} · {ls.speaking} {p.speaking} · {ls.listening} {p.listening} · {ls.reading} {p.reading}
                      <span className="ml-1.5 font-semibold text-gray-800">= {p.total}/100</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
