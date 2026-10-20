import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// The public price list. It comes from one database function (public_pricing),
// so a price changed in Mon Espace changes everywhere on the website too.

export interface PublicPack {
  id: string;
  name: string;
  price: number;
  offer_name: string | null;
  offer_price: number | null;
  subjects: string[];
}

export interface PublicSolo {
  price: number;
  offer_name: string | null;
  offer_price: number | null;
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

interface Priced {
  price: number | null;
  offer_name: string | null;
  offer_price: number | null;
}

/** The offer applies only when it is a real reduction. */
export function offerOf(item: Priced): { name: string; price: number } | null {
  if (!item.offer_name || item.offer_price == null || item.price == null) return null;
  return item.offer_price > 0 && item.offer_price < item.price ? { name: item.offer_name, price: item.offer_price } : null;
}

/** What the family pays per trimester once the offer is applied. */
export const payableOf = (item: Priced): number => (offerOf(item)?.price ?? item.price ?? 0);

export const percentOff = (price: number, offer: number): number => Math.round(((price - offer) / price) * 100);

/** Monthly amount when paying in 3 instalments. */
export const perMonth = (total: number): number => Math.round(total / 3);

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
      packs: [...list].sort((a, b) => a.price - b.price || a.name.localeCompare(b.name)),
    }));
}

/** MAD saved by the offer of a pack (0 when there is none). */
export const savingOf = (item: Priced): number => {
  const o = offerOf(item);
  return o && item.price != null ? item.price - o.price : 0;
};

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
