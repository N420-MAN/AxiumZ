import type { ReactElement } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";

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
  classes: <path d="M3 5.5 10 2l7 3.5-7 3.5-7-3.5Zm0 0v7l7 3.5m0-3.5 7-3.5v-3.5m-7 7v7" />,
  manage: <path d="M10 3v3.5M10 13.5V17M4.2 5.8l2.5 2.5M13.3 11.7l2.5 2.5M3 10h3.5M13.5 10H17M4.2 14.2l2.5-2.5M13.3 8.3l2.5-2.5" />,
  announcements: <path d="M3 11V9a2 2 0 0 1 2-2h1l6-3v12l-6-3H5a2 2 0 0 1-2-2Zm9-8v14M15 8a3 3 0 0 1 0 4" />,
};

export default function MonEspaceLayout() {
  const { profile, memberships, isSuperAdmin, signOut } = useAuth();

  const primaryRole = isSuperAdmin ? "super_admin" : (memberships[0]?.role_name ?? null);
  const isAdmin = primaryRole === "super_admin" || primaryRole === "center_admin";
  const isTeacher = primaryRole === "teacher";

  const navItems: NavItem[] = [
    { to: "aujourdhui", label: isAdmin || isTeacher ? "Aujourd'hui" : "Aperçu", icon: ICONS.today },
    ...(isAdmin || isTeacher ? [{ to: "planning", label: "Planning", icon: ICONS.calendar }] : []),
    ...(isTeacher ? [{ to: "classes", label: "Mes classes", icon: ICONS.classes }] : []),
    ...(isAdmin ? [{ to: "gestion", label: "Gestion", icon: ICONS.manage }] : []),
    { to: "annonces", label: "Annonces", icon: ICONS.announcements },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white px-3 py-5">
        <div className="flex items-center gap-2 px-2 pb-6">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-soft text-[0.75rem] font-bold text-ink">
            A
          </div>
          <span className="font-display text-[0.9rem] font-bold text-ink">AxiumZ</span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[0.85rem] font-medium transition-colors ${
                  isActive ? "bg-gray-100 text-ink" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
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
          <div className="px-2 text-[0.8rem] font-medium text-gray-700">{profile?.full_name || "Mon compte"}</div>
          <button
            type="button"
            onClick={() => signOut()}
            className="mt-1 w-full rounded-md px-2.5 py-1.5 text-left text-[0.8rem] text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700"
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
