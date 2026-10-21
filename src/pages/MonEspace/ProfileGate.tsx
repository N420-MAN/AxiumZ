import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../features/auth/AuthContext";
import { useLocale } from "../../i18n/LocaleContext";
import { humanizeError } from "../../lib/humanizeError";
import { isValidPhone, normalizePhone } from "../../lib/validation";

const inputClass = "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[0.92rem] text-gray-900 outline-none focus:border-gray-400";

interface Gaps {
  needs_phone: boolean;
  needs_employment: boolean;
}

// Teachers, admins and assistants are created with just a name and an email.
// The first time they sign in they must give the rest (phone; for teachers,
// their status) before reaching the app. Nothing here applies to students,
// parents or the super admin.
export default function ProfileGate({ children }: { children: React.ReactNode }) {
  const { memberships, isSuperAdmin, profile, refresh } = useAuth();
  const { t, locale } = useLocale();
  const g = t.monEspace.profileGate;
  const ta = t.monEspace.teacherAdmin;
  const role = memberships[0]?.role_name ?? null;
  const applies = !isSuperAdmin && (role === "teacher" || role === "center_admin" || role === "assistant");

  const [gaps, setGaps] = useState<Gaps | null>(null);
  const [checking, setChecking] = useState(applies);
  const [phone, setPhone] = useState("");
  const [employment, setEmployment] = useState("");
  const [establishment, setEstablishment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!applies) return;
    let cancelled = false;
    supabase.rpc("my_profile_gaps").then(({ data, error: rpcError }) => {
      if (cancelled) return;
      // If the check itself fails, let the person in rather than lock them out.
      setGaps(!rpcError && data ? (data as Gaps) : null);
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [applies, profile?.id]);

  if (!applies) return <>{children}</>;
  if (checking) return <div className="min-h-screen bg-paper" />;
  if (!gaps || (!gaps.needs_phone && !gaps.needs_employment)) return <>{children}</>;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValidPhone(phone)) {
      setError(t.validation.phone);
      return;
    }
    setSaving(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("complete_my_profile", {
      p_phone: normalizePhone(phone) ?? phone.trim(),
      p_employment_type: gaps?.needs_employment ? employment : null,
      p_establishment: gaps?.needs_employment && employment === "establishment" ? establishment.trim() : null,
    });
    setSaving(false);
    if (rpcError) {
      setError(humanizeError(rpcError, locale));
      return;
    }
    setGaps(null);
    await refresh();
  }

  return (
    <div className="min-h-screen bg-paper px-4 py-8 sm:py-14">
      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-ink to-ink-soft px-6 py-6 sm:px-8">
          <h1 className="font-display text-[1.35rem] font-semibold leading-snug text-paper sm:text-[1.6rem]">{g.title}</h1>
          <p className="mt-1.5 text-[0.88rem] leading-relaxed text-paper/75">{g.intro}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6 sm:px-8">
          <p className="text-[0.88rem] text-gray-700">
            <span className="font-semibold">{profile?.full_name}</span>
          </p>
          <label className="block">
            <span className="text-[0.8rem] text-gray-500">{g.phone} *</span>
            <input required type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" className={inputClass} />
          </label>
          {gaps.needs_employment && (
            <>
              <label className="block">
                <span className="text-[0.8rem] text-gray-500">{ta.employmentLabel} *</span>
                <select required value={employment} onChange={(e) => setEmployment(e.target.value)} className={inputClass}>
                  <option value="">{ta.choose}</option>
                  <option value="liberal">{ta.liberal}</option>
                  <option value="establishment">{ta.establishment}</option>
                </select>
              </label>
              {employment === "establishment" && (
                <label className="block">
                  <span className="text-[0.8rem] text-gray-500">{ta.establishmentName} *</span>
                  <input required value={establishment} onChange={(e) => setEstablishment(e.target.value)} className={inputClass} />
                </label>
              )}
              <p className="text-[0.72rem] text-gray-400">{ta.adminOnlyNote}</p>
            </>
          )}
          {error && <p className="text-[0.82rem] text-red-600">{error}</p>}
          <button type="submit" disabled={saving} className="w-full rounded-lg bg-gradient-to-br from-ink to-ink-soft px-4 py-2.5 text-[0.9rem] font-medium text-paper disabled:opacity-50">
            {saving ? g.saving : g.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
