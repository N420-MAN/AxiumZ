import { NavLink, Routes, Route, Navigate, Outlet, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { useLocale } from "../../i18n/LocaleContext";
import PeopleTable from "./PeopleTable";
import PreinscriptionsManager from "./PreinscriptionsManager";
import GuardiansTable from "./GuardiansTable";
import ProgramsManager from "./ProgramsManager";
import LevelsManager from "./LevelsManager";
import ClassesManager from "./ClassesManager";
import EntityManager from "./EntityManager";
import TermsManager from "./TermsManager";
import AuditLogViewer from "./AuditLogViewer";
import AdminsManager from "./AdminsManager";
import RoomsManager from "./RoomsManager";
import SpecialtiesManager from "./SpecialtiesManager";
import PacksManager from "./PacksManager";
import PaymentsManager from "./PaymentsManager";
import TeacherHoursReport from "./TeacherHoursReport";
import ReadOnlyZone from "./ReadOnlyZone";
import PeopleDirectory from "./PeopleDirectory";
import StructureTree from "./StructureTree";

interface Tab {
  to: string;
  label: string;
}
interface Group {
  id: string;
  label: string;
  tabs: Tab[];
}

function GestionShell({ groups }: { groups: Group[] }) {
  const { lang } = useParams();
  const { pathname } = useLocation();
  const base = `/${lang ?? "fr"}/mon-espace/gestion`;
  const active = groups.find((gr) => gr.tabs.some((tb) => pathname.startsWith(`${base}/${tb.to}`))) ?? groups[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-8">
      <div className="flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-gray-100 p-1.5 sm:inline-flex" role="tablist">
        {groups.map((gr) => (
          <NavLink
            key={gr.id}
            to={`${base}/${gr.tabs[0].to}`}
            className={`shrink-0 rounded-xl px-5 py-2 text-[0.88rem] transition-colors ${gr.id === active.id ? "bg-white font-bold text-ink shadow-sm" : "font-medium text-gray-500 hover:text-gray-800"}`}
          >
            {gr.label}
          </NavLink>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {active.tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={`${base}/${tab.to}`}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-full px-3.5 py-1.5 text-[0.8rem] font-semibold transition-colors ${isActive ? "bg-ink text-paper" : "bg-gray-100 text-gray-600 hover:text-gray-900"}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
      <div className="mt-5">
        <Outlet />
      </div>
    </div>
  );
}

export default function GestionLayout() {
  const { memberships, isSuperAdmin, isAssistant } = useAuth();
  const { t } = useLocale();
  const m = t.monEspace.gestion;
  const { lang } = useParams();
  const base = `/${lang ?? "fr"}/mon-espace/gestion`;
  const orgId = memberships.find((mem) => mem.role_name === "center_admin")?.organization_id ?? memberships[0]?.organization_id;

  const groups: Group[] = [
    {
      id: "people",
      label: m.groupPeople,
      tabs: [
        { to: "personnes", label: m.allPeople },
        { to: "preinscriptions", label: t.monEspace.preinscriptions.title },
        { to: "eleves", label: t.monEspace.people.eleves },
        { to: "stagiaires", label: t.monEspace.people.stagiaires },
        { to: "parents", label: t.monEspace.guardian.parents },
        { to: "superviseurs", label: t.monEspace.guardian.supervisors },
        { to: "enseignants", label: m.teachersTitle },
        { to: "paiements", label: t.monEspace.payments.title },
      ],
    },
    {
      id: "structure",
      label: m.groupStructure,
      tabs: [
        { to: "structure", label: m.tree },
        { to: "programmes", label: t.monEspace.programs.title },
        { to: "niveaux", label: t.monEspace.levels.title },
        { to: "specialites", label: t.monEspace.specialties.title },
        { to: "classes", label: m.classes.title },
        { to: "packs", label: t.monEspace.packs.title },
        { to: "salles", label: t.monEspace.rooms.title },
      ],
    },
    ...(isAssistant
      ? []
      : [
          {
            id: "admin",
            label: m.groupAdmin,
            tabs: [
              ...(isSuperAdmin ? [{ to: "admins", label: m.admins.title }] : []),
              { to: "assistants", label: m.assistants.title },
              { to: "periodes", label: m.periods },
              { to: "heures", label: t.monEspace.teacherHours.title },
              { to: "journal", label: m.journal.title },
            ],
          },
        ]),
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
      <Route element={<GestionShell groups={groups} />}>
        <Route index element={<Navigate to={`${base}/personnes`} replace />} />
        <Route path="personnes" element={<PeopleDirectory organizationId={orgId} />} />
        <Route path="preinscriptions" element={<PreinscriptionsManager organizationId={orgId} />} />
        <Route path="structure" element={<StructureTree organizationId={orgId} />} />
        <Route path="eleves" element={<PeopleTable kind="eleve" organizationId={orgId} />} />
        <Route path="stagiaires" element={<PeopleTable kind="stagiaire" organizationId={orgId} />} />
        <Route path="parents" element={<GuardiansTable kind="parent" organizationId={orgId} />} />
        <Route path="superviseurs" element={<GuardiansTable kind="superviseur" organizationId={orgId} />} />
        <Route path="programmes" element={<ReadOnlyZone><ProgramsManager organizationId={orgId} /></ReadOnlyZone>} />
        <Route path="niveaux" element={<ReadOnlyZone><LevelsManager organizationId={orgId} /></ReadOnlyZone>} />
        <Route path="specialites" element={<ReadOnlyZone><SpecialtiesManager organizationId={orgId} /></ReadOnlyZone>} />
        <Route path="classes" element={<ReadOnlyZone><ClassesManager organizationId={orgId} /></ReadOnlyZone>} />
        <Route path="paiements" element={<PaymentsManager organizationId={orgId} />} />
        <Route path="packs" element={<ReadOnlyZone><PacksManager organizationId={orgId} /></ReadOnlyZone>} />
        <Route
          path="enseignants"
          element={
            <ReadOnlyZone>
              <EntityManager
                table="teachers"
                organizationId={orgId}
                title={m.teachersTitle}
                extraFields={[{ key: "specialization", label: m.specialization }]}
              />
            </ReadOnlyZone>
          }
        />
        {isSuperAdmin && <Route path="admins" element={<AdminsManager organizationId={orgId} />} />}
        {!isAssistant && <Route path="assistants" element={<AdminsManager organizationId={orgId} variant="assistants" />} />}
        <Route path="salles" element={<ReadOnlyZone><RoomsManager organizationId={orgId} /></ReadOnlyZone>} />
        {!isAssistant && <Route path="heures" element={<TeacherHoursReport organizationId={orgId} />} />}
        {!isAssistant && <Route path="periodes" element={<TermsManager organizationId={orgId} />} />}
        {!isAssistant && <Route path="journal" element={<AuditLogViewer organizationId={orgId} />} />}
        <Route path="*" element={<Navigate to={`${base}/personnes`} replace />} />
      </Route>
    </Routes>
  );
}
