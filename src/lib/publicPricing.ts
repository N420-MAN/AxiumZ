import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// The public list of packs and programmes (no prices). It comes from one database
// function (public_pricing), so a pack published in Mon Espace appears on the website too.

export interface PublicPack {
  id: string;
  name: string;
  subjects: string[];
}

/** Present when a single subject can be taken alone. */
export interface PublicSolo {
  available: true;
}

export interface PublicLevel {
  id: string;
  name: string;
  specialties: { id: string; name: string }[];
  solo: PublicSolo | null;
  subjects: string[];
  packs: PublicPack[];
}

export interface PublicProgram {
  id: string;
  name: string;
  kind: string;
  levels: PublicLevel[];
}

const KIND_BY_COUNT: Record<number, string> = { 1: "Solo", 2: "Duo", 3: "Trio", 4: "Quatuor", 5: "Quintette" };

/** "DUO: MATHS-PC" → "Duo"; falls back to the number of subjects. */
export function packKind(pack: Pick<PublicPack, "name" | "subjects">): string {
  const prefix = pack.name.split(":")[0]?.trim();
  if (pack.name.includes(":") && prefix) return prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
  return KIND_BY_COUNT[pack.subjects.length] ?? `${pack.subjects.length}`;
}

/** Packs of one level grouped by number of subjects (Duo, Trio…): the price depends on the size, the combination is a second choice. */
export interface PackTier {
  size: number;
  kind: string;
  packs: PublicPack[];
}

export function tiersOf(packs: PublicPack[]): PackTier[] {
  const bySize = new Map<number, PublicPack[]>();
  for (const p of packs) bySize.set(p.subjects.length, [...(bySize.get(p.subjects.length) ?? []), p]);
  return [...bySize.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([size, list]) => ({
      size,
      kind: packKind(list[0]),
      packs: [...list].sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

let cache: Promise<PublicProgram[]> | null = null;

function load(): Promise<PublicProgram[]> {
  if (!cache) {
    cache = Promise.resolve(supabase.rpc("public_pricing")).then(({ data, error }) => {
      if (error) throw error;
      return (data ?? []) as PublicProgram[];
    });
    cache.catch(() => {
      cache = null; // let the next visit retry
    });
  }
  return cache;
}

export function usePublicPricing(): { programs: PublicProgram[]; loading: boolean; failed: boolean } {
  const [programs, setPrograms] = useState<PublicProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    load()
      .then((list) => {
        if (alive) setPrograms(list);
      })
      .catch(() => {
        if (alive) setFailed(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { programs, loading, failed };
}
