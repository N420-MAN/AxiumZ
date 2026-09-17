import EntityManager from "./EntityManager";
import ParentsManager from "./ParentsManager";
import CoursesManager from "./CoursesManager";
import ClassesManager from "./ClassesManager";
import AuditLogViewer from "./AuditLogViewer";

interface AdminPanelProps {
  organizationId: string;
}

export default function AdminPanel({ organizationId }: AdminPanelProps) {
  return (
    <div className="mt-10">
      <h2 className="font-display text-[1.3rem] font-extrabold text-paper">Gestion du centre</h2>
      <p className="mt-1 text-[0.85rem] text-mist">
        Ajoutez ou retirez des élèves, enseignants et parents pour ce centre.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-5">
        <EntityManager
          table="students"
          organizationId={organizationId}
          title="Élèves"
          extraFields={[
            { key: "student_number", label: "Numéro élève" },
            { key: "date_of_birth", label: "Date de naissance", type: "date" },
          ]}
        />
        <EntityManager
          table="teachers"
          organizationId={organizationId}
          title="Enseignants"
          extraFields={[{ key: "specialization", label: "Spécialisation" }]}
        />
        <ParentsManager organizationId={organizationId} />
        <CoursesManager organizationId={organizationId} />
        <ClassesManager organizationId={organizationId} />
        <AuditLogViewer organizationId={organizationId} />
      </div>
    </div>
  );
}
