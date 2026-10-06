import { NavLink, Routes, Route, Navigate, Outlet, useParams } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { useLocale } from "../../i18n/LocaleContext";
import PeopleTable from "./PeopleTable";
import GuardiansTable from "./GuardiansTable";
import ProgramsManager from "./ProgramsManager";
import LevelsManager from "./LevelsManager";
import ClassesManager from "./ClassesManager";
import EntityManager from "./EntityManager";
import TermsManager from "./TermsManager";
import AuditLogViewer from "./AuditLogViewer";
import AdminsManager from "./AdminsManager";
import RoomsManager from "./RoomsManager";

interface Tab {
  to: string;
  label: string;
  /** Starts a new group of tabs (people / structure / administration). */
  divider?: boolean;
}

function GestionShell({ tabs }: { tabs: Tab[] }) {
  const { lang } = useParams();
  const base = `/${lang ?? "fr"}/mon-espace/gestion`;

  return (
    <div>
      <div className="border-b border-gray-200 bg-white px-4 sm:px-8">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <div key={tab.to} className="flex items-center">
              {tab.divider && <span className="mx-1.5 h-5 w-px bg-gray-200" aria-hidden="true" />}
              <NavLink
                to={`${base}/${tab.to}`}
                className={({ isActive }) =>
                  `whitespace-nowrap border-b-2 px-3 py-3 text-[0.85rem] font-medium transition-colors ${
                    isActive ? "border-ink text-ink" : "border-transparent text-gray-500 hover:text-gray-900"
                  }`
                }
              >
                {tab.label}
              </NavLink>
            </div>
          ))}
        </nav>
      </div>
      <div className="p-4 sm:p-8">
        <Outlet />
      </div>
    </div>
  );
}

export default function GestionLayout() {
  const { memberships, isSuperAdmin } = useAuth();
  const { t } = useLocale();
  const m = t.monEspace.gestion;
  const { lang } = useParams();
  const base = `/${lang ?? "fr"}/mon-espace/gestion`;
  const orgId = memberships.find((mem) => mem.role_name === "center_admin")?.organization_id ?? memberships[0]?.organization_id;

  const tabs: Tab[] = [
    { to: "eleves", label: t.monEspace.people.eleves },
    { to: "stagiaires", label: t.monEspace.people.stagiaires },
    { to: "parents", label: t.monEspace.guardian.parents },
    { to: "superviseurs", label: t.monEspace.guardian.supervisors },
    { to: "enseignants", label: m.teachersTitle },
    { to: "programmes", label: t.monEspace.programs.title, divider: true },
    { to: "niveaux", label: t.monEspace.levels.title },
    { to: "classes", label: m.classes.title },
    { to: "salles", label: t.monEspace.rooms.title },
    ...(isSuperAdmin ? [{ to: "admins", label: m.admins.title, divider: true }] : []),
    { to: "journal", label: m.journal.title, divider: !isSuperAdmin },
  ];

  if (!orgId) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
        <p className="text-[0.9rem] text-gray-500">{m.noOrganization}</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<GestionShell tabs={tabs} />}>
        <Route index element={<Navigate to={`${base}/eleves`} replace />} />
        <Route path="eleves" element={<PeopleTable kind="eleve" organizationId={orgId} />} />
        <Route path="stagiaires" element={<PeopleTable kind="stagiaire" organizationId={orgId} />} />
        <Route path="parents" element={<GuardiansTable kind="parent" organizationId={orgId} />} />
        <Route path="superviseurs" element={<GuardiansTable kind="superviseur" organizationId={orgId} />} />
        <Route path="programmes" element={<ProgramsManager organizationId={orgId} />} />
        <Route path="niveaux" element={<LevelsManager organizationId={orgId} />} />
        <Route path="classes" element={<ClassesManager organizationId={orgId} />} />
        <Route
          path="enseignants"
          element={
            <EntityManager
              table="teachers"
              organizationId={orgId}
              title={m.teachersTitle}
              extraFields={[{ key: "specialization", label: m.specialization }]}
            />
          }
        />
        {isSuperAdmin && <Route path="admins" element={<AdminsManager organizationId={orgId} />} />}
        <Route path="salles" element={<RoomsManager organizationId={orgId} />} />
        <Route path="periodes" element={<TermsManager organizationId={orgId} />} />
        <Route path="journal" element={<AuditLogViewer organizationId={orgId} />} />
        <Route path="*" element={<Navigate to={`${base}/eleves`} replace />} />
      </Route>
    </Routes>
  );
}
