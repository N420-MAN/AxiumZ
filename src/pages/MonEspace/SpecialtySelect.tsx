import { useLocale } from "../../i18n/LocaleContext";
import type { SpecialtyRow } from "../../lib/programs";

const selectClass = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.88rem] text-gray-900 outline-none focus:border-gray-400";

/** The student's specialty, asked right after the niveau and only when that niveau has specialties. */
export default function SpecialtySelect({
  options,
  value,
  onChange,
}: {
  options: SpecialtyRow[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { t } = useLocale();
  const sp = t.monEspace.specialtyPicker;
  if (options.length === 0) return null;
  return (
    <div className="mt-2">
      <label className="text-[0.78rem] font-semibold text-gray-700" htmlFor="student-specialty">
        {sp.label} <span className="text-red-600">*</span>
      </label>
      <select id="student-specialty" value={value} onChange={(e) => onChange(e.target.value)} className={`${selectClass} mt-1 sm:max-w-sm`}>
        <option value="">{sp.choose}</option>
        {options.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {!value && <p className="mt-1 text-[0.74rem] text-gray-500">{sp.pickFirst}</p>}
    </div>
  );
}

/** A class fits a student when it has no specialty (common to all) or has the student's one. */
export function fitsSpecialty(classSpecialtyIds: string[], specialtyId: string): boolean {
  return classSpecialtyIds.length === 0 || !specialtyId || classSpecialtyIds.includes(specialtyId);
}
