import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { extractFunctionErrorMessage } from "../../lib/invokeEdgeFunction";
import { humanizeError } from "../../lib/humanizeError";
import { useConfirmDialog } from "./useConfirmDialog";
import { useLocale } from "../../i18n/LocaleContext";

interface AdminRow {
  user_id: string;
  role_id: number;
  profiles: { full_name: string | null } | null;
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.9rem] text-gray-900 outline-none focus:border-gray-400";

export default function AdminsManager({ organizationId }: { organizationId: string }) {
  const { t } = useLocale();
  const m = t.monEspace.gestion.admins;
  const c = t.monEspace.gestion.common;

  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: "", email: "" });
  const { confirm, dialog } = useConfirmDialog();

  async function load() {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("organization_members")
      .select("user_id, role_id, profiles(full_name)")
      .eq("organization_id", organizationId)
      .in("role_id", [1, 2]);
    if (fetchError) setError(humanizeError(fetchError));
    else setError(null);
    setAdmins((data as unknown as AdminRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { data, error: inviteError } = await supabase.functions.invoke("invite-admin", {
      body: { organizationId, email: form.email, fullName: form.fullName },
    });

    setSaving(false);
    if (inviteError || data?.error) {
      const message = await extractFunctionErrorMessage(inviteError, data);
      setError(message);
      return;
    }
    setForm({ fullName: "", email: "" });
    setShowForm(false);
    load();
  }

  async function handleRemove(userId: string) {
    const { error: deleteError } = await supabase.from("organization_members").delete().eq("organization_id", organizationId).eq("user_id", userId);
    if (deleteError) setError(humanizeError(deleteError));
    else load();
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[1rem] font-semibold text-gray-900">{m.title}</h3>
          <p className="mt-0.5 max-w-lg text-[0.78rem] text-gray-500">{m.description}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="shrink-0 rounded-md bg-gradient-to-br from-ink to-ink-soft px-3.5 py-1.5 text-[0.82rem] font-medium text-paper"
        >
          {showForm ? c.cancel : c.add}
        </button>
      </div>

      {error && <p className="mt-3 text-[0.82rem] text-red-600">{error}</p>}

      {showForm && (
        <form onSubmit={handleInvite} className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
          <input
            required
            placeholder={m.fullNamePlaceholder}
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className={inputClass}
          />
          <input
            required
            type="email"
            placeholder={m.email}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={saving}
            className="sm:col-span-2 rounded-md bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.85rem] font-medium text-paper disabled:opacity-50"
          >
            {saving ? m.inviting : m.invite}
          </button>
        </form>
      )}

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-[0.85rem] text-gray-400">{c.loading}</p>
        ) : admins.length === 0 ? (
          <p className="text-[0.85rem] text-gray-400">{m.empty}</p>
        ) : (
          admins.map((a) => (
            <div key={a.user_id} className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-2.5">
              <div>
                <span className="text-[0.9rem] font-medium text-gray-900">{a.profiles?.full_name || m.unnamed}</span>
                <span className="ml-2 text-[0.78rem] text-gray-500">{a.role_id === 1 ? m.roleSuperAdmin : m.roleCenterAdmin}</span>
              </div>
              {a.role_id !== 1 && (
                <button
                  type="button"
                  onClick={() => confirm(m.removeConfirm.replace("{name}", a.profiles?.full_name || m.unnamed), () => handleRemove(a.user_id))}
                  className="text-[0.78rem] text-red-600 hover:underline"
                >
                  {m.remove}
                </button>
              )}
            </div>
          ))
        )}
      </div>
      {dialog}
    </div>
  );
}
