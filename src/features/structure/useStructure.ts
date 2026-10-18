import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { ClassSlot, LevelRow, ProgramRow, PackRow, SpecialtyRow, StructureClass } from "../../lib/programs";

interface Structure {
  programs: ProgramRow[];
  levels: LevelRow[];
  classes: StructureClass[];
  specialties: SpecialtyRow[];
  packs: PackRow[];
  failed: boolean;
}

async function fetchStructure(organizationId: string): Promise<Structure> {
  const [programs, levels, classes, specialties, classSpecialties, slots, packRows, packSubs] = await Promise.all([
    supabase.from("programs").select("id, name, kind, audience, is_active, tracks_school_progress").eq("organization_id", organizationId).order("name"),
    supabase.from("levels").select("id, program_id, name, position").eq("organization_id", organizationId).order("position"),
    supabase
      .from("classes")
      .select("id, name, subject, price_trimestre, discount_name, discount_price, program_id, level_id, teacher_id, capacity, room_id, created_at, teachers(first_name, last_name), class_students(count)")
      .eq("organization_id", organizationId)
      .order("name"),
    supabase.from("specialties").select("id, program_id, level_id, name").eq("organization_id", organizationId).order("name"),
    supabase.from("class_specialties").select("class_id, specialty_id"),
    supabase.from("class_slots").select("id, class_id, weekday, start_time, end_time, room_id").order("weekday").order("start_time"),
    supabase.from("packs").select("id, program_id, level_id, name, price_trimestre, discount_name, discount_price").eq("organization_id", organizationId).order("name"),
    supabase.from("pack_subjects").select("id, pack_id, subject, position").order("position").order("created_at"),
  ]);
  const packs: PackRow[] = ((packRows.data as { id: string; program_id: string; level_id: string; name: string; price_trimestre: number | null; discount_name: string | null; discount_price: number | null }[]) ?? []).map((p) => ({
    ...p,
    subjects: ((packSubs.data as { id: string; pack_id: string; subject: string; position: number }[]) ?? []).filter((x) => x.pack_id === p.id),
  }));
  // Specialties and weekly slots are optional extras: if they cannot be read the structure still loads.
  const specialtiesByClass = new Map<string, string[]>();
  for (const row of (classSpecialties.data as { class_id: string; specialty_id: string }[]) ?? []) {
    specialtiesByClass.set(row.class_id, [...(specialtiesByClass.get(row.class_id) ?? []), row.specialty_id]);
  }
  const slotsByClass = new Map<string, ClassSlot[]>();
  for (const row of (slots.data as (ClassSlot & { class_id: string })[]) ?? []) {
    slotsByClass.set(row.class_id, [...(slotsByClass.get(row.class_id) ?? []), row]);
  }
  const classRows = ((classes.data as unknown as StructureClass[]) ?? []).map((c) => ({
    ...c,
    specialty_ids: specialtiesByClass.get(c.id) ?? [],
    slots: slotsByClass.get(c.id) ?? [],
  }));
  return {
    programs: (programs.data as ProgramRow[]) ?? [],
    levels: (levels.data as LevelRow[]) ?? [],
    classes: classRows,
    specialties: (specialties.data as SpecialtyRow[]) ?? [],
    packs,
    failed: Boolean(programs.error || levels.error || classes.error),
  };
}

// The whole structure (programmes, niveaux, classes with their seat counts) in
// one place, so the pickers and filters on every screen read the same data.
export function useStructure(organizationId: string) {
  const [data, setData] = useState<Structure>({ programs: [], levels: [], classes: [], specialties: [], packs: [], failed: false });
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
