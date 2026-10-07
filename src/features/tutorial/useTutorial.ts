import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../auth/AuthContext";

/**
 * Which tutorial PDF belongs to the signed-in person. The PDFs ship with the
 * site (public/tutoriels). A stagiaire is a "student" membership whose
 * students row has kind = 'stagiaire'; a superviseur is a "parent" membership
 * whose parents row has kind = 'superviseur' — so those two need one lookup.
 */
export function useTutorialFile(): string | null {
  const { user, memberships, isSuperAdmin } = useAuth();
  const role = isSuperAdmin ? "super_admin" : (memberships[0]?.role_name ?? null);
  const userId = user?.id ?? null;
  const [kindFile, setKindFile] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setKindFile(null);
    if (!userId || (role !== "student" && role !== "parent")) return;
    const table = role === "student" ? "students" : "parents";
    supabase
      .from(table)
      .select("kind")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const kind = (data as { kind?: string } | null)?.kind;
        if (role === "student") setKindFile(kind === "stagiaire" ? "stagiaire" : "eleve");
        else setKindFile(kind === "superviseur" ? "superviseur" : "parent");
      });
    return () => {
      cancelled = true;
    };
  }, [userId, role]);

  if (role === "super_admin") return "super-administrateur";
  if (role === "center_admin") return "administrateur";
  if (role === "teacher") return "enseignant";
  if (role === "student" || role === "parent") return kindFile;
  return null;
}

export function tutorialUrl(file: string): string {
  return `/tutoriels/${file}.pdf`;
}
