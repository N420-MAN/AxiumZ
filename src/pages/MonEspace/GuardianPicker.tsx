import { useLocale } from "../../i18n/LocaleContext";
import { type GuardianKind, matchesWords } from "../../lib/programs";
import { type GuardianChoice, type GuardianOption, EMPTY_DRAFT, NO_GUARDIAN, digitsOnly, samePhone } from "../../lib/guardianChoice";

interface GuardianPickerProps {
  kind: GuardianKind;
  /** A parent is mandatory for an élève who has none yet. */
  required: boolean;
  /** Guardians already linked to this person (editing). */
  linked: GuardianOption[];
  /** Every guardian of this kind, to suggest as the admin types. */
  guardians: GuardianOption[];
  choice: GuardianChoice;
  onChange: (choice: GuardianChoice) => void;
  /** A supervisor sees an adult's results, so the stagiaire's consent is confirmed. */
  consent: boolean;
  onConsentChange: (value: boolean) => void;
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.9rem] text-gray-900 outline-none focus:border-gray-400";

export default function GuardianPicker({ kind, required, linked, guardians, choice, onChange, consent, onConsentChange }: GuardianPickerProps) {
  const { t } = useLocale();
  const gd = t.monEspace.guardian;
  const isSupervisor = kind === "superviseur";

  const linkedIds = new Set(linked.map((g) => g.id));
  const selected = choice.mode === "existing" ? guardians.find((g) => g.id === choice.id) : undefined;

  // Suggestions appear while a new guardian is being typed: by name (any
  // order, accents ignored) or by phone number.
  let suggestions: GuardianOption[] = [];
  let phoneMatch: GuardianOption | undefined;
  if (choice.mode === "new") {
    const { draft } = choice;
    const nameQuery = `${draft.last_name} ${draft.first_name}`.trim();
    const phoneDigits = digitsOnly(draft.phone);
    suggestions = guardians
      .filter((g) => !linkedIds.has(g.id))
      .filter(
        (g) =>
          (nameQuery.length >= 2 && matchesWords(`${g.first_name} ${g.last_name}`, nameQuery)) ||
          (phoneDigits.length >= 4 && digitsOnly(g.phone).includes(phoneDigits)),
      )
      .slice(0, 5);
    phoneMatch = draft.phone.trim() ? guardians.find((g) => !linkedIds.has(g.id) && samePhone(g.phone, draft.phone)) : undefined;
  }

  const heading = isSupervisor ? gd.supervisorHeading : gd.parentHeading;
  const startNew = () => onChange({ mode: "new", draft: EMPTY_DRAFT });

  function updateDraft(patch: Partial<typeof EMPTY_DRAFT>) {
    if (choice.mode === "new") onChange({ mode: "new", draft: { ...choice.draft, ...patch } });
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:col-span-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.82rem] font-semibold text-gray-700">{heading}</p>
        <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-medium ${required ? "border border-red-200 bg-red-50 text-red-700" : "bg-gray-100 text-gray-500"}`}>
          {required ? gd.required : gd.optional}
        </span>
      </div>
      <p className="mt-1 text-[0.74rem] text-gray-500">{isSupervisor ? gd.supervisorHint : gd.parentHint}</p>

      {linked.length > 0 && (
        <div className="mt-2">
          <p className="text-[0.74rem] text-gray-500">{gd.linked}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {linked.map((g) => (
              <span key={g.id} className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-[0.78rem] text-gray-700">
                {g.first_name} {g.last_name}
                {g.phone && <span className="ml-1.5 text-gray-400">{g.phone}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {choice.mode === "none" && (
        <button type="button" onClick={startNew} className="mt-2 text-[0.82rem] font-medium text-ink hover:underline">
          + {linked.length > 0 ? (isSupervisor ? gd.addAnotherSupervisor : gd.addAnotherParent) : isSupervisor ? gd.addSupervisor : gd.addParent}
        </button>
      )}

      {choice.mode === "existing" && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-[0.85rem]">
          <span className="text-gray-800">
            {selected ? `${selected.first_name} ${selected.last_name}` : "—"}
            {selected?.phone && <span className="ml-2 text-gray-400">{selected.phone}</span>}
            {selected?.email && <span className="ml-2 text-gray-400">{selected.email}</span>}
          </span>
          <span className="flex items-center gap-3">
            <button type="button" onClick={startNew} className="text-[0.78rem] text-gray-500 hover:text-gray-800 hover:underline">
              {gd.change}
            </button>
            {!required && (
              <button type="button" onClick={() => onChange(NO_GUARDIAN)} className="text-[0.78rem] text-red-600 hover:underline">
                {gd.remove}
              </button>
            )}
          </span>
        </div>
      )}

      {choice.mode === "new" && (
        <>
          <p className="mt-2 text-[0.72rem] text-gray-500">{gd.searchHint}</p>
          <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              required
              autoComplete="off"
              placeholder={`${gd.lastName} *`}
              value={choice.draft.last_name}
              onChange={(e) => updateDraft({ last_name: e.target.value })}
              className={inputClass}
            />
            <input
              required
              autoComplete="off"
              placeholder={`${gd.firstName} *`}
              value={choice.draft.first_name}
              onChange={(e) => updateDraft({ first_name: e.target.value })}
              className={inputClass}
            />
          </div>

          {suggestions.length > 0 && (
            <div className="mt-1 overflow-hidden rounded-md border border-gray-200 bg-white" role="listbox" aria-label={gd.suggestionsTitle}>
              <p className="border-b border-gray-100 bg-gray-50 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-wide text-gray-500">{gd.suggestionsTitle}</p>
              {suggestions.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  role="option"
                  aria-selected="false"
                  onClick={() => onChange({ mode: "existing", id: g.id })}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[0.85rem] hover:bg-gray-50"
                >
                  <span className="text-gray-800">
                    {g.first_name} {g.last_name}
                  </span>
                  <span className="shrink-0 text-[0.76rem] text-gray-400">{g.phone ?? g.email}</span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input required type="email" autoComplete="off" placeholder={`${gd.email} *`} value={choice.draft.email} onChange={(e) => updateDraft({ email: e.target.value })} className={inputClass} />
            <input required type="tel" autoComplete="off" placeholder={`${gd.phone} *`} value={choice.draft.phone} onChange={(e) => updateDraft({ phone: e.target.value })} className={inputClass} />
            <input
              required={!isSupervisor}
              autoComplete="off"
              placeholder={isSupervisor ? gd.address : `${gd.address} *`}
              value={choice.draft.address}
              onChange={(e) => updateDraft({ address: e.target.value })}
              className={inputClass}
            />
            {isSupervisor && (
              <input autoComplete="off" placeholder={gd.company} value={choice.draft.company} onChange={(e) => updateDraft({ company: e.target.value })} className={inputClass} />
            )}
          </div>

          {phoneMatch && !suggestions.some((g) => g.id === phoneMatch?.id) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[0.78rem] text-amber-800">
              <span>{gd.phoneMatch.replace("{name}", `${phoneMatch.first_name} ${phoneMatch.last_name}`)}</span>
              <button type="button" onClick={() => onChange({ mode: "existing", id: phoneMatch.id })} className="font-semibold underline">
                {gd.useThis}
              </button>
            </div>
          )}

          {!required && (
            <button type="button" onClick={() => onChange(NO_GUARDIAN)} className="mt-2 text-[0.78rem] text-gray-500 hover:text-gray-800 hover:underline">
              {gd.remove}
            </button>
          )}
        </>
      )}

      {isSupervisor && choice.mode !== "none" && (
        <label className="mt-3 flex cursor-pointer items-start gap-2 text-[0.8rem] text-gray-700">
          <input type="checkbox" checked={consent} onChange={(e) => onConsentChange(e.target.checked)} className="mt-0.5" />
          <span>{gd.consent}</span>
        </label>
      )}
    </div>
  );
}
