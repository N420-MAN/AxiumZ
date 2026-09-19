import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { extractFunctionErrorMessage } from "../../lib/invokeEdgeFunction";
import { humanizeError } from "../../lib/humanizeError";
import { useConfirmDialog } from "./useConfirmDialog";
import SendAnnouncementModal from "./SendAnnouncementModal";

interface StudentRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  student_number: string | null;
  user_id: string | null;
  created_at: string;
  class_students: { classes: { name: string } | null }[];
}

type SortKey = "name" | "created_at";
const EMPTY_FORM = { first_name: "", last_name: "", email: "", phone: "", student_number: "" };

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.9rem] text-gray-900 outline-none focus:border-gray-400";

export default function StudentsTable({ organizationId }: { organizationId: string }) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [inviting, setInviting] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<Record<string, string>>({});
  const { confirm, dialog } = useConfirmDialog();
  const [announcingTo, setAnnouncingTo] = useState<StudentRow | null>(null);

  async function load() {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("students")
      .select("id, first_name, last_name, email, phone, student_number, user_id, created_at, class_students(classes(name))")
      .eq("organization_id", organizationId);
    if (fetchError) setError(humanizeError(fetchError));
    else setError(null);
    setStudents((data as unknown as StudentRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = students;
    if (q) {
      rows = rows.filter((s) => `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) || (s.email ?? "").toLowerCase().includes(q));
    }
    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
      else cmp = a.created_at.localeCompare(b.created_at);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [students, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function openAddForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEditForm(s: StudentRow) {
    setEditingId(s.id);
    setForm({
      first_name: s.first_name,
      last_name: s.last_name,
      email: s.email ?? "",
      phone: s.phone ?? "",
      student_number: s.student_number ?? "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email || null,
      phone: form.phone || null,
      student_number: form.student_number || null,
    };
    const { error: saveError } = editingId
      ? await supabase.from("students").update(payload).eq("id", editingId)
      : await supabase.from("students").insert({ organization_id: organizationId, ...payload });
    setSaving(false);
    if (saveError) {
      setError(humanizeError(saveError));
      return;
    }
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    setError(null);
    load();
  }

  async function handleDelete(id: string) {
    const { error: deleteError } = await supabase.from("students").delete().eq("id", id);
    if (deleteError) setError(humanizeError(deleteError));
    else load();
  }

  async function handleInvite(row: StudentRow) {
    if (!row.email) return;
    setInviting(row.id);
    setInviteResult((prev) => ({ ...prev, [row.id]: "" }));
    const { data, error: inviteError } = await supabase.functions.invoke("invite-user", {
      body: { organizationId, table: "students", recordId: row.id, email: row.email, fullName: `${row.first_name} ${row.last_name}` },
    });
    setInviting(null);
    if (inviteError || data?.error) {
      const message = await extractFunctionErrorMessage(inviteError, data);
      setInviteResult((prev) => ({ ...prev, [row.id]: `Erreur : ${message}` }));
      return;
    }
    setInviteResult((prev) => ({ ...prev, [row.id]: "Invitation envoyée ✓" }));
    load();
  }

  const SortHeader = ({ label, sortKeyValue }: { label: string; sortKeyValue: SortKey }) => (
    <button
      type="button"
      onClick={() => toggleSort(sortKeyValue)}
      className="flex items-center gap-1 text-[0.75rem] font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-900"
    >
      {label}
      {sortKey === sortKeyValue && <span>{sortDir === "asc" ? "↑" : "↓"}</span>}
    </button>
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
        <div>
          <h2 className="text-[1.1rem] font-semibold text-gray-900">Élèves</h2>
          <p className="mt-0.5 text-[0.8rem] text-gray-500">{students.length} au total</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Rechercher un élève…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 rounded-md border border-gray-200 px-3 py-1.5 text-[0.85rem] outline-none focus:border-gray-400"
          />
          <button
            type="button"
            onClick={() => (showForm ? setShowForm(false) : openAddForm())}
            className="rounded-md bg-gray-900 px-3.5 py-1.5 text-[0.82rem] font-medium text-white"
          >
            {showForm ? "Annuler" : "+ Ajouter"}
          </button>
        </div>
      </div>

      {error && <p className="px-5 pt-3 text-[0.82rem] text-red-600">{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 border-b border-gray-100 p-5 sm:grid-cols-3">
          <input required placeholder="Prénom" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={inputClass} />
          <input required placeholder="Nom" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={inputClass} />
          <input placeholder="Numéro élève" value={form.student_number} onChange={(e) => setForm({ ...form, student_number: e.target.value })} className={inputClass} />
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
          <input placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
          <button type="submit" disabled={saving} className="rounded-md bg-gray-900 px-4 py-2 text-[0.85rem] font-medium text-white disabled:opacity-50">
            {saving ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Enregistrer"}
          </button>
        </form>
      )}

      <div className="overflow-x-auto">
        {loading ? (
          <p className="p-5 text-[0.85rem] text-gray-400">Chargement…</p>
        ) : filteredSorted.length === 0 ? (
          <p className="p-5 text-[0.85rem] text-gray-400">{search ? "Aucun résultat." : "Aucun élève pour le moment."}</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-[0.85rem]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-2.5"><SortHeader label="Nom" sortKeyValue="name" /></th>
                <th className="px-3 py-2.5 text-[0.75rem] font-semibold uppercase tracking-wide text-gray-500">Contact</th>
                <th className="px-3 py-2.5 text-[0.75rem] font-semibold uppercase tracking-wide text-gray-500">Classes</th>
                <th className="px-3 py-2.5"><SortHeader label="Inscrit le" sortKeyValue="created_at" /></th>
                <th className="px-3 py-2.5 text-[0.75rem] font-semibold uppercase tracking-wide text-gray-500">Compte</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filteredSorted.map((s) => {
                const classNames = s.class_students.map((cs) => cs.classes?.name).filter(Boolean);
                return (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-2.5 font-medium text-gray-900">
                      {s.first_name} {s.last_name}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">{s.email ?? s.phone ?? "—"}</td>
                    <td className="px-3 py-2.5 text-gray-600">{classNames.length > 0 ? classNames.join(", ") : "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500">{new Date(s.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="px-3 py-2.5">
                      {s.user_id ? (
                        <span className="text-[0.76rem] font-medium text-green-700">Actif</span>
                      ) : s.email ? (
                        <button
                          type="button"
                          onClick={() => handleInvite(s)}
                          disabled={inviting === s.id}
                          className="text-[0.78rem] text-gray-600 hover:text-gray-900 hover:underline disabled:opacity-60"
                        >
                          {inviting === s.id ? "Envoi…" : "Inviter"}
                        </button>
                      ) : (
                        <span className="text-[0.74rem] text-gray-400">Pas d'email</span>
                      )}
                      {inviteResult[s.id] && <p className="mt-0.5 text-[0.7rem] text-gray-400">{inviteResult[s.id]}</p>}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <button type="button" onClick={() => setAnnouncingTo(s)} className="mr-3 text-[0.78rem] text-gray-600 hover:text-gray-900 hover:underline">
                        Annoncer
                      </button>
                      <button type="button" onClick={() => openEditForm(s)} className="mr-3 text-[0.78rem] text-gray-600 hover:text-gray-900 hover:underline">
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => confirm(`Supprimer ${s.first_name} ${s.last_name} ? Cette action est irréversible.`, () => handleDelete(s.id))}
                        className="text-[0.78rem] text-red-600 hover:underline"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {dialog}
      {announcingTo && (
        <SendAnnouncementModal
          targetType="student"
          targetId={announcingTo.id}
          targetName={`${announcingTo.first_name} ${announcingTo.last_name}`}
          organizationId={organizationId}
          onClose={() => setAnnouncingTo(null)}
        />
      )}
    </div>
  );
}
