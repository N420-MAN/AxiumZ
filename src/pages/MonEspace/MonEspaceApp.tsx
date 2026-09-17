import { useState } from "react";
import { AuthProvider, useAuth } from "../../features/auth/AuthContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useLocale } from "../../i18n/LocaleContext";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import Login from "./Login";
import Dashboard from "./Dashboard";
import SetPassword from "./SetPassword";

function NotConfigured() {
  // Shown instead of silently crashing when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
  // are missing — most likely because they haven't been added to the hosting
  // platform's environment variables yet (a local .env file isn't enough).
  return (
    <section className="flex min-h-screen items-center justify-center bg-ink px-6 py-24 text-center text-paper">
      <div className="max-w-md">
        <h1 className="font-display text-[1.4rem] font-extrabold">Mon espace n'est pas encore configuré</h1>
        <p className="mt-4 text-[0.92rem] leading-relaxed text-mist">
          Les variables d'environnement Supabase (VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY) sont manquantes sur ce
          déploiement. Ajoutez-les dans les paramètres du projet (Vercel : Settings → Environment Variables), puis
          redéployez.
        </p>
      </div>
    </section>
  );
}

function MonEspaceGate() {
  const { t } = useLocale();
  const { session, loading } = useAuth();
  usePageMeta(`${t.auth.dashboardTitle} — AxiumZ`, t.auth.dashboardTitle, "monEspace", { noindex: true });

  // Supabase's client (detectSessionInUrl: true) automatically reads the
  // access_token out of the URL hash and establishes a session — but it
  // doesn't tell us "this session came from an invite link" on its own.
  // We capture that ourselves, once, before anything strips the hash.
  const [authFlowType] = useState<"invite" | "recovery" | null>(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) return "recovery";
    if (hash.includes("type=invite")) return "invite";
    return null;
  });
  const [passwordJustSet, setPasswordJustSet] = useState(false);

  if (!isSupabaseConfigured) {
    return <NotConfigured />;
  }

  if (authFlowType && !passwordJustSet) {
    return <SetPassword onDone={() => setPasswordJustSet(true)} />;
  }

  if (loading) {
    return <div className="min-h-screen bg-ink" />;
  }

  return session ? <Dashboard /> : <Login />;
}

export default function MonEspaceApp() {
  return (
    <AuthProvider>
      <MonEspaceGate />
    </AuthProvider>
  );
}
