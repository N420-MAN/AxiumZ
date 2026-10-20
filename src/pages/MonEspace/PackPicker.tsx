import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useLocale } from "../../i18n/LocaleContext";
import { type LevelRow, type PackRow, type PersonKind, type ProgramRow, type SpecialtyRow, type StructureClass, audienceAllows, enrolledCount, isFull, isLanguageProgram, seatText, priceText, slotText, slotsOverlap } from "../../lib/programs";
import type { PlacementChoice } from "./ClassPicker";
import SpecialtySelect, { fitsSpecialty } from "./SpecialtySelect";
import { money, toDiscount } from "../../lib/discount";

const selectClass = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.88rem] text-gray-900 outline-none focus:border-gray-400";
const WAIT = "__wait__";
const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

interface Props {
  initialProgramId?: string;
  initialLevelId?: string;
  personKind: PersonKind;
  programs: ProgramRow[];
  levels: LevelRow[];
  classes: StructureClass[];
  packs: PackRow[];
  specialties: SpecialtyRow[];
  specialtyId: string;
  onSpecialtyChange: (id: string) => void;
  /** Is the pack's offer (discounted price) applied for this person? */
  offerApplied: (packId: string) => boolean;
  onOfferChange: (packId: string, applied: boolean) => void;
  organizationId: string;
  /** Classes the person is already in (when editing). */
  takenClassIds: string[];
  selection: PlacementChoice[];
  onChange: (next: PlacementChoice[]) => void;
  packId: string;
  onPackChange: (id: string) => void;
}

