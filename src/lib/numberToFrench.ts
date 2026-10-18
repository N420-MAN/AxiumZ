// "1 250,50" -> "mille deux cent cinquante dirhams et cinquante centimes".
const UNITS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
const TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"];

function below100(n: number): string {
  if (n < 20) return UNITS[n];
  if (n < 70) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (u === 0) return TENS[t];
    return `${TENS[t]}${u === 1 ? " et un" : `-${UNITS[u]}`}`;
  }
  if (n < 80) {
    const r = n - 60; // 70..79 = soixante + 10..19
    return r === 11 ? "soixante et onze" : `soixante-${UNITS[r]}`;
  }
  const r = n - 80; // 80..99 = quatre-vingt(s) + 0..19
  return r === 0 ? "quatre-vingts" : `quatre-vingt-${UNITS[r]}`;
}

function below1000(n: number, final: boolean): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  let out = "";
  if (h > 0) {
    out = h === 1 ? "cent" : `${UNITS[h]} cent`;
    if (r === 0 && h > 1 && final) out += "s";
  }
  if (r > 0) {
    const part = r === 80 && !final ? "quatre-vingt" : below100(r);
    out += out ? ` ${part}` : part;
  }
  return out;
}

export function integerToFrench(n: number): string {
  if (n === 0) return "zéro";
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (millions > 0) parts.push(`${millions === 1 ? "un" : below1000(millions, false)} million${millions > 1 ? "s" : ""}`);
  if (thousands > 0) parts.push(thousands === 1 ? "mille" : `${below1000(thousands, false)} mille`);
  if (rest > 0) parts.push(below1000(rest, true));
  return parts.join(" ");
}

export function amountInFrench(amount: number): string {
  const cents = Math.round(amount * 100);
  const dh = Math.floor(cents / 100);
  const c = cents % 100;
  const base = `${integerToFrench(dh)} ${dh >= 1_000_000 && dh % 1_000_000 === 0 ? "de " : ""}dirham${dh > 1 ? "s" : ""}`;
  return c > 0 ? `${base} et ${integerToFrench(c)} centime${c > 1 ? "s" : ""}` : base;
}
