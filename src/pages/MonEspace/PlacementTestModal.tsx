import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { humanizeError } from "../../lib/humanizeError";
import { useLocale } from "../../i18n/LocaleContext";

interface PlacementTestModalProps {
  studentName: string;
  studentId: string;
  classId: string;
  onClose: () => void;
}

const SKILLS = [
  { key: "score_writing", labelKey: "writing" },
  { key: "score_speaking", labelKey: "speaking" },
  { key: "score_listening", labelKey: "listening" },
  { key: "score_reading", labelKey: "reading" },
] as const;

export default function PlacementTestModal({ studentName, studentId, classId, onClose }: PlacementTestModalProps) {
  const { t } = useLocale();
  const ls = t.monEspace.languageScoring;
  const [scores, setScores] = useState({ score_writing: "", score_speaking: "", score_listening: "", score_reading: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = SKILLS.reduce((sum, s) => sum + (Number(scores[s.key]) || 0), 0);
  const allFilled = SKILLS.every((s) => scores[s.key] !== "");

  async function handleSave() {
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from("placement_tests").insert({
      student_id: studentId,
      class_id: classId,
      score_writing: Number(scores.score_writing),
      score_speaking: Number(scores.score_speaking),
      score_listening: Number(scores.score_listening),
      score_reading: Number(scores.score_reading),
    });
    setSaving(false);
    if (insertError) {
      setError(humanizeError(insertError));
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/40 px-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="bg-gradient-to-br from-ink to-ink-soft px-5 py-4">
          <h2 className="text-[1rem] font-semibold text-paper">{ls.placementTitle}</h2>
          <p className="mt-0.5 text-[0.8rem] text-paper/75">{studentName}</p>
        </div>

        <div className="p-5">
          <p className="text-[0.82rem] text-gray-500">{ls.placementIntro}</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {SKILLS.map((s) => (
              <label key={s.key} className="block">
                <span className="text-[0.76rem] font-medium text-gray-600">{ls[s.labelKey]}</span>
                <div className="mt-1 flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="25"
                    value={scores[s.key]}
                    onChange={(e) => setScores({ ...scores, [s.key]: e.target.value })}
                    className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-[0.9rem] outline-none focus:border-gray-400"
                  />
                  <span className="shrink-0 text-[0.76rem] text-gray-400">/25</span>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
            <span className="text-[0.82rem] font-medium text-gray-600">{ls.totalLabel}</span>
            <span className="text-[1.15rem] font-bold text-ink">{total}<span className="text-[0.8rem] font-normal text-gray-400">/100</span></span>
          </div>

          {error && <p className="mt-3 text-[0.82rem] text-red-600">{error}</p>}

          <div className="mt-5 flex items-center justify-between gap-3">
            <button type="button" onClick={onClose} className="text-[0.82rem] text-gray-500 hover:text-gray-800 hover:underline">
              {ls.skipPlacement}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !allFilled}
              className="rounded-md bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.85rem] font-medium text-paper disabled:opacity-50"
            >
              {saving ? t.monEspace.gestion.common.saving : ls.savePlacement}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
