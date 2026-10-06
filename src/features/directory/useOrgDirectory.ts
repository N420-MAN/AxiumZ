import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export type DirectoryRole = "eleve" | "stagiaire" | "parent" | "superviseur" | "enseignant";

/** Everyone the center has on file, whatever their role: the basis of every duplicate hint. */
export interface DirectoryEntry {
  id: string;
  table: "students" | "parents" | "teachers";
  role: DirectoryRole;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
}

interface Row {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  kind?: string;
}

export function useOrgDirectory(organizationId: string) {
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);

  const reload = useCallback(async () => {
    const [students, parents, teachers] = await Promise.all([
      supabase.from("students").select("id, first_name, last_name, email, phone, kind").eq("organization_id", organizationId),
      supabase.from("parents").select("id, first_name, last_name, email, phone, kind").eq("organization_id", organizationId),
      supabase.from("teachers").select("id, first_name, last_name, email, phone").eq("organization_id", organizationId),
    ]);
    const make = (rows: Row[] | null, table: DirectoryEntry["table"], role: (r: Row) => DirectoryRole): DirectoryEntry[] =>
      (rows ?? []).map((r) => ({ id: r.id, table, role: role(r), first_name: r.first_name, last_name: r.last_name, email: r.email, phone: r.phone }));
    setEntries([
      ...make(students.data as Row[] | null, "students", (r) => (r.kind === "stagiaire" ? "stagiaire" : "eleve")),
      ...make(parents.data as Row[] | null, "parents", (r) => (r.kind === "superviseur" ? "superviseur" : "parent")),
      ...make(teachers.data as Row[] | null, "teachers", () => "enseignant"),
    ]);
  }, [organizationId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  return { entries, reload };
}
