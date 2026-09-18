import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../features/auth/AuthContext";
import { useLocale } from "../../i18n/LocaleContext";

interface Announcement {
  id: string;
  title: string;
  content: string;
  class_id: string | null;
  created_at: string;
  classes: { name: string } | null;
}
interface ClassOption {
  id: string;
  name: string;
}

export default function AnnouncementsView() {
  const { isSuperAdmin, memberships } = useAuth();
  const { locale, t } = useLocale();
  const m = t.monEspace.announcements;
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";
  const primaryRole = isSuperAdmin ? "super_admin" : (memberships[0]?.role_name ?? null);
  const isAdmin = primaryRole === "super_admin" || primaryRole === "center_admin";
  const isTeacher = primaryRole === "teacher";
  const orgId = memberships[0]?.organization_id;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [myClasses, setMyClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", classId: "" });

  async function load() {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("announcements")
      .select("id, title, content, class_id, created_at, classes(name)")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setAnnouncements([]);
    } else {
      setAnnouncements((data as unknown as Announcement[]) ?? []);
    }

    if (isTeacher) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: teacherRow } = await supabase.from("teachers").select("id").eq("user_id", userData.user.id).maybeSingle();
        if (teacherRow) {
          const { data: classData } = await supabase.from("classes").select("id, name").eq("teacher_id", teacherRow.id);
          setMyClasses(classData ?? []);
        }
      }
    } else if (isAdmin && orgId) {
      const { data: classData } = await supabase.from("classes").select("id, name").eq("organization_id", orgId);
      setMyClasses(classData ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePost(e: FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setSaving(true);
    setError(null);

    const { data: inserted, error: insertError } = await supabase
      .from("announcements")
      .insert({
        organization_id: orgId,
        class_id: form.classId || null,
        title: form.title,
        content: form.content,
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (inserted) {
      supabase.functions.invoke("send-announcement-email", { body: { announcementId: inserted.id } }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Announcement email notification failed:", err);
      });
    }

    setForm({ title: "", content: "", classId: "" });
    setShowForm(false);
    load();
  }

  const canPost = isAdmin || isTeacher;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[1.5rem] font-bold text-gray-900">{m.title}</h1>
        {canPost && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-gray-900 px-3.5 py-1.5 text-[0.82rem] font-medium text-white"
          >
            {showForm ? m.cancelButton : m.newButton}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handlePost} className="mt-5 rounded-lg border border-gray-200 bg-white p-5">
          <input
            required
            placeholder={m.titlePlaceholder}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-[0.9rem] outline-none focus:border-gray-400"
          />
          <textarea
            required
            placeholder={m.messagePlaceholder}
            rows={3}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            className="mt-2.5 w-full rounded-md border border-gray-200 px-3 py-2 text-[0.9rem] outline-none focus:border-gray-400"
          />
          {isAdmin ? (
            <select
              value={form.classId}
              onChange={(e) => setForm({ ...form, classId: e.target.value })}
              className="mt-2.5 w-full rounded-md border border-gray-200 px-3 py-2 text-[0.88rem] text-gray-700"
            >
              <option value="">{m.wholeOrg}</option>
              {myClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <select
              required
              value={form.classId}
              onChange={(e) => setForm({ ...form, classId: e.target.value })}
              className="mt-2.5 w-full rounded-md border border-gray-200 px-3 py-2 text-[0.88rem] text-gray-700"
            >
              <option value="">{m.pickClass}</option>
              {myClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {error && <p className="mt-2 text-[0.82rem] text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="mt-3 rounded-md bg-gray-900 px-4 py-2 text-[0.85rem] font-medium text-white disabled:opacity-50"
          >
            {saving ? m.publishing : m.publishButton}
          </button>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {error && !showForm && <p className="text-[0.85rem] text-red-600">{error}</p>}
        {loading ? (
          <p className="text-[0.88rem] text-gray-400">{m.loading}</p>
        ) : announcements.length === 0 ? (
          <p className="text-[0.88rem] text-gray-400">{m.none}</p>
        ) : (
          announcements.map((a) => (
            <div key={a.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[0.92rem] font-semibold text-gray-900">{a.title}</h3>
                <span className="text-[0.75rem] text-gray-400">{a.classes ? a.classes.name : m.wholeOrg}</span>
              </div>
              <p className="mt-1.5 text-[0.87rem] text-gray-600">{a.content}</p>
              <p className="mt-2 text-[0.72rem] text-gray-400">
                {new Date(a.created_at).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
