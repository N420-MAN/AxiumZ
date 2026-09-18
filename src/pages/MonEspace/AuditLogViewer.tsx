import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface LogRow {
  id: string;
  action: string;
  table_name: string | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  insert: "Création",
  update: "Modification",
  delete: "Suppression",
};

export default function AuditLogViewer({ organizationId }: { organizationId: string }) {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("audit_logs")
      .select("id, action, table_name, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setLogs(data ?? []);
        setLoading(false);
      });
  }, [organizationId]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="text-[1rem] font-semibold text-gray-900">Journal d'activité</h3>
      <p className="mt-1 text-[0.8rem] text-gray-500">
        Historique des modifications sensibles (rôles, notes) — lecture seule, non modifiable.
      </p>

      <div className="mt-4 space-y-1.5">
        {loading ? (
          <p className="text-[0.85rem] text-gray-400">Chargement…</p>
        ) : logs.length === 0 ? (
          <p className="text-[0.85rem] text-gray-400">Aucune activité enregistrée.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between rounded-md bg-gray-50 border border-gray-200 px-4 py-2 text-[0.82rem]">
              <span className="text-gray-800">
                {ACTION_LABELS[log.action] ?? log.action} — <span className="text-gray-500">{log.table_name}</span>
              </span>
              <span className="text-gray-400">{new Date(log.created_at).toLocaleString("fr-FR")}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
