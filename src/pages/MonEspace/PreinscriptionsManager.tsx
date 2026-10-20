import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useLocale } from "../../i18n/LocaleContext";
import { humanizeError } from "../../lib/humanizeError";
import { money } from "../../lib/discount";
import { digitsOnly } from "../../lib/guardianChoice";
import { useConfirmDialog } from "./useConfirmDialog";

export interface PreinscriptionRow {
  id: string;
  created_at: string;
  status: "new" | "contacted" | "enrolled" | "dismissed";
  student_first_name: string;
  student_last_name: string;
  birth_date: string | null;
  school: string | null;
  program_id: string | null;
  level_id: string | null;
  specialty_id: string | null;
  formula: "pack" | "subject" | "info";
  pack_id: string | null;
  pack_name: string | null;
  subjects: string[];
  list_price: number | null;
  offer_name: string | null;
  offer_price: number | null;
  payment_pref: "full" | "monthly" | null;
  needs: string | null;
  availability: string | null;
  guardian_name: string;
  relation: string | null;
  phone: string;
  email: string;
  preferred_contact: string | null;
  levels: { name: string } | null;
  programs: { name: string } | null;
  specialties: { name: string } | null;
}

export const PREINSCRIPTION_SELECT =
  "id, created_at, status, student_first_name, student_last_name, birth_date, school, program_id, level_id, specialty_id, formula, pack_id, pack_name, subjects, list_price, offer_name, offer_price, payment_pref, needs, availability, guardian_name, relation, phone, email, preferred_contact, levels(name), programs(name), specialties(name)";

type Filter = PreinscriptionRow["status"] | "all";

const STATUS_STYLE: Record<PreinscriptionRow["status"], string> = {
  new: "border-amber-200 bg-amber-50 text-amber-800",
  contacted: "border-blue-200 bg-blue-50 text-blue-800",
  enrolled: "border-green-200 bg-green-50 text-green-800",
  dismissed: "border-gray-200 bg-gray-100 text-gray-500",
};

