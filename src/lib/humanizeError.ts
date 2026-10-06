interface SupabaseLikeError {
  message?: string;
  code?: string;
}

type Locale = "fr" | "en";
type Message = Record<Locale, string>;

// Each message in both languages, side by side, so a rule can never be
// translated in one language and forgotten in the other.
const MESSAGES = {
  emailTaken: { fr: "Cette adresse e-mail est déjà utilisée par un autre compte.", en: "This email address is already used by another account." },
  programNameTaken: { fr: "Un programme porte déjà ce nom.", en: "A programme with this name already exists." },
  levelNameTaken: { fr: "Ce niveau existe déjà dans ce programme.", en: "This niveau already exists in this programme." },
  roomNameTaken: { fr: "Une salle porte déjà ce nom.", en: "A room with this name already exists." },
  wishTaken: { fr: "Cette demande existe déjà pour cette personne.", en: "This request already exists for this person." },
  classFrozen: {
    fr: "Cette classe a des inscrits : son programme et son niveau ne peuvent plus être modifiés.",
    en: "This class has people in it: its programme and niveau can no longer be changed.",
  },
  eleveNeedsParent: { fr: "Un élève doit avoir au moins un parent.", en: "An élève must have at least one parent." },
  lastParent: {
    fr: "Un élève doit garder au moins un parent. Ajoutez-en un autre avant de retirer celui-ci.",
    en: "An élève must keep at least one parent. Add another before removing this one.",
  },
  wrongGuardianKind: {
    fr: "Un parent se lie à un élève, et un superviseur à un stagiaire.",
    en: "A parent links to an élève, and a supervisor to a stagiaire.",
  },
  consentRequired: {
    fr: "Le consentement du stagiaire est nécessaire pour lui associer un superviseur.",
    en: "The stagiaire's consent is required to link a supervisor.",
  },
  notOpen: {
    fr: "Ce programme n'est pas ouvert à ce type de personne (élève ou stagiaire).",
    en: "This programme is not open to this type of person (élève or stagiaire).",
  },
  excludedType: {
    fr: "Des personnes du type exclu sont déjà inscrites dans ce programme.",
    en: "People of the excluded type are already registered in this programme.",
  },
  programTypeLocked: {
    fr: "Un programme qui a des classes ne peut plus changer de type.",
    en: "A programme that has classes can no longer change its type.",
  },
  kindLocked: {
    fr: "Le type d'une personne (élève ou stagiaire) ne peut plus changer une fois qu'elle a des parents, des classes ou des demandes.",
    en: "A person's type (élève or stagiaire) can no longer change once they have guardians, classes or requests.",
  },
  needPlacement: { fr: "Choisissez au moins une classe ou une classe souhaitée.", en: "Choose at least one class or a class wish." },
  notFound: { fr: "Élément introuvable. Actualisez la page et réessayez.", en: "Item not found. Refresh the page and try again." },
  starterOnlyLanguages: { fr: "Les niveaux A1 à C2 ne s'ajoutent qu'à un programme de langues.", en: "The A1 to C2 niveaux can only be added to a language programme." },
  eleveFields: {
    fr: "Pour un élève, l'établissement et l'année scolaire sont obligatoires.",
    en: "For an élève, the school and the année scolaire are required.",
  },
  stagiairePhone: { fr: "Le téléphone est obligatoire pour un stagiaire.", en: "A phone number is required for a stagiaire." },
  parentFields: { fr: "Pour un parent, l'e-mail et l'adresse sont obligatoires.", en: "For a parent, the email and address are required." },
  supervisorEmail: { fr: "L'e-mail est obligatoire pour un superviseur.", en: "An email is required for a supervisor." },
  phoneRequired: { fr: "Le téléphone est obligatoire.", en: "A phone number is required." },
  emailRequired: { fr: "L'e-mail est obligatoire.", en: "An email is required." },
  capacityPositive: { fr: "La capacité doit être supérieure à zéro.", en: "The capacity must be greater than zero." },
  nameRequired: { fr: "Le nom est obligatoire.", en: "A name is required." },
  duplicate: { fr: "Cet enregistrement existe déjà.", en: "This record already exists." },
  rls: { fr: "Vous n'avez pas les droits nécessaires pour effectuer cette action.", en: "You don't have permission to do this." },
  foreignKey: { fr: "Impossible : d'autres éléments dépendent encore de cet enregistrement.", en: "Can't complete this: other records still depend on it." },
  notNull: { fr: "Un champ obligatoire est manquant.", en: "A required field is missing." },
  checkConstraint: { fr: "La valeur saisie n'est pas valide.", en: "The value entered isn't valid." },
  network: { fr: "Problème de connexion. Vérifiez votre connexion internet et réessayez.", en: "Connection problem. Check your internet connection and try again." },
  generic: { fr: "Une erreur est survenue. Merci de réessayer.", en: "Something went wrong. Please try again." },
} satisfies Record<string, Message>;

