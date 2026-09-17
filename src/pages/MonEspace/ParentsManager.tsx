import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}
interface ChildLink {
  student_id: string;
  students: { first_name: string; last_name: string } | null;
}
interface Parent {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  user_id: string | null;
  children: ChildLink[];
}

const inputClass =
  "w-full rounded-lg border border-paper/15 bg-paper/[0.04] px-3 py-2 text-[0.9rem] text-paper outline-none focus:border-accent-bright";

export default function ParentsManager({ organizationId }: { organizationId: string }) {
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", student_id: "" });
  const [addingChildFor, setAddingChildFor] = useState<string | null>(null);
  const [extraChildId, setExtraChildId] = useState("");
  const [inviting, setInviting] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const [{ data: parentData, error: parentError }, { data: studentData }] = await Promise.all([
      supabase
        .from("parents")
        .select("id, first_name, last_name, email, phone, user_id, children:parent_students(student_id, students(first_name, last_name))")
        .eq("organization_id", organizationId)
        .order("last_name"),
      supabase.from("students").select("id, first_name, last_name").eq("organization_id", organizationId).order("last_name"),
    ]);
    if (parentError) setError(parentError.message);
    else setError(null);
    setParents((parentData as unknown as Parent[]) ?? []);
    setStudents(studentData ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { data: newParent, error: insertError } = await supabase
      .from("parents")
      .insert({
        organization_id: organizationId,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email || null,
        phone: form.phone || null,
      })
      .select("id")
      .single();

    if (insertError || !newParent) {
      setSaving(false);
      setError(insertError?.message ?? "Erreur lors de la création du parent.");
      return;
    }

    if (form.student_id) {
      const { error: linkError } = await supabase
        .from("parent_students")
        .insert({ parent_id: newParent.id, student_id: form.student_id });
      if (linkError) {
        setSaving(false);
        setError(`Parent créé, mais l'association a échoué : ${linkError.message}`);
        load();
        return;
      }
    }

    setSaving(false);
    setForm({ first_name: "", last_name: "", email: "", phone: "", student_id: "" });
    setShowForm(false);
    load();
  }

  async function handleDeleteParent(id: string) {
    const { error: deleteError } = await supabase.from("parents").delete().eq("id", id);
    if (deleteError) setError(deleteError.message);
    else load();
  }

  async function handleAddChild(parentId: string) {
    if (!extraChildId) return;
    const { error: linkError } = await supabase.from("parent_students").insert({ parent_id: parentId, student_id: extraChildId });
    if (linkError) {
      setError(linkError.message);
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

  async function handleInvite(parent: Parent) {
    if (!parent.email) return;
    setInviting(parent.id);
    setInviteResult((prev) => ({ ...prev, [parent.id]: "" }));

    const { data, error: inviteError } = await supabase.functions.invoke("invite-user", {
      body: {
        organizationId,
        table: "parents",
        recordId: parent.id,
        email: parent.email,
        fullName: `${parent.first_name} ${parent.last_name}`,
      },
    });

    setInviting(null);

    if (inviteError || data?.error) {
      setInviteResult((prev) => ({ ...prev, [parent.id]: `Erreur : ${data?.error ?? inviteError?.message}` }));
      return;
    }

    setInviteResult((prev) => ({ ...prev, [parent.id]: "Invitation envoyée ✓" }));
    load();
  }

  return (
    <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[1.15rem] font-extrabold">Parents</h3>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-full bg-accent px-4 py-1.5 text-[0.82rem] font-semibold text-ink"
        >
          {showForm ? "Annuler" : "+ Ajouter"}
        </button>
      </div>

      {error && <p className="mt-3 text-[0.82rem] text-red-bright">{error}</p>}

      {showForm && (
        <form onSubmit={handleAdd} className="mt-4 grid grid-cols-1 gap-3 border-t border-paper/10 pt-4 sm:grid-cols-2">
          <input
            required
            placeholder="Prénom"
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            className={inputClass}
          />
          <input
            required
            placeholder="Nom"
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            className={inputClass}
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputClass}
          />
          <input
            placeholder="Téléphone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={inputClass}
          />
          <select
            value={form.student_id}
            onChange={(e) => setForm({ ...form, student_id: e.target.value })}
            className={`sm:col-span-2 ${inputClass}`}
          >
            <option value="">Associer à un élève (optionnel)…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.first_name} {s.last_name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={saving}
            className="sm:col-span-2 rounded-lg bg-ink-soft px-4 py-2 text-[0.88rem] font-semibold text-paper disabled:opacity-60"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      )}

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-[0.85rem] text-mist">Chargement…</p>
        ) : parents.length === 0 ? (
          <p className="text-[0.85rem] text-mist">Aucun parent pour le moment.</p>
        ) : (
          parents.map((p) => (
            <div key={p.id} className="rounded-lg border border-paper/10 bg-ink-soft px-4 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[0.9rem] font-medium text-paper">
                  {p.first_name} {p.last_name}
                  <span className="ml-2 text-[0.8rem] text-mist">{p.email ?? p.phone ?? ""}</span>
                </span>
                <div className="flex items-center gap-3">
                  {p.user_id ? (
                    <span className="text-[0.76rem] text-accent-bright">Compte actif</span>
                  ) : p.email ? (
                    <button
                      type="button"
                      onClick={() => handleInvite(p)}
                      disabled={inviting === p.id}
                      className="text-[0.78rem] text-accent-bright hover:underline disabled:opacity-60"
                    >
                      {inviting === p.id ? "Envoi…" : "Inviter"}
                    </button>
                  ) : (
                    <span className="text-[0.76rem] text-mist">Pas d'email</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setAddingChildFor(addingChildFor === p.id ? null : p.id)}
                    className="text-[0.78rem] text-accent-bright hover:underline"
                  >
                    + Enfant
                  </button>
                  <button type="button" onClick={() => handleDeleteParent(p.id)} className="text-[0.8rem] text-red-bright hover:underline">
                    Supprimer
                  </button>
                </div>
              </div>
              {inviteResult[p.id] && <p className="mt-1.5 text-[0.76rem] text-mist">{inviteResult[p.id]}</p>}

              {p.children.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.children.map((c) => (
                    <span
                      key={c.student_id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-paper/[0.06] px-3 py-1 text-[0.78rem] text-paper"
                    >
                      {c.students?.first_name} {c.students?.last_name}
                      <button type="button" onClick={() => handleRemoveChild(p.id, c.student_id)} className="text-mist hover:text-red-bright">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {addingChildFor === p.id && (
                <div className="mt-2 flex items-center gap-2">
                  <select value={extraChildId} onChange={(e) => setExtraChildId(e.target.value)} className={`w-auto ${inputClass}`}>
                    <option value="">Élève…</option>
                    {students
                      .filter((s) => !p.children.some((c) => c.student_id === s.id))
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.first_name} {s.last_name}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleAddChild(p.id)}
                    className="rounded-lg bg-accent px-3 py-1.5 text-[0.8rem] font-semibold text-ink"
                  >
                    Associer
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
