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
    <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-6">
      <h3 className="font-display text-[1.15rem] font-extrabold">Journal d'activité</h3>
      <p className="mt-1 text-[0.8rem] text-mist">
        Historique des modifications sensibles (rôles, notes) — lecture seule, non modifiable.
      </p>

      <div className="mt-4 space-y-1.5">
        {loading ? (
          <p className="text-[0.85rem] text-mist">Chargement…</p>
        ) : logs.length === 0 ? (
          <p className="text-[0.85rem] text-mist">Aucune activité enregistrée.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between rounded-lg bg-ink-soft px-4 py-2 text-[0.82rem]">
              <span className="text-paper">
                {ACTION_LABELS[log.action] ?? log.action} — <span className="text-mist">{log.table_name}</span>
              </span>
              <span className="text-mist">{new Date(log.created_at).toLocaleString("fr-FR")}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
