import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { humanizeError } from "../../lib/humanizeError";
import { useLocale } from "../../i18n/LocaleContext";

interface CommentRow {
  id: string;
  content: string;
  author_name: string | null;
  created_at: string;
}

interface StudentCommentModalProps {
  studentId: string;
  studentName: string;
  classId: string | null;
  onClose: () => void;
  onCommentAdded?: () => void;
}

export default function StudentCommentModal({ studentId, studentName, classId, onClose, onCommentAdded }: StudentCommentModalProps) {
  const { t, locale } = useLocale();
  const m = t.monEspace.studentComments;
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";

  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("student_comments")
      .select("id, content, author_name, created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    setComments(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from("student_comments").insert({ student_id: studentId, class_id: classId, content });
    setSaving(false);
    if (insertError) {
      setError(humanizeError(insertError));
      return;
    }
    setContent("");
    load();
    onCommentAdded?.();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-[1rem] font-semibold text-gray-900">{m.title.replace("{name}", studentName)}</h2>
          <button type="button" onClick={onClose} className="text-[0.85rem] text-gray-400 hover:text-gray-700">
            {t.monEspace.gestion.classes.close}
          </button>
        </div>

        <div className="mt-3 max-h-64 space-y-3 overflow-y-auto">
          {loading ? (
            <p className="text-[0.85rem] text-gray-400">{m.loading}</p>
          ) : comments.length === 0 ? (
            <p className="text-[0.85rem] text-gray-400">{m.empty}</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="rounded-lg bg-gray-50 px-3 py-2.5">
                <p className="text-[0.85rem] text-gray-800">{c.content}</p>
                <p className="mt-1 text-[0.72rem] text-gray-400">
                  {c.author_name || t.monEspace.gestion.journal.unknownUser} · {new Date(c.created_at).toLocaleDateString(dateLocale, { day: "numeric", month: "short" })}
                </p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 border-t border-gray-100 pt-3">
          <textarea
            required
            placeholder={m.placeholder}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-[0.9rem] outline-none focus:border-gray-400"
          />
          {error && <p className="mt-2 text-[0.82rem] text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="mt-3 w-full rounded-md bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.85rem] font-medium text-paper disabled:opacity-50"
          >
            {saving ? m.saving : m.save}
          </button>
        </form>
      </div>
    </div>
  );
}
