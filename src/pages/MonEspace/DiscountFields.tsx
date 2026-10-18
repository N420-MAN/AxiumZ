import { useLocale } from "../../i18n/LocaleContext";
import { money } from "../../lib/discount";

const inputClass = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.9rem] text-gray-900 outline-none focus:border-gray-400";

/** Name + discounted price of the optional discount of a pack or class. */
export default function DiscountFields({
  name,
  price,
  listPrice,
  onChange,
  idPrefix,
}: {
  name: string;
  price: string;
  listPrice: string;
  onChange: (name: string, price: string) => void;
  idPrefix: string;
}) {
  const { t, locale } = useLocale();
  const d = t.monEspace.discount;
  const disc = Number(price);
  const list = Number(listPrice);
  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
        <div>
          <label className="text-[0.8rem] font-medium text-gray-600" htmlFor={`${idPrefix}-discount-name`}>{d.nameLabel}</label>
          <input id={`${idPrefix}-discount-name`} value={name} onChange={(e) => onChange(e.target.value, price)} placeholder={d.namePlaceholder} className={`${inputClass} mt-1`} />
        </div>
        <div>
          <label className="text-[0.8rem] font-medium text-gray-600" htmlFor={`${idPrefix}-discount-price`}>{d.priceLabel}</label>
          <input id={`${idPrefix}-discount-price`} type="number" min="0" step="0.01" value={price} onChange={(e) => onChange(name, e.target.value)} className={`${inputClass} mt-1`} />
        </div>
      </div>
      <p className="mt-1.5 text-[0.74rem] text-gray-500">{d.help}</p>
      {list > 0 && disc > 0 && disc < list && <p className="mt-1 text-[0.8rem] font-semibold text-ink">{d.preview.replace("{amount}", money(list - disc, locale))}</p>}
    </div>
  );
}
