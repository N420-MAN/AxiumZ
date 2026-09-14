import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "../../i18n/LocaleContext";
import { BRAND } from "../../data/brand";
import { trackEvent } from "../../lib/analytics";

const EASE = [0.16, 1, 0.3, 1] as const;
const FORM_ENDPOINT = `https://formsubmit.co/ajax/${BRAND.contactEmail}`;

type Status = "idle" | "sending" | "success" | "error";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[0.85rem] text-graphite">
        {label}
        {required && <span className="text-accent"> *</span>}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-ink/12 bg-paper-soft px-4 py-3 text-[0.98rem] text-ink outline-none transition-colors placeholder:text-graphite/50 focus:border-accent focus:bg-paper";

const selectClass = `${inputClass} appearance-none pr-10`;

function Select({ children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...rest} className={selectClass}>
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-4 top-1/2 h-3 w-3 -translate-y-1/2 text-graphite"
        viewBox="0 0 12 8"
        fill="none"
        aria-hidden="true"
      >
        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function InscriptionForm() {
  const { t } = useLocale();
  const f = t.inscriptionForm;
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    const form = e.currentTarget;
    const data = new FormData(form);
    const firstName = data.get(f.firstName)?.toString() ?? "";
    const lastName = data.get(f.lastName)?.toString() ?? "";
    const guardianEmail = data.get(f.email)?.toString() ?? "";

    const payload: Record<string, string> = {};
    data.forEach((value, key) => {
      payload[key] = value.toString();
    });
    payload["_subject"] = `Nouvelle préinscription AxiumZ — ${firstName} ${lastName}`.trim();
    payload["_template"] = "table";
    payload["_captcha"] = "false";
    if (guardianEmail) payload["_replyto"] = guardianEmail;

    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Request failed");
      trackEvent("form_submit", { form: "inscription" });
      setStatus("success");
      form.reset();
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
        className="rounded-2xl border border-ink/10 bg-cream px-8 py-14 text-center sm:px-16"
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

  return (
    <form onSubmit={handleSubmit} className="space-y-16">
      <p className="max-w-xl text-[1rem] leading-relaxed text-graphite">{f.intro}</p>

      {/* Honeypot for basic spam protection */}
      <input type="text" name="_honey" className="hidden" tabIndex={-1} autoComplete="off" />

      <div>
        <h3 className="font-display text-[1.3rem] font-extrabold">{f.section1}</h3>
        <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-7 border-t border-ink/10 pt-8 sm:grid-cols-2">
          <Field label={f.lastName} required>
            <input required name={f.lastName} type="text" className={inputClass} />
          </Field>
          <Field label={f.firstName} required>
            <input required name={f.firstName} type="text" className={inputClass} />
          </Field>
          <Field label={f.birthDate}>
            <input name={f.birthDate} type="date" className={inputClass} />
          </Field>
          <Field label={f.level} required>
            <Select required name={f.level} defaultValue="">
              <option value="" disabled>
                {f.levelPlaceholder}
              </option>
              {f.levelOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={f.school} required>
            <input required name={f.school} type="text" className={inputClass} />
          </Field>
        </div>
      </div>

      <div>
        <h3 className="font-display text-[1.3rem] font-extrabold">{f.section2}</h3>
        <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-7 border-t border-ink/10 pt-8 sm:grid-cols-2">
          <Field label={f.activity} required>
            <Select required name={f.activity} defaultValue="">
              <option value="" disabled>
                {f.activityPlaceholder}
              </option>
              {f.activityOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={f.subject} required>
            <Select required name={f.subject} defaultValue="">
              <option value="" disabled>
                {f.subjectPlaceholder}
              </option>
              {f.subjectOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={f.needs}>
            <textarea name={f.needs} rows={3} className={`${inputClass} resize-none`} />
          </Field>
          <Field label={f.availability}>
            <input name={f.availability} type="text" className={inputClass} />
          </Field>
        </div>
      </div>

      <div>
        <h3 className="font-display text-[1.3rem] font-extrabold">{f.section3}</h3>
        <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-7 border-t border-ink/10 pt-8 sm:grid-cols-2">
          <Field label={f.guardianName} required>
            <input required name={f.guardianName} type="text" className={inputClass} />
          </Field>
          <Field label={f.relation} required>
            <Select required name={f.relation} defaultValue="">
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
            <input required name={f.phone} type="tel" className={inputClass} />
          </Field>
          <Field label={f.email} required>
            <input required name={f.email} type="email" className={inputClass} />
          </Field>

          <div className="sm:col-span-2">
            <span className="text-[0.85rem] text-graphite">{f.preferredContact}</span>
            <div className="mt-3 flex flex-wrap gap-6">
              {f.preferredContactOptions.map((opt, i) => (
                <label key={opt} className="flex cursor-pointer items-center gap-2.5 text-[0.95rem]">
                  <input
                    type="radio"
                    name={f.preferredContact}
                    value={opt}
                    defaultChecked={i === 0}
                    className="h-4 w-4 accent-[#c8962f]"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-ink/10 pt-8">
        <label className="flex cursor-pointer items-start gap-3 text-[0.9rem] leading-relaxed text-graphite">
          <input required type="checkbox" name="_consent" className="mt-1 h-4 w-4 shrink-0 accent-[#c8962f]" />
          {f.consent}
        </label>

        <p className="mt-6 text-[0.8rem] text-graphite/70">{f.requiredNote}</p>

        <div className="mt-8 flex flex-wrap items-center gap-6">
          <button
            type="submit"
            disabled={status === "sending"}
            className="group relative inline-flex items-center justify-center overflow-hidden bg-ink px-8 py-3.5 text-[0.95rem] font-medium text-paper transition-opacity disabled:opacity-60"
          >
            <span className="absolute inset-0 origin-left scale-x-0 bg-accent transition-transform duration-500 ease-[var(--ease-editorial)] group-hover:scale-x-100" aria-hidden="true" />
            <span className="relative">{status === "sending" ? f.sending : f.submit}</span>
          </button>

          <AnimatePresence>
            {status === "error" && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-xs text-[0.85rem] text-accent"
              >
                {f.errorBody}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </form>
  );
}
