import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { useLocale } from "../../i18n/LocaleContext";
import NotificationBell from "./NotificationBell";
import MonEspaceErrorBoundary from "./MonEspaceErrorBoundary";
import axiumzLogo from "../../assets/images/axiumz-logo.png";

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
  grades: <path d="M6 3h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm2 4h4M8 9.5h4M8 12h2.5" />,
  menu: <path d="M3 5h14M3 10h14M3 15h14" />,
};

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function MonEspaceLayout() {
  const { profile, memberships, isSuperAdmin, signOut } = useAuth();
  const { t } = useLocale();
  const location = useLocation();
  const { lang } = useParams();
  const base = `/${lang ?? "fr"}/mon-espace`;
  const m = t.monEspace.layout;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const primaryRole = isSuperAdmin ? "super_admin" : (memberships[0]?.role_name ?? null);
  const isAdmin = primaryRole === "super_admin" || primaryRole === "center_admin";
  const isTeacher = primaryRole === "teacher";
  const displayName = profile?.full_name?.trim() || m.myAccount;

  const navItems: NavItem[] = [
    { to: `${base}/aujourdhui`, label: isAdmin || isTeacher ? m.todayNav : m.overviewNav, icon: ICONS.today },
    { to: `${base}/planning`, label: m.planningNav, icon: ICONS.calendar },
    ...(isAdmin || isTeacher ? [{ to: `${base}/notes`, label: "Notes", icon: ICONS.grades }] : []),
    ...(isAdmin ? [{ to: `${base}/gestion`, label: m.manageNav, icon: ICONS.manage }] : []),
    { to: `${base}/annonces`, label: m.announcementsNav, icon: ICONS.announcements },
  ];

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-1 pb-5">
        <img src={axiumzLogo} alt="AxiumZ" className="h-8 w-auto object-contain" />
        <NotificationBell />
      </div>

      {/* Always-visible identity block — the person's name should never be
          more than a glance away, regardless of which page they're on. */}
      <div className="mb-5 flex items-center gap-2.5 rounded-xl bg-gradient-to-br from-ink to-ink-soft px-3 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-[0.78rem] font-bold text-ink">
          {initialsFrom(displayName)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[0.85rem] font-semibold text-paper">{displayName}</p>
          <p className="text-[0.7rem] text-mist">
            {isAdmin ? "Administrateur" : isTeacher ? "Enseignant" : "Mon espace"}
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[0.85rem] font-medium transition-colors md:py-2 ${
                isActive ? "bg-gradient-to-r from-ink to-ink-soft text-paper shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`
            }
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {item.icon}
            </svg>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-gray-200 pt-3">
        <NavLink
          to={`${base}/parametres`}
          className="block w-full rounded-md px-2.5 py-2 text-left text-[0.8rem] text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700 md:py-1.5"
        >
          {m.settingsNav}
        </NavLink>
        <button
          type="button"
          onClick={() => signOut()}
          className="w-full rounded-md px-2.5 py-2 text-left text-[0.8rem] text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700 md:py-1.5"
        >
          {m.signOut}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-paper text-gray-900 md:flex-row">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-50"
          aria-label="Menu"
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            {ICONS.menu}
          </svg>
        </button>
        <img src={axiumzLogo} alt="AxiumZ" className="h-6 w-auto object-contain" />
        <NotificationBell />
      </div>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-900/40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col border-r border-gray-200 bg-white px-3 py-5 transition-transform duration-200 ease-out md:relative md:z-auto md:w-60 md:shrink-0 md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : ""
        }`}
      >
        {sidebarContent}
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <MonEspaceErrorBoundary key={location.pathname}>
          <Outlet />
        </MonEspaceErrorBoundary>
      </main>
    </div>
  );
}