/** Choose a pack, then one class per subject. Overlaps are checked here; full classes cannot be picked. */
export default function PackPicker({ initialProgramId, initialLevelId, personKind, programs, levels, classes, packs, specialties, specialtyId, onSpecialtyChange, offerApplied, onOfferChange, organizationId, takenClassIds, selection, onChange, packId, onPackChange }: Props) {
  const { t, locale } = useLocale();
  const pk = t.monEspace.packPicker;
  const [programId, setProgramId] = useState(initialProgramId ?? "");
  const [levelId, setLevelId] = useState(initialLevelId ?? "");
  const [pickId, setPickId] = useState(packId);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [rooms, setRooms] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    supabase.from("rooms").select("id, name").eq("organization_id", organizationId).then(({ data }) => setRooms(new Map(((data as { id: string; name: string }[]) ?? []).map((r) => [r.id, r.name]))));
  }, [organizationId]);

  const openPrograms = programs.filter((p) => p.is_active && !isLanguageProgram(p.kind) && audienceAllows(p.audience, personKind) && packs.some((x) => x.program_id === p.id));
  const programLevels = levels.filter((l) => l.program_id === programId && packs.some((x) => x.level_id === l.id)).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  const levelSpecs = specialties.filter((s) => s.level_id === levelId);
  const specialtyReady = levelSpecs.length === 0 || levelSpecs.some((s) => s.id === specialtyId);
  const levelPacks = specialtyReady ? packs.filter((x) => x.level_id === levelId) : [];
  const pack = packs.find((x) => x.id === pickId && x.level_id === levelId) ?? null;
  const classById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);

  const pickedIds = selection.flatMap((s) => (s.type === "class" ? [s.classId] : []));
  const heldIds = [...takenClassIds, ...pickedIds];

  const rows = pack
    ? pack.subjects.map(({ subject }) => {
        const held = heldIds.map((id) => classById.get(id)).find((c) => c && norm(c.subject) === norm(subject));
        const candidates = classes
          .filter(
            (c) =>
              c.level_id === pack.level_id &&
              norm(c.subject) === norm(subject) &&
              !heldIds.includes(c.id) &&
              fitsSpecialty(c.specialty_ids, levelSpecs.length > 0 ? specialtyId : ""),
          )
          .sort((a, b) => Number(isFull(a)) - Number(isFull(b)) || enrolledCount(b) - enrolledCount(a) || a.name.localeCompare(b.name));
        const recommendedId = candidates.length > 1 && !isFull(candidates[0]) ? candidates[0].id : null;
        return { subject, held, candidates, recommendedId };
      })
    : [];

  // Time clashes between the chosen classes, and with the classes the person already has.
  const chosenIds = rows.map((r) => choice[r.subject]).filter((v): v is string => Boolean(v) && v !== WAIT);
  const clashes: string[] = [];
  const label = (c: StructureClass) => `${c.subject ? c.subject + " – " : ""}${c.name}`;
  const clash = (a: StructureClass, b: StructureClass) => a.slots.some((x) => b.slots.some((y) => slotsOverlap(x, y)));
  chosenIds.forEach((id, i) => {
    const a = classById.get(id);
    if (!a) return;
    chosenIds.slice(i + 1).forEach((otherId) => {
      const b = classById.get(otherId);
      if (b && clash(a, b)) clashes.push(pk.clash.replace("{a}", label(a)).replace("{b}", label(b)));
    });
    heldIds.forEach((otherId) => {
      const b = classById.get(otherId);
      if (b && clash(a, b)) clashes.push(pk.clashExisting.replace("{a}", label(a)).replace("{b}", label(b)));
    });
  });
  const missing = rows.some((r) => !r.held && !choice[r.subject]);
  const nothingToAdd = rows.every((r) => r.held);

  function apply() {
    if (!pack || missing || clashes.length > 0) return;
    const added: PlacementChoice[] = rows.flatMap((r): PlacementChoice[] => {
      const v = choice[r.subject];
      if (!v) return [];
      if (v === WAIT) return [{ type: "wish", programId: pack.program_id, levelId: pack.level_id, note: pk.waitlistNote.replace("{subject}", r.subject) }];
      return [{ type: "class", classId: v }];
    });
    onChange([...selection, ...added]);
    onPackChange(pack.id);
    setChoice({});
  }

  if (openPrograms.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:col-span-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.82rem] font-semibold text-gray-700">{pk.heading}</p>
        {packId && (
          <span className="rounded-full border border-green-300 bg-green-50 px-2.5 py-0.5 text-[0.74rem] font-medium text-green-800">
            {pk.packChip.replace("{name}", packs.find((x) => x.id === packId)?.name ?? "—")}{" "}
            <button type="button" className="underline" onClick={() => { onPackChange(""); setPickId(""); }}>{pk.change}</button>
          </span>
        )}
      </div>
      <p className="mt-0.5 text-[0.76rem] text-gray-500">{pk.help}</p>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select value={programId} onChange={(e) => { setProgramId(e.target.value); setLevelId(""); setPickId(""); setChoice({}); onSpecialtyChange(""); }} className={selectClass} aria-label={t.monEspace.packs.programmeLabel}>
          <option value="">{t.monEspace.classPicker.chooseProgramme}</option>
          {openPrograms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={levelId} disabled={!programId} onChange={(e) => { setLevelId(e.target.value); setPickId(""); setChoice({}); if (!specialties.some((s) => s.level_id === e.target.value && s.id === specialtyId)) onSpecialtyChange(""); }} className={`${selectClass} disabled:bg-gray-100`} aria-label={t.monEspace.packs.niveauLabel}>
          <option value="">{t.monEspace.classPicker.chooseNiveau}</option>
          {programLevels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select value={pickId} disabled={!levelId || !specialtyReady} onChange={(e) => { setPickId(e.target.value); setChoice({}); }} className={`${selectClass} disabled:bg-gray-100`} aria-label={pk.heading}>
          <option value="">{levelId && levelPacks.length === 0 ? pk.noPack : pk.choosePack}</option>
          {levelPacks.map((x) => {
            const d = toDiscount(x.discount_name, x.discount_price, x.discount_active);
            return <option key={x.id} value={x.id}>{x.price_trimestre != null ? `${x.name} — ${priceText(x.price_trimestre, locale)}${d ? ` · ${d.name} : ${money(d.price, locale)}` : ""}` : x.name}</option>;
          })}
        </select>
      </div>

      {levelId && <SpecialtySelect options={levelSpecs} value={specialtyId} onChange={(id) => { onSpecialtyChange(id); setPickId(""); setChoice({}); }} />}

      {pack && pack.price_trimestre != null && (() => {
        const d = toDiscount(pack.discount_name, pack.discount_price, pack.discount_active);
        return (
          <div className="mt-2">
            <p className="text-[0.84rem] font-semibold text-ink">
              {d ? <><span className="mr-1.5 font-normal text-gray-400 line-through">{money(pack.price_trimestre, locale)}</span>{money(d.price, locale)} · {d.name}</> : priceText(pack.price_trimestre, locale)}
            </p>
            {d && (
              <label className="mt-1 flex items-center gap-1.5 text-[0.8rem] font-medium text-amber-800">
                <input type="checkbox" checked={offerApplied(pack.id)} onChange={(e) => onOfferChange(pack.id, e.target.checked)} />
                {t.monEspace.payPlan.applyDiscount.replace("{name}", d.name).replace("{price}", money(d.price, locale))}
              </label>
            )}
          </div>
        );
      })()}
      {pack && (
        <div className="mt-3 space-y-3">
          {rows.map((r) => (
            <div key={r.subject}>
              <p className="text-[0.8rem] font-semibold text-gray-800">{r.subject}</p>
              {r.held ? (
                <p className="text-[0.76rem] text-green-700">✓ {pk.already.replace("{subject}", r.subject)}</p>
              ) : (
                <div className="mt-1 space-y-1">
                  {r.candidates.length === 0 && <p className="text-[0.76rem] text-gray-500">{pk.noSubjectClasses}</p>}
                  {r.candidates.map((c) => {
                    const full = isFull(c);
                    const on = choice[r.subject] === c.id;
                    const slots = [...c.slots].sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time));
                    const roomIds = [...new Set(slots.map((s) => s.room_id ?? c.room_id).filter(Boolean))] as string[];
                    return (
                      <label key={c.id} className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-[0.84rem] ${full ? "border-gray-200 bg-gray-100 text-gray-400" : on ? "border-ink bg-white" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                        <span className="flex items-center gap-2">
                          <input type="radio" name={`pack-${r.subject}`} disabled={full} checked={on} onChange={() => setChoice({ ...choice, [r.subject]: c.id })} />
                          <span>
                            {c.name}
                            {c.teachers && <span className="ml-1.5 text-[0.74rem] text-gray-400">· {c.teachers.first_name} {c.teachers.last_name}</span>}
                            <span className="block text-[0.76rem] text-gray-500">
                              {slots.length > 0 ? slots.map((s) => slotText(s, locale)).join(" · ") : pk.noSlots}
                              {roomIds.length > 0 && ` · ${pk.room} ${roomIds.map((id) => rooms.get(id) ?? "").filter(Boolean).join(", ")}`}
                            </span>
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-[0.76rem]">
                          {r.recommendedId === c.id && <span className="mr-2 rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-ink">{pk.recommended}</span>}
                          <span className={full ? "font-medium text-red-600" : "text-gray-500"}>{full ? pk.full : `${seatText(c)}`}</span>
                        </span>
                      </label>
                    );
                  })}
                  <label className={`flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-[0.82rem] ${choice[r.subject] === WAIT ? "border-ink bg-white" : "border-gray-300 bg-white"}`}>
                    <input type="radio" name={`pack-${r.subject}`} checked={choice[r.subject] === WAIT} onChange={() => setChoice({ ...choice, [r.subject]: WAIT })} />
                    <span className="font-medium text-gray-700">{pk.waitlist}</span>
                  </label>
                </div>
              )}
            </div>
          ))}
          {clashes.map((c) => <p key={c} className="rounded-md bg-red-50 px-3 py-1.5 text-[0.78rem] text-red-700">{c}</p>)}
          {missing && !nothingToAdd && <p className="text-[0.76rem] text-gray-500">{pk.incomplete}</p>}
          <button type="button" disabled={missing || clashes.length > 0 || (nothingToAdd && packId === pack.id)} onClick={apply} className="rounded-md border border-gray-300 bg-white px-3.5 py-1.5 text-[0.82rem] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40">
            + {pk.apply}
          </button>
        </div>
      )}
    </div>
  );
}
