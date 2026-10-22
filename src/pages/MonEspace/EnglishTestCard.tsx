import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useLocale } from "../../i18n/LocaleContext";

interface ResultRow {
  id: string;
  full_name: string;
  score: number;
  total: number;
  level: string;
  cefr: string;
  created_at: string;
  language?: string;
  test_type?: string;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);

/** English placement test result(s) linked to a student. Admins can link / unlink. */
export default function EnglishTestCard({ studentId, studentName, canLink }: { studentId: string; studentName: string; canLink: boolean }) {
  const { t, locale } = useLocale();
  const m = t.monEspace.englishTest;
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";
  const typeLabel = (r: ResultRow) => (r.test_type === "business" ? m.typeBusiness : m.typeGeneral);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [picking, setPicking] = useState(false);
  const [candidates, setCandidates] = useState<ResultRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("get_student_placement_results_v2", { p_student_id: studentId });
    setResults((data as ResultRow[]) ?? []);
    setLoaded(true);
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function openPicker() {
    setPicking(true);
    setError(false);
    const { data, error: e } = await supabase.rpc("list_unlinked_placement_results_v2");
    if (e) setError(true);
    const words = norm(studentName);
    const rows = ((data as ResultRow[]) ?? []).map((r) => ({ r, hit: norm(r.full_name).some((w) => words.includes(w)) }));
    rows.sort((a, b) => Number(b.hit) - Number(a.hit));
    setCandidates(rows.map((x) => ({ ...x.r, _hit: x.hit }) as ResultRow));
  }

  async function link(resultId: string | null, target: string | null) {
    setBusy(true);
    setError(false);
    const { error: e } = await supabase.rpc("link_placement_result", { p_result_id: resultId, p_student_id: target });
    setBusy(false);
    if (e) {
      setError(true);
      return;
    }
    setPicking(false);
    load();
  }

  if (!loaded) return null;
  if (!canLink && results.length === 0) return null;

  const fmt = (d: string) => new Date(d).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[0.85rem] font-semibold text-gray-900">{m.heading}</h2>
        {canLink && !picking && (
          <button type="button" onClick={openPicker} className="text-[0.78rem] font-medium text-accent-dark hover:underline">
            {m.link}
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <p className="mt-2 text-[0.85rem] text-gray-400">{m.empty}</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {results.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-gray-50 px-3 py-2 text-[0.82rem]">
              <span className="font-medium text-gray-800">
                <span className="mr-2 rounded-full bg-accent-soft px-2 py-0.5 text-[0.7rem] font-semibold text-ink">{typeLabel(r)}</span>
                {m.scoreLine.replace("{score}", String(r.score)).replace("{total}", String(r.total)).replace("{level}", r.level).replace("{cefr}", r.cefr)}
              </span>
              <span className="flex items-center gap-3 text-gray-500">
                {fmt(r.created_at)}
                {canLink && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => window.confirm(m.unlinkConfirm) && link(r.id, null)}
                    className="text-[0.74rem] text-red-600 hover:underline disabled:opacity-50"
                  >
                    {m.unlink}
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {picking && (
        <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-3">
          <p className="text-[0.8rem] font-medium text-gray-700">{m.linkTitle}</p>
          {candidates.length === 0 ? (
            <p className="mt-2 text-[0.8rem] text-gray-400">{m.linkEmpty}</p>
          ) : (
            <div className="mt-2 max-h-60 space-y-1.5 overflow-y-auto">
              {candidates.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-gray-50 px-3 py-1.5 text-[0.8rem]">
                  <span className="text-gray-800">
                    {c.full_name}
                    {(c as ResultRow & { _hit?: boolean })._hit && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[0.7rem] text-amber-700">{m.suggested}</span>}
                    <span className="ml-2 text-gray-500">
                      {typeLabel(c)} · {c.score}/{c.total} · {c.cefr} · {fmt(c.created_at)}
                    </span>
                  </span>
                  <button type="button" disabled={busy} onClick={() => link(c.id, studentId)} className="rounded-md bg-ink px-2.5 py-1 text-[0.74rem] font-medium text-paper disabled:opacity-50">
                    {m.choose}
                  </button>
                </div>
              ))}
            </div>
          )}
          {error && <p className="mt-2 text-[0.78rem] text-red-600">{m.error}</p>}
          <button type="button" onClick={() => setPicking(false)} className="mt-2 text-[0.78rem] text-gray-500 hover:underline">
            {m.cancel}
          </button>
        </div>
      )}
    </div>
  );
}
