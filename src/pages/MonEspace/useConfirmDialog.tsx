import { useState, useCallback, type ReactNode } from "react";
import { useLocale } from "../../i18n/LocaleContext";

interface ConfirmState {
  message: string;
  onConfirm: () => void;
}

/**
 * Renders a confirmation dialog and gives back a `confirm(message, onConfirm)`
 * function to trigger it. Used in front of every destructive action in Mon
 * Espace — deleting a student, a class, an announcement, etc. — so a
 * misclick can no longer silently destroy real data.
 */
export function useConfirmDialog() {
  const { locale } = useLocale();
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((message: string, onConfirm: () => void) => {
    setState({ message, onConfirm });
  }, []);

  const cancelLabel = locale === "en" ? "Cancel" : "Annuler";
  const deleteLabel = locale === "en" ? "Delete" : "Supprimer";

  const dialog: ReactNode = state ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <p className="text-[0.9rem] text-gray-800">{state.message}</p>
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
            className="rounded-md bg-red-600 px-3.5 py-1.5 text-[0.82rem] font-medium text-white hover:bg-red-700"
          >
            {deleteLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}
