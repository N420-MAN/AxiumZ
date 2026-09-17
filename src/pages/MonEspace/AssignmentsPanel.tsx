import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface AssignmentsPanelProps {
  classId: string;
  canEdit: boolean;
  enrollments: { student_id: string; students: { first_name: string; last_name: string } | null }[];
}

interface Assignment {
  id: string;
  title: string;
  max_score: number | null;
  due_at: string | null;
}
interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string | null;
  score: number | null;
  feedback: string | null;
  status: string;
}

export default function AssignmentsPanel({ classId, canEdit, enrollments }: AssignmentsPanelProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [myStudentId, setMyStudentId] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  async function loadAll() {
    const [{ data: assignData }, { data: subData }, { data: userData }] = await Promise.all([
      supabase.from("assignments").select("id, title, max_score, due_at").eq("class_id", classId).order("due_at"),
      supabase.from("assignment_submissions").select("id, assignment_id, student_id, content, score, feedback, status"),
      supabase.auth.getUser(),
    ]);
    setAssignments(assignData ?? []);
    setSubmissions(subData ?? []);

    if (userData.user) {
      const { data: myStudent } = await supabase.from("students").select("id").eq("user_id", userData.user.id).maybeSingle();
      if (myStudent && enrollments.some((e) => e.student_id === myStudent.id)) {
        setMyStudentId(myStudent.id);
      }
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  async function handleSubmit(assignmentId: string) {
    if (!myStudentId || !draft.trim()) return;
    await supabase.from("assignment_submissions").insert({
      assignment_id: assignmentId,
      student_id: myStudentId,
      content: draft,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    });
    setDraft("");
    loadAll();
  }

  async function handleGrade(submissionId: string, score: string, feedback: string) {
    const numeric = Number(score);
    if (Number.isNaN(numeric)) return;
    await supabase.from("assignment_submissions").update({ score: numeric, feedback, status: "graded" }).eq("id", submissionId);
    loadAll();
  }

  if (assignments.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="font-display text-[1rem] font-extrabold text-paper">Devoirs</h3>
      <div className="mt-3 space-y-2">
        {assignments.map((a) => (
          <div key={a.id} className="rounded-lg border border-paper/10 bg-paper/[0.03]">
            <button
              type="button"
              onClick={() => setActive(active === a.id ? null : a.id)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left"
            >
              <span className="text-[0.88rem] text-paper">{a.title}</span>
              <span className="text-[0.78rem] text-accent-bright">{active === a.id ? "Fermer" : "Ouvrir"}</span>
            </button>

            {active === a.id && (
              <div className="border-t border-paper/10 px-4 py-3">
                {canEdit ? (
                  <div className="space-y-3">
                    {enrollments.map((e) => {
                      const sub = submissions.find((s) => s.assignment_id === a.id && s.student_id === e.student_id);
                      return (
                        <div key={e.student_id} className="rounded border border-paper/10 p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[0.85rem] text-paper">
                              {e.students?.first_name} {e.students?.last_name}
                            </span>
                            <span className="text-[0.75rem] text-mist">{sub ? sub.status : "non rendu"}</span>
                          </div>
                          {sub && (
                            <>
                              <p className="mt-2 text-[0.8rem] text-mist">{sub.content}</p>
                              <div className="mt-2 flex items-center gap-2">
                                <input
                                  type="number"
                                  step="0.5"
                                  placeholder="Note"
                                  defaultValue={sub.score ?? ""}
                                  onBlur={(ev) => ev.target.value && handleGrade(sub.id, ev.target.value, sub.feedback ?? "")}
                                  className="w-16 rounded border border-paper/15 bg-paper/[0.04] px-2 py-1 text-[0.8rem] text-paper"
                                />
                                <span className="text-[0.75rem] text-mist">/{a.max_score}</span>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : myStudentId ? (
                  (() => {
                    const mine = submissions.find((s) => s.assignment_id === a.id && s.student_id === myStudentId);
                    return mine ? (
                      <div>
                        <p className="text-[0.85rem] text-paper">{mine.content}</p>
                        <p className="mt-2 text-[0.8rem] text-accent-bright">
                          {mine.score !== null ? `Note : ${mine.score}/${a.max_score}` : "En attente de correction"}
                        </p>
                        {mine.feedback && <p className="mt-1 text-[0.8rem] text-mist">{mine.feedback}</p>}
                      </div>
                    ) : (
                      <div>
                        <textarea
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          placeholder="Votre réponse…"
                          rows={4}
                          className="w-full rounded-lg border border-paper/15 bg-paper/[0.04] px-3 py-2 text-[0.85rem] text-paper outline-none focus:border-accent-bright"
                        />
                        <button
                          type="button"
                          onClick={() => handleSubmit(a.id)}
                          className="mt-2 rounded-lg bg-accent px-4 py-2 text-[0.82rem] font-semibold text-ink"
                        >
                          Envoyer
                        </button>
                      </div>
                    );
                  })()
                ) : (
                  (() => {
                    const childSub = submissions.find((s) => s.assignment_id === a.id);
                    return childSub ? (
                      <div>
                        <p className="text-[0.85rem] text-paper">{childSub.content}</p>
                        <p className="mt-2 text-[0.8rem] text-accent-bright">
                          {childSub.score !== null ? `Note : ${childSub.score}/${a.max_score}` : "En attente de correction"}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[0.8rem] text-mist">Pas encore rendu.</p>
                    );
                  })()
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
