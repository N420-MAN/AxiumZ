import { useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { humanizeError } from "../../lib/humanizeError";
import { useLocale } from "../../i18n/LocaleContext";
import { useStructure } from "../../features/structure/useStructure";
import { isLanguageProgram, priceText } from "../../lib/programs";
import { useConfirmDialog } from "./useConfirmDialog";
import DiscountFields from "./DiscountFields";
import { discountBadge, parseDiscountFields, toDiscount } from "../../lib/discount";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.9rem] text-gray-900 outline-none focus:border-gray-400";
const linkClass = "text-[0.78rem] text-gray-600 hover:text-gray-900 hover:underline disabled:opacity-40";
const chip = (on: boolean) =>
  `rounded-full border px-3 py-1 text-[0.8rem] font-medium ${on ? "border-ink bg-ink text-white" : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"}`;

// A pack = programme + niveau (+ spécialités) + the subjects a student follows together.
export default function PacksManager({ organizationId }: { organizationId: string }) {
  const { t, locale } = useLocale();
  const pk = t.monEspace.packs;
  const c = t.monEspace.gestion.common;
  const { programs, levels, classes, specialties, packs, loading, reload } = useStructure(organizationId);
  const { confirm, dialog } = useConfirmDialog();

  const [programId, setProgramId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [specIds, setSpecIds] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectDraft, setSubjectDraft] = useState("");
  const [price, setPrice] = useState("");
  const [discName, setDiscName] = useState("");
  const [discPrice, setDiscPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schoolPrograms = programs.filter((p) => !isLanguageProgram(p.kind));
  const program = schoolPrograms.find((p) => p.id === programId) ?? schoolPrograms[0] ?? null;
  const programLevels = program ? levels.filter((l) => l.program_id === program.id).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)) : [];
  const level = programLevels.find((l) => l.id === levelId) ?? programLevels[0] ?? null;
  const levelSpecs = level ? specialties.filter((s) => s.level_id === level.id) : [];
  const items = level ? packs.filter((p) => p.level_id === level.id) : [];
  // Subjects already used by the classes of this niveau: offered as one-click suggestions.
  const suggestions = level
    ? [...new Set(classes.filter((cl) => cl.level_id === level.id && cl.subject).map((cl) => (cl.subject as string).trim()))].sort((a, b) => a.localeCompare(b))
    : [];
  const has = (s: string) => subjects.some((x) => x.toLowerCase() === s.toLowerCase());

  function reset() {
    setEditingId(null);
    setName("");
    setSpecIds([]);
    setSubjects([]);
    setSubjectDraft("");
    setPrice("");
    setDiscName("");
    setDiscPrice("");
  }

  function addSubject(s: string) {
    const v = s.trim();
    if (v && !has(v)) setSubjects([...subjects, v]);
    setSubjectDraft("");
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!program || !level) return;
    const all = subjectDraft.trim() && !has(subjectDraft.trim()) ? [...subjects, subjectDraft.trim()] : subjects;
    if (all.length === 0) {
      setError(pk.needSubject);
      return;
    }
    const disc = parseDiscountFields(discName, discPrice, price);
    if (!disc.ok) {
      setError(disc.error === "both" ? t.monEspace.discount.errBoth : t.monEspace.discount.errPrice);
      return;
    }
    const money = { price_trimestre: price.trim() ? Number(price) : null, discount_name: disc.name, discount_price: disc.price };
    setBusy(true);
    setError(null);
    let packId = editingId;
    let failure: unknown = null;
    if (editingId) {
      failure = (await supabase.from("packs").update({ name: name.trim(), ...money }).eq("id", editingId)).error;
    } else {
      const newId = crypto.randomUUID();
      failure = (await supabase.from("packs").insert({ id: newId, organization_id: organizationId, program_id: program.id, level_id: level.id, name: name.trim(), ...money })).error;
      packId = failure ? null : newId;
    }
    if (!failure && packId) {
      failure = (await supabase.from("pack_specialties").delete().eq("pack_id", packId)).error;
      if (!failure && specIds.length > 0) failure = (await supabase.from("pack_specialties").insert(specIds.map((specialty_id) => ({ pack_id: packId, specialty_id })))).error;
      if (!failure) failure = (await supabase.from("pack_subjects").delete().eq("pack_id", packId)).error;
      if (!failure) failure = (await supabase.from("pack_subjects").insert(all.map((subject, position) => ({ pack_id: packId, subject, position })))).error;
    }
    setBusy(false);
    if (failure) setError(humanizeError(failure));
    else reset();
    await reload();
  }

  if (loading) return <p className="text-[0.85rem] text-gray-400">{c.loading}</p>;
  if (schoolPrograms.length === 0) return <p className="text-[0.85rem] text-gray-500">{pk.noPrograms}</p>;

  return (
    <div>
      <h2 className="text-[1rem] font-semibold text-gray-900">{pk.title}</h2>
      <p className="mt-0.5 max-w-2xl text-[0.8rem] text-gray-500">{pk.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="text-[0.8rem] font-medium text-gray-600" htmlFor="pack-program">{pk.programmeLabel}</label>
        <select id="pack-program" value={program?.id ?? ""} onChange={(e) => { setProgramId(e.target.value); setLevelId(""); reset(); setError(null); }} className={`${inputClass} sm:max-w-xs`}>
          {schoolPrograms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <label className="text-[0.8rem] font-medium text-gray-600" htmlFor="pack-level">{pk.niveauLabel}</label>
        <select id="pack-level" value={level?.id ?? ""} onChange={(e) => { setLevelId(e.target.value); reset(); setError(null); }} disabled={programLevels.length === 0} className={`${inputClass} sm:max-w-xs`}>
          {programLevels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      {programLevels.length === 0 ? (
        <p className="mt-4 text-[0.85rem] text-gray-500">{pk.noLevels}</p>
      ) : (
        <>
          <form onSubmit={handleSave} className="app-card mt-4 max-w-2xl space-y-4 p-4">
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={pk.namePlaceholder} className={inputClass} />
            <div>
              <label className="text-[0.8rem] font-semibold text-gray-700" htmlFor="pack-price">{pk.priceLabel}</label>
              <input id="pack-price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={`${inputClass} mt-1 sm:max-w-xs`} />
            </div>
            <DiscountFields idPrefix="pack" name={discName} price={discPrice} listPrice={price} onChange={(n, p) => { setDiscName(n); setDiscPrice(p); }} />
            {levelSpecs.length > 0 && (
              <div>
                <p className="text-[0.8rem] font-semibold text-gray-700">{pk.specialtiesLabel}</p>
                <p className="text-[0.74rem] text-gray-500">{pk.specialtiesHelp}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {levelSpecs.map((s) => (
                    <button key={s.id} type="button" onClick={() => setSpecIds(specIds.includes(s.id) ? specIds.filter((x) => x !== s.id) : [...specIds, s.id])} className={chip(specIds.includes(s.id))}>{s.name}</button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-[0.8rem] font-semibold text-gray-700">{pk.subjectsLabel}</p>
              <p className="text-[0.74rem] text-gray-500">{pk.subjectsHelp}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => (has(s) ? setSubjects(subjects.filter((x) => x.toLowerCase() !== s.toLowerCase())) : addSubject(s))} className={chip(has(s))}>{s}</button>
                ))}
                {subjects.filter((s) => !suggestions.some((x) => x.toLowerCase() === s.toLowerCase())).map((s) => (
                  <button key={s} type="button" onClick={() => setSubjects(subjects.filter((x) => x !== s))} className={chip(true)}>{s} ×</button>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input value={subjectDraft} onChange={(e) => setSubjectDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubject(subjectDraft); } }} placeholder={pk.subjectPlaceholder} className={`${inputClass} flex-1`} />
                <button type="button" onClick={() => addSubject(subjectDraft)} className="rounded-md border border-gray-300 bg-white px-3 text-[0.82rem] font-medium text-gray-700">+ {pk.addSubject}</button>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={busy || !name.trim()} className="rounded-md bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.85rem] font-medium text-paper disabled:opacity-50">
                {editingId ? pk.save : `+ ${pk.create}`}
              </button>
              {editingId && <button type="button" onClick={reset} className={linkClass}>{pk.cancel}</button>}
            </div>
          </form>

          {error && <p className="mt-3 text-[0.82rem] text-red-600">{error}</p>}

          <div className="mt-4 max-w-2xl space-y-2">
            {items.length === 0 && <p className="text-[0.85rem] text-gray-400">{pk.empty}</p>}
            {items.map((p) => (
              <div key={p.id} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[0.92rem] font-semibold text-gray-900">{p.name}{p.price_trimestre != null && <span className="ml-2 rounded-full bg-accent-soft px-2.5 py-0.5 text-[0.72rem] font-semibold text-ink">{priceText(p.price_trimestre, locale)}</span>}{toDiscount(p.discount_name, p.discount_price) && <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-[0.72rem] font-semibold text-amber-800">{discountBadge(t.monEspace.discount.badge, toDiscount(p.discount_name, p.discount_price)!, locale)}</span>}</span>
                  <div className="flex items-center gap-3">
                    <button data-write type="button" className={linkClass} onClick={() => { setEditingId(p.id); setName(p.name); setPrice(p.price_trimestre?.toString() ?? ""); setDiscName(p.discount_name ?? ""); setDiscPrice(p.discount_price?.toString() ?? ""); setSpecIds(p.specialty_ids); setSubjects(p.subjects.map((s) => s.subject)); setError(null); }}>{pk.edit}</button>
                    <button data-write type="button" disabled={busy} className="text-[0.78rem] text-red-600 hover:underline disabled:opacity-40"
                      onClick={() => confirm(`${c.delete} « ${p.name} » ?`, async () => { setBusy(true); const { error: delError } = await supabase.from("packs").delete().eq("id", p.id); setBusy(false); setError(delError ? humanizeError(delError) : null); await reload(); })}>{c.delete}</button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.specialty_ids.map((id) => <span key={id} className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[0.72rem] font-semibold text-ink">{specialties.find((s) => s.id === id)?.name}</span>)}
                  {p.subjects.length === 0 ? <span className="text-[0.76rem] text-gray-400">{pk.noSubjects}</span> : p.subjects.map((s) => <span key={s.id} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[0.76rem] font-medium text-gray-700">{s.subject}</span>)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {dialog}
    </div>
  );
}
