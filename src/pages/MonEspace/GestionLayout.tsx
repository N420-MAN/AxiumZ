import { NavLink, Routes, Route, Navigate, Outlet, useParams } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { useLocale } from "../../i18n/LocaleContext";
import StudentsTable from "./StudentsTable";
import ParentsTable from "./ParentsTable";
import CoursesTable from "./CoursesTable";
import ClassesManager from "./ClassesManager";
import EntityManager from "./EntityManager";
import TermsManager from "./TermsManager";
import AuditLogViewer from "./AuditLogViewer";

const TABS = [
  { to: "eleves", label: "Élèves" },
  { to: "parents", label: "Parents" },
  { to: "programmes", label: "Programmes" },
  { to: "classes", label: "Classes" },
  { to: "enseignants", label: "Enseignants" },
  { to: "periodes", label: "Périodes" },
  { to: "journal", label: "Journal" },
];

function GestionShell() {
  const { lang } = useParams();
  const base = `/${lang ?? "fr"}/mon-espace/gestion`;

  return (
    <div>
      <div className="border-b border-gray-200 bg-white px-4 sm:px-8">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={`${base}/${tab.to}`}
              className={({ isActive }) =>
                `whitespace-nowrap border-b-2 px-3 py-3 text-[0.85rem] font-medium transition-colors ${
                  isActive ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-900"
                }`
              }
            >
              {tab.label}
            </NavLink>
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
  const { memberships } = useAuth();
  const { t } = useLocale();
  const m = t.monEspace.gestion;
  const { lang } = useParams();
  const base = `/${lang ?? "fr"}/mon-espace/gestion`;
  const orgId = memberships.find((mem) => mem.role_name === "center_admin")?.organization_id ?? memberships[0]?.organization_id;

  if (!orgId) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
        <p className="text-[0.9rem] text-gray-500">{m.noOrganization}</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<GestionShell />}>
        <Route index element={<Navigate to={`${base}/eleves`} replace />} />
        <Route path="eleves" element={<StudentsTable organizationId={orgId} />} />
        <Route path="parents" element={<ParentsTable organizationId={orgId} />} />
        <Route path="programmes" element={<CoursesTable organizationId={orgId} />} />
        <Route path="classes" element={<ClassesManager organizationId={orgId} />} />
        <Route
          path="enseignants"
          element={
            <EntityManager
              table="teachers"
              organizationId={orgId}
              title="Enseignants"
              extraFields={[{ key: "specialization", label: "Spécialisation" }]}
            />
          }
        />
        <Route path="periodes" element={<TermsManager organizationId={orgId} />} />
        <Route path="journal" element={<AuditLogViewer organizationId={orgId} />} />
        <Route path="*" element={<Navigate to={`${base}/eleves`} replace />} />
      </Route>
    </Routes>
  );
}
