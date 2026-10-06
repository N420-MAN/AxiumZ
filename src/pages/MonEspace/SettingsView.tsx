import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { humanizeError } from "../../lib/humanizeError";
import { useLocale } from "../../i18n/LocaleContext";
import { uploadTeacherAvatar } from "../../lib/avatarUpload";
import TeacherAvatar from "./TeacherAvatar";
import { useAuth } from "../../features/auth/AuthContext";
import { applyTheme, readCachedTheme, type Theme } from "../../lib/theme";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.9rem] text-gray-900 outline-none focus:border-gray-400";

export default function SettingsView() {
  const { t, locale } = useLocale();
  const m = t.monEspace.gestion.settings;
  const gc = t.monEspace.gestion.common;
  const tp = t.monEspace.teacherProfile;
  const location = useLocation();
  const navigate = useNavigate();
  const [localeSaving, setLocaleSaving] = useState(false);

  const { profile, refresh } = useAuth();
  const theme: Theme = profile?.preferred_theme ?? readCachedTheme();
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeError, setThemeError] = useState(false);

  async function switchTheme(target: Theme) {
    if (target === theme || themeSaving) return;
    setThemeSaving(true);
    setThemeError(false);
    applyTheme(target); // instant, then saved to the account
    const { data: userData } = await supabase.auth.getUser();
    const { error } = userData.user
      ? await supabase.from("profiles").update({ preferred_theme: target }).eq("id", userData.user.id)
      : { error: new Error("no user") };
    if (error) {
      applyTheme(theme);
      setThemeError(true);
    } else {
      await refresh();
    }
    setThemeSaving(false);
  }

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

  // Only populated when this person has their own teachers row — bio and
  // photo are teacher-specific, unlike name/phone which every role has.
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

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

        const { data: teacherRow } = await supabase.from("teachers").select("id, avatar_url, bio").eq("user_id", userData.user.id).maybeSingle();
        if (teacherRow) {
          setTeacherId(teacherRow.id);
          setAvatarUrl(teacherRow.avatar_url);
          setBio(teacherRow.bio ?? "");
        }
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
      supabase.from("teachers").update({ phone: phone || null, bio: bio || null }).eq("user_id", userId),
      supabase.from("parents").update({ phone: phone || null }).eq("user_id", userId),
    ]);

    setPhoneSaving(false);
    setPhoneMessage({ text: m.profileUpdated, isError: false });
  }

  async function handleAvatarChange(file: File | undefined) {
    if (!file || !teacherId) return;
    setAvatarUploading(true);
    setAvatarError(null);
    const result = await uploadTeacherAvatar(teacherId, file);
    setAvatarUploading(false);
    if ("error" in result) {
      setAvatarError(result.error === "too_large" ? tp.photoTooLarge : result.error === "invalid_type" ? tp.photoInvalidType : tp.uploadFailed);
      return;
    }
    setAvatarUrl(result.url);
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
        <h2 className="text-[1rem] font-semibold text-gray-900">{m.themeTitle}</h2>
        <p className="mt-0.5 text-[0.8rem] text-gray-500">{m.themeDescription}</p>
        <div className="mt-3 flex gap-2" role="radiogroup" aria-label={m.themeTitle}>
          {(["light", "dark"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={theme === option}
              disabled={themeSaving}
              onClick={() => switchTheme(option)}
              className={`rounded-md px-4 py-2 text-[0.85rem] font-medium disabled:opacity-60 ${theme === option ? "bg-gradient-to-br from-ink to-ink-soft text-paper ring-1 ring-accent" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              {option === "light" ? m.themeLight : m.themeDark}
            </button>
          ))}
        </div>
        {themeError && <p className="mt-2 text-[0.8rem] text-red-600">{m.themeSaveFailed}</p>}
      </div>

      <div className="mt-5 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-[1rem] font-semibold text-gray-900">{m.profileTitle}</h2>
        <p className="mt-0.5 text-[0.8rem] text-gray-500">{m.profileDescription}</p>
        {phoneLoading ? (
          <p className="mt-3 text-[0.85rem] text-gray-400">{gc.loading}</p>
        ) : (
          <>
            {teacherId && (
              <div className="mt-3 flex items-center gap-3">
                <TeacherAvatar avatarUrl={avatarUrl} name={fullName || "?"} size={56} />
                <label className="cursor-pointer text-[0.82rem] text-gray-600 hover:text-gray-900 hover:underline">
                  {avatarUploading ? tp.uploading : tp.uploadPhoto}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleAvatarChange(e.target.files?.[0])}
                  />
                </label>
              </div>
            )}
            {avatarError && <p className="mt-2 text-[0.8rem] text-red-600">{avatarError}</p>}

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
              {teacherId && (
                <textarea
                  placeholder={tp.bioPlaceholder}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className={`sm:col-span-3 ${inputClass}`}
                />
              )}
            </form>
          </>
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
