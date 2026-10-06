import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { humanizeError } from "../../lib/humanizeError";
import { extractFunctionErrorMessage } from "../../lib/invokeEdgeFunction";
import { useLocale } from "../../i18n/LocaleContext";
import { accountState, sendInvitation } from "../../lib/invitations";
import { type GuardianKind, matchesWords } from "../../lib/programs";
import { useAcceptedAccounts } from "../../features/accounts/useAcceptedAccounts";
import { useOrgDirectory } from "../../features/directory/useOrgDirectory";
import DirectoryField from "./DirectoryField";
import AccountStatus from "./AccountStatus";
import PersonalDataNotice from "./PersonalDataNotice";
import { useConfirmDialog } from "./useConfirmDialog";

interface GuardianRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  company: string | null;
  user_id: string | null;
  parent_students: { student_id: string; students: { first_name: string; last_name: string } | null }[];
}

interface PersonOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface GuardianForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  student_id: string;
}

const EMPTY_FORM: GuardianForm = { first_name: "", last_name: "", email: "", phone: "", address: "", company: "", student_id: "" };

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.9rem] text-gray-900 outline-none focus:border-gray-400";

async function fetchGuardians(organizationId: string, kind: GuardianKind) {
  const personKind = kind === "parent" ? "eleve" : "stagiaire";
  const [guardians, people] = await Promise.all([
    supabase
      .from("parents")
      .select("id, first_name, last_name, email, phone, address, company, user_id, parent_students(student_id, students(first_name, last_name))")
      .eq("organization_id", organizationId)
      .eq("kind", kind)
      .order("last_name"),
    supabase.from("students").select("id, first_name, last_name").eq("organization_id", organizationId).eq("kind", personKind).order("last_name"),
  ]);
  return {
    guardians: (guardians.data as unknown as GuardianRow[]) ?? [],
    people: (people.data as PersonOption[]) ?? [],
    error: guardians.error,
  };
}

