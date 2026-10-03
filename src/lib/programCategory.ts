export type ProgramCategory = "standard" | "centre_langue" | "soutien_mission" | "soutien_bilingue";

export const CATEGORY_BADGE_STYLES: Record<ProgramCategory, string> = {
  standard: "bg-gray-100 text-gray-600",
  centre_langue: "bg-amber-50 text-amber-800 border border-amber-200",
  soutien_mission: "bg-blue-50 text-blue-800 border border-blue-200",
  soutien_bilingue: "bg-purple-50 text-purple-800 border border-purple-200",
};

export function isLanguageCategory(category: ProgramCategory | null | undefined): boolean {
  return category === "centre_langue";
}
