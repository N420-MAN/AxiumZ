import { useLocale } from "../../i18n/LocaleContext";
import type { AccountState } from "../../lib/invitations";

interface AccountStatusProps {
  state: AccountState;
  busy: boolean;
  /** Message from the last send attempt, if any. */
  result?: string;
  onSend: () => void;
}

// The "Account" cell shared by students, parents and teachers: shows whether
// the person can sign in, and offers the right action when they can't.
export default function AccountStatus({ state, busy, result, onSend }: AccountStatusProps) {
  const { t } = useLocale();
  const inv = t.monEspace.invitations;
  const c = t.monEspace.gestion.common;

  const actionClass = "text-[0.76rem] text-gray-600 hover:text-gray-900 hover:underline disabled:opacity-60";

  return (
    <div>
      {state === "active" && <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[0.72rem] font-medium text-green-700">{c.active}</span>}

      {state === "pending" && (
        <div className="flex flex-col items-start gap-0.5">
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[0.72rem] font-medium text-amber-800">{inv.pending}</span>
          <button type="button" onClick={onSend} disabled={busy} className={actionClass}>
            {busy ? inv.sending : inv.resend}
          </button>
        </div>
      )}

      {state === "not_invited" && (
        <div className="flex flex-col items-start gap-0.5">
          <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[0.72rem] font-medium text-gray-600">{inv.notInvited}</span>
          <button type="button" onClick={onSend} disabled={busy} className={actionClass}>
            {busy ? inv.sending : inv.sendNow}
          </button>
        </div>
      )}

      {state === "no_email" && <span className="text-[0.74rem] text-gray-400">{c.noEmail}</span>}

      {result && <p className="mt-0.5 max-w-[16rem] text-[0.7rem] leading-snug text-gray-500">{result}</p>}
    </div>
  );
}
