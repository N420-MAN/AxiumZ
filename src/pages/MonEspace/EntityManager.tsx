import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { extractFunctionErrorMessage } from "../../lib/invokeEdgeFunction";
import { humanizeError } from "../../lib/humanizeError";
import { useConfirmDialog } from "./useConfirmDialog";

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
  [key: string]: unknown;
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.9rem] text-gray-900 outline-none focus:border-gray-400";

export default function EntityManager({ table, organizationId, title, extraFields = [] }: EntityManagerProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [inviting, setInviting] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<Record<string, string>>({});
  const { confirm, dialog } = useConfirmDialog();

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
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, organizationId]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload: Record<string, string> = { organization_id: organizationId, ...form };

    const { error: insertError } = await supabase.from(table).insert(payload);
    setSaving(false);

    if (insertError) {
      setError(humanizeError(insertError));
      return;
    }
    setForm({});
    setShowForm(false);
    load();
  }

  async function handleDelete(id: string) {
    const { error: deleteError } = await supabase.from(table).delete().eq("id", id);
    if (deleteError) {
      setError(humanizeError(deleteError));
      return;
    }
    load();
  }

  async function handleInvite(row: Row) {
    if (!row.email) return;
    setInviting(row.id);
    setInviteResult((prev) => ({ ...prev, [row.id]: "" }));

    const { data, error: inviteError } = await supabase.functions.invoke("invite-user", {
      body: {
        organizationId,
        table,
        recordId: row.id,
        email: row.email,
        fullName: `${row.first_name} ${row.last_name}`,
      },
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

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[1rem] font-semibold text-gray-900">{title}</h3>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-gray-900 px-3.5 py-1.5 text-[0.82rem] font-medium text-white"
        >
          {showForm ? "Annuler" : "+ Ajouter"}
        </button>
      </div>

      {error && <p className="mt-3 text-[0.82rem] text-red-600">{error}</p>}

      {showForm && (
        <form onSubmit={handleAdd} className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
          <input
            required
            placeholder="Prénom"
            value={form.first_name ?? ""}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            className={inputClass}
          />
          <input
            required
            placeholder="Nom"
            value={form.last_name ?? ""}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            className={inputClass}
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email ?? ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputClass}
          />
          <input
            placeholder="Téléphone"
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
          <button
            type="submit"
            disabled={saving}
            className="sm:col-span-2 rounded-md bg-gray-900 px-4 py-2 text-[0.85rem] font-medium text-white disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      )}

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-[0.85rem] text-gray-400">Chargement…</p>
        ) : rows.length === 0 ? (
          <p className="text-[0.85rem] text-gray-400">Aucun enregistrement pour le moment.</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="rounded-md border border-gray-200 bg-gray-50 px-4 py-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[0.9rem] font-medium text-gray-900">
                    {row.first_name} {row.last_name}
                  </span>
                  <span className="ml-2 text-[0.8rem] text-gray-500">{row.email ?? row.phone ?? ""}</span>
                </div>
                <div className="flex items-center gap-3">
                  {row.user_id ? (
                    <span className="text-[0.76rem] font-medium text-green-700">Compte actif</span>
                  ) : row.email ? (
                    <button
                      type="button"
                      onClick={() => handleInvite(row)}
                      disabled={inviting === row.id}
                      className="text-[0.8rem] text-gray-600 hover:text-gray-900 hover:underline disabled:opacity-60"
                    >
                      {inviting === row.id ? "Envoi…" : "Inviter"}
                    </button>
                  ) : (
                    <span className="text-[0.76rem] text-gray-400">Pas d'email</span>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      confirm(`Supprimer ${row.first_name} ${row.last_name} ? Cette action est irréversible.`, () => handleDelete(row.id))
                    }
                    className="text-[0.8rem] text-red-600 hover:underline"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
              {inviteResult[row.id] && <p className="mt-1.5 text-[0.76rem] text-gray-500">{inviteResult[row.id]}</p>}
            </div>
          ))
        )}
      </div>
      {dialog}
    </div>
  );
}
