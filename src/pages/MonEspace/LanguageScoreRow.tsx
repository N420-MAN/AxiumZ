import { useState } from "react";

interface SkillRecord {
  score_writing: number | null;
  score_speaking: number | null;
  score_listening: number | null;
  score_reading: number | null;
}

interface LanguageScoreRowProps {
  studentName: string;
  record?: SkillRecord;
  labels: { writing: string; speaking: string; listening: string; reading: string; total: string };
  onSave: (skills: { score_writing: number; score_speaking: number; score_listening: number; score_reading: number }) => void;
}

const FIELDS = ["writing", "speaking", "listening", "reading"] as const;

export default function LanguageScoreRow({ studentName, record, labels, onSave }: LanguageScoreRowProps) {
  const [values, setValues] = useState({
    writing: record?.score_writing?.toString() ?? "",
    speaking: record?.score_speaking?.toString() ?? "",
    listening: record?.score_listening?.toString() ?? "",
    reading: record?.score_reading?.toString() ?? "",
  });

  const total = FIELDS.reduce((sum, f) => sum + (Number(values[f]) || 0), 0);
  const allFilled = FIELDS.every((f) => values[f] !== "");

  function commit() {
    if (!allFilled) return;
    onSave({
      score_writing: Number(values.writing),
      score_speaking: Number(values.speaking),
      score_listening: Number(values.listening),
      score_reading: Number(values.reading),
    });
  }

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[0.85rem] font-medium text-gray-800">{studentName}</span>
        <span className="text-[0.82rem] font-semibold text-ink">
          {total}
          <span className="font-normal text-gray-400">/100</span>
        </span>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {FIELDS.map((f) => (
          <label key={f} className="block">
            <span className="block text-[0.68rem] text-gray-500">{labels[f]}</span>
            <input
              type="number"
              min="0"
              max="25"
              value={values[f]}
              onChange={(e) => setValues({ ...values, [f]: e.target.value })}
              onBlur={commit}
              className="mt-0.5 w-full rounded border border-gray-200 bg-white px-1.5 py-1 text-[0.8rem] outline-none focus:border-gray-400"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