// Staff list of the pre-enrolments sent from the website.
export default function PreinscriptionsManager({ organizationId }: { organizationId: string }) {
  const { t, locale } = useLocale();
  const m = t.monEspace.preinscriptions;
  const common = t.monEspace.gestion.common;
  const navigate = useNavigate();
  const { lang } = useParams();
  const { confirm, dialog } = useConfirmDialog();
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";

  const [rows, setRows] = useState<PreinscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("new");

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("preinscriptions")
      .select(PREINSCRIPTION_SELECT)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(500);
    setRows((data as unknown as PreinscriptionRow[]) ?? []);
    setError(loadError ? humanizeError(loadError) : null);
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { new: 0, contacted: 0, enrolled: 0, dismissed: 0 };
    rows.forEach((r) => (c[r.status] += 1));
    return c;
  }, [rows]);
  const visible = rows.filter((r) => filter === "all" || r.status === filter);

  async function setStatus(id: string, status: PreinscriptionRow["status"]) {
    const { error: updateError } = await supabase.from("preinscriptions").update({ status }).eq("id", id);
    if (updateError) setError(humanizeError(updateError));
    else load();
  }

  function remove(r: PreinscriptionRow) {
    confirm(m.deleteConfirm.replace("{name}", `${r.student_first_name} ${r.student_last_name}`), async () => {
      const { error: deleteError } = await supabase.from("preinscriptions").delete().eq("id", r.id);
      if (deleteError) setError(humanizeError(deleteError));
      else load();
    });
  }

  const filters: { id: Filter; label: string; n: number }[] = [
    { id: "new", label: m.filterNew, n: counts.new },
    { id: "contacted", label: m.filterContacted, n: counts.contacted },
    { id: "enrolled", label: m.filterEnrolled, n: counts.enrolled },
    { id: "dismissed", label: m.filterDismissed, n: counts.dismissed },
    { id: "all", label: m.filterAll, n: rows.length },
  ];
  const statusLabel = { new: m.statusNew, contacted: m.statusContacted, enrolled: m.statusEnrolled, dismissed: m.statusDismissed };
  const btn = "rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[0.8rem] font-medium text-gray-700 hover:bg-gray-50";

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-5">
        <h2 className="text-[1.05rem] font-semibold text-gray-900">{m.title}</h2>
        <div className="flex flex-wrap gap-1.5" role="group">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full border px-3 py-1 text-[0.8rem] font-medium ${filter === f.id ? "border-ink bg-ink text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"}`}
            >
              {f.label} <span className="opacity-70">{f.n}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="px-5 pt-4 text-[0.85rem] text-red-600">{error}</p>}
      {loading ? (
        <p className="px-5 py-6 text-[0.88rem] text-gray-500">{common.loading}</p>
      ) : visible.length === 0 ? (
        <p className="px-5 py-8 text-[0.88rem] text-gray-500">{m.empty}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {visible.map((r) => {
            const payable = r.offer_price ?? r.list_price;
            const choice =
              r.formula === "pack" ? m.choicePack.replace("{name}", r.pack_name ?? "") : r.formula === "subject" ? m.choiceSubjects.replace("{names}", r.subjects.join(", ")) : m.choiceFree;
            const wa = `https://wa.me/${digitsOnly(r.phone).replace(/^0/, "212")}`;
            return (
              <li key={r.id} className="px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[0.95rem] font-semibold text-gray-900">
                      {r.student_first_name} {r.student_last_name}
                      <span className={`ml-2 rounded-full border px-2 py-0.5 text-[0.7rem] font-medium ${STATUS_STYLE[r.status]}`}>{statusLabel[r.status]}</span>
                    </p>
                    <p className="mt-0.5 text-[0.8rem] text-gray-500">
                      {[r.programs?.name, r.levels?.name, r.specialties?.name, r.school].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <p className="text-[0.76rem] text-gray-500">{m.received.replace("{date}", new Date(r.created_at).toLocaleString(dateLocale, { dateStyle: "short", timeStyle: "short" }))}</p>
                </div>

                <div className="mt-3 grid gap-3 text-[0.85rem] text-gray-700 sm:grid-cols-2">
                  <div className="rounded-lg bg-gray-50 px-3 py-2.5">
                    <p className="font-medium text-gray-900">{choice}</p>
                    {r.list_price != null && <p className={r.offer_price != null ? "text-gray-500 line-through" : ""}>{m.pricePerTrimester.replace("{amount}", money(r.list_price, locale))}</p>}
                    {r.offer_name && r.offer_price != null && <p className="font-medium text-green-700">{m.offerLine.replace("{name}", r.offer_name).replace("{amount}", money(r.offer_price, locale))}</p>}
                    {payable != null && r.payment_pref && (
                      <p className="text-gray-600">{r.payment_pref === "monthly" ? m.payMonthly.replace("{amount}", money(Math.round(payable / 3), locale)) : m.payFull}</p>
                    )}
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2.5">
                    <p className="font-medium text-gray-900">
                      {r.guardian_name}
                      {r.relation ? <span className="font-normal text-gray-500"> ({r.relation})</span> : null}
                    </p>
                    <p>{r.phone} · {r.email}</p>
                    {r.preferred_contact && <p className="text-gray-500">{r.preferred_contact}</p>}
                  </div>
                </div>
                {(r.needs || r.availability) && (
                  <p className="mt-2 text-[0.82rem] text-gray-600">
                    {r.needs && <><span className="font-medium">{m.needs} :</span> {r.needs} </>}
                    {r.availability && <span className="text-gray-500">· {r.availability}</span>}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {r.status !== "enrolled" && (
                    <button type="button" onClick={() => navigate(`/${lang ?? "fr"}/mon-espace/gestion/eleves?new=1&pre=${r.id}`)} className="rounded-md bg-ink px-3.5 py-1.5 text-[0.8rem] font-semibold text-white hover:opacity-90">
                      {m.enroll}
                    </button>
                  )}
                  <a href={`tel:${r.phone.replace(/\s/g, "")}`} className={btn}>{m.call}</a>
                  <a href={wa} target="_blank" rel="noreferrer" className={btn}>{m.whatsapp}</a>
                  {r.status === "new" && <button type="button" onClick={() => setStatus(r.id, "contacted")} className={btn}>{m.markContacted}</button>}
                  {(r.status === "new" || r.status === "contacted") && <button type="button" onClick={() => setStatus(r.id, "dismissed")} className={btn}>{m.dismiss}</button>}
                  {(r.status === "dismissed" || r.status === "enrolled") && <button type="button" onClick={() => setStatus(r.id, "new")} className={btn}>{m.reopen}</button>}
                  <button type="button" onClick={() => remove(r)} className="rounded-md border border-red-100 bg-white px-3 py-1.5 text-[0.8rem] font-medium text-red-600 hover:bg-red-50">{m.delete}</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {dialog}
    </div>
  );
}
