import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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
import AnnouncementsView from "./AnnouncementsView";
import AdminPanel from "./AdminPanel";

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

function GestionView() {
  // Admin management screens still need an organization to scope to — reuse
  // the same "first admin-eligible membership" logic the old flat dashboard
  // used, since there's currently only ever one organization in practice.
  const { memberships, isSuperAdmin } = useAuth();
  const { t } = useLocale();
  const m = t.monEspace.gestion;
  const orgId = memberships.find((m) => m.role_name === "center_admin")?.organization_id ?? memberships[0]?.organization_id;

  if (!orgId) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
        <p className="text-[0.9rem] text-gray-500">{m.noOrganization}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
      <AdminPanel organizationId={orgId} />
      {isSuperAdmin && <p className="mt-2 text-[0.75rem] text-gray-400">{m.platformAdminNote}</p>}
    </div>
  );
}

function AuthenticatedApp() {
  const { memberships, isSuperAdmin } = useAuth();
  const primaryRole = isSuperAdmin ? "super_admin" : (memberships[0]?.role_name ?? null);
  const isAdmin = primaryRole === "super_admin" || primaryRole === "center_admin";
  const isTeacher = primaryRole === "teacher";

  return (
    <Routes>
      <Route element={<MonEspaceLayout />}>
        <Route index element={<Navigate to="aujourdhui" replace />} />
        <Route path="aujourdhui" element={isAdmin || isTeacher ? <TodayView /> : <OverviewView />} />
        <Route path="planning" element={<CalendarView />} />
        {isAdmin && <Route path="gestion" element={<GestionView />} />}
        <Route path="annonces" element={<AnnouncementsView />} />
        <Route path="*" element={<Navigate to="aujourdhui" replace />} />
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
