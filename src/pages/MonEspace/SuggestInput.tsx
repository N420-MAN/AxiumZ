import { useId, useRef, useState, type InputHTMLAttributes, type KeyboardEvent } from "react";

export interface Suggestion {
  key: string;
  /** What fills the field when picked. */
  value: string;
  title: string;
  hint?: string;
  badge?: string;
}

interface SuggestInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  /** Already filtered for the current text. */
  suggestions: Suggestion[];
  /** Picking runs this instead of filling the field. */
  onPick?: (suggestion: Suggestion) => void;
  /** Without onPick: false makes the list informational ("these already exist"). */
  fill?: boolean;
  heading?: string;
  /** Shown under the field, e.g. "this address is already used by …". */
  warning?: string;
  minChars?: number;
  inputClassName: string;
}

/**
 * A text field with a suggestion list: arrow keys + Enter, click, Escape.
 * Used to complete values (schools, grades) and to show what already exists
 * while typing, so the same programme, person or address isn't entered twice.
 */
export default function SuggestInput({
  value,
  onChange,
  suggestions,
  onPick,
  fill = true,
  heading,
  warning,
  minChars = 1,
  inputClassName,
  onKeyDown,
  onFocus,
  onBlur,
  ...inputProps
}: SuggestInputProps) {
  const listId = useId();
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const closeTimer = useRef<number | undefined>(undefined);

  const interactive = Boolean(onPick) || fill;
  const open = focused && value.trim().length >= minChars && suggestions.length > 0;

  function pick(s: Suggestion) {
    if (onPick) onPick(s);
    else onChange(s.value);
    setActive(-1);
    setFocused(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(e);
    if (e.defaultPrevented || !open || !interactive) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault(); // choosing a suggestion must not submit the form
      pick(suggestions[active]);
    } else if (e.key === "Escape") {
      setFocused(false);
    }
  }

  return (
    <div className="relative">
      <input
        {...inputProps}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        className={inputClassName}
        onChange={(e) => {
          onChange(e.target.value);
          setActive(-1);
          setFocused(true);
        }}
        onFocus={(e) => {
          window.clearTimeout(closeTimer.current);
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          // Delay so a click on a suggestion lands before the list closes.
          closeTimer.current = window.setTimeout(() => setFocused(false), 120);
          onBlur?.(e);
        }}
        onKeyDown={handleKeyDown}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {heading && <li className="px-3 pb-1 pt-1.5 text-[0.7rem] font-medium uppercase tracking-wide text-gray-400">{heading}</li>}
          {suggestions.map((s, i) => (
            <li
              key={s.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={interactive ? () => pick(s) : undefined}
              onMouseEnter={() => interactive && setActive(i)}
              className={`flex items-center justify-between gap-3 px-3 py-1.5 text-[0.85rem] ${interactive ? "cursor-pointer" : "cursor-default"} ${
                i === active ? "bg-gray-100" : ""
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-gray-900">{s.title}</span>
                {s.hint && <span className="block truncate text-[0.74rem] text-gray-500">{s.hint}</span>}
              </span>
              {s.badge && <span className="shrink-0 rounded-full border border-gray-200 px-2 py-0.5 text-[0.68rem] text-gray-500">{s.badge}</span>}
            </li>
          ))}
        </ul>
      )}
      {warning && <p className="mt-1 text-[0.74rem] text-amber-700">{warning}</p>}
    </div>
  );
}
