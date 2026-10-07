// Shared vocabulary for the center's structure: programmes contain niveaux,
// niveaux contain classes, and people (élèves / stagiaires) join classes.

export type ProgramKind = "scolaire" | "langues";
export type Audience = "eleves" | "stagiaires" | "both";
export type PersonKind = "eleve" | "stagiaire";
export type GuardianKind = "parent" | "superviseur";

export interface ProgramRow {
  id: string;
  name: string;
  kind: ProgramKind;
  audience: Audience;
  is_active: boolean;
}

export interface LevelRow {
  id: string;
  program_id: string;
  name: string;
  position: number;
}

export interface StructureClass {
  id: string;
  name: string;
  program_id: string;
  level_id: string;
  teacher_id: string | null;
  capacity: number | null;
  room_id: string | null;
  created_at: string;
  teachers: { first_name: string; last_name: string } | null;
  class_students: { count: number }[];
}

/** Language programmes get the four-skill scoring and the placement test. */
export function isLanguageProgram(kind: ProgramKind | null | undefined): boolean {
  return kind === "langues";
}

/** Who a programme is open to. */
export function audienceAllows(audience: Audience, person: PersonKind): boolean {
  return audience === "both" || (audience === "eleves" && person === "eleve") || (audience === "stagiaires" && person === "stagiaire");
}

/** A parent goes with an élève, a supervisor with a stagiaire. */
export function guardianKindFor(person: PersonKind): GuardianKind {
  return person === "eleve" ? "parent" : "superviseur";
}

export function enrolledCount(c: Pick<StructureClass, "class_students">): number {
  return c.class_students?.[0]?.count ?? 0;
}

export function isFull(c: Pick<StructureClass, "class_students" | "capacity">): boolean {
  return c.capacity !== null && enrolledCount(c) >= c.capacity;
}

/** "8/10" when the class has a limit, "8" when it doesn't. */
export function seatText(c: Pick<StructureClass, "class_students" | "capacity">): string {
  return c.capacity !== null ? `${enrolledCount(c)}/${c.capacity}` : String(enrolledCount(c));
}

// What a screen selects to be able to name a class in full.
export const CLASS_LABEL_SELECT = "name, programs(name, kind), levels(name)";

export interface ClassLabelParts {
  name: string;
  programs?: { name: string } | null;
  levels?: { name: string } | null;
}

/** "Soutien Mission · 6ème année · maths/physique - classe A" */
export function classLabel(c: ClassLabelParts): string {
  return [c.programs?.name, c.levels?.name, c.name].filter(Boolean).join(" · ");
}

/** Accent- and case-insensitive text for searching. */
export function searchable(value: string | null | undefined): string {
  return (value ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** Existing values that contain what is being typed (never the exact value already typed). */
export function completeFrom(values: string[], query: string, max = 6): { key: string; value: string; title: string }[] {
  const q = searchable(query);
  if (!q) return [];
  return values
    .filter((v) => {
      const s = searchable(v);
      return s.includes(q) && s !== q;
    })
    .sort((a, b) => Number(searchable(b).startsWith(q)) - Number(searchable(a).startsWith(q)))
    .slice(0, max)
    .map((v) => ({ key: v, value: v, title: v }));
}

/** Every word typed must appear somewhere in the text (any order). */
export function matchesWords(text: string | null | undefined, query: string): boolean {
  const haystack = searchable(text);
  return searchable(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}
