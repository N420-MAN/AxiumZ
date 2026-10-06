import type { InputHTMLAttributes } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import { matchesWords, searchable } from "../../lib/programs";
import SuggestInput from "./SuggestInput";

export interface NamedItem {
  id: string;
  name: string;
  hint?: string;
  badge?: string;
}

interface NameInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  /** What already exists in the same place (programmes, niveaux of this programme, rooms…). */
  items: NamedItem[];
  /** The record being edited: never its own duplicate. */
  excludeId?: string;
  inputClassName: string;
}

/**
 * A name field that lists what already exists while you type and warns when
 * the exact name is taken, so the same programme, niveau, class or room
 * isn't created twice (and typos of an existing name stand out).
 */
export default function NameInput({ value, onChange, items, excludeId, inputClassName, ...rest }: NameInputProps) {
  const { t } = useLocale();
  const sg = t.monEspace.suggest;

  const pool = items.filter((i) => i.id !== excludeId);
  const query = value.trim();
  const matches = query ? pool.filter((i) => matchesWords(i.name, query)).slice(0, 6) : [];
  const exact = query ? pool.some((i) => searchable(i.name) === searchable(query)) : false;

  return (
    <SuggestInput
      {...rest}
      value={value}
      onChange={onChange}
      suggestions={matches.map((i) => ({ key: i.id, value: i.name, title: i.name, hint: i.hint, badge: i.badge }))}
      fill={false}
      heading={sg.existsHeading}
      warning={exact ? sg.exists : undefined}
      inputClassName={inputClassName}
    />
  );
}
