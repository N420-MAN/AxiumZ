import { useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { humanizeError } from "../../lib/humanizeError";

interface SendAnnouncementModalProps {
  targetType: "student" | "teacher" | "parent";
  targetId: string;
  targetName: string;
  organizationId: string;
  onClose: () => void;
}

export default function SendAnnouncementModal({ targetType, targetId, targetName, organizationId, onClose }: SendAnnouncementModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const targetColumn = targetType === "student" ? "target_student_id" : targetType === "teacher" ? "target_teacher_id" : "target_parent_id";

    const { data: inserted, error: insertError } = await supabase
      .from("announcements")
      .insert({ organization_id: organizationId, [targetColumn]: targetId, title, content, published_at: new Date().toISOString() })
      .select("id")
      .single();

    setSaving(false);
    if (insertError) {
      setError(humanizeError(insertError));
      return;
    }
    if (inserted) {
      supabase.functions.invoke("send-announcement-email", { body: { announcementId: inserted.id } }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Announcement email notification failed:", err);
      });
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-[1rem] font-semibold text-gray-900">Annonce à {targetName}</h2>
          <button type="button" onClick={onClose} className="text-[0.85rem] text-gray-400 hover:text-gray-700">
            Fermer
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-3">
          <input
            required
            placeholder="Titre"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-[0.9rem] outline-none focus:border-gray-400"
          />
          <textarea
            required
            placeholder="Message"
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mt-2.5 w-full rounded-md border border-gray-200 px-3 py-2 text-[0.9rem] outline-none focus:border-gray-400"
          />
          {error && <p className="mt-2 text-[0.82rem] text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="mt-3 w-full rounded-md bg-gray-900 px-4 py-2 text-[0.85rem] font-medium text-white disabled:opacity-50"
          >
            {saving ? "Envoi…" : "Envoyer"}
          </button>
        </form>
      </div>
    </div>
  );
}
