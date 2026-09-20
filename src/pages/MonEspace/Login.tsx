import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { useLocale } from "../../i18n/LocaleContext";
import { useAuth } from "../../features/auth/AuthContext";
import { supabase } from "../../lib/supabaseClient";

const EASE = [0.16, 1, 0.3, 1] as const;
const inputClass =
  "w-full rounded-lg border border-paper/15 bg-paper/[0.04] px-4 py-3 text-[0.98rem] text-paper outline-none transition-colors placeholder:text-mist/50 focus:border-accent-bright";

// Accounts on Mon Espace are always created by an admin invite (see
// AdminPanel → "Inviter"), never by open self-registration — a student or
// parent doesn't have an organization role or a linked record until an
// admin sets that up. Open signup would just create dead-end accounts with
// no access, so this page only ever offers sign-in.
export default function Login() {
  const { t, locale } = useLocale();
  const a = t.auth;
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState<"idle" | "loading" | "sent">("idle");

  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault();
    setForgotStatus("loading");
    // Deliberately shows the same "sent" confirmation regardless of whether
    // the address actually matches an account — a different message for
    // "no such account" would let anyone probe which emails are registered.
    await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: "https://www.axiumz.com/fr/mon-espace",
    });
    setForgotStatus("sent");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const result = await signIn(email, password);

    if (result.error) {
      setStatus("error");
      setErrorMessage(result.error);
      return;
    }
    // On success, AuthContext's onAuthStateChange listener updates the
    // session automatically — MonEspaceApp re-renders into the dashboard.
  }

  async function handleGoogleSignIn() {
    // The invite-only boundary isn't enforced here — it's enforced in the
    // database (a trigger only grants access if the email matches a
    // pre-created student/teacher/parent) and by MonEspaceApp's post-login
    // check, which signs out and rejects anyone who authenticates
    // successfully but ends up with zero organization memberships.
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: "https://www.axiumz.com/fr/mon-espace" },
    });
  }

  return (
    <section className="grain-texture relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-4 py-24 text-paper sm:px-6">
      <div className="pattern-grid-dark pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, var(--color-accent-bright) 0%, transparent 68%)" }}
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative w-full max-w-sm"
      >
        <a href={`/${locale}`} className="mb-4 inline-block text-[0.85rem] text-mist hover:text-paper">
          {a.backToWebsite}
        </a>

        <div className="rounded-2xl border border-paper/10 bg-ink-soft p-8 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]">
        {showForgotPassword ? (
          forgotStatus === "sent" ? (
            <>
              <h1 className="font-display text-[1.4rem] font-extrabold">{a.forgotPasswordTitle}</h1>
              <p className="mt-4 text-[0.9rem] leading-relaxed text-mist">{a.resetLinkSent}</p>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotStatus("idle");
                }}
                className="mt-6 text-[0.85rem] text-accent-bright hover:underline"
              >
                {a.backToSignIn}
              </button>
            </>
          ) : (
            <>
              <h1 className="font-display text-[1.4rem] font-extrabold">{a.forgotPasswordTitle}</h1>
              <p className="mt-2 text-[0.85rem] text-mist">{a.forgotPasswordBody}</p>
              <form onSubmit={handleForgotPassword} className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-[0.82rem] text-mist">{a.emailLabel}</span>
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className={`mt-2 ${inputClass}`}
                  />
                </label>
                <button
                  type="submit"
                  disabled={forgotStatus === "loading"}
                  className="w-full rounded-full bg-accent px-6 py-3 text-[0.95rem] font-semibold text-ink transition-opacity disabled:opacity-60"
                >
                  {forgotStatus === "loading" ? a.sending : a.sendResetLink}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full text-[0.85rem] text-mist hover:text-paper"
                >
                  {a.backToSignIn}
                </button>
              </form>
            </>
          )
        ) : (
          <>
            <h1 className="font-display text-[1.5rem] font-extrabold">{a.signInTitle}</h1>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-[0.82rem] text-mist">{a.emailLabel}</span>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`mt-2 ${inputClass}`}
                />
              </label>
              <label className="block">
                <span className="text-[0.82rem] text-mist">{a.passwordLabel}</span>
                <input
                  required
                  type="password"
                  minLength={6}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`mt-2 ${inputClass}`}
                />
              </label>

              {status === "error" && <p className="text-[0.85rem] text-red-bright">{errorMessage}</p>}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full rounded-full bg-accent px-6 py-3 text-[0.95rem] font-semibold text-ink transition-opacity disabled:opacity-60"
              >
                {status === "loading" ? a.loading : a.signInButton}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true);
                  setForgotEmail(email);
                }}
                className="w-full text-[0.82rem] text-mist hover:text-paper"
              >
                {a.forgotPasswordLink}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-paper/10" />
              <span className="text-[0.78rem] text-mist">{a.orDivider}</span>
              <div className="h-px flex-1 bg-paper/10" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="flex w-full items-center justify-center gap-2.5 rounded-full border border-paper/15 bg-paper px-6 py-3 text-[0.9rem] font-medium text-ink transition-opacity hover:opacity-90"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path fill="#4285F4" d="M23.52 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.76Z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11C3.25 21.3 7.31 24 12 24Z" />
                <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 0 1-.38-2.27c0-.79.14-1.56.38-2.27V6.62H1.27A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4-3.11Z" />
                <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.6 4.6 1.79l3.45-3.45C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.62l4 3.11C6.22 6.88 8.87 4.77 12 4.77Z" />
              </svg>
              {a.googleButton}
            </button>
          </>
        )}
        </div>
      </motion.div>
    </section>
  );
}
