interface SupabaseLikeError {
  message?: string;
  code?: string;
}

/**
 * Raw Postgres/PostgREST errors ("duplicate key value violates unique
 * constraint...", "new row violates row-level security policy...") are
 * meaningless and alarming to a non-technical admin. This maps the common,
 * recognizable patterns to plain language, in the person's current
 * language, and falls back to a generic message rather than ever showing
 * the raw database text.
 */
export function humanizeError(error: unknown, locale: "fr" | "en" = "fr"): string {
  const err = error as SupabaseLikeError | null;
  const raw = err?.message ?? String(error ?? "");
  const code = err?.code;

  const fr = {
    duplicate: "Cet enregistrement existe déjà.",
    rls: "Vous n'avez pas les droits nécessaires pour effectuer cette action.",
    foreignKey: "Impossible : d'autres éléments dépendent encore de cet enregistrement.",
    notNull: "Un champ obligatoire est manquant.",
    checkConstraint: "La valeur saisie n'est pas valide.",
    network: "Problème de connexion. Vérifiez votre connexion internet et réessayez.",
    generic: "Une erreur est survenue. Merci de réessayer.",
  };
  const en = {
    duplicate: "This record already exists.",
    rls: "You don't have permission to do this.",
    foreignKey: "Can't complete this: other records still depend on it.",
    notNull: "A required field is missing.",
    checkConstraint: "The value entered isn't valid.",
    network: "Connection problem. Check your internet connection and try again.",
    generic: "Something went wrong. Please try again.",
  };
  const t = locale === "en" ? en : fr;

  if (code === "23505" || raw.includes("duplicate key")) return t.duplicate;
  if (code === "42501" || raw.includes("row-level security")) return t.rls;
  if (code === "23503" || raw.includes("foreign key constraint")) return t.foreignKey;
  if (code === "23502" || raw.includes("null value in column")) return t.notNull;
  if (code === "23514" || raw.includes("violates check constraint")) {
    // Triggers like enforce_score_within_max() raise their own specific,
    // already-readable message (e.g. "Score 25 exceeds the maximum of 20
    // for this assessment") — those are worth showing as-is rather than
    // flattening into the generic check-constraint message.
    if (raw.includes("exceeds the maximum")) return raw;
    return t.checkConstraint;
  }
  if (raw.includes("Failed to fetch") || raw.includes("NetworkError")) return t.network;

  return t.generic;
}
