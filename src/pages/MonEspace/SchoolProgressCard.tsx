import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { humanizeError } from "../../lib/humanizeError";
import { useLocale } from "../../i18n/LocaleContext";

interface NextSession {
  sessionId: string;
  startsAt: string;
  classLabel: string;
}

interface SchoolProgressCardProps {
  studentId: string;
  studentName: string;
  /** The student writes; a parent only reads. */
  canEdit: boolean;
}

// For programmes that follow the student's home school (Mission): before each session the
// student says what they did at their own school since the last one. The teacher reads it
// in the session panel; reminders go out the evening before (see the scheduled function).
export default function SchoolProgressCard({ studentId, studentName, canEdit }: SchoolProgressCardProps) {
  const { t, locale } = useLocale();
  const m = t.monEspace.schoolProgress;
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";

  const [sessions, setSessions] = useState<NextSession[]>([]);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [justSavedId, setJustSavedId] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data: enrolled } = await supabase.from("class_students").select("class_id").eq("student_id", studentId);
    const classIds = (enrolled ?? []).map((r) => r.class_id);
    if (classIds.length === 0) {
      setSessions([]);
      return;
    }

    const { data: classRows } = await supabase
      .from("classes")
      .select("id, name, programs(name, tracks_school_progress), levels(name)")
      .in("id", classIds);
    const tracked = ((classRows ?? []) as unknown as { id: string; name: string; programs: { name: string; tracks_school_progress: boolean } | null; levels: { name: string } | null }[]).filter(
      (c) => c.programs?.tracks_school_progress,
    );
    if (tracked.length === 0) {
      setSessions([]);
      return;
    }
    const labelOf = new Map(tracked.map((c) => [c.id, [c.programs?.name, c.levels?.name, c.name].filter(Boolean).join(" · ")]));

    const { data: upcoming } = await supabase
      .from("class_sessions")
      .select("id, class_id, starts_at")
      .in("class_id", tracked.map((c) => c.id))
      .gt("starts_at", new Date().toISOString())
      .neq("status", "cancelled")
      .order("starts_at")
      .limit(50);

    // Only the very next session of each class.
    const next: NextSession[] = [];
    const seen = new Set<string>();
    for (const row of upcoming ?? []) {
      if (seen.has(row.class_id)) continue;
      seen.add(row.class_id);
      next.push({ sessionId: row.id, startsAt: row.starts_at, classLabel: labelOf.get(row.class_id) ?? "" });
    }
    setSessions(next);

    if (next.length > 0) {
      const { data: entries } = await supabase
        .from("school_progress_entries")
        .select("session_id, content")
        .eq("student_id", studentId)
        .in("session_id", next.map((n) => n.sessionId));
      const map: Record<string, string> = {};
      for (const e of entries ?? []) map[e.session_id] = e.content;
      setSaved(map);
      setDrafts(map);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(sessionId: string) {
    const content = (drafts[sessionId] ?? "").trim();
    if (!content) return;
    setBusyId(sessionId);
    setError(null);
    setJustSavedId(null);

    let failure: string | null = null;
    if (saved[sessionId] !== undefined) {
      // .select() so an update blocked by RLS (session already started) is not silent.
      const { data, error: updateError } = await supabase
        .from("school_progress_entries")
        .update({ content })
        .eq("session_id", sessionId)
        .eq("student_id", studentId)
        .select("content");
      if (updateError) failure = humanizeError(updateError);
      else if (!data || data.length === 0) failure = m.saveFailed;
    } else {
      const { error: insertError } = await supabase.from("school_progress_entries").insert({ session_id: sessionId, student_id: studentId, content });
      if (insertError) failure = insertError.code === "42501" ? m.saveFailed : humanizeError(insertError);
    }

    setBusyId(null);
    if (failure) {
      setError({ id: sessionId, text: failure });
      return;
    }
    setSaved((prev) => ({ ...prev, [sessionId]: content }));
    setDrafts((prev) => ({ ...prev, [sessionId]: content }));
    setJustSavedId(sessionId);
  }

  if (sessions.length === 0) return null;

  return (
    <div className="mt-7">
      <h2 className="text-[0.9rem] font-semibold text-gray-900">{canEdit ? m.heading : m.headingParent}</h2>
      <div className="mt-2.5 space-y-3">
        {sessions.map((s) => {
          const when = new Date(s.startsAt).toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" });
          const filled = saved[s.sessionId] !== undefined;
          return (
            <div key={s.sessionId} className={`rounded-lg border p-4 ${filled ? "border-gray-200 bg-white" : "border-amber-200 bg-amber-50"}`}>
              <p className="text-[0.8rem] font-medium text-gray-700">{s.classLabel}</p>
              <p className="mt-0.5 text-[0.76rem] text-gray-500">{m.dueBefore.replace("{date}", when)}</p>

              {canEdit ? (
                <>
                  <label className="mt-3 block text-[0.85rem] font-medium text-gray-800" htmlFor={`sp-${s.sessionId}`}>
                    {m.prompt}
                  </label>
                  <textarea
                    id={`sp-${s.sessionId}`}
                    rows={3}
                    maxLength={2000}
                    value={drafts[s.sessionId] ?? ""}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [s.sessionId]: e.target.value }))}
                    placeholder={m.placeholder}
                    className="mt-1.5 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-[0.85rem] text-gray-800 outline-none focus:border-gray-400"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => save(s.sessionId)}
                      disabled={busyId === s.sessionId || !(drafts[s.sessionId] ?? "").trim() || drafts[s.sessionId] === saved[s.sessionId]}
                      className="rounded-md bg-gradient-to-br from-ink to-ink-soft px-3.5 py-1.5 text-[0.82rem] font-medium text-paper disabled:opacity-40"
                    >
                      {busyId === s.sessionId ? m.saving : m.save}
                    </button>
                    {justSavedId === s.sessionId && <span className="text-[0.78rem] text-green-700">{m.saved}</span>}
                    {filled && justSavedId !== s.sessionId && <span className="text-[0.76rem] text-gray-400">{m.editable}</span>}
                  </div>
                  {error?.id === s.sessionId && <p className="mt-1.5 text-[0.78rem] text-red-600">{error.text}</p>}
                </>
              ) : filled ? (
                <div className="mt-2.5">
                  <p className="text-[0.78rem] text-gray-500">{m.filledLabel.replace("{name}", studentName)}</p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-[0.85rem] text-gray-800">{saved[s.sessionId]}</p>
                </div>
              ) : (
                <p className="mt-2.5 text-[0.82rem] font-medium text-amber-700">{m.notFilled.replace("{name}", studentName)}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
