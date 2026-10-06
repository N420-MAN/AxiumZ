import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { extractFunctionErrorMessage } from "../../lib/invokeEdgeFunction";
import { humanizeError } from "../../lib/humanizeError";
import { useConfirmDialog } from "./useConfirmDialog";
import { useLocale } from "../../i18n/LocaleContext";
import PersonalDataNotice from "./PersonalDataNotice";
import DirectoryField from "./DirectoryField";
import NameInput from "./NameInput";
import { useOrgDirectory } from "../../features/directory/useOrgDirectory";

interface AdminRow {
  user_id: string;
  role_id: number;
  profiles: { full_name: string | null; phone: string | null } | null;
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.9rem] text-gray-900 outline-none focus:border-gray-400";

export default function AdminsManager({ organizationId }: { organizationId: string }) {
  const { t, locale } = useLocale();
  const m = t.monEspace.gestion.admins;
  const c = t.monEspace.gestion.common;

  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "" });
  const { confirm, dialog } = useConfirmDialog();
  const directory = useOrgDirectory(organizationId);

  // Super admins can correct another admin's name and phone.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ fullName: "", phone: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function startEdit(a: AdminRow) {
    setEditingId(a.user_id);
    setEditForm({ fullName: a.profiles?.full_name ?? "", phone: a.profiles?.phone ?? "" });
    setError(null);
    setNotice(null);
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    if (!editForm.fullName.trim()) {
      setError(m.nameRequired);
      return;
    }
    setEditSaving(true);
    setError(null);
    const { error: updateError } = await supabase.rpc("update_admin_profile", {
      p_organization_id: organizationId,
      p_user_id: editingId,
      p_full_name: editForm.fullName,
      p_phone: editForm.phone,
    });
    setEditSaving(false);
    if (updateError) {
      setError(humanizeError(updateError, locale));
      return;
    }
    setEditingId(null);
    setNotice(m.saved);
    load();
  }

  async function load() {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("organization_members")
      .select("user_id, role_id, profiles(full_name, phone)")
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
      body: { organizationId, email: form.email.trim(), fullName: form.fullName.trim(), phone: form.phone.trim() },
    });

    setSaving(false);
    if (inviteError || data?.error) {
      const message = await extractFunctionErrorMessage(inviteError, data);
      setError(message);
      return;
    }
    setForm({ fullName: "", email: "", phone: "" });
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
      {notice && !error && <p className="mt-3 text-[0.82rem] text-green-700">{notice}</p>}

      {showForm && (
        <form onSubmit={handleInvite} className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
          <NameInput
            required
            placeholder={`${m.fullNamePlaceholder} *`}
            value={form.fullName}
            onChange={(v) => setForm({ ...form, fullName: v })}
            items={[
              ...admins.map((a) => ({ id: a.user_id, name: a.profiles?.full_name ?? "", badge: a.role_id === 1 ? m.roleSuperAdmin : m.roleCenterAdmin })),
              ...directory.entries.map((e) => ({ id: e.id, name: `${e.first_name} ${e.last_name}`, hint: e.email ?? undefined })),
            ].filter((i) => i.name)}
            inputClassName={inputClass}
          />
          <DirectoryField
            field="email"
            required
            type="email"
            placeholder={`${m.email} *`}
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
            entries={directory.entries}
            inputClassName={inputClass}
          />
          <DirectoryField
            field="phone"
            required
            type="tel"
            placeholder={`${m.phone} *`}
            value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })}
            entries={directory.entries}
            inputClassName={inputClass}
          />
          <PersonalDataNotice className="sm:col-span-2" />
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
          admins.map((a) =>
            editingId === a.user_id ? (
              <form key={a.user_id} onSubmit={handleSaveEdit} className="grid grid-cols-1 gap-2 rounded-md border border-gray-300 bg-gray-50 p-3 sm:grid-cols-[1fr_1fr_auto_auto]">
                <input required placeholder={`${m.fullNamePlaceholder} *`} value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} className={inputClass} />
                <input type="tel" placeholder={m.phone} value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className={inputClass} />
                <button type="submit" disabled={editSaving} className="rounded-md bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.85rem] font-medium text-paper disabled:opacity-50">
                  {editSaving ? c.saving : c.save}
                </button>
                <button type="button" onClick={() => setEditingId(null)} className="rounded-md border border-gray-300 px-4 py-2 text-[0.85rem] text-gray-600 hover:bg-white">
                  {c.cancel}
                </button>
              </form>
            ) : (
              <div key={a.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-4 py-2.5">
                <div className="min-w-0">
                  <span className="text-[0.9rem] font-medium text-gray-900">{a.profiles?.full_name || m.unnamed}</span>
                  <span className="ml-2 text-[0.78rem] text-gray-500">{a.role_id === 1 ? m.roleSuperAdmin : m.roleCenterAdmin}</span>
                  <div className="text-[0.78rem] text-gray-500">{a.profiles?.phone || m.noPhone}</div>
                </div>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => startEdit(a)} className="text-[0.78rem] text-gray-700 hover:underline">
                    {m.edit}
                  </button>
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
              </div>
            ),
          )
        )}
      </div>
      {dialog}
    </div>
  );
}
