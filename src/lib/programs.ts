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
  /** Students of this programme write what they did at their own school before each session. */
  tracks_school_progress: boolean;
}

export interface SpecialtyRow {
  id: string;
  program_id: string;
  level_id: string;
  name: string;
}

export interface PackRow {
  id: string;
  program_id: string;
  level_id: string;
  name: string;
  price_trimestre: number | null;
  discount_name: string | null;
  discount_price: number | null;
  discount_active: boolean;
  subjects: { id: string; subject: string; position: number }[];
}

/** One fixed weekly time of a class. weekday: 1 = Monday ... 7 = Sunday; times are "HH:MM:SS". */
export interface ClassSlot {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  room_id: string | null;
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
  /** The course this class belongs to (Maths, Physique…): groups the same course given on several days. */
  subject: string | null;
  /** Price of this class taken alone, per trimester (MAD). */
  price_trimestre: number | null;
  discount_name: string | null;
  discount_price: number | null;
  discount_active: boolean;
  teachers: { first_name: string; last_name: string } | null;
  class_students: { count: number }[];
  specialty_ids: string[];
  slots: ClassSlot[];
}

const DAY_SHORT = {
  fr: ["", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
  en: ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};

/** "Lun 17:00–19:00" */
/** "1 200 MAD / trimestre". */
export function priceText(n: number, locale: "fr" | "en" = "fr"): string {
  return `${new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR", { maximumFractionDigits: 2 }).format(n)} MAD / ${locale === "en" ? "term" : "trimestre"}`;
}

export function slotText(slot: Pick<ClassSlot, "weekday" | "start_time" | "end_time">, locale: "fr" | "en" = "fr"): string {
  return `${DAY_SHORT[locale][slot.weekday] ?? ""} ${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)}`;
}

/** Two weekly slots collide when they are on the same day and the hours overlap. */
export function slotsOverlap(a: Pick<ClassSlot, "weekday" | "start_time" | "end_time">, b: Pick<ClassSlot, "weekday" | "start_time" | "end_time">): boolean {
  return a.weekday === b.weekday && a.start_time < b.end_time && b.start_time < a.end_time;
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
