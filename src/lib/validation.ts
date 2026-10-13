// One definition of "a believable phone number / email" for the whole site.
// The database enforces the same rules (is_valid_phone / is_valid_email), so a
// value that gets past a form here is never refused later, and nothing can
// sneak in through another route.

const SEPARATORS = /[\s.\-()]/g;

function allSameDigit(digits: string): boolean {
  return /^(\d)\1+$/.test(digits);
}

/**
 * Moroccan numbers are 10 digits starting with 05 (landline), 06 or 07
 * (mobile), or the same without the first 0 after +212 / 00212. Numbers from
 * another country are accepted only in international form (+ and 8–15 digits).
 * Returns the number tidied up ("06 12 34 56 78"), or null when it is not valid.
 */
export function normalizePhone(raw: string): string | null {
  const compact = raw.trim().replace(SEPARATORS, "");
  if (!compact) return null;

  let national: string | null = null;
  if (/^0[567]\d{8}$/.test(compact)) national = compact;
  else if (/^(\+212|00212)[567]\d{8}$/.test(compact)) national = `0${compact.replace(/^(\+212|00212)/, "")}`;

  if (national) {
    // 0600000000, 0611111111…: right shape, obviously not a real number.
    if (allSameDigit(national.slice(2))) return null;
    return national.replace(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, "$1 $2 $3 $4 $5");
  }

  if (/^\+(?!212)[1-9]\d{7,14}$/.test(compact) && !allSameDigit(compact.slice(1))) return compact;
  return null;
}

export function isValidPhone(raw: string): boolean {
  return normalizePhone(raw) !== null;
}

const EMAIL = /^[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

export function isValidEmail(raw: string): boolean {
  const v = raw.trim();
  return v.length <= 254 && !v.includes("..") && EMAIL.test(v);
}

/** First problem found among the given fields, as a ready-to-show message (empty values are skipped: "required" is checked elsewhere). */
export function firstContactError(
  fields: { email?: string | null; phone?: string | null },
  messages: { email: string; phone: string },
): string | null {
  if (fields.email && fields.email.trim() && !isValidEmail(fields.email)) return messages.email;
  if (fields.phone && fields.phone.trim() && !isValidPhone(fields.phone)) return messages.phone;
  return null;
}
