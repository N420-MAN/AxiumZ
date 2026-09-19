import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useLocale } from "../../i18n/LocaleContext";

interface LogRow {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

// Best-effort human name for whatever record was touched — different
// tables keep their "name" in different columns, so this tries the most
// common shapes in order rather than assuming one.
function extractRecordName(details: Record<string, unknown> | null): string | null {
  if (!details) return null;
  const firstName = details.first_name as string | undefined;
  const lastName = details.last_name as string | undefined;
  if (firstName || lastName) return [firstName, lastName].filter(Boolean).join(" ");
  if (typeof details.title === "string") return details.title;
  if (typeof details.name === "string") return details.name;
  return null;
}

export default function AuditLogViewer({ organizationId }: { organizationId: string }) {
  const { t, locale } = useLocale();
  const m = t.monEspace.gestion.journal;
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";

  const TABLE_LABELS: Record<string, string> = {
    students: m.tableStudents,
    parents: m.tableParents,
    teachers: m.tableTeachers,
    courses: m.tableCourses,
    classes: m.tableClasses,
    academic_terms: m.tableTerms,
    announcements: m.tableAnnouncements,
    assessments: m.tableAssessments,
    grades: m.tableGrades,
    organization_members: m.tableMembers,
  };
  const ACTION_LABELS: Record<string, string> = {
    insert: m.actionCreated,
    update: m.actionUpdated,
    delete: m.actionDeleted,
  };

  const [logs, setLogs] = useState<LogRow[]>([]);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("audit_logs")
        .select("id, user_id, action, table_name, record_id, details, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(50);
      const rows = (data as unknown as LogRow[]) ?? [];
      setLogs(rows);

      // Resolve actor names via a separate lookup — audit_logs.user_id
      // isn't a PostgREST-embeddable relation to profiles, so this fetches
      // the distinct set of actors once and maps client-side.
      const actorIds = Array.from(new Set(rows.map((r) => r.user_id).filter((id): id is string => Boolean(id))));
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", actorIds);
        const map: Record<string, string> = {};
        for (const p of profiles ?? []) {
          if (p.full_name) map[p.id] = p.full_name;
        }
        setActorNames(map);
      }
      setLoading(false);
    }
    load();
  }, [organizationId]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="text-[1rem] font-semibold text-gray-900">{m.title}</h3>
      <p className="mt-1 text-[0.8rem] text-gray-500">{m.description}</p>

      <div className="mt-4 space-y-1.5">
        {loading ? (
          <p className="text-[0.85rem] text-gray-400">{m.loading}</p>
        ) : logs.length === 0 ? (
          <p className="text-[0.85rem] text-gray-400">{m.empty}</p>
        ) : (
          logs.map((log) => {
            const actor = (log.user_id && actorNames[log.user_id]) || m.unknownUser;
            const actionLabel = ACTION_LABELS[log.action] ?? log.action;
            const tableLabel = (log.table_name && TABLE_LABELS[log.table_name]) ?? log.table_name ?? "";
            const recordName = extractRecordName(log.details) ?? (log.record_id ? `#${log.record_id.slice(0, 8)}` : "");
            const line = m.entryLine
              .replace("{actor}", actor)
              .replace("{action}", actionLabel)
              .replace("{table}", tableLabel)
              .replace("{name}", recordName);
            return (
              <div key={log.id} className="flex items-center justify-between rounded-md bg-gray-50 border border-gray-200 px-4 py-2 text-[0.82rem]">
                <span className="text-gray-800">{line}</span>
                <span className="shrink-0 pl-3 text-gray-400">
                  {new Date(log.created_at).toLocaleString(dateLocale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