// Fragments of the database's own wording (rule names or the text of its
// refusals), checked in order: the most specific first.
const RULES: [fragment: string, message: keyof typeof MESSAGES][] = [
  ["email address is already used", "emailTaken"],
  ["programs_unique_name_per_org", "programNameTaken"],
  ["levels_unique_name_per_program", "levelNameTaken"],
  ["rooms_unique_name_per_org", "roomNameTaken"],
  ["class_wishes_no_duplicates", "wishTaken"],
  ["can no longer be changed", "classFrozen"],
  ["must have a parent", "eleveNeedsParent"],
  ["last parent of an eleve", "lastParent"],
  ["can only be linked", "wrongGuardianKind"],
  ["consent is required", "consentRequired"],
  ["not open to this type", "notOpen"],
  ["excluded type", "excludedType"],
  ["cannot change its type", "programTypeLocked"],
  ["cannot be changed once they have", "kindLocked"],
  ["at least one class", "needPlacement"],
  ["Starter niveaux exist only", "starterOnlyLanguages"],
  ["Guardian not found", "notFound"],
  ["Programme not found", "notFound"],
  ["Niveau not found", "notFound"],
  ["Class not found", "notFound"],
  ["Student not found", "notFound"],
  ["Room not found", "notFound"],
  ["students_eleve_fields", "eleveFields"],
  ["students_stagiaire_fields", "stagiairePhone"],
  ["students_email_required", "emailRequired"],
  ["parents_parent_fields", "parentFields"],
  ["parents_superviseur_fields", "supervisorEmail"],
  ["parents_phone_required", "phoneRequired"],
  ["classes_capacity_positive", "capacityPositive"],
  ["classes_name_not_blank", "nameRequired"],
];

/**
 * Raw Postgres/PostgREST errors ("duplicate key value violates unique
 * constraint...", "new row violates row-level security policy...") are
 * meaningless and alarming to a non-technical admin. This maps the common,
 * recognizable patterns to plain language, in the person's current
 * language, and falls back to a generic message rather than ever showing
 * the raw database text.
 */
export function humanizeError(error: unknown, locale: Locale = "fr"): string {
  const err = error as SupabaseLikeError | null;
  const raw = err?.message ?? String(error ?? "");
  const code = err?.code;
  const say = (key: keyof typeof MESSAGES) => MESSAGES[key][locale];

  for (const [fragment, message] of RULES) {
    if (raw.includes(fragment)) return say(message);
  }

  // The database says exactly which class is full and by how much: keep the numbers.
  const capacity = raw.match(/is at capacity \((\d+)\/(\d+)\)/);
  if (capacity) {
    return locale === "en"
      ? `This class is full (${capacity[1]}/${capacity[2]}). Increase its capacity or remove someone first.`
      : `Cette classe est complète (${capacity[1]}/${capacity[2]}). Augmentez sa capacité ou retirez quelqu'un d'abord.`;
  }
  // enforce_score_within_max() raises its own readable message: worth showing as-is.
  if (raw.includes("exceeds the maximum")) return raw;

  if (code === "23505" || raw.includes("duplicate key")) return say("duplicate");
  if (code === "42501" || raw.includes("row-level security")) return say("rls");
  if (code === "23503" || raw.includes("foreign key constraint")) return say("foreignKey");
  if (code === "23502" || raw.includes("null value in column")) return say("notNull");
  if (code === "23514" || raw.includes("violates check constraint")) return say("checkConstraint");
  if (raw.includes("Failed to fetch") || raw.includes("NetworkError")) return say("network");

  return say("generic");
}
