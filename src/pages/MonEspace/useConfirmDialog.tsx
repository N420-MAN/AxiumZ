import { useState, useCallback, type ReactNode } from "react";
import { useLocale } from "../../i18n/LocaleContext";

interface ConfirmState {
  message: string;
  onConfirm: () => void;
  confirmLabel?: string;
  isDestructive?: boolean;
}

/**
 * Renders a confirmation dialog and gives back a
 * `confirm(message, onConfirm, confirmLabel?, isDestructive?)` function to
 * trigger it. Used in front of every destructive action in Mon Espace —
 * deleting a student, a class, an announcement, etc. — so a misclick can
 * no longer silently destroy real data. Both optional params default to
 * the original delete-confirmation behavior (red button, "Supprimer"/
 * "Delete"); pass an explicit label and `isDestructive: false` for
 * confirmations that aren't destructive, like "proceed with this
 * scheduling conflict anyway."
 */
export function useConfirmDialog() {
  const { locale } = useLocale();
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((message: string, onConfirm: () => void, confirmLabel?: string, isDestructive = true) => {
    setState({ message, onConfirm, confirmLabel, isDestructive });
  }, []);

  const cancelLabel = locale === "en" ? "Cancel" : "Annuler";
  const defaultConfirmLabel = locale === "en" ? "Delete" : "Supprimer";

  const dialog: ReactNode = state ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <p className="whitespace-pre-line text-[0.9rem] text-gray-800">{state.message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setState(null)}
            className="rounded-md px-3.5 py-1.5 text-[0.82rem] font-medium text-gray-500 hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              state.onConfirm();
              setState(null);
            }}
            className={`rounded-md px-3.5 py-1.5 text-[0.82rem] font-medium text-white ${
              state.isDestructive === false ? "bg-gray-900 hover:bg-gray-800" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {state.confirmLabel ?? defaultConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}
