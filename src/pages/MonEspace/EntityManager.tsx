import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { extractFunctionErrorMessage } from "../../lib/invokeEdgeFunction";
import { humanizeError } from "../../lib/humanizeError";
import { useConfirmDialog } from "./useConfirmDialog";
import SendAnnouncementModal from "./SendAnnouncementModal";
import { useLocale } from "../../i18n/LocaleContext";
import { uploadTeacherAvatar } from "../../lib/avatarUpload";
import TeacherAvatar from "./TeacherAvatar";
import { accountState, sendInvitation } from "../../lib/invitations";
import { useAcceptedAccounts } from "../../features/accounts/useAcceptedAccounts";
import AccountStatus from "./AccountStatus";
import PersonalDataNotice from "./PersonalDataNotice";

interface ExtraField {
  key: string;
  label: string;
  type?: "text" | "date";
}

interface EntityManagerProps {
  table: "students" | "teachers" | "parents";
  organizationId: string;
  title: string;
  extraFields?: ExtraField[];
}

interface Row {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  user_id: string | null;
  status?: string;
  avatar_url?: string | null;
  bio?: string | null;
  [key: string]: unknown;
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.9rem] text-gray-900 outline-none focus:border-gray-400";

export default function EntityManager({ table, organizationId, title, extraFields = [] }: EntityManagerProps) {
  const { t } = useLocale();
  const c = t.monEspace.gestion.common;
  const s = t.monEspace.gestion.students;
  const inv = t.monEspace.invitations;
  const tp = t.monEspace.teacherProfile;
  const ta = t.monEspace.teacherAdmin;
  // Email and phone are mandatory for teachers (management rule).
  const reqMark = table === "teachers" ? " *" : "";
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const { accepted, known: acceptanceKnown, reload: reloadAccepted } = useAcceptedAccounts(organizationId);
  const [notice, setNotice] = useState<{ kind: "ok" | "warn"; text: string } | null>(null);
  const [inviting, setInviting] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<Record<string, string>>({});
  const { confirm, dialog } = useConfirmDialog();
  const [announcingTo, setAnnouncingTo] = useState<Row | null>(null);
  const [uploadingAvatarFor, setUploadingAvatarFor] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  // Employment status lives in its own admin-only table, so it is kept out
  // of `form` (which is sent as-is to the teachers table).
  type EmploymentType = "liberal" | "establishment";
  const [adminInfo, setAdminInfo] = useState<Record<string, { employment_type: EmploymentType; establishment_name: string | null }>>({});
  const [employmentType, setEmploymentType] = useState<"" | EmploymentType>("");
  const [establishmentName, setEstablishmentName] = useState("");
  const establishmentSuggestions = Array.from(
    new Set(Object.values(adminInfo).map((i) => i.establishment_name?.trim()).filter((v): v is string => Boolean(v))),
  ).sort((a, b) => a.localeCompare(b));

  async function handleAvatarChange(row: Row, file: File | undefined) {
    if (!file) return;
    setUploadingAvatarFor(row.id);
    setAvatarError(null);
    const result = await uploadTeacherAvatar(row.id, file);
    setUploadingAvatarFor(null);
    if ("error" in result) {
      setAvatarError(
        result.error === "too_large" ? tp.photoTooLarge : result.error === "invalid_type" ? tp.photoInvalidType : tp.uploadFailed,
      );
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, avatar_url: result.url } : r)));
  }

  async function load() {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from(table)
      .select("*")
      .eq("organization_id", organizationId)
      .order("last_name");
    if (fetchError) {
      setError(humanizeError(fetchError));
    } else {
      setRows((data as Row[]) ?? []);
      setError(null);
      if (table === "teachers") {
        const { data: infoRows } = await supabase
          .from("teacher_admin_info")
          .select("teacher_id, employment_type, establishment_name")
          .eq("organization_id", organizationId);
        const map: Record<string, { employment_type: EmploymentType; establishment_name: string | null }> = {};
        for (const r of infoRows ?? []) {
          map[r.teacher_id] = { employment_type: r.employment_type as EmploymentType, establishment_name: r.establishment_name };
        }
        setAdminInfo(map);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, organizationId]);

  function openAddForm() {
    setEditingId(null);
    setForm({});
    setEmploymentType("");
    setEstablishmentName("");
    setShowForm(true);
  }

  function openEditForm(row: Row) {
    setEditingId(row.id);
    const prefill: Record<string, string> = {
      first_name: row.first_name ?? "",
      last_name: row.last_name ?? "",
      email: row.email ?? "",
      phone: row.phone ?? "",
      ...(table === "teachers" ? { bio: row.bio ?? "" } : {}),
    };
    for (const f of extraFields) {
      const value = row[f.key];
      prefill[f.key] = value == null ? "" : String(value);
    }
    setForm(prefill);
    setEmploymentType(adminInfo[row.id]?.employment_type ?? "");
    setEstablishmentName(adminInfo[row.id]?.establishment_name ?? "");
    setShowForm(true);
  }

  // Someone who already accepted their invitation signs in with this address,
  // so it can no longer be changed from here.
  const editingRow = editingId ? rows.find((r) => r.id === editingId) : undefined;
  const emailLocked = editingRow ? accountState(editingRow, accepted, acceptanceKnown) === "active" : false;
  const emailChanged = editingId ? (form.email ?? "").trim().toLowerCase() !== (editingRow?.email ?? "").trim().toLowerCase() : false;
  // An invitation goes out for a new person, or when the address was added or
  // corrected before they accepted.
  const willInvite = (form.email ?? "").trim() !== "" && (!editingId || (emailChanged && !emailLocked));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    const payload = { ...form, email: (form.email ?? "").trim(), phone: (form.phone ?? "").trim() };
    let personId: string | null = editingId;
    let saveError: unknown = null;
    if (editingId) {
      ({ error: saveError } = await supabase.from(table).update(payload).eq("id", editingId));
    } else {
      const { data: created, error: insertError } = await supabase
        .from(table)
        .insert({ organization_id: organizationId, ...payload })
        .select("id")
        .single();
      saveError = insertError;
      personId = created?.id ?? null;
    }
    if (saveError || !personId) {
      setSaving(false);
      setError(humanizeError(saveError));
      return;
    }

    // The invitation goes out automatically; a failure never undoes the save.
    let inviteOutcome: { ok: boolean; message?: string } | null = null;
    if (willInvite) {
      const result = await sendInvitation(organizationId, table, personId);
      inviteOutcome = result.ok ? { ok: true } : { ok: false, message: result.message };
    }

    if (table === "teachers") {
      const { error: infoError } = await supabase.from("teacher_admin_info").upsert(
        {
          teacher_id: personId,
          organization_id: organizationId,
          employment_type: employmentType,
          establishment_name: employmentType === "establishment" ? establishmentName.trim() : null,
        },
        { onConflict: "teacher_id" },
      );
      if (infoError) {
        // The teacher itself is saved. Switch to edit mode so submitting
        // again updates this teacher instead of creating a duplicate.
        setSaving(false);
        setEditingId(personId);
        setError(ta.saveFailed);
        load();
        return;
      }
    }
    setSaving(false);
    setForm({});
    setEmploymentType("");
    setEstablishmentName("");
    setEditingId(null);
    setShowForm(false);
    if (inviteOutcome && !inviteOutcome.ok) {
      setNotice({ kind: "warn", text: inv.savedInviteFailed.replace("{email}", payload.email).replace("{message}", inviteOutcome.message ?? "") });
    } else {
      setNotice({ kind: "ok", text: inviteOutcome ? inv.savedAndInvited.replace("{emails}", payload.email) : inv.saved });
    }
    await Promise.all([load(), reloadAccepted()]);
  }

  async function handleDelete(id: string) {
    const { data, error: deleteError } = await supabase.functions.invoke("delete-person", {
      body: { organizationId, table, recordId: id },
    });
    if (deleteError || data?.error) {
      const message = await extractFunctionErrorMessage(deleteError, data);
      setError(message);
      return;
    }
    load();
  }

  async function handleInvite(row: Row) {
    setInviting(row.id);
    setInviteResult((prev) => ({ ...prev, [row.id]: "" }));
    const result = await sendInvitation(organizationId, table, row.id);
    setInviting(null);
    setInviteResult((prev) => ({ ...prev, [row.id]: result.ok ? inv.sentOk : inv.sentFailed.replace("{message}", result.message) }));
    await Promise.all([load(), reloadAccepted()]);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[1rem] font-semibold text-gray-900">{title}</h3>
        <button
          type="button"
          onClick={() => (showForm ? setShowForm(false) : openAddForm())}
          className="rounded-md bg-gradient-to-br from-ink to-ink-soft px-3.5 py-1.5 text-[0.82rem] font-medium text-paper"
        >
          {showForm ? c.cancel : c.add}
        </button>
      </div>

      {error && <p className="mt-3 text-[0.82rem] text-red-600">{error}</p>}
      {notice && (
        <p className={`mt-3 rounded-md px-3 py-2 text-[0.82rem] ${notice.kind === "ok" ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>{notice.text}</p>
      )}
      {avatarError && <p className="mt-3 text-[0.82rem] text-red-600">{avatarError}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
          <input
            required
            placeholder={`${s.firstName} *`}
            value={form.first_name ?? ""}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            className={inputClass}
          />
          <input
            required
            placeholder={`${s.lastName} *`}
            value={form.last_name ?? ""}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            className={inputClass}
          />
          <div>
            <input
              type="email"
              disabled={emailLocked}
              required={table === "teachers"}
              placeholder={`${s.email}${reqMark}`}
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={`${inputClass} disabled:bg-gray-100 disabled:text-gray-500`}
            />
            {emailLocked && <p className="mt-1 text-[0.72rem] text-gray-500">{inv.activeEmailLocked}</p>}
          </div>
          <input
            type="tel"
            required={table === "teachers"}
            placeholder={`${s.phone}${reqMark}`}
            value={form.phone ?? ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={inputClass}
          />
          {extraFields.map((f) => (
            <input
              key={f.key}
              type={f.type ?? "text"}
              placeholder={f.label}
              value={form[f.key] ?? ""}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              className={inputClass}
            />
          ))}
          {table === "teachers" && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:col-span-2">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[0.76rem] text-gray-500">{ta.employmentLabel} *</span>
                  <select
                    required
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as "" | EmploymentType)}
                    className={`mt-1 ${inputClass}`}
                  >
                    <option value="">{ta.choose}</option>
                    <option value="liberal">{ta.liberal}</option>
                    <option value="establishment">{ta.establishment}</option>
                  </select>
                </label>
                {employmentType === "establishment" && (
                  <label className="block">
                    <span className="text-[0.76rem] text-gray-500">{ta.establishmentName} *</span>
                    <input
                      required
                      list="establishment-suggestions"
                      value={establishmentName}
                      onChange={(e) => setEstablishmentName(e.target.value)}
                      className={`mt-1 ${inputClass}`}
                    />
                    <datalist id="establishment-suggestions">
                      {establishmentSuggestions.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </label>
                )}
              </div>
              <p className="mt-2 text-[0.72rem] text-gray-400">{ta.adminOnlyNote}</p>
            </div>
          )}
          {table === "teachers" && (
            <textarea
              placeholder={tp.bioPlaceholder}
              value={form.bio ?? ""}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={3}
              className={`sm:col-span-2 ${inputClass}`}
            />
          )}
          {!editingId && <PersonalDataNotice className="sm:col-span-2" />}
          {willInvite && (
            <p className="text-[0.78rem] text-gray-500 sm:col-span-2">
              ✉ {inv.willSendTo.replace("{emails}", (form.email ?? "").trim())}
              {editingId && emailChanged ? ` ${inv.emailChangedNote}` : ""}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="sm:col-span-2 rounded-md bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.85rem] font-medium text-paper disabled:opacity-50"
          >
            {saving ? c.saving : editingId ? c.saveEdits : c.save}
          </button>
        </form>
      )}

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-[0.85rem] text-gray-400">{c.loading}</p>
        ) : rows.length === 0 ? (
          <p className="text-[0.85rem] text-gray-400">{c.noRecordsYet}</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="rounded-md border border-gray-200 bg-gray-50 px-4 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  {table === "teachers" && <TeacherAvatar avatarUrl={row.avatar_url} name={`${row.first_name} ${row.last_name}`} size={32} />}
                  <div className="min-w-0">
                    <span className="text-[0.9rem] font-medium text-gray-900">
                      {row.first_name} {row.last_name}
                    </span>
                    <span className="ml-2 text-[0.8rem] text-gray-500">{row.email ?? row.phone ?? ""}</span>
                    {table === "teachers" && adminInfo[row.id] && (
                      <span className="ml-2 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[0.7rem] text-gray-500">
                        {adminInfo[row.id].employment_type === "liberal" ? ta.liberal : adminInfo[row.id].establishment_name}
                      </span>
                    )}
                    {table === "teachers" && (
                      <label className="ml-2 cursor-pointer text-[0.76rem] text-gray-500 hover:text-gray-900 hover:underline">
                        {uploadingAvatarFor === row.id ? tp.uploading : tp.uploadPhoto}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => handleAvatarChange(row, e.target.files?.[0])}
                        />
                      </label>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <AccountStatus
                    state={accountState(row, accepted, acceptanceKnown)}
                    busy={inviting === row.id}
                    result={inviteResult[row.id]}
                    onSend={() => handleInvite(row)}
                  />
                  <button type="button" onClick={() => setAnnouncingTo(row)} className="text-[0.8rem] text-gray-600 hover:text-gray-900 hover:underline">
                    {c.announce}
                  </button>
                  <button type="button" onClick={() => openEditForm(row)} className="text-[0.8rem] text-gray-600 hover:text-gray-900 hover:underline">
                    {c.edit}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      confirm(s.deleteConfirm.replace("{name}", `${row.first_name} ${row.last_name}`), () => handleDelete(row.id))
                    }
                    className="text-[0.8rem] text-red-600 hover:underline"
                  >
                    {c.delete}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {dialog}
      {announcingTo && (
        <SendAnnouncementModal
          targetType={table === "students" ? "student" : table === "teachers" ? "teacher" : "parent"}
          targetId={announcingTo.id}
          targetName={`${announcingTo.first_name} ${announcingTo.last_name}`}
          organizationId={organizationId}
          onClose={() => setAnnouncingTo(null)}
        />
      )}
    </div>
  );
}
