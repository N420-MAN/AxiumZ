/** One named discount per pack / class: a fixed discounted price (e.g. "Offre de bienvenue" : 8 900 instead of 9 700). */
export interface Discount {
  name: string;
  price: number;
}

export function toDiscount(name: string | null | undefined, price: number | string | null | undefined): Discount | null {
  const n = (name ?? "").trim();
  const p = Number(price);
  return n && p > 0 ? { name: n, price: p } : null;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Checks the two form fields against the normal price; returns the values to save, or the kind of error. */
export function parseDiscountFields(
  name: string,
  price: string,
  listPrice: string,
): { ok: true; name: string | null; price: number | null } | { ok: false; error: "both" | "price" } {
  const n = name.trim();
  const p = price.trim();
  if (!n && !p) return { ok: true, name: null, price: null };
  if (!n || !p) return { ok: false, error: "both" };
  const v = Number(p);
  const list = Number(listPrice);
  if (!(v > 0) || !(list > 0) || v >= list) return { ok: false, error: "price" };
  return { ok: true, name: n, price: v };
}

export function money(n: number, locale: "fr" | "en" = "fr"): string {
  return `${new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR", { maximumFractionDigits: 2 }).format(n)} MAD`;
}

export function discountBadge(template: string, d: Discount, locale: "fr" | "en" = "fr"): string {
  return template.replace("{name}", d.name).replace("{price}", money(d.price, locale));
}
