import type { ReactNode } from "react";
import { useAuth } from "../../features/auth/AuthContext";
import { useLocale } from "../../i18n/LocaleContext";

// Wraps an editing screen: for an assistant it becomes consultation only.
export default function ReadOnlyZone({ children }: { children: ReactNode }) {
  const { isAssistant } = useAuth();
  const { t } = useLocale();
  if (!isAssistant) return <>{children}</>;
  return (
    <div className="read-only-zone">
      <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[0.8rem] text-amber-800">{t.monEspace.gestion.readOnly}</p>
      {children}
    </div>
  );
}
