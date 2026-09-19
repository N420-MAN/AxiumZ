import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { extractFunctionErrorMessage } from "../../lib/invokeEdgeFunction";
import { humanizeError } from "../../lib/humanizeError";
import { useConfirmDialog } from "./useConfirmDialog";
import SendAnnouncementModal from "./SendAnnouncementModal";

interface StudentOption {
  id: string;
  first_name: string;
  last_name: string;
}
interface ChildLink {
  student_id: string;
  students: { first_name: string; last_name: string } | null;
}
interface ParentRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  user_id: string | null;
  created_at: string;
  children: ChildLink[];
}

type SortKey = "name" | "created_at";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.9rem] text-gray-900 outline-none focus:border-gray-400";

export default function ParentsTable({ organizationId }: { organizationId: string }) {
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", student_id: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingChildFor, setAddingChildFor] = useState<string | null>(null);
  const [extraChildId, setExtraChildId] = useState("");
  const [inviting, setInviting] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<Record<string, string>>({});
  const { confirm, dialog } = useConfirmDialog();
  const [announcingTo, setAnnouncingTo] = useState<ParentRow | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: parentData, error: parentError }, { data: studentData }] = await Promise.all([
      supabase
        .from("parents")
        .select("id, first_name, last_name, email, phone, user_id, created_at, children:parent_students(student_id, students(first_name, last_name))")
        .eq("organization_id", organizationId),
      supabase.from("students").select("id, first_name, last_name").eq("organization_id", organizationId).order("last_name"),
    ]);
    if (parentError) setError(humanizeError(parentError));
    else setError(null);
    setParents((parentData as unknown as ParentRow[]) ?? []);
    setStudents(studentData ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = parents;
    if (q) {
      rows = rows.filter(
        (p) =>
          `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
          p.children.some((c) => `${c.students?.first_name} ${c.students?.last_name}`.toLowerCase().includes(q)),
      );
    }
    return [...rows].sort((a, b) => {
      const cmp = sortKey === "name" ? `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`) : a.created_at.localeCompare(b.created_at);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [parents, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (editingId) {
      const { error: updateError } = await supabase
        .from("parents")
        .update({ first_name: form.first_name, last_name: form.last_name, email: form.email || null, phone: form.phone || null })
        .eq("id", editingId);
      setSaving(false);
      if (updateError) {
        setError(humanizeError(updateError));
        return;
      }
      setEditingId(null);
      setForm({ first_name: "", last_name: "", email: "", phone: "", student_id: "" });
      setShowForm(false);
      load();
      return;
    }

    const { data: newParent, error: insertError } = await supabase
      .from("parents")
      .insert({ organization_id: organizationId, first_name: form.first_name, last_name: form.last_name, email: form.email || null, phone: form.phone || null })
      .select("id")
      .single();
    if (insertError || !newParent) {
      setSaving(false);
      setError(insertError ? humanizeError(insertError) : "Erreur lors de la création du parent.");
      return;
    }
    if (form.student_id) {
      const { error: linkError } = await supabase.from("parent_students").insert({ parent_id: newParent.id, student_id: form.student_id });
      if (linkError) {
        setSaving(false);
        setError(`Parent créé, mais l'association a échoué : ${humanizeError(linkError)}`);
        load();
        return;
      }
    }
    setSaving(false);
    setForm({ first_name: "", last_name: "", email: "", phone: "", student_id: "" });
    setShowForm(false);
    load();
  }

  async function handleDelete(id: string) {
    const { error: deleteError } = await supabase.from("parents").delete().eq("id", id);
    if (deleteError) setError(humanizeError(deleteError));
    else load();
  }

  async function handleAddChild(parentId: string) {
    if (!extraChildId) return;
    const { error: linkError } = await supabase.from("parent_students").insert({ parent_id: parentId, student_id: extraChildId });
    if (linkError) {
      setError(humanizeError(linkError));
      return;
    }
    setExtraChildId("");
    setAddingChildFor(null);
    load();
  }

  async function handleRemoveChild(parentId: string, studentId: string) {
    await supabase.from("parent_students").delete().eq("parent_id", parentId).eq("student_id", studentId);
    load();
  }

  async function handleInvite(p: ParentRow) {
    if (!p.email) return;
    setInviting(p.id);
    setInviteResult((prev) => ({ ...prev, [p.id]: "" }));
    const { data, error: inviteError } = await supabase.functions.invoke("invite-user", {
      body: { organizationId, table: "parents", recordId: p.id, email: p.email, fullName: `${p.first_name} ${p.last_name}` },
    });
    setInviting(null);
    if (inviteError || data?.error) {
      const message = await extractFunctionErrorMessage(inviteError, data);
      setInviteResult((prev) => ({ ...prev, [p.id]: `Erreur : ${message}` }));
      return;
    }
    setInviteResult((prev) => ({ ...prev, [p.id]: "Invitation envoyée ✓" }));
    load();
  }

  function openAddForm() {
    setEditingId(null);
    setForm({ first_name: "", last_name: "", email: "", phone: "", student_id: "" });
    setShowForm(true);
  }

  function openEditForm(p: ParentRow) {
    setEditingId(p.id);
    setForm({ first_name: p.first_name, last_name: p.last_name, email: p.email ?? "", phone: p.phone ?? "", student_id: "" });
    setShowForm(true);
  }

  const SortHeader = ({ label, sortKeyValue }: { label: string; sortKeyValue: SortKey }) => (
    <button type="button" onClick={() => toggleSort(sortKeyValue)} className="flex items-center gap-1 text-[0.75rem] font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-900">
      {label}
      {sortKey === sortKeyValue && <span>{sortDir === "asc" ? "↑" : "↓"}</span>}
    </button>
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
        <div>
          <h2 className="text-[1.1rem] font-semibold text-gray-900">Parents</h2>
          <p className="mt-0.5 text-[0.8rem] text-gray-500">{parents.length} au total</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Rechercher un parent ou un enfant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-md border border-gray-200 px-3 py-1.5 text-[0.85rem] outline-none focus:border-gray-400"
          />
          <button type="button" onClick={() => (showForm ? setShowForm(false) : openAddForm())} className="rounded-md bg-gray-900 px-3.5 py-1.5 text-[0.82rem] font-medium text-white">
            {showForm ? "Annuler" : "+ Ajouter"}
          </button>
        </div>
      </div>

      {error && <p className="px-5 pt-3 text-[0.82rem] text-red-600">{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 border-b border-gray-100 p-5 sm:grid-cols-3">
          <input required placeholder="Prénom" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={inputClass} />
          <input required placeholder="Nom" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={inputClass} />
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
          <input placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
          {!editingId && (
            <select value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} className={`sm:col-span-2 ${inputClass}`}>
              <option value="">Associer à un élève (optionnel)…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </option>
              ))}
            </select>
          )}
          <button type="submit" disabled={saving} className="sm:col-span-3 rounded-md bg-gray-900 px-4 py-2 text-[0.85rem] font-medium text-white disabled:opacity-50">
            {saving ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Enregistrer"}
          </button>
        </form>
      )}

      <div className="overflow-x-auto">
        {loading ? (
          <p className="p-5 text-[0.85rem] text-gray-400">Chargement…</p>
        ) : filteredSorted.length === 0 ? (
          <p className="p-5 text-[0.85rem] text-gray-400">{search ? "Aucun résultat." : "Aucun parent pour le moment."}</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-[0.85rem]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-2.5"><SortHeader label="Nom" sortKeyValue="name" /></th>
                <th className="px-3 py-2.5 text-[0.75rem] font-semibold uppercase tracking-wide text-gray-500">Contact</th>
                <th className="px-3 py-2.5 text-[0.75rem] font-semibold uppercase tracking-wide text-gray-500">Enfants</th>
                <th className="px-3 py-2.5"><SortHeader label="Ajouté le" sortKeyValue="created_at" /></th>
                <th className="px-3 py-2.5 text-[0.75rem] font-semibold uppercase tracking-wide text-gray-500">Compte</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filteredSorted.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0 align-top hover:bg-gray-50">
                  <td className="px-5 py-2.5 font-medium text-gray-900">{p.first_name} {p.last_name}</td>
                  <td className="px-3 py-2.5 text-gray-500">{p.email ?? p.phone ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {p.children.map((c) => (
                        <span key={c.student_id} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[0.75rem] text-gray-700">
                          {c.students?.first_name} {c.students?.last_name}
                          <button type="button" onClick={() => handleRemoveChild(p.id, c.student_id)} className="text-gray-400 hover:text-red-600">×</button>
                        </span>
                      ))}
                      {addingChildFor === p.id ? (
                        <div className="mt-1 flex items-center gap-1">
                          <select value={extraChildId} onChange={(e) => setExtraChildId(e.target.value)} className="rounded border border-gray-200 px-1.5 py-0.5 text-[0.75rem]">
                            <option value="">Élève…</option>
                            {students.filter((s) => !p.children.some((c) => c.student_id === s.id)).map((s) => (
                              <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                            ))}
                          </select>
                          <button type="button" onClick={() => handleAddChild(p.id)} className="text-[0.72rem] text-gray-600 hover:underline">OK</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setAddingChildFor(p.id)} className="text-[0.75rem] text-gray-400 hover:text-gray-700">+ enfant</button>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500">{new Date(p.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="px-3 py-2.5">
                    {p.user_id ? (
                      <span className="text-[0.76rem] font-medium text-green-700">Actif</span>
                    ) : p.email ? (
                      <button type="button" onClick={() => handleInvite(p)} disabled={inviting === p.id} className="text-[0.78rem] text-gray-600 hover:text-gray-900 hover:underline disabled:opacity-60">
                        {inviting === p.id ? "Envoi…" : "Inviter"}
                      </button>
                    ) : (
                      <span className="text-[0.74rem] text-gray-400">Pas d'email</span>
                    )}
                    {inviteResult[p.id] && <p className="mt-0.5 text-[0.7rem] text-gray-400">{inviteResult[p.id]}</p>}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <button type="button" onClick={() => setAnnouncingTo(p)} className="mr-3 text-[0.78rem] text-gray-600 hover:text-gray-900 hover:underline">
                      Annoncer
                    </button>
                    <button type="button" onClick={() => openEditForm(p)} className="mr-3 text-[0.78rem] text-gray-600 hover:text-gray-900 hover:underline">
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => confirm(`Supprimer ${p.first_name} ${p.last_name} ? Cette action est irréversible.`, () => handleDelete(p.id))}
                      className="text-[0.78rem] text-red-600 hover:underline"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {dialog}
      {announcingTo && (
        <SendAnnouncementModal
          targetType="parent"
          targetId={announcingTo.id}
          targetName={`${announcingTo.first_name} ${announcingTo.last_name}`}
          organizationId={organizationId}
          onClose={() => setAnnouncingTo(null)}
        />
      )}
    </div>
  );
}
