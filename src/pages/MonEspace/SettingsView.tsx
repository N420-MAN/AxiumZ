import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { humanizeError } from "../../lib/humanizeError";
import { useLocale } from "../../i18n/LocaleContext";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.9rem] text-gray-900 outline-none focus:border-gray-400";

export default function SettingsView() {
  const { t, locale } = useLocale();
  const m = t.monEspace.gestion.settings;
  const gc = t.monEspace.gestion.common;
  const location = useLocation();
  const navigate = useNavigate();
  const [localeSaving, setLocaleSaving] = useState(false);

  async function switchLocale(target: "fr" | "en") {
    if (target === locale || localeSaving) return;
    setLocaleSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await supabase.from("profiles").update({ preferred_locale: target }).eq("id", userData.user.id);
    }
    setLocaleSaving(false);
    // Mon Espace's sub-paths are identical in both languages, so switching
    // is just swapping the leading /fr or /en segment in place.
    navigate(location.pathname.replace(/^\/(fr|en)/, `/${target}`), { replace: true });
  }

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(true);
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneMessage, setPhoneMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    async function load() {
      setPhoneLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        // profiles.phone is the canonical value shown here, since every
        // authenticated user has a profiles row regardless of role —
        // students/teachers/parents specifically get kept in sync on save,
        // since that's what the notification functions actually read from.
        const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("id", userData.user.id).maybeSingle();
        setFullName(profile?.full_name ?? "");
        setPhone(profile?.phone ?? "");
      }
      setPhoneLoading(false);
    }
    load();
  }, []);

  async function handleSavePhone(e: FormEvent) {
    e.preventDefault();
    setPhoneSaving(true);
    setPhoneMessage(null);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setPhoneSaving(false);
      return;
    }
    const userId = userData.user.id;

    const { error: profileError } = await supabase.from("profiles").update({ full_name: fullName || null, phone: phone || null }).eq("id", userId);
    if (profileError) {
      setPhoneSaving(false);
      setPhoneMessage({ text: humanizeError(profileError), isError: true });
      return;
    }

    // Best-effort sync to whichever role-specific record this person has —
    // a person only ever matches one of these, the others simply affect
    // zero rows, which is not an error.
    await Promise.all([
      supabase.from("students").update({ phone: phone || null }).eq("user_id", userId),
      supabase.from("teachers").update({ phone: phone || null }).eq("user_id", userId),
      supabase.from("parents").update({ phone: phone || null }).eq("user_id", userId),
    ]);

    setPhoneSaving(false);
    setPhoneMessage({ text: m.profileUpdated, isError: false });
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordMessage({ text: m.passwordTooShort, isError: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: m.passwordMismatch, isError: true });
      return;
    }

    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);

    if (error) {
      setPasswordMessage({ text: humanizeError(error), isError: true });
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage({ text: m.passwordUpdated, isError: false });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-10">
      <h1 className="font-display text-[1.5rem] font-bold text-gray-900">{m.title}</h1>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-[1rem] font-semibold text-gray-900">{m.languageTitle}</h2>
        <p className="mt-0.5 text-[0.8rem] text-gray-500">{m.languageDescription}</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => switchLocale("fr")}
            className={`rounded-md px-4 py-2 text-[0.85rem] font-medium ${locale === "fr" ? "bg-gradient-to-br from-ink to-ink-soft text-paper" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            Français
          </button>
          <button
            type="button"
            onClick={() => switchLocale("en")}
            className={`rounded-md px-4 py-2 text-[0.85rem] font-medium ${locale === "en" ? "bg-gradient-to-br from-ink to-ink-soft text-paper" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            English
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-[1rem] font-semibold text-gray-900">{m.profileTitle}</h2>
        <p className="mt-0.5 text-[0.8rem] text-gray-500">{m.profileDescription}</p>
        {phoneLoading ? (
          <p className="mt-3 text-[0.85rem] text-gray-400">{gc.loading}</p>
        ) : (
          <form onSubmit={handleSavePhone} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              type="text"
              placeholder={m.fullNamePlaceholder}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
            />
            <input
              type="tel"
              placeholder={m.phonePlaceholder}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
            />
            <button
              type="submit"
              disabled={phoneSaving}
              className="shrink-0 rounded-md bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.85rem] font-medium text-paper disabled:opacity-50"
            >
              {phoneSaving ? gc.saving : gc.save}
            </button>
          </form>
        )}
        {phoneMessage && (
          <p className={`mt-2 text-[0.8rem] ${phoneMessage.isError ? "text-red-600" : "text-green-700"}`}>{phoneMessage.text}</p>
        )}
      </div>

      <div className="mt-5 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-[1rem] font-semibold text-gray-900">{m.passwordTitle}</h2>
        <p className="mt-0.5 text-[0.8rem] text-gray-500">{m.passwordDescription}</p>
        <form onSubmit={handleChangePassword} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="password"
            placeholder={m.newPasswordPlaceholder}
            minLength={6}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
          <input
            type="password"
            placeholder={m.confirmPasswordPlaceholder}
            minLength={6}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={passwordSaving}
            className="sm:col-span-2 rounded-md bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.85rem] font-medium text-paper disabled:opacity-50"
          >
            {passwordSaving ? gc.saving : m.changePassword}
          </button>
        </form>
        {passwordMessage && (
          <p className={`mt-2 text-[0.8rem] ${passwordMessage.isError ? "text-red-600" : "text-green-700"}`}>{passwordMessage.text}</p>
        )}
      </div>
    </div>
  );
}
