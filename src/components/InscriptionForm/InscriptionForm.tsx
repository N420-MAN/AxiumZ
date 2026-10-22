import PhoneHint from "../PhoneHint";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useLocale } from "../../i18n/LocaleContext";
import { firstContactError } from "../../lib/validation";
import { supabase } from "../../lib/supabaseClient";
import { extractFunctionErrorMessage } from "../../lib/invokeEdgeFunction";
import { money } from "../../lib/discount";
import { offerOf, percentOff, perMonth, savingOf, tiersOf, usePublicPricing } from "../../lib/publicPricing";
import { trackEvent } from "../../lib/analytics";

const EASE = [0.16, 1, 0.3, 1] as const;
const OTHER = "__other__";

type Status = "idle" | "sending" | "success" | "error";
type Formula = "" | "pack" | "subject" | "info";
type PayPref = "full" | "monthly";

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-[0.85rem] text-graphite">
        {label}
        {required && <span className="text-accent"> *</span>}
      </span>
      <div className="mt-2">{children}</div>
      {hint && <span className="mt-1.5 block text-[0.78rem] text-graphite/70">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-ink/12 bg-paper-soft px-4 py-3 text-[1rem] text-ink outline-none transition-colors placeholder:text-graphite/50 focus:border-accent focus:bg-paper";

const selectClass = `${inputClass} appearance-none pr-10`;

function Select({ children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...rest} className={selectClass}>
        {children}
      </select>
      <svg className="pointer-events-none absolute right-4 top-1/2 h-3 w-3 -translate-y-1/2 text-graphite" viewBox="0 0 12 8" fill="none" aria-hidden="true">
        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** A big tappable choice (radio or checkbox) used for formula / pack / subject. */
function Choice({
  type,
  name,
  checked,
  onChange,
  title,
  hint,
  right,
  badge,
}: {
  type: "radio" | "checkbox";
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  hint?: string;
  right?: React.ReactNode;
  badge?: string;
}) {
  return (
    <label
      className={`flex min-h-[56px] cursor-pointer items-center gap-4 rounded-xl border-2 px-4 py-3.5 transition-colors ${
        checked ? "border-accent bg-accent-soft" : "border-ink/12 bg-paper hover:border-ink/35"
      }`}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="h-5 w-5 shrink-0 accent-[#c8962f]" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          {badge && <span className="font-display rounded bg-ink px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-paper">{badge}</span>}
          <span className="font-display text-[1rem] font-bold leading-snug text-ink">{title}</span>
        </span>
        {hint && <span className="mt-0.5 block text-[0.84rem] text-graphite">{hint}</span>}
      </span>
      {right && <span className="shrink-0 text-right">{right}</span>}
    </label>
  );
}

export default function InscriptionForm() {
  const { t, locale } = useLocale();
  const f = t.inscriptionForm;
  const { programs, loading: pricingLoading, failed: pricingFailed } = usePublicPricing();
  const [search] = useSearchParams();

  const [status, setStatus] = useState<Status>("idle");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const [programId, setProgramId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [formula, setFormula] = useState<Formula>("");
  const [packId, setPackId] = useState("");
  const [tierSize, setTierSize] = useState(0);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [payPref, setPayPref] = useState<PayPref>("full");
  const preselected = useRef(false);

  // Arriving from "Packs et tarifs": the pack (or the level and "single subject") is already chosen.
  useEffect(() => {
    if (preselected.current || programs.length === 0) return;
    const wantedPack = search.get("pack");
    const wantedLevel = search.get("level");
    for (const pr of programs) {
      for (const lv of pr.levels) {
        if (wantedPack && lv.packs.some((k) => k.id === wantedPack)) {
          setProgramId(pr.id);
          setLevelId(lv.id);
          setFormula("pack");
          setPackId(wantedPack);
          setTierSize(lv.packs.find((k) => k.id === wantedPack)?.subjects.length ?? 0);
          preselected.current = true;
          return;
        }
        if (!wantedPack && wantedLevel === lv.id && search.get("formula") === "subject") {
          setProgramId(pr.id);
          setLevelId(lv.id);
          setFormula("subject");
          preselected.current = true;
          return;
        }
      }
    }
  }, [programs, search]);

  const isOther = programId === OTHER;
  const program = programs.find((p) => p.id === programId) ?? null;
  const level = program?.levels.find((l) => l.id === levelId) ?? null;
  const needsSpecialty = !!level && level.specialties.length > 0;
  const choiceReady = !!level;
  const pack = level?.packs.find((k) => k.id === packId) ?? null;
  const tiers = useMemo(() => tiersOf(level?.packs ?? []), [level]);
  const activeTier = tiers.find((x) => x.size === tierSize) ?? null;
  const bestSize = useMemo(() => {
    let size = 0;
    let save = 0;
    for (const x of tiers) {
      const sv = Math.max(...x.packs.map(savingOf));
      if (sv > save) {
        save = sv;
        size = x.size;
      }
    }
    return size;
  }, [tiers]);
  function pickTier(size: number) {
    setTierSize(size);
    const tier = tiers.find((x) => x.size === size);
    setPackId(tier && tier.packs.length === 1 ? tier.packs[0].id : "");
  }

  // What the family would pay, from the live prices.
  const summary = useMemo(() => {
    if (!level) return null;
    if (formula === "pack" && pack) {
      const o = offerOf(pack);
      return { label: pack.subjects.join(" + ") || pack.name, price: pack.price, offerName: o?.name ?? null, offerPrice: o?.price ?? null };
    }
    if (formula === "subject" && level.solo && subjects.length > 0) {
      const n = subjects.length;
      const o = offerOf(level.solo);
      return { label: subjects.join(" + "), price: level.solo.price * n, offerName: o?.name ?? null, offerPrice: o ? o.price * n : null };
    }
    return null;
  }, [level, formula, pack, subjects]);
  const payable = summary ? summary.offerPrice ?? summary.price : 0;

  function pickProgram(id: string) {
    setProgramId(id);
    setLevelId("");
    setSpecialtyId("");
    setFormula("");
    setPackId("");
    setTierSize(0);
    setSubjects([]);
  }
  function pickLevel(id: string) {
    setLevelId(id);
    setSpecialtyId("");
    setPackId("");
    setTierSize(0);
    setSubjects([]);
    const lv = program?.levels.find((l) => l.id === id);
    // Packs first when there are some, otherwise a single subject.
    setFormula(lv ? (lv.packs.length > 0 ? "pack" : "subject") : "");
  }
  function pickFormula(next: Formula) {
    setFormula(next);
    setPackId("");
    setTierSize(0);
    setSubjects([]);
  }
  // A single subject only: several subjects must be taken as a pack, so the price is always one of the published prices.
  const pickSubject = (s: string) => setSubjects([s]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const get = (k: string) => data.get(k)?.toString().trim() ?? "";

    const problem = firstContactError({ email: get("email"), phone: get("phone") }, t.validation);
    if (problem) {
      setFieldError(problem);
      return;
    }
    if (!isOther && formula !== "info" && (!summary || (formula === "pack" && !pack))) {
      setFieldError(f.choiceRequired);
      return;
    }
    setFieldError(null);
    setStatus("sending");

    const body = {
      _honey: get("_honey"),
      firstName: get("firstName"),
      lastName: get("lastName"),
      birthDate: get("birthDate"),
      school: get("school"),
      formula: isOther || formula === "info" ? "info" : formula,
      programId: isOther ? "" : programId,
      levelId: isOther ? "" : levelId,
      specialtyId,
      packId: formula === "pack" ? packId : "",
      subjects: formula === "subject" ? subjects : [],
      paymentPref: payPref,
      needs: formula === "info" && level && !isOther ? `[${program?.name ?? ""} · ${level.name}] ${get("needs")}` : get("needs"),
      availability: get("availability"),
      guardianName: get("guardianName"),
      relation: get("relation"),
      phone: get("phone"),
      email: get("email"),
      preferredContact: get("preferredContact"),
    };

    try {
      const { data: res, error } = await supabase.functions.invoke("submit-preinscription", { body });
      if (error || res?.error) {
        const msg = await extractFunctionErrorMessage(error, res);
        setFieldError(msg === "rate_limited" ? f.rateLimited : null);
        setStatus("error");
        return;
      }
      trackEvent("form_submit", { form: "inscription", formula: body.formula });
      setStatus("success");
      form.reset();
      setProgramId("");
      setLevelId("");
      setSpecialtyId("");
      setFormula("");
      setPackId("");
    setTierSize(0);
      setSubjects([]);
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="rounded-2xl border border-ink/10 bg-cream px-6 py-12 text-center sm:px-16 sm:py-14"
        role="status"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 13l4 4L19 7" stroke="#faf8f3" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="font-display mt-6 text-[1.6rem] font-extrabold">{f.successTitle}</h3>
        <p className="mx-auto mt-4 max-w-md text-[0.98rem] leading-relaxed text-graphite">{f.successBody}</p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-8 text-[0.92rem] font-medium text-ink underline decoration-ink/25 underline-offset-4 hover:text-accent hover:decoration-accent"
        >
          {f.sendAnother}
        </button>
      </motion.div>
    );
  }

  const specialtiesOf = level?.specialties ?? [];

  return (
    <form onSubmit={handleSubmit} className="space-y-14 sm:space-y-16">
      <p className="max-w-xl text-[1rem] leading-relaxed text-graphite">{f.intro}</p>

      <input type="text" name="_honey" className="hidden" tabIndex={-1} autoComplete="off" />

      <div>
        <h3 className="font-display text-[1.3rem] font-extrabold">{f.section1}</h3>
        <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 border-t border-ink/10 pt-6 sm:mt-8 sm:grid-cols-2 sm:gap-y-7 sm:pt-8">
          <Field label={f.lastName} required>
            <input required name="lastName" type="text" autoComplete="family-name" className={inputClass} />
          </Field>
          <Field label={f.firstName} required>
            <input required name="firstName" type="text" autoComplete="given-name" className={inputClass} />
          </Field>
          <Field label={f.birthDate}>
            <input name="birthDate" type="date" className={inputClass} />
          </Field>
          <Field label={f.school} required>
            <input required name="school" type="text" className={inputClass} />
          </Field>
        </div>
      </div>

      <div>
        <h3 className="font-display text-[1.3rem] font-extrabold">{f.section2}</h3>
        <div className="mt-6 border-t border-ink/10 pt-6 sm:mt-8 sm:pt-8">
          {pricingFailed && (
            <p role="alert" className="mb-6 rounded-lg border border-red/30 bg-red/5 px-4 py-3 text-[0.9rem] text-red">
              {f.pricingFailed}
            </p>
          )}
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
            <Field label={f.program} required>
              <Select required value={programId} onChange={(e) => pickProgram(e.target.value)} disabled={pricingLoading && programs.length === 0 && !pricingFailed}>
                <option value="" disabled>
                  {f.programPlaceholder}
                </option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                <option value={OTHER}>{f.otherProgram}</option>
              </Select>
            </Field>
            {program && (
              <Field label={f.level} required>
                <Select required value={levelId} onChange={(e) => pickLevel(e.target.value)}>
                  <option value="" disabled>
                    {f.levelPlaceholder}
                  </option>
                  {program.levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            {needsSpecialty && (
              <Field label={f.specialty} required>
                <Select required value={specialtyId} onChange={(e) => setSpecialtyId(e.target.value)}>
                  <option value="" disabled>
                    {f.specialtyPlaceholder}
                  </option>
                  {specialtiesOf.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>

          {!isOther && !choiceReady && <p className="mt-6 text-[0.9rem] text-graphite">{f.pickLevelFirst}</p>}

          {!isOther && choiceReady && level && (
            <div className="mt-8 space-y-8">
              <fieldset>
                <legend className="text-[0.85rem] text-graphite">{f.formulaLabel}</legend>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {level.packs.length > 0 && (
                    <Choice type="radio" name="formula" checked={formula === "pack"} onChange={() => pickFormula("pack")} title={f.formulaPack} hint={f.formulaPackHint} />
                  )}
                  {level.solo && (
                    <Choice type="radio" name="formula" checked={formula === "subject"} onChange={() => pickFormula("subject")} title={f.formulaSubject} hint={f.formulaSubjectHint} />
                  )}
                  <Choice type="radio" name="formula" checked={formula === "info"} onChange={() => pickFormula("info")} title={f.formulaInfo} hint={f.formulaInfoHint} />
                </div>
              </fieldset>

              {formula === "pack" && (
                <fieldset>
                  <legend className="text-[0.85rem] text-graphite">{f.sizeLabel}</legend>
                  <div className="mt-3 grid grid-cols-1 gap-3">
                    {level.packs.length === 0 && <p className="text-[0.9rem] text-graphite">{f.noPacks}</p>}
                    {tiers.map((x) => {
                      const first = x.packs[0];
                      const cheapest = Math.min(...x.packs.map((k) => offerOf(k)?.price ?? k.price));
                      const dearest = Math.max(...x.packs.map((k) => offerOf(k)?.price ?? k.price));
                      const o = offerOf(first);
                      const same = cheapest === dearest;
                      return (
                        <Choice
                          key={x.size}
                          type="radio"
                          name="tier"
                          checked={tierSize === x.size}
                          onChange={() => pickTier(x.size)}
                          badge={x.kind}
                          title={f.tierTitle.replace("{n}", String(x.size))}
                          hint={x.size === bestSize ? t.tarifsPage.bestOffer : undefined}
                          right={
                            <span className="block">
                              <span className="font-display block text-[1.05rem] font-extrabold text-ink">{same ? money(cheapest, locale) : f.fromPrice.replace("{amount}", money(cheapest, locale))}</span>
                              {o && same && <s className="block text-[0.78rem] text-graphite/70">{money(first.price, locale)}</s>}
                            </span>
                          }
                        />
                      );
                    })}
                  </div>
                  {activeTier && activeTier.packs.length > 1 && (
                    <div className="mt-6">
                      <p className="text-[0.85rem] text-graphite">{f.combosLabel}</p>
                      <div className="mt-3 grid grid-cols-1 gap-3">
                        {activeTier.packs.map((k) => {
                          const o = offerOf(k);
                          return (
                            <Choice
                              key={k.id}
                              type="radio"
                              name="pack"
                              checked={packId === k.id}
                              onChange={() => setPackId(k.id)}
                              title={k.subjects.join(" + ") || k.name}
                              right={
                                <span className="block">
                                  <span className="font-display block text-[1.05rem] font-extrabold text-ink">{money(o?.price ?? k.price, locale)}</span>
                                  {o && <s className="block text-[0.78rem] text-graphite/70">{money(k.price, locale)}</s>}
                                </span>
                              }
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </fieldset>
              )}

              {formula === "subject" && level.solo && (
                <fieldset>
                  <legend className="text-[0.85rem] text-graphite">{f.subjectsLabel}</legend>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {level.subjects.length === 0 && <p className="text-[0.9rem] text-graphite">{f.noSubjects}</p>}
                    {level.subjects.map((s) => {
                      const o = offerOf(level.solo!);
                      return (
                        <Choice
                          key={s}
                          type="radio"
                          name="subjects"
                          checked={subjects.includes(s)}
                          onChange={() => pickSubject(s)}
                          title={s}
                          right={
                            <span className="block">
                              <span className="font-display block text-[0.98rem] font-extrabold text-ink">{money(o?.price ?? level.solo!.price, locale)}</span>
                              {o && <s className="block text-[0.76rem] text-graphite/70">{money(level.solo!.price, locale)}</s>}
                            </span>
                          }
                        />
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {formula === "info" && (
                <Field label={f.requestLabel} required hint={f.requestHelp}>
                  <textarea required name="needs" rows={4} className={`${inputClass} resize-none`} />
                </Field>
              )}

              {summary && (
                <div className="rounded-2xl border-2 border-ink bg-white p-5 sm:p-6" aria-live="polite">
                  <p className="font-display text-[0.8rem] font-bold uppercase tracking-[0.1em] text-accent">{f.summary.title}</p>
                  <p className="font-display mt-2 text-[1.1rem] font-extrabold leading-snug">{summary.label}</p>
                  <dl className="mt-4 space-y-2 text-[0.95rem]">
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-graphite">{f.summary.price}</dt>
                      <dd className={summary.offerPrice != null ? "text-graphite/70 line-through" : "font-display text-[1.25rem] font-extrabold"}>{money(summary.price, locale)}</dd>
                    </div>
                    {summary.offerName && summary.offerPrice != null && (
                      <>
                        <div className="flex items-baseline justify-between gap-4">
                          <dt className="font-semibold text-accent">{summary.offerName}</dt>
                          <dd className="font-display text-[1.4rem] font-extrabold">{money(summary.offerPrice, locale)}</dd>
                        </div>
                        <p className="rounded-md bg-accent-soft px-3 py-2 text-[0.88rem] font-semibold text-ink">
                          {f.summary.save.replace("{amount}", money(summary.price - summary.offerPrice, locale)).replace("{pct}", String(percentOff(summary.price, summary.offerPrice)))}
                        </p>
                      </>
                    )}
                  </dl>
                  <fieldset className="mt-5 border-t border-ink/10 pt-5">
                    <legend className="text-[0.85rem] text-graphite">{f.summary.payLabel}</legend>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Choice type="radio" name="payPref" checked={payPref === "full"} onChange={() => setPayPref("full")} title={f.summary.payFull} hint={f.summary.payFullHint.replace("{amount}", money(payable, locale))} />
                      <Choice type="radio" name="payPref" checked={payPref === "monthly"} onChange={() => setPayPref("monthly")} title={f.summary.payMonthly} hint={f.summary.payMonthlyHint.replace("{amount}", money(perMonth(payable), locale))} />
                    </div>
                  </fieldset>
                  <p className="mt-4 text-[0.78rem] text-graphite/80">{f.summary.indicative}</p>
                </div>
              )}
            </div>
          )}

          {isOther && (
            <div className="mt-6">
              <Field label={f.requestLabel} required hint={f.requestHelp}>
                <textarea required name="needs" rows={4} className={`${inputClass} resize-none`} />
              </Field>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-display text-[1.3rem] font-extrabold">{f.sectionNeeds}</h3>
        <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 border-t border-ink/10 pt-6 sm:mt-8 sm:grid-cols-2 sm:gap-y-7 sm:pt-8">
          {!isOther && formula !== "info" && (
            <Field label={f.needs}>
              <textarea name="needs" rows={3} className={`${inputClass} resize-none`} />
            </Field>
          )}
          <Field label={f.availability}>
            <input name="availability" type="text" className={inputClass} />
          </Field>
        </div>
      </div>

      <div>
        <h3 className="font-display text-[1.3rem] font-extrabold">{f.section3}</h3>
        <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 border-t border-ink/10 pt-6 sm:mt-8 sm:grid-cols-2 sm:gap-y-7 sm:pt-8">
          <Field label={f.guardianName} required>
            <input required name="guardianName" type="text" autoComplete="name" className={inputClass} />
          </Field>
          <Field label={f.relation} required>
            <Select required name="relation" defaultValue="">
              <option value="" disabled>
                {f.relationPlaceholder}
              </option>
              {f.relationOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={f.phone} required>
            <input required name="phone" type="tel" inputMode="tel" autoComplete="tel" className={inputClass} />
            <PhoneHint />
          </Field>
          <Field label={f.email} required>
            <input required name="email" type="email" inputMode="email" autoComplete="email" className={inputClass} />
          </Field>

          <fieldset className="sm:col-span-2">
            <legend className="text-[0.85rem] text-graphite">{f.preferredContact}</legend>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
              {f.preferredContactOptions.map((opt, i) => (
                <label key={opt} className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[0.95rem]">
                  <input type="radio" name="preferredContact" value={opt} defaultChecked={i === 0} className="h-5 w-5 accent-[#c8962f]" />
                  {opt}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      <div className="border-t border-ink/10 pt-8">
        <label className="flex cursor-pointer items-start gap-3 text-[0.9rem] leading-relaxed text-graphite">
          <input required type="checkbox" name="_consent" className="mt-1 h-5 w-5 shrink-0 accent-[#c8962f]" />
          {f.consent}
        </label>

        <p className="mt-6 text-[0.8rem] text-graphite/70">{f.requiredNote}</p>

        <div className="mt-8 flex flex-wrap items-center gap-6">
          <button
            type="submit"
            disabled={status === "sending"}
            className="group relative inline-flex min-h-[52px] w-full items-center justify-center overflow-hidden bg-ink px-8 py-3.5 text-[0.95rem] font-medium text-paper transition-opacity disabled:opacity-60 sm:w-auto"
          >
            <span className="absolute inset-0 origin-left scale-x-0 bg-accent transition-transform duration-500 ease-[var(--ease-editorial)] group-hover:scale-x-100" aria-hidden="true" />
            <span className="relative">{status === "sending" ? f.sending : f.submit}</span>
          </button>

          {fieldError && (
            <p role="alert" className="max-w-md text-[0.9rem] text-red">
              {fieldError}
            </p>
          )}
          {status === "error" && !fieldError && (
            <p role="alert" className="max-w-md text-[0.9rem] text-red">
              {f.errorBody}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
