import type { GuardianKind } from "./programs";

// A guardian is a parent (of an élève) or a superviseur (of a stagiaire): the
// same kind of account, with a different form.
export interface GuardianOption {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  company: string | null;
  kind: GuardianKind;
}

export interface GuardianDraft {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
}

// What the admin chose in the form's guardian section.
export type GuardianChoice =
  | { mode: "none" }
  | { mode: "existing"; id: string }
  | { mode: "new"; draft: GuardianDraft };

export const NO_GUARDIAN: GuardianChoice = { mode: "none" };
export const EMPTY_DRAFT: GuardianDraft = { first_name: "", last_name: "", email: "", phone: "", address: "", company: "" };

export function digitsOnly(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

// Two numbers are the same when their last 9 digits match, so "06 78 77 77 69"
// and "+212 678 777 769" are recognized as one number.
export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = digitsOnly(a).slice(-9);
  const y = digitsOnly(b).slice(-9);
  return x.length >= 9 && x === y;
}