export default function GuardiansTable({ kind, organizationId }: { kind: GuardianKind; organizationId: string }) {
  const isSupervisor = kind === "superviseur";
  const { t } = useLocale();
  const gd = t.monEspace.guardian;
  const c = t.monEspace.gestion.common;
  const inv = t.monEspace.invitations;
  const { confirm, dialog } = useConfirmDialog();
  const { accepted, known: acceptanceKnown, reload: reloadAccepted } = useAcceptedAccounts(organizationId);
  const directory = useOrgDirectory(organizationId);
  const reloadDirectory = directory.reload;

  const [guardians, setGuardians] = useState<GuardianRow[]>([]);
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "warn"; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GuardianForm>(EMPTY_FORM);
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<Record<string, string>>({});
  const [linkPick, setLinkPick] = useState<Record<string, string>>({});
  const [linkConsent, setLinkConsent] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const result = await fetchGuardians(organizationId, kind);
    setGuardians(result.guardians);
    setPeople(result.people);
    setError(result.error ? humanizeError(result.error) : null);
    setLoading(false);
    reloadDirectory();
  }, [organizationId, kind, reloadDirectory]);

  useEffect(() => {
    let cancelled = false;
    fetchGuardians(organizationId, kind).then((result) => {
      if (cancelled) return;
      setGuardians(result.guardians);
      setPeople(result.people);
      setError(result.error ? humanizeError(result.error) : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [organizationId, kind]);

  const editing = editingId ? guardians.find((g) => g.id === editingId) : undefined;
  // Someone who already accepted their invitation signs in with this address.
  const emailLocked = editing ? accountState(editing, accepted, acceptanceKnown) === "active" : false;
  const visible = guardians.filter((g) => !search || matchesWords(`${g.first_name} ${g.last_name} ${g.email ?? ""} ${g.phone ?? ""} ${g.parent_students.map((l) => `${l.students?.first_name} ${l.students?.last_name}`).join(" ")}`, search));

  function openAddForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setConsent(false);
    setNotice(null);
    setError(null);
    setShowForm(true);
  }

  function openEditForm(g: GuardianRow) {
    setEditingId(g.id);
    setForm({ first_name: g.first_name, last_name: g.last_name, email: g.email ?? "", phone: g.phone ?? "", address: g.address ?? "", company: g.company ?? "", student_id: "" });
    setNotice(null);
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (isSupervisor && !editingId && form.student_id && !consent) {
      setError(gd.consentError);
      return;
    }
    setSaving(true);
    const fields = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim() || null,
      company: isSupervisor ? form.company.trim() || null : null,
    };

    let guardianId = editingId;
    let shouldInvite = false;
    if (editingId) {
      const emailChanged = fields.email.toLowerCase() !== (editing?.email ?? "").trim().toLowerCase();
      const { error: updateError } = await supabase.from("parents").update(fields).eq("id", editingId);
      if (updateError) {
        setSaving(false);
        setError(humanizeError(updateError));
        return;
      }
      shouldInvite = emailChanged && !emailLocked;
    } else {
      const { data: created, error: insertError } = await supabase
        .from("parents")
        .insert({ organization_id: organizationId, kind, ...fields })
        .select("id")
        .single();
      if (insertError || !created) {
        setSaving(false);
        setError(humanizeError(insertError));
        return;
      }
      guardianId = created.id;
      shouldInvite = true;
      if (form.student_id) {
        const { error: linkError } = await supabase
          .from("parent_students")
          .insert({ parent_id: created.id, student_id: form.student_id, consent_confirmed_at: isSupervisor ? new Date().toISOString() : null });
        if (linkError) setError(humanizeError(linkError));
      }
    }

    // Every guardian has an email, so every new one is invited automatically.
    if (shouldInvite && guardianId) {
      const result = await sendInvitation(organizationId, "parents", guardianId);
      setNotice(
        result.ok
          ? { kind: "ok", text: inv.savedAndInvited.replace("{emails}", fields.email) }
          : { kind: "warn", text: inv.savedInviteFailed.replace("{email}", fields.email).replace("{message}", result.message) },
      );
    } else {
      setNotice({ kind: "ok", text: inv.saved });
    }
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    await Promise.all([load(), reloadAccepted()]);
  }

  async function handleLink(g: GuardianRow) {
    const studentId = linkPick[g.id];
    if (!studentId) return;
    setError(null);
    const { error: linkError } = await supabase
      .from("parent_students")
      .insert({ parent_id: g.id, student_id: studentId, consent_confirmed_at: isSupervisor && linkConsent[g.id] ? new Date().toISOString() : null });
    if (linkError) {
      setError(humanizeError(linkError));
      return;
    }
    setLinkPick((prev) => ({ ...prev, [g.id]: "" }));
    setLinkConsent((prev) => ({ ...prev, [g.id]: false }));
    await load();
  }

  async function handleUnlink(g: GuardianRow, studentId: string) {
    // An élève keeps at least one parent: the database refuses otherwise, and says why.
    const { error: unlinkError } = await supabase.from("parent_students").delete().eq("parent_id", g.id).eq("student_id", studentId);
    setError(unlinkError ? humanizeError(unlinkError) : null);
    await load();
  }

  function handleDelete(g: GuardianRow) {
    confirm(t.monEspace.gestion.students.deleteConfirm.replace("{name}", `${g.first_name} ${g.last_name}`), async () => {
      const { data, error: deleteError } = await supabase.functions.invoke("delete-person", {
        body: { organizationId, table: "parents", recordId: g.id },
      });
      if (deleteError || data?.error) {
        setError(humanizeError(await extractFunctionErrorMessage(deleteError, data)));
        return;
      }
      await load();
    });
  }

  async function handleInvite(g: GuardianRow) {
    setInviting(g.id);
    setInviteResult((prev) => ({ ...prev, [g.id]: "" }));
    const result = await sendInvitation(organizationId, "parents", g.id);
    setInviting(null);
    setInviteResult((prev) => ({ ...prev, [g.id]: result.ok ? inv.sentOk : inv.sentFailed.replace("{message}", result.message) }));
    await Promise.all([load(), reloadAccepted()]);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="text-[1rem] font-semibold text-gray-900">{isSupervisor ? gd.supervisors : gd.parents}</h2>
          <p className="text-[0.78rem] text-gray-400">{isSupervisor ? gd.supervisorsHint : gd.parentsHint}</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="search" placeholder={gd.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} className="w-56 rounded-md border border-gray-200 px-3 py-1.5 text-[0.85rem] outline-none focus:border-gray-400" />
          <button type="button" onClick={() => (showForm ? setShowForm(false) : openAddForm())} className="rounded-md bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.85rem] font-medium text-paper">
            {showForm ? c.cancel : `+ ${isSupervisor ? gd.newSupervisor : gd.newParent}`}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 border-b border-gray-100 p-5 sm:grid-cols-2">
          <DirectoryField
            field="last_name"
            required
            placeholder={`${gd.lastName} *`}
            value={form.last_name}
            onChange={(v) => setForm({ ...form, last_name: v })}
            otherName={form.first_name}
            entries={directory.entries}
            excludeId={editingId ?? undefined}
            canOpen={(e) => e.table === "parents" && e.role === kind}
            onOpen={(e) => {
              const g = guardians.find((x) => x.id === e.id);
              if (g) openEditForm(g);
            }}
            inputClassName={inputClass}
          />
          <DirectoryField
            field="first_name"
            required
            placeholder={`${gd.firstName} *`}
            value={form.first_name}
            onChange={(v) => setForm({ ...form, first_name: v })}
            otherName={form.last_name}
            entries={directory.entries}
            excludeId={editingId ?? undefined}
            canOpen={(e) => e.table === "parents" && e.role === kind}
            onOpen={(e) => {
              const g = guardians.find((x) => x.id === e.id);
              if (g) openEditForm(g);
            }}
            inputClassName={inputClass}
          />
          <div>
            <DirectoryField
              field="email"
              required
              type="email"
              disabled={emailLocked}
              placeholder={`${gd.email} *`}
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              entries={directory.entries}
              excludeId={editingId ?? undefined}
              inputClassName={`${inputClass} disabled:bg-gray-100 disabled:text-gray-500`}
            />
            {emailLocked && <p className="mt-1 text-[0.72rem] text-gray-500">{inv.activeEmailLocked}</p>}
          </div>
          <DirectoryField field="phone" required type="tel" placeholder={`${gd.phone} *`} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} entries={directory.entries} excludeId={editingId ?? undefined} inputClassName={inputClass} />
          <input required={!isSupervisor} placeholder={isSupervisor ? gd.address : `${gd.address} *`} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} />
          {isSupervisor && <input placeholder={gd.company} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={inputClass} />}
          {!editingId && (
            <div className="sm:col-span-2">
              <select value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} className={inputClass}>
                <option value="">{isSupervisor ? gd.linkOptionalTrainee : gd.linkOptionalChild}</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.last_name} {p.first_name}
                  </option>
                ))}
              </select>
              {isSupervisor && form.student_id && (
                <label className="mt-2 flex cursor-pointer items-start gap-2 text-[0.8rem] text-gray-700">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
                  <span>{gd.consent}</span>
                </label>
              )}
            </div>
          )}
          {!editingId && <PersonalDataNotice className="sm:col-span-2" />}
          {!editingId && <p className="text-[0.78rem] text-gray-500 sm:col-span-2">✉ {inv.willSendTo.replace("{emails}", form.email.trim() || "—")}</p>}
          <button type="submit" disabled={saving} className="rounded-md bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.85rem] font-medium text-paper disabled:opacity-50 sm:col-span-2">
            {saving ? c.saving : editingId ? c.saveEdits : c.save}
          </button>
        </form>
      )}

      {error && <p className="px-5 pt-3 text-[0.82rem] text-red-600">{error}</p>}
      {notice && (
        <p className={`mx-5 mt-3 rounded-md px-3 py-2 text-[0.82rem] ${notice.kind === "ok" ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>{notice.text}</p>
      )}

      {loading ? (
        <p className="p-5 text-[0.85rem] text-gray-400">{c.loading}</p>
      ) : visible.length === 0 ? (
        <p className="p-5 text-[0.85rem] text-gray-400">{search ? c.noResults : isSupervisor ? gd.emptySupervisors : gd.emptyParents}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[0.85rem]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {[gd.nameColumn, gd.contactColumn, isSupervisor ? gd.companyColumn : gd.addressColumn, isSupervisor ? gd.traineesColumn : gd.childrenColumn, gd.accountColumn, ""].map((label, i) => (
                  <th key={i} className="px-4 py-2.5 text-[0.75rem] font-semibold uppercase tracking-wide text-gray-500">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((g) => {
                const linkedIds = new Set(g.parent_students.map((l) => l.student_id));
                return (
                  <tr key={g.id} className="border-b border-gray-50 align-top last:border-0">
                    <td className="px-4 py-2.5 font-medium text-gray-900">
                      {g.last_name} {g.first_name}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {g.email ?? "—"}
                      {g.phone && <span className="block text-[0.76rem] text-gray-400">{g.phone}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{isSupervisor ? (g.company ?? "—") : (g.address ?? "—")}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {g.parent_students.map((l) => (
                          <span key={l.student_id} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[0.74rem] text-gray-700">
                            {l.students?.first_name} {l.students?.last_name}
                            <button type="button" onClick={() => handleUnlink(g, l.student_id)} className="text-gray-400 hover:text-red-600" aria-label={gd.unlink}>
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <select value={linkPick[g.id] ?? ""} onChange={(e) => setLinkPick((prev) => ({ ...prev, [g.id]: e.target.value }))} className="max-w-[11rem] rounded-md border border-gray-200 bg-white px-2 py-1 text-[0.76rem] text-gray-700">
                          <option value="">{isSupervisor ? gd.pickTrainee : gd.pickChild}</option>
                          {people
                            .filter((p) => !linkedIds.has(p.id))
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.last_name} {p.first_name}
                              </option>
                            ))}
                        </select>
                        {linkPick[g.id] && (
                          <>
                            {isSupervisor && (
                              <label className="flex items-center gap-1 text-[0.72rem] text-gray-600" title={gd.consent}>
                                <input type="checkbox" checked={linkConsent[g.id] ?? false} onChange={(e) => setLinkConsent((prev) => ({ ...prev, [g.id]: e.target.checked }))} />
                                {gd.consentShort}
                              </label>
                            )}
                            <button type="button" onClick={() => handleLink(g)} className="text-[0.76rem] font-medium text-gray-700 hover:underline">
                              {gd.link}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <AccountStatus state={accountState(g, accepted, acceptanceKnown)} busy={inviting === g.id} result={inviteResult[g.id]} onSend={() => handleInvite(g)} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <button type="button" onClick={() => openEditForm(g)} className="mr-3 text-[0.78rem] text-gray-600 hover:underline">
                        {c.edit}
                      </button>
                      <button type="button" onClick={() => handleDelete(g)} className="text-[0.78rem] text-red-600 hover:underline">
                        {c.delete}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {dialog}
    </div>
  );
}
