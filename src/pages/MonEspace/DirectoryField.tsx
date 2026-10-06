import type { InputHTMLAttributes } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import type { DirectoryEntry } from "../../features/directory/useOrgDirectory";
import { digitsOnly, samePhone } from "../../lib/guardianChoice";
import { matchesWords, searchable } from "../../lib/programs";
import SuggestInput, { type Suggestion } from "./SuggestInput";

export type DirectoryFieldKind = "first_name" | "last_name" | "email" | "phone";

interface DirectoryFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  field: DirectoryFieldKind;
  value: string;
  onChange: (value: string) => void;
  entries: DirectoryEntry[];
  /** The record being edited: it never counts as its own duplicate. */
  excludeId?: string;
  /** The other half of the name, to narrow the suggestions to the same person. */
  otherName?: string;
  /** Records that can be opened from the list (instead of re-entering them). */
  canOpen?: (entry: DirectoryEntry) => boolean;
  onOpen?: (entry: DirectoryEntry) => void;
  inputClassName: string;
}

const MAX = 6;

/**
 * A person field that shows who is already on file while you type — by name,
 * e-mail or phone, across élèves, stagiaires, parents, superviseurs and
 * teachers — and warns when an address or number is already in use.
 */
export default function DirectoryField({ field, value, onChange, entries, excludeId, otherName = "", canOpen, onOpen, inputClassName, ...rest }: DirectoryFieldProps) {
  const { t } = useLocale();
  const sg = t.monEspace.suggest;

  const query = value.trim();
  const pool = entries.filter((e) => e.id !== excludeId);
  let matches: DirectoryEntry[] = [];
  let warning: string | undefined;

  if (field === "first_name" || field === "last_name") {
    if (query.length >= 2) {
      const own = (e: DirectoryEntry) => (field === "first_name" ? e.first_name : e.last_name);
      const other = (e: DirectoryEntry) => (field === "first_name" ? e.last_name : e.first_name);
      matches = pool
        .filter((e) => searchable(own(e)).includes(searchable(query)))
        .filter((e) => !otherName.trim() || matchesWords(other(e), otherName))
        .sort((a, b) => Number(searchable(own(b)).startsWith(searchable(query))) - Number(searchable(own(a)).startsWith(searchable(query))));
    }
  } else if (field === "email") {
    if (query.length >= 3) {
      matches = pool.filter((e) => e.email && searchable(e.email).includes(searchable(query)));
      const owner = pool.find((e) => e.email && searchable(e.email) === searchable(query));
      if (owner) warning = sg.usedBy.replace("{name}", `${owner.first_name} ${owner.last_name}`).replace("{role}", sg.roles[owner.role]);
    }
  } else if (digitsOnly(query).length >= 4) {
    matches = pool.filter((e) => digitsOnly(e.phone).includes(digitsOnly(query)));
    const owner = pool.find((e) => samePhone(e.phone, query));
    if (owner) warning = sg.usedBy.replace("{name}", `${owner.first_name} ${owner.last_name}`).replace("{role}", sg.roles[owner.role]);
  }

  const byKey = new Map(matches.map((e) => [e.table + e.id, e]));
  const suggestions: Suggestion[] = matches.slice(0, MAX).map((e) => ({
    key: e.table + e.id,
    value,
    title: `${e.first_name} ${e.last_name}`,
    hint: [e.email, e.phone].filter(Boolean).join(" · ") || undefined,
    badge: sg.roles[e.role],
  }));

  const openable = Boolean(onOpen);
  return (
    <SuggestInput
      {...rest}
      value={value}
      onChange={onChange}
      suggestions={suggestions}
      fill={false}
      onPick={
        openable
          ? (s) => {
              const entry = byKey.get(s.key);
              if (entry && (!canOpen || canOpen(entry))) onOpen?.(entry);
            }
          : undefined
      }
      heading={openable ? sg.alreadyRegisteredOpen : sg.alreadyRegistered}
      warning={warning}
      minChars={field === "email" ? 3 : field === "phone" ? 4 : 2}
      inputClassName={inputClassName}
    />
  );
}
