import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { useLocale } from "../../i18n/LocaleContext";
import NotificationBell from "./NotificationBell";
import MonEspaceErrorBoundary from "./MonEspaceErrorBoundary";
import axiumzLogo from "../../assets/images/axiumz-logo.webp";
import axiumzLogoLight from "../../assets/images/axiumz-logo-footer.webp";
import CommandPalette from "./CommandPalette";
import "@fontsource/plus-jakarta-sans/latin-500.css";
import "@fontsource/plus-jakarta-sans/latin-600.css";
import "@fontsource/plus-jakarta-sans/latin-700.css";
import "@fontsource/plus-jakarta-sans/latin-800.css";
import { supabase } from "../../lib/supabaseClient";
import { useTutorialFile, tutorialUrl } from "../../features/tutorial/useTutorial";

interface NavItem {
  to: string;
  label: string;
  icon: ReactElement;
}

const ICONS = {
  today: (
    <path d="M6 3v3M14 3v3M3.5 8h13M4 5h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
  ),
  calendar: (
    <path d="M6 3v3M14 3v3M3.5 8h13M4 5h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm2 6h2v2H6v-2Zm4 0h2v2h-2v-2Zm4 0h2v2h-2v-2Z" />
  ),
  manage: <path d="M10 3v3.5M10 13.5V17M4.2 5.8l2.5 2.5M13.3 11.7l2.5 2.5M3 10h3.5M13.5 10H17M4.2 14.2l2.5-2.5M13.3 8.3l2.5-2.5" />,
  announcements: <path d="M3 11V9a2 2 0 0 1 2-2h1l6-3v12l-6-3H5a2 2 0 0 1-2-2Zm9-8v14M15 8a3 3 0 0 1 0 4" />,
  cahier: <path d="M5 3h9a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm0 3H3m2 3H3m2 3H3m5-6h4M8 9h4" />,
  grades: <path d="M6 3h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm2 4h4M8 9.5h4M8 12h2.5" />,
  classes: <path d="M2.5 16v-1.5A3.5 3.5 0 0 1 6 11h2a3.5 3.5 0 0 1 3.5 3.5V16M7 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM13 11.2a3 3 0 0 1 4.5 2.6V16M12.5 3.7a2.5 2.5 0 0 1 0 4.6" />,
  stats: <path d="M4 16V9M9 16V4M14 16v-6M4 16h12" />,
  menu: <path d="M3 5h14M3 10h14M3 15h14" />,
};

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function MonEspaceLayout() {
  const { profile, memberships, isSuperAdmin, isAssistant, signOut, refresh } = useAuth();
  const { t } = useLocale();
  const location = useLocation();
  const { lang } = useParams();
  const base = `/${lang ?? "fr"}/mon-espace`;
  const m = t.monEspace.layout;
  const m_shell = t.monEspace.shell;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // One-time "a tutorial is available" prompt. Closing it either way records
  // that it was shown; the sidebar button stays available permanently.
  const tutorialFile = useTutorialFile();
  const [promptClosed, setPromptClosed] = useState(false);
  const showTutorialPrompt = !!profile && !profile.tutorial_seen_at && !!tutorialFile && !promptClosed;
  async function closeTutorialPrompt() {
    setPromptClosed(true);
    if (!profile) return;
    await supabase.from("profiles").update({ tutorial_seen_at: new Date().toISOString() }).eq("id", profile.id);
    void refresh();
  }

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const primaryRole = isSuperAdmin ? "super_admin" : (memberships[0]?.role_name ?? null);
  const isAdmin = primaryRole === "super_admin" || primaryRole === "center_admin";
  // Reception sees what the admins see, and edits only subscriptions.
  const isStaff = isAdmin || isAssistant;
  const isTeacher = primaryRole === "teacher";
  const displayName = profile?.full_name?.trim() || m.myAccount;

  const navItems: NavItem[] = [
    { to: `${base}/aujourdhui`, label: isStaff || isTeacher ? m.todayNav : m.overviewNav, icon: ICONS.today },
    { to: `${base}/planning`, label: m.planningNav, icon: ICONS.calendar },
    ...(!isStaff && !isTeacher ? [{ to: `${base}/cahier`, label: m.cahierNav, icon: ICONS.cahier }] : []),
    ...(isTeacher ? [{ to: `${base}/classes`, label: m.classesNav, icon: ICONS.classes }] : []),
    ...(isAdmin || isTeacher ? [{ to: `${base}/notes`, label: "Notes", icon: ICONS.grades }] : []),
    ...(isStaff || isTeacher ? [{ to: `${base}/statistiques`, label: t.monEspace.statistics.navLabel, icon: ICONS.stats }] : []),
    ...(isStaff ? [{ to: `${base}/gestion`, label: m.manageNav, icon: ICONS.manage }] : []),
    { to: `${base}/annonces`, label: m.announcementsNav, icon: ICONS.announcements },
  ];

  // "Mes classes" / "Personnes" stay highlighted on the class and student pages that hang under them.
  const underClasses = /\/(classe|eleve)\//.test(location.pathname);

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-2 pb-6">
        <img src={axiumzLogoLight} alt="AxiumZ" width={320} height={145} className="h-8 w-auto object-contain" />
      </div>

      <p className="px-3 pb-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-mist">{isStaff ? m.adminGroup : isTeacher ? m.teachGroup : m.myGroup}</p>
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const forced = underClasses && ((isTeacher && item.to.endsWith("/classes")) || (isStaff && item.to.endsWith("/gestion")));
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-2xl px-3 py-3 text-[0.88rem] transition-colors md:py-2.5 ${
                  isActive || forced ? "bg-white/15 font-semibold text-white" : "font-medium text-mist hover:bg-white/8 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <svg viewBox="0 0 20 20" className={`h-[18px] w-[18px] shrink-0 ${isActive || forced ? "text-accent-bright" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    {item.icon}
                  </svg>
                  {item.label}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-4 space-y-0.5 border-t border-white/10 pt-3">
        {tutorialFile && (
          <a
            href={tutorialUrl(tutorialFile)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[0.8rem] font-medium text-mist transition-colors hover:bg-white/8 hover:text-white"
          >
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0 text-accent-bright" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 3h7l3 3v11H5V3Zm7 0v3h3M8 10h4M8 13h4" />
            </svg>
            {m.tutorialNav}
          </a>
        )}
        <NavLink to={`${base}/parametres`} className="block w-full rounded-xl px-3 py-2 text-left text-[0.8rem] text-mist transition-colors hover:bg-white/8 hover:text-white">
          {m.settingsNav}
        </NavLink>
        <button type="button" onClick={() => signOut()} className="w-full rounded-xl px-3 py-2 text-left text-[0.8rem] text-mist transition-colors hover:bg-white/8 hover:text-white">
          {m.signOut}
        </button>
      </div>

      {/* Always-visible identity block: the person's name is never more than a glance away. */}
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/8 px-3 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-[0.8rem] font-bold text-ink">{initialsFrom(displayName)}</div>
        <div className="min-w-0">
          <p className="truncate text-[0.85rem] font-semibold text-white">{displayName}</p>
          <p className="text-[0.72rem] text-mist">{isAssistant ? m.roleAssistant : isAdmin ? m.roleAdmin : isTeacher ? m.roleTeacher : m.roleMember}</p>
        </div>
      </div>
    </>
  );

  const bottomItems = navItems.slice(0, 4);

  return (
    <div className="app-shell min-h-screen bg-paper text-gray-900 md:flex">
      {mobileMenuOpen && <div className="fixed inset-0 z-30 bg-gray-900/40 md:hidden" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 -translate-x-full flex-col overflow-y-auto bg-ink px-3 py-5 text-paper transition-transform duration-200 ease-out md:sticky md:top-3 md:z-auto md:m-3 md:h-[calc(100vh-1.5rem)] md:w-64 md:shrink-0 md:translate-x-0 md:rounded-3xl ${
          mobileMenuOpen ? "translate-x-0" : ""
        }`}
      >
        {sidebarContent}
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3 px-4 pt-4 sm:px-8 md:pt-5">
          <img src={axiumzLogo} alt="AxiumZ" width={320} height={145} className="h-7 w-auto object-contain md:hidden" />
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-[0.88rem] text-gray-400 shadow-sm transition-colors hover:border-gray-300 md:max-w-xl"
            aria-label={m_shell.searchButton}
          >
            <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="9" cy="9" r="6" />
              <path d="M14 14l4 4" />
            </svg>
            <span className="min-w-0 flex-1 truncate">{m_shell.searchPlaceholder}</span>
            <span className="hidden shrink-0 rounded-lg border border-gray-200 px-2 py-0.5 text-[0.7rem] text-gray-400 lg:block">Ctrl K</span>
          </button>
          <div className="ml-auto flex items-center gap-2">
            {isStaff && (
              <div className="relative">
                <button type="button" onClick={() => setNewOpen((v) => !v)} className="rounded-2xl bg-gradient-to-br from-ink to-ink-soft px-4 py-3 text-[0.85rem] font-bold text-paper shadow-sm">
                  + {m_shell.newBtn}
                </button>
                {newOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setNewOpen(false)} aria-hidden="true" />
                    <div className="absolute right-0 top-full z-40 mt-2 w-52 rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-gray-100">
                      {[
                        [m_shell.newStudent, `${base}/gestion/eleves?new=1`],
                        ...(isAssistant ? [] : [[m_shell.newClass, `${base}/gestion/classes?new=1`]]),
                        ...(isAssistant ? [] : [[m_shell.newAnnouncement, `${base}/annonces?new=1`]]),
                      ].map(([label, to]) => (
                        <button
                          key={to}
                          type="button"
                          onClick={() => {
                            setNewOpen(false);
                            navigate(to);
                          }}
                          className="block w-full rounded-xl px-3 py-2.5 text-left text-[0.85rem] font-medium text-gray-800 hover:bg-gray-50"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <NotificationBell variant="round" />
          </div>
        </div>

        <main className="min-w-0 pb-28 md:pb-10">
          <MonEspaceErrorBoundary key={location.pathname}>
            <div className="app-fade-in">
              <Outlet />
            </div>
          </MonEspaceErrorBoundary>
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-30 flex gap-1 rounded-3xl bg-ink p-1.5 shadow-2xl md:hidden" aria-label={m_shell.menu}>
        {bottomItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[0.64rem] font-medium ${isActive ? "bg-accent text-ink" : "text-mist"}`}
          >
            <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              {item.icon}
            </svg>
            <span className="max-w-full truncate">{item.label}</span>
          </NavLink>
        ))}
        <button type="button" onClick={() => setMobileMenuOpen(true)} className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[0.64rem] font-medium text-mist" aria-label={m_shell.menu}>
          <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            {ICONS.menu}
          </svg>
          <span>{m_shell.menu}</span>
        </button>
      </nav>

      {paletteOpen && <CommandPalette base={base} isAdmin={isStaff} onClose={() => setPaletteOpen(false)} />}

      {showTutorialPrompt && tutorialFile && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/50 px-4" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 3h7l3 3v11H5V3Zm7 0v3h3M8 10h4M8 13h4" />
              </svg>
            </div>
            <h2 id="tutorial-title" className="mt-4 text-[1.05rem] font-semibold text-gray-900">
              {m.tutorialTitle}
            </h2>
            <p className="mt-2 text-[0.88rem] leading-relaxed text-gray-500">{m.tutorialBody}</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <a
                href={tutorialUrl(tutorialFile)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => void closeTutorialPrompt()}
                className="rounded-lg bg-accent px-4 py-2.5 text-center text-[0.85rem] font-semibold text-ink transition-opacity hover:opacity-90"
              >
                {m.tutorialOpen}
              </a>
              <button
                type="button"
                onClick={() => void closeTutorialPrompt()}
                className="rounded-lg px-4 py-2.5 text-[0.85rem] font-medium text-gray-500 hover:bg-gray-50"
              >
                {m.tutorialLater}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
