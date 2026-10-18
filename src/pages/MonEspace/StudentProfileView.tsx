import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../../lib/supabaseClient";
import { useLocale } from "../../i18n/LocaleContext";
import { type ProgramKind, classLabel, isLanguageProgram } from "../../lib/programs";
import LanguageProgressSection from "./LanguageProgressSection";
import EnglishTestCard from "./EnglishTestCard";
import { useAuth } from "../../features/auth/AuthContext";

interface StudentDetail {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  address: string | null;
  school_name: string | null;
  grade_level: string | null;
  kind: "eleve" | "stagiaire";
  packs: { name: string } | null;
}
interface ParentRow {
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
}
interface WaitingLine {
  id: string;
  note: string | null;
  programs: { name: string } | null;
  levels: { name: string } | null;
}
interface ClassRow {
  class_id: string;
  classes: { name: string; programs: { name: string; kind: ProgramKind } | null; levels: { name: string } | null } | null;
}
interface AverageRow {
  class_id: string;
  average_out_of_20: number;
}
interface AttendanceRow {
  status: string;
  class_sessions: { starts_at: string; classes: { name: string } | null } | null;
}
interface CommentRow {
  id: string;
  content: string;
  author_name: string | null;
  created_at: string;
}
interface HomeworkRow {
  id: string;
  title: string;
  due_date: string | null;
  classes: { name: string } | null;
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function computeAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear = today.getMonth() > birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export default function StudentProfileView() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { memberships } = useAuth();
  const canLink = memberships.some((x) => x.role_name === "super_admin" || x.role_name === "center_admin");
  const { t, locale } = useLocale();
  const m = t.monEspace.studentProfile;
  const pp = t.monEspace.people;
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [averages, setAverages] = useState<AverageRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [homework, setHomework] = useState<HomeworkRow[]>([]);
  const [waiting, setWaiting] = useState<WaitingLine[]>([]);
  const [tab, setTab] = useState<"overview" | "grades" | "attendance" | "contacts">("overview");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    async function load() {
      setLoading(true);
      const { data: studentData } = await supabase
        .from("students")
        .select("id, first_name, last_name, email, phone, date_of_birth, address, school_name, grade_level, kind, packs(name)")
        .eq("id", studentId)
        .maybeSingle();

      if (!studentData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setStudent(studentData as unknown as StudentDetail);

      const { data: classRows } = await supabase.from("class_students").select("class_id, classes(name, programs(name, kind), levels(name))").eq("student_id", studentId);
      setClasses((classRows as unknown as ClassRow[]) ?? []);

      const [{ data: parentLinks }, { data: avgRows }, { data: attRows }, { data: commentRows }, { data: hwRows }, { data: waitingRows }] = await Promise.all([
        supabase.from("parent_students").select("parents(first_name, last_name, phone, email)").eq("student_id", studentId),
        supabase.from("student_class_averages").select("class_id, average_out_of_20").eq("student_id", studentId),
        supabase
          .from("attendance")
          .select("status, class_sessions(starts_at, classes(name))")
          .eq("student_id", studentId)
          .order("class_sessions(starts_at)", { ascending: false })
          .limit(15),
        supabase.from("student_comments").select("id, content, author_name, created_at").eq("student_id", studentId).order("created_at", { ascending: false }),
        (classRows ?? []).length > 0
          ? supabase.from("homework").select("id, title, due_date, classes(name)").in("class_id", (classRows ?? []).map((c) => c.class_id))
          : Promise.resolve({ data: [] }),
        supabase.from("class_wishes").select("id, note, programs(name), levels(name)").eq("student_id", studentId).is("fulfilled_at", null),
      ]);

      setParents(((parentLinks as unknown as { parents: ParentRow | null }[]) ?? []).map((p) => p.parents).filter((p): p is ParentRow => p !== null));
      setAverages(avgRows ?? []);
      setAttendance((attRows as unknown as AttendanceRow[]) ?? []);
      setComments(commentRows ?? []);
      setHomework((hwRows as unknown as HomeworkRow[]) ?? []);
      setWaiting((waitingRows as unknown as WaitingLine[]) ?? []);
      setLoading(false);
    }
    load();
  }, [studentId]);

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8" />;
  }
  if (notFound || !student) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
        <p className="text-[0.9rem] text-gray-500">{m.notFound}</p>
      </div>
    );
  }

  const fullName = `${student.first_name} ${student.last_name}`;
  const age = computeAge(student.date_of_birth);
  // The année scolaire only exists for élèves (a stagiaire has no school grade).
  const gradeLevel = student.kind === "eleve" ? student.grade_level : null;

  function generateReportCard() {
    if (!student) return;
    const doc = new jsPDF();
    const generatedOn = new Date().toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" });

    doc.setFontSize(18);
    doc.setTextColor(15, 42, 92);
    doc.text("AxiumZ", 14, 20);
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text(m.reportCardTitle, 14, 28);

    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(`${m.reportCardStudent}: ${fullName}`, 14, 42);
    if (age !== null) doc.text(`${m.reportCardAge}: ${age}`, 14, 49);
    if (gradeLevel) doc.text(`${m.reportCardGrade}: ${gradeLevel}`, 14, 56);
    if (student.school_name) doc.text(`${m.reportCardSchool}: ${student.school_name}`, 14, 63);

    autoTable(doc, {
      startY: 72,
      head: [[m.reportCardClassColumn, m.reportCardAverageColumn]],
      body: classes.map((c) => {
        const avg = averages.find((a) => a.class_id === c.class_id);
        return [c.classes ? classLabel(c.classes) : "—", avg ? `${avg.average_out_of_20}/20` : "—"];
      }),
      headStyles: { fillColor: [15, 42, 92] },
      styles: { fontSize: 10 },
    });

    const afterTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    const presentCount = attendance.filter((a) => a.status === "present").length;
    const absentCount = attendance.filter((a) => a.status === "absent").length;
    doc.setFontSize(11);
    doc.text(`${m.reportCardAttendanceSummary}: ${presentCount} ${m.attPresent.toLowerCase()}, ${absentCount} ${m.attAbsent.toLowerCase()}`, 14, afterTableY);

    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`${m.reportCardGeneratedOn} ${generatedOn}`, 14, 285);

    doc.save(`bulletin-${student.first_name}-${student.last_name}.pdf`);
  }

  const attendanceLabels: Record<string, string> = {
    present: m.attPresent,
    absent: m.attAbsent,
    late: m.attLate,
    excused: m.attExcused,
  };

  const avgVals = averages.map((x) => Number(x.average_out_of_20));
  const overallAvg = avgVals.length > 0 ? Math.round((avgVals.reduce((x, y) => x + y, 0) / avgVals.length) * 10) / 10 : null;
  const presentN = attendance.filter((x) => x.status === "present" || x.status === "late").length;
  const presenceRate = attendance.length > 0 ? Math.round((presentN / attendance.length) * 100) : null;
  const base = `/${locale}/mon-espace`;
  const tabs = [
    { id: "overview", label: m.tabOverview },
    { id: "grades", label: m.tabGrades },
    { id: "attendance", label: m.tabAttendance },
    { id: "contacts", label: m.tabContacts },
  ] as const;

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 sm:px-8">
      <button type="button" onClick={() => navigate(-1)} className="mb-3 text-[0.82rem] text-gray-500 hover:text-gray-800 hover:underline">
        {m.back}
      </button>

      <div className="app-card flex flex-wrap items-center justify-between gap-5 p-6 sm:p-7">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent text-[1.15rem] font-bold text-ink">{initialsFrom(fullName)}</div>
          <div className="min-w-0">
            <h1 className="text-[1.5rem] font-extrabold text-gray-900">{fullName}</h1>
            <p className="mt-0.5 text-[0.84rem] text-gray-500">
              {[student.kind === "stagiaire" ? pp.stagiaire : null, age !== null ? m.ageValue.replace("{age}", String(age)) : null, gradeLevel, student.school_name].filter(Boolean).join(" · ")}
            </p>
            {student.packs && (
              <span className="mt-1.5 inline-block rounded-full bg-accent-soft px-2.5 py-0.5 text-[0.74rem] font-semibold text-ink">
                {t.monEspace.packPicker.packChip.replace("{name}", student.packs.name)}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {[
            [m.statAverage, overallAvg !== null ? `${overallAvg}/20` : "—"],
            [m.statPresence, presenceRate !== null ? `${presenceRate}%` : "—"],
          ].map(([k, v]) => (
            <div key={k} className="min-w-[92px] rounded-2xl bg-gray-50 px-4 py-3">
              <p className="text-[0.72rem] text-gray-500">{k}</p>
              <p className="text-[1.25rem] font-extrabold text-gray-900">{v}</p>
            </div>
          ))}
          <button type="button" onClick={generateReportCard} className="rounded-xl bg-gradient-to-br from-ink to-ink-soft px-4 py-2.5 text-[0.82rem] font-semibold text-paper">
            {m.generateReportCard}
          </button>
        </div>
      </div>

      <div className="mt-5 flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-gray-100 p-1.5" role="tablist">
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={`shrink-0 rounded-xl px-4 py-2 text-[0.85rem] transition-colors ${tab === x.id ? "bg-white font-bold text-ink shadow-sm" : "font-medium text-gray-500 hover:text-gray-800"}`}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="app-fade-in mt-5 space-y-5" key={tab}>
        {tab === "overview" && (
          <>
            {waiting.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <h2 className="text-[0.9rem] font-bold text-amber-900">{pp.waitingProfileHeading}</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {waiting.map((w) => (
                    <span key={w.id} className="rounded-full border border-dashed border-amber-300 bg-white px-2.5 py-0.5 text-[0.78rem] text-amber-900">
                      {[w.programs?.name, w.levels?.name, w.note].filter(Boolean).join(" · ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="app-card p-6">
              <h2 className="text-[1.05rem] font-bold text-gray-900">{m.classesHeading}</h2>
              <div className="mt-2">
                {classes.length === 0 ? (
                  <p className="text-[0.88rem] text-gray-400">{m.noClasses}</p>
                ) : (
                  classes.map((c) => {
                    const avg = averages.find((a) => a.class_id === c.class_id);
                    return (
                      <Link key={c.class_id} to={`${base}/classe/${c.class_id}`} className="flex items-center justify-between border-t border-gray-100 py-3 text-[0.9rem] first:border-t-0 hover:opacity-80">
                        <span className="font-semibold text-gray-900">{c.classes ? classLabel(c.classes) : "—"}</span>
                        {avg && <span className="rounded-full bg-gray-100 px-3 py-0.5 text-[0.78rem] font-semibold text-gray-700">{avg.average_out_of_20}/20</span>}
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
            <EnglishTestCard studentId={student.id} studentName={fullName} canLink={canLink} />
            {homework.length > 0 && (
              <div className="app-card p-6">
                <h2 className="text-[1.05rem] font-bold text-gray-900">{t.monEspace.homework.heading}</h2>
                <div className="mt-2 space-y-1.5">
                  {homework.map((hw) => (
                    <div key={hw.id} className="text-[0.88rem] text-gray-700">
                      {hw.title} <span className="text-[0.76rem] text-gray-400">— {hw.classes?.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {tab === "grades" && (
          <>
            <div className="app-card p-6">
              <h2 className="text-[1.05rem] font-bold text-gray-900">{m.statAverage}</h2>
              <div className="mt-2">
                {classes.map((c) => {
                  const avg = averages.find((a) => a.class_id === c.class_id);
                  return (
                    <div key={c.class_id} className="flex items-center justify-between border-t border-gray-100 py-3 text-[0.9rem] first:border-t-0">
                      <span className="font-semibold text-gray-900">{c.classes ? classLabel(c.classes) : "—"}</span>
                      <span className="text-gray-700">{avg ? `${avg.average_out_of_20}/20` : "—"}</span>
                    </div>
                  );
                })}
                {classes.length === 0 && <p className="text-[0.88rem] text-gray-400">{m.noClasses}</p>}
              </div>
            </div>
            <LanguageProgressSection
              studentId={student.id}
              languageClasses={classes
                .filter((c) => isLanguageProgram(c.classes?.programs?.kind))
                .map((c) => ({ classId: c.class_id, className: c.classes ? classLabel(c.classes) : "—" }))}
            />
            <div className="app-card p-6">
              <h2 className="text-[1.05rem] font-bold text-gray-900">{m.commentsHeading}</h2>
              <div className="mt-2 space-y-2">
                {comments.length === 0 ? (
                  <p className="text-[0.88rem] text-gray-400">{m.noComments}</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="rounded-xl bg-gray-50 px-4 py-3">
                      <p className="text-[0.88rem] text-gray-800">{c.content}</p>
                      <p className="mt-1 text-[0.72rem] text-gray-400">
                        {c.author_name || t.monEspace.gestion.journal.unknownUser} · {new Date(c.created_at).toLocaleDateString(dateLocale, { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {tab === "attendance" && (
          <div className="app-card p-6">
            <h2 className="text-[1.05rem] font-bold text-gray-900">{m.attendanceHeading}</h2>
            <div className="mt-2">
              {attendance.length === 0 ? (
                <p className="text-[0.88rem] text-gray-400">{m.noAttendance}</p>
              ) : (
                attendance.map((a, i) => (
                  <div key={i} className="flex items-center justify-between border-t border-gray-100 py-2.5 text-[0.86rem] first:border-t-0">
                    <span className="text-gray-700">
                      {a.class_sessions?.classes?.name} — {a.class_sessions?.starts_at && new Date(a.class_sessions.starts_at).toLocaleDateString(dateLocale, { day: "numeric", month: "short" })}
                    </span>
                    <span
                      className={`rounded-full px-3 py-0.5 text-[0.74rem] font-semibold ${
                        a.status === "present" ? "bg-green-50 text-green-700" : a.status === "absent" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {attendanceLabels[a.status] ?? a.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === "contacts" && (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="app-card p-6">
              <h2 className="text-[1.05rem] font-bold text-gray-900">{m.contactHeading}</h2>
              <div className="mt-2 space-y-1 text-[0.88rem] text-gray-700">
                {student.phone && <p>{student.phone}</p>}
                {student.email && <p>{student.email}</p>}
                {student.address && <p>{student.address}</p>}
                {!student.phone && !student.email && !student.address && <p className="text-gray-400">{m.noContact}</p>}
              </div>
            </div>
            <div className="app-card p-6">
              <h2 className="text-[1.05rem] font-bold text-gray-900">{student.kind === "stagiaire" ? m.supervisorsHeading : m.parentsHeading}</h2>
              <div className="mt-2 space-y-2 text-[0.88rem] text-gray-700">
                {parents.length === 0 ? (
                  <p className="text-gray-400">{student.kind === "stagiaire" ? m.noSupervisors : m.noParents}</p>
                ) : (
                  parents.map((p, i) => (
                    <div key={i}>
                      <p className="font-semibold text-gray-900">
                        {p.first_name} {p.last_name}
                      </p>
                      {p.phone && <p>{p.phone}</p>}
                      {p.email && !p.email.endsWith(".invalid") && <p>{p.email}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
