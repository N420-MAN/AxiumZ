import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabaseClient";
import { useLocale } from "../../i18n/LocaleContext";

const EASE = [0.16, 1, 0.3, 1] as const;
const inputClass =
  "w-full rounded-lg border border-paper/15 bg-paper/[0.04] px-4 py-3 text-[0.98rem] text-paper outline-none transition-colors placeholder:text-mist/50 focus:border-accent-bright";

export default function SetPassword({ onDone }: { onDone: () => void }) {
  const { t } = useLocale();
  const m = t.monEspace.setPassword;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setStatus("error");
      setErrorMessage(m.tooShort);
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setErrorMessage(m.mismatch);
      return;
    }

    setStatus("loading");
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    onDone();
  }

  return (
    <section className="grain-texture relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-4 py-24 text-paper sm:px-6">
      <div className="pattern-grid-dark pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative w-full max-w-sm rounded-2xl border border-paper/10 bg-ink-soft p-8 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]"
      >
        <h1 className="font-display text-[1.4rem] font-extrabold">{m.title}</h1>
        <p className="mt-2 text-[0.9rem] text-mist">{m.subtitle}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-[0.82rem] text-mist">{m.passwordLabel}</span>
            <input
              required
              type="password"
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`mt-2 ${inputClass}`}
            />
          </label>
          <label className="block">
            <span className="text-[0.82rem] text-mist">{m.confirmLabel}</span>
            <input
              required
              type="password"
              minLength={6}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={`mt-2 ${inputClass}`}
            />
          </label>

          {status === "error" && <p className="text-[0.85rem] text-red-bright">{errorMessage}</p>}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-full bg-accent px-6 py-3 text-[0.95rem] font-semibold text-ink transition-opacity disabled:opacity-60"
          >
            {status === "loading" ? m.savingButton : m.continueButton}
          </button>
        </form>
      </motion.div>
    </section>
  );
}
