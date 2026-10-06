import { useState } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import {
  type LevelRow,
  type PersonKind,
  type ProgramRow,
  type StructureClass,
  audienceAllows,
  classLabel,
  isFull,
  seatText,
} from "../../lib/programs";

// What the admin picked for a person: a real class, or a wish for one that
// doesn't exist yet (or is full). Wishes form the waiting list.
export type PlacementChoice =
  | { type: "class"; classId: string }
  | { type: "wish"; programId: string; levelId: string; note: string };

/** A placement the person already has (when editing), shown as a chip. */
export interface ExistingPlacement {
  key: string;
  label: string;
  wish: boolean;
  removed: boolean;
}

interface ClassPickerProps {
  personKind: PersonKind;
  programs: ProgramRow[];
  levels: LevelRow[];
  classes: StructureClass[];
  selection: PlacementChoice[];
  onChange: (next: PlacementChoice[]) => void;
  /** Classes the person is already in: not offered again. */
  takenClassIds?: string[];
  existing?: ExistingPlacement[];
  onToggleExisting?: (key: string) => void;
  required?: boolean;
}

const selectClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.88rem] text-gray-900 outline-none focus:border-gray-400";

const WISH = "__wish__";

export default function ClassPicker({
  personKind,
  programs,
  levels,
  classes,
  selection,
  onChange,
  takenClassIds = [],
  existing = [],
  onToggleExisting,
  required = false,
}: ClassPickerProps) {
  const { t } = useLocale();
  const cp = t.monEspace.classPicker;

  const [programId, setProgramId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [option, setOption] = useState("");
  const [note, setNote] = useState("");

  const programById = new Map(programs.map((p) => [p.id, p]));
  const levelById = new Map(levels.map((l) => [l.id, l]));

  // Only programmes open to this kind of person, and that have niveaux to pick.
  const openPrograms = programs.filter((p) => p.is_active && audienceAllows(p.audience, personKind) && levels.some((l) => l.program_id === p.id));
  const programLevels = levels.filter((l) => l.program_id === programId).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  const selectedClassIds = new Set(selection.filter((s) => s.type === "class").map((s) => (s as { classId: string }).classId));
  const levelClasses = classes
    .filter((cl) => cl.level_id === levelId && !takenClassIds.includes(cl.id) && !selectedClassIds.has(cl.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const labelFor = (cl: StructureClass) =>
    classLabel({ name: cl.name, programs: programById.get(cl.program_id), levels: levelById.get(cl.level_id) });

  function handleAdd() {
    if (!option) return;
    if (option === WISH) {
      onChange([...selection, { type: "wish", programId, levelId, note: note.trim() }]);
    } else {
      onChange([...selection, { type: "class", classId: option }]);
    }
    setOption("");
    setNote("");
  }

  function chipLabel(choice: PlacementChoice): string {
    if (choice.type === "class") {
      const cl = classes.find((x) => x.id === choice.classId);
      return cl ? labelFor(cl) : "—";
    }
    const base = classLabel({ name: "", programs: programById.get(choice.programId), levels: levelById.get(choice.levelId) });
    return cp.wishChip.replace("{label}", choice.note ? `${base} · ${choice.note}` : base);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:col-span-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.82rem] font-semibold text-gray-700">{cp.heading}</p>
        {required && <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[0.7rem] font-medium text-red-700">{cp.required}</span>}
      </div>

      {(existing.length > 0 || selection.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {existing.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onToggleExisting?.(item.key)}
              title={item.removed ? cp.undoRemove : cp.remove}
              className={`rounded-full border px-2.5 py-0.5 text-[0.76rem] ${
                item.wish ? "border-dashed" : ""
              } ${item.removed ? "border-gray-200 bg-gray-100 text-gray-400 line-through" : "border-gray-300 bg-white text-gray-700"}`}
            >
              {item.label} <span aria-hidden="true">{item.removed ? "↺" : "×"}</span>
            </button>
          ))}
          {selection.map((choice, index) => (
            <button
              key={`new-${index}`}
              type="button"
              onClick={() => onChange(selection.filter((_, i) => i !== index))}
              title={cp.remove}
              className={`rounded-full border border-green-300 bg-green-50 px-2.5 py-0.5 text-[0.76rem] text-green-800 ${choice.type === "wish" ? "border-dashed" : ""}`}
            >
              {chipLabel(choice)} <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}

      {openPrograms.length === 0 ? (
        <p className="mt-2 text-[0.78rem] text-gray-500">{cp.noPrograms}</p>
      ) : (
        <>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              value={programId}
              onChange={(e) => {
                setProgramId(e.target.value);
                setLevelId("");
                setOption("");
              }}
              className={selectClass}
              aria-label={cp.programme}
            >
              <option value="">{cp.chooseProgramme}</option>
              {openPrograms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={levelId}
              disabled={!programId}
              onChange={(e) => {
                setLevelId(e.target.value);
                setOption("");
              }}
              className={`${selectClass} disabled:bg-gray-100 disabled:text-gray-400`}
              aria-label={cp.niveau}
            >
              <option value="">{cp.chooseNiveau}</option>
              {programLevels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {levelId && (
            <div className="mt-2 space-y-1">
              {levelClasses.map((cl) => {
                const full = isFull(cl);
                return (
                  <label
                    key={cl.id}
                    className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-[0.84rem] ${
                      full ? "border-gray-200 bg-gray-100 text-gray-400" : option === cl.id ? "border-ink bg-white" : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input type="radio" name="class-option" disabled={full} checked={option === cl.id} onChange={() => setOption(cl.id)} />
                      <span>
                        {cl.name}
                        {cl.teachers && <span className="ml-1.5 text-[0.74rem] text-gray-400">· {cl.teachers.first_name} {cl.teachers.last_name}</span>}
                      </span>
                    </span>
                    <span className={`shrink-0 text-[0.76rem] ${full ? "font-medium text-red-600" : "text-gray-500"}`}>
                      {full ? cp.full : `${seatText(cl)} ${cp.enrolledWord}`}
                    </span>
                  </label>
                );
              })}
              {levelClasses.length === 0 && <p className="text-[0.76rem] text-gray-500">{cp.noClasses}</p>}

              <label
                className={`block rounded-md border border-dashed px-3 py-2 text-[0.84rem] ${option === WISH ? "border-ink bg-white" : "border-gray-300 bg-white hover:border-gray-400"}`}
              >
                <span className="flex items-center gap-2">
                  <input type="radio" name="class-option" checked={option === WISH} onChange={() => setOption(WISH)} />
                  <span className="font-medium text-gray-700">{cp.wishOption}</span>
                </span>
                {option === WISH && (
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={cp.wishNote}
                    className="mt-2 w-full rounded-md border border-gray-200 px-3 py-1.5 text-[0.84rem] outline-none focus:border-gray-400"
                  />
                )}
              </label>
            </div>
          )}

          <button
            type="button"
            disabled={!option}
            onClick={handleAdd}
            className="mt-2 rounded-md border border-gray-300 bg-white px-3.5 py-1.5 text-[0.82rem] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            + {cp.add}
          </button>
          {!levelId && selection.length === 0 && existing.length === 0 && <p className="mt-2 text-[0.74rem] text-gray-500">{cp.hint}</p>}
        </>
      )}
    </div>
  );
}
