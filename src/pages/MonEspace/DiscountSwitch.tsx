import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useLocale } from "../../i18n/LocaleContext";
import { humanizeError } from "../../lib/humanizeError";

// One-click on/off for the offer of a pack or a class (e.g. to run the same offer again next year).
// Saves immediately; the stored offer name and price are kept.
export default function DiscountSwitch({
  table,
  id,
  active,
  onChanged,
}: {
  table: "packs" | "classes";
  id: string;
  active: boolean;
  onChanged: () => void | Promise<void>;
}) {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setBusy(true);
    const { error: e } = await supabase.from(table).update({ discount_active: next }).eq("id", id);
    setError(e ? humanizeError(e) : null);
    await onChanged();
    setBusy(false);
  }

  return (
    <label data-write className="mt-1.5 flex w-fit cursor-pointer items-center gap-2 text-[0.78rem] text-gray-700">
      <input type="checkbox" className="h-4 w-4 accent-[#0f2a5c]" checked={active} disabled={busy} onChange={(e) => toggle(e.target.checked)} />
      {t.monEspace.discount.activeLabel}
      {error && <span role="alert" className="text-red-600">{error}</span>}
    </label>
  );
}
