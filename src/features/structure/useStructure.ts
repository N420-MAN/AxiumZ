import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { LevelRow, ProgramRow, StructureClass } from "../../lib/programs";

interface Structure {
  programs: ProgramRow[];
  levels: LevelRow[];
  classes: StructureClass[];
  failed: boolean;
}

async function fetchStructure(organizationId: string): Promise<Structure> {
  const [programs, levels, classes] = await Promise.all([
    supabase.from("programs").select("id, name, kind, audience, is_active").eq("organization_id", organizationId).order("name"),
    supabase.from("levels").select("id, program_id, name, position").eq("organization_id", organizationId).order("position"),
    supabase
      .from("classes")
      .select("id, name, program_id, level_id, teacher_id, capacity, room_id, created_at, teachers(first_name, last_name), class_students(count)")
      .eq("organization_id", organizationId)
      .order("name"),
  ]);
  return {
    programs: (programs.data as ProgramRow[]) ?? [],
    levels: (levels.data as LevelRow[]) ?? [],
    classes: (classes.data as unknown as StructureClass[]) ?? [],
    failed: Boolean(programs.error || levels.error || classes.error),
  };
}

// The whole structure (programmes, niveaux, classes with their seat counts) in
// one place, so the pickers and filters on every screen read the same data.
export function useStructure(organizationId: string) {
  const [data, setData] = useState<Structure>({ programs: [], levels: [], classes: [], failed: false });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setData(await fetchStructure(organizationId));
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    let cancelled = false;
    fetchStructure(organizationId).then((result) => {
      if (cancelled) return;
      setData(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return { ...data, loading, reload };
}
