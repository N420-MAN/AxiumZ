import { Fragment, useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../../lib/supabaseClient";
import { useLocale } from "../../i18n/LocaleContext";
import { downloadCsv } from "../../lib/exportCsv";

interface SessionRow {
  starts_at: string;
  ends_at: string;
  status: string;
  classes: {
    id: string;
    name: string;
    teacher_id: string | null;
    teachers: { first_name: string; last_name: string } | null;
    programs: { name: string } | null;
    levels: { name: string } | null;
  } | null;
}

interface ClassLine {
  label: string;
  sessions: number;
  hours: number;
}
interface TeacherLine {
  key: string;
  name: string;
  sessions: number;
  hours: number;
  upcoming: number;
  cancelled: number;
  classes: Map<string, ClassLine>;
}

const hoursOf = (s: SessionRow) => (new Date(s.ends_at).getTime() - new Date(s.starts_at).getTime()) / 3600000;
const fmtH = (h: number) => `${Math.round(h * 100) / 100}`.replace(".", ",");

// Admin-only: how many sessions and hours each teacher taught in a month.
export default function TeacherHoursReport({ organizationId }: { organizationId: string }) {
  const { t, locale } = useLocale();
  const m = t.monEspace.teacherHours;
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [y, mo] = month.split("-").map(Number);
      const from = new Date(y, mo - 1, 1).toISOString();
      const to = new Date(y, mo, 1).toISOString();
      const { data } = await supabase
        .from("class_sessions")
        .select("starts_at, ends_at, status, classes!inner(id, name, teacher_id, organization_id, teachers(first_name, last_name), programs(name), levels(name))")
        .eq("classes.organization_id", organizationId)
        .gte("starts_at", from)
        .lt("starts_at", to)
        .limit(5000);
      setRows((data as unknown as SessionRow[]) ?? []);
      setLoading(false);
    }
    load();
  }, [month, organizationId]);

  const lines = useMemo(() => {
    const now = Date.now();
    const map = new Map<string, TeacherLine>();
    for (const s of rows) {
      if (!s.classes) continue;
      const key = s.classes.teacher_id ?? "none";
      const name = s.classes.teachers ? `${s.classes.teachers.first_name} ${s.classes.teachers.last_name}` : m.noTeacher;
      const line = map.get(key) ?? { key, name, sessions: 0, hours: 0, upcoming: 0, cancelled: 0, classes: new Map() };
      if (s.status === "cancelled") line.cancelled += 1;
      else if (new Date(s.ends_at).getTime() > now) line.upcoming += 1;
      else {
        const h = hoursOf(s);
        line.sessions += 1;
        line.hours += h;
        const label = [s.classes.programs?.name, s.classes.levels?.name, s.classes.name].filter(Boolean).join(" · ");
        const cl = line.classes.get(s.classes.id) ?? { label, sessions: 0, hours: 0 };
        cl.sessions += 1;
        cl.hours += h;
        line.classes.set(s.classes.id, cl);
      }
      map.set(key, line);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, m.noTeacher]);

  const totals = lines.reduce((t2, l) => ({ sessions: t2.sessions + l.sessions, hours: t2.hours + l.hours, upcoming: t2.upcoming + l.upcoming, cancelled: t2.cancelled + l.cancelled }), { sessions: 0, hours: 0, upcoming: 0, cancelled: 0 });

  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", { month: "long", year: "numeric" });

  function exportCsv() {
    const out: (string | number)[][] = [[m.colTeacher, m.detail, m.colSessions, m.colHours]];
    for (const l of lines) {
      for (const c of l.classes.values()) out.push([l.name, c.label, c.sessions, fmtH(c.hours)]);
      out.push([l.name, m.total, l.sessions, fmtH(l.hours)]);
    }
    downloadCsv(`heures-enseignants-${month}.csv`, out);
  }

  function exportPdf() {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(15, 42, 92);
    doc.text(m.pdfTitle.replace("{month}", monthLabel), 14, 18);
    const body: (string | number)[][] = [];
    for (const l of lines) {
      body.push([l.name, l.sessions, fmtH(l.hours), l.upcoming, l.cancelled]);
      for (const c of l.classes.values()) body.push([`   ${c.label}`, c.sessions, fmtH(c.hours), "", ""]);
    }
    autoTable(doc, {
      startY: 24,
      head: [[m.colTeacher, m.colSessions, m.colHours, m.colUpcoming, m.colCancelled]],
      body,
      foot: [[m.total, totals.sessions, fmtH(totals.hours), totals.upcoming, totals.cancelled]],
      styles: { font: "helvetica", fontSize: 9.5 },
      headStyles: { fillColor: [15, 42, 92] },
      footStyles: { fillColor: [251, 248, 242], textColor: [15, 42, 92], fontStyle: "bold" },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    });
    doc.save(`heures-enseignants-${month}.pdf`);
  }

  return (
    <div>
      <h2 className="text-[1.1rem] font-semibold text-gray-900">{m.title}</h2>
      <p className="text-[0.82rem] text-gray-500">{m.description}</p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block text-[0.8rem] font-medium text-gray-600">
          {m.month}
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="mt-1 block rounded-lg border border-gray-200 px-3 py-2 text-[0.88rem] outline-none focus:border-gray-400" />
        </label>
        <button type="button" onClick={exportCsv} disabled={lines.length === 0} className="rounded-md border border-gray-200 px-3.5 py-2 text-[0.82rem] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">
          {m.exportCsv}
        </button>
        <button type="button" onClick={exportPdf} disabled={lines.length === 0} className="rounded-md bg-ink px-3.5 py-2 text-[0.82rem] font-semibold text-paper disabled:opacity-40">
          {m.exportPdf}
        </button>
      </div>

      {loading ? (
        <div className="h-40" />
      ) : lines.length === 0 ? (
        <p className="mt-6 text-[0.88rem] text-gray-400">{m.empty}</p>
      ) : (
        <div className="app-card mt-4 overflow-x-auto">
          <table className="w-full text-left text-[0.86rem]" data-testid="hours-table">
            <thead className="border-b border-gray-100 text-[0.74rem] uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-2.5">{m.colTeacher}</th>
                <th className="px-4 py-2.5 text-right">{m.colSessions}</th>
                <th className="px-4 py-2.5 text-right">{m.colHours}</th>
                <th className="px-4 py-2.5 text-right">{m.colUpcoming}</th>
                <th className="px-4 py-2.5 text-right">{m.colCancelled}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <Fragment key={l.key}>
                  <tr onClick={() => setOpen(open === l.key ? null : l.key)} className="cursor-pointer border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-semibold text-gray-900">{l.name}</td>
                    <td className="px-4 py-2.5 text-right">{l.sessions}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{fmtH(l.hours)} h</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{l.upcoming}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{l.cancelled}</td>
                  </tr>
                  {open === l.key &&
                    [...l.classes.values()].map((c) => (
                      <tr key={`${l.key}-${c.label}`} className="bg-gray-50/60 text-[0.8rem] text-gray-600">
                        <td className="px-4 py-1.5 pl-8">{c.label}</td>
                        <td className="px-4 py-1.5 text-right">{c.sessions}</td>
                        <td className="px-4 py-1.5 text-right">{fmtH(c.hours)} h</td>
                        <td />
                        <td />
                      </tr>
                    ))}
                </Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#fbf8f2] font-bold text-ink">
                <td className="px-4 py-2.5">{m.total}</td>
                <td className="px-4 py-2.5 text-right">{totals.sessions}</td>
                <td className="px-4 py-2.5 text-right">{fmtH(totals.hours)} h</td>
                <td className="px-4 py-2.5 text-right">{totals.upcoming}</td>
                <td className="px-4 py-2.5 text-right">{totals.cancelled}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="mt-3 text-[0.76rem] text-gray-400">{m.note}</p>
    </div>
  );
}
