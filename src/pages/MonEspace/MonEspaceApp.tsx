import { useState } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "../../features/auth/AuthContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useLocale, LocaleProvider } from "../../i18n/LocaleContext";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { capturedAuthFlowType } from "../../lib/authFlowCapture";
import Login from "./Login";
import SetPassword from "./SetPassword";
import MonEspaceLayout from "./MonEspaceLayout";
import TodayView from "./TodayView";
import OverviewView from "./OverviewView";
import CalendarView from "./CalendarView";
import GradesView from "./GradesView";
import SettingsView from "./SettingsView";
import AnnouncementsView from "./AnnouncementsView";
import GestionLayout from "./GestionLayout";

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

function AuthenticatedApp() {
  const { memberships, isSuperAdmin } = useAuth();
  const { lang } = useParams();
  const base = `/${lang ?? "fr"}/mon-espace`;
  const primaryRole = isSuperAdmin ? "super_admin" : (memberships[0]?.role_name ?? null);
  const isAdmin = primaryRole === "super_admin" || primaryRole === "center_admin";
  const isTeacher = primaryRole === "teacher";

  return (
    <Routes>
      <Route element={<MonEspaceLayout />}>
        <Route index element={<Navigate to={`${base}/aujourdhui`} replace />} />
        <Route path="aujourdhui" element={isAdmin || isTeacher ? <TodayView /> : <OverviewView />} />
        <Route path="planning" element={<CalendarView />} />
        {(isAdmin || isTeacher) && <Route path="notes" element={<GradesView />} />}
        {isAdmin && <Route path="gestion/*" element={<GestionLayout />} />}
        <Route path="annonces" element={<AnnouncementsView />} />
        <Route path="parametres" element={<SettingsView />} />
        <Route path="*" element={<Navigate to={`${base}/aujourdhui`} replace />} />
      </Route>
    </Routes>
  );
}

function MonEspaceGate() {
  const { t } = useLocale();
  const { session, loading } = useAuth();
  usePageMeta(`${t.auth.dashboardTitle} — AxiumZ`, t.auth.dashboardTitle, "monEspace", { noindex: true });

  // Read the value captured at app entry (see authFlowCapture.ts) instead of
  // re-checking window.location.hash here — by the time this lazy-loaded
  // component mounts, Supabase's own client may have already stripped it.
  const [authFlowType] = useState<"invite" | "recovery" | null>(() => capturedAuthFlowType);
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

  return session ? <AuthenticatedApp /> : <Login />;
}

export default function MonEspaceApp() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <MonEspaceGate />
      </AuthProvider>
    </LocaleProvider>
  );
}
