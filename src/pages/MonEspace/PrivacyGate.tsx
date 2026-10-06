import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../features/auth/AuthContext";
import { useLocale } from "../../i18n/LocaleContext";
import { pathFor } from "../../i18n/config";
import { BRAND } from "../../data/brand";
import { CNDP_REFERENCE, LEGAL_VERSION } from "../../data/legal";

// Shown once, right after login, until the person has accepted the current
// version of the personal-data notice. Accepting records when and which
// version, on their own profile; changing LEGAL_VERSION asks everyone again.
export default function PrivacyGate() {
  const { profile, signOut, refresh } = useAuth();
  const { t, locale } = useLocale();
  const lg = t.monEspace.legal;
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    if (!profile || !accepted) return;
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ privacy_accepted_at: new Date().toISOString(), privacy_version: LEGAL_VERSION })
      .eq("id", profile.id);
    if (updateError) {
      setSaving(false);
      setError(lg.saveFailed);
      return;
    }
    await refresh();
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-paper px-4 py-8 sm:py-14">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-ink to-ink-soft px-6 py-6 sm:px-8">
          <h1 className="font-display text-[1.35rem] font-semibold leading-snug text-paper sm:text-[1.6rem]">{lg.gateTitle}</h1>
          <p className="mt-1.5 text-[0.88rem] leading-relaxed text-paper/75">{lg.gateIntro}</p>
        </div>

        <div className="px-6 py-6 sm:px-8">
          <div className="space-y-4">
            {lg.sections.map((section) => (
              <div key={section.heading}>
                <h2 className="text-[0.9rem] font-semibold text-gray-900">{section.heading}</h2>
                <p className="mt-0.5 text-[0.86rem] leading-relaxed text-gray-600">{section.body}</p>
              </div>
            ))}
          </div>

          {CNDP_REFERENCE && <p className="mt-4 text-[0.82rem] text-gray-500">{lg.cndpDeclared.replace("{ref}", CNDP_REFERENCE)}</p>}
          <p className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-[0.82rem] leading-relaxed text-gray-600">{lg.minorsNote}</p>
          <p className="mt-3 text-[0.8rem] text-gray-500">
            {BRAND.name} · {BRAND.publicEmail} · {BRAND.phoneDisplay}
          </p>
          <a href={pathFor(locale, "privacy")} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[0.8rem] text-ink underline">
            {lg.readPolicy}
          </a>

          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="text-[0.86rem] leading-snug text-gray-800">{lg.acceptLabel}</span>
          </label>

          {error && <p className="mt-3 text-[0.82rem] text-red-600">{error}</p>}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => signOut()} className="text-[0.82rem] text-gray-500 hover:text-gray-800 hover:underline">
              {lg.signOut}
            </button>
            <button
              type="button"
              disabled={!accepted || saving}
              onClick={handleAccept}
              className="rounded-md bg-gradient-to-br from-ink to-ink-soft px-5 py-2.5 text-[0.88rem] font-medium text-paper disabled:opacity-40"
            >
              {saving ? lg.accepting : lg.acceptButton}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
