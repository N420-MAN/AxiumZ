import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { useLocale } from "../../i18n/LocaleContext";
import { useAuth } from "../../features/auth/AuthContext";

const EASE = [0.16, 1, 0.3, 1] as const;
const inputClass =
  "w-full rounded-lg border border-paper/15 bg-paper/[0.04] px-4 py-3 text-[0.98rem] text-paper outline-none transition-colors placeholder:text-mist/50 focus:border-accent-bright";

export default function Login() {
  const { t } = useLocale();
  const a = t.auth;
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "signedUp">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const result = mode === "signin" ? await signIn(email, password) : await signUp(email, password, fullName);

    if (result.error) {
      setStatus("error");
      setErrorMessage(result.error);
      return;
    }

    if (mode === "signup") {
      setStatus("signedUp");
    }
    // On sign-in success, AuthContext's onAuthStateChange listener updates the
    // session automatically — MonEspaceApp re-renders into the dashboard.
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
        className="relative w-full max-w-sm rounded-2xl border border-paper/10 bg-ink-soft p-8 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]"
      >
        <h1 className="font-display text-[1.5rem] font-extrabold">
          {mode === "signin" ? a.signInTitle : a.signUpTitle}
        </h1>

        {status === "signedUp" ? (
          <p className="mt-6 text-[0.95rem] leading-relaxed text-mist">{a.checkYourEmail}</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <label className="block">
                <span className="text-[0.82rem] text-mist">{a.fullNameLabel}</span>
                <input
                  required
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`mt-2 ${inputClass}`}
                />
              </label>
            )}
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
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
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
              {status === "loading" ? a.loading : mode === "signin" ? a.signInButton : a.signUpButton}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setStatus("idle");
            setErrorMessage("");
          }}
          className="mt-6 text-[0.85rem] text-mist underline decoration-mist/30 underline-offset-4 hover:text-paper"
        >
          {mode === "signin" ? a.switchToSignUp : a.switchToSignIn}
        </button>
      </motion.div>
    </section>
  );
}
