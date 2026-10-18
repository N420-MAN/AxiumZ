import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useLocale } from "../../i18n/LocaleContext";
import { downloadVoucherPdf } from "../../lib/voucherPdf";
import { toVoucherData, VOUCHER_SELECT, type VoucherRow } from "../../lib/voucherData";
import PaymentModal from "./PaymentModal";

interface StudentOpt {
  id: string;
  first_name: string;
  last_name: string;
}

// Staff-only list of every payment voucher, with reprint, cancel and "new payment".
export default function PaymentsManager({ organizationId }: { organizationId: string }) {
  const { t, locale } = useLocale();
  const m = t.monEspace.payments;
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";

  const [rows, setRows] = useState<VoucherRow[]>([]);
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [picking, setPicking] = useState(false);
  const [pickSearch, setPickSearch] = useState("");
  const [target, setTarget] = useState<StudentOpt | null>(null);

  const load = useCallback(async () => {
    const [{ data: v }, { data: s }] = await Promise.all([
      supabase.from("payment_vouchers").select(VOUCHER_SELECT).eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(500),
      supabase.from("students").select("id, first_name, last_name").eq("organization_id", organizationId).order("last_name").limit(2000),
    ]);
    setRows((v as unknown as VoucherRow[]) ?? []);
    setStudents((s as StudentOpt[]) ?? []);
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.voucher_number} ${r.students?.first_name ?? ""} ${r.students?.last_name ?? ""}`.toLowerCase().includes(q));
  }, [rows, search]);

  const matches = useMemo(() => {
    const q = pickSearch.trim().toLowerCase();
    return students.filter((s) => !q || `${s.first_name} ${s.last_name}`.toLowerCase().includes(q)).slice(0, 8);
  }, [students, pickSearch]);

  const fmt = (n: number) => new Intl.NumberFormat(dateLocale, { maximumFractionDigits: 2 }).format(n);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[1.1rem] font-semibold text-gray-900">{m.title}</h2>
          <p className="text-[0.82rem] text-gray-500">{m.description}</p>
        </div>
        <button type="button" data-write onClick={() => setPicking((p) => !p)} className="rounded-md bg-ink px-4 py-2 text-[0.85rem] font-semibold text-paper">
          {m.newPayment}
        </button>
      </div>

      {picking && (
        <div className="app-card mt-3 p-4">
          <input
            autoFocus
            value={pickSearch}
            onChange={(e) => setPickSearch(e.target.value)}
            placeholder={m.pickStudent}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[0.9rem] outline-none focus:border-gray-400"
          />
          <ul className="mt-2 divide-y divide-gray-100">
            {matches.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    setTarget(s);
                    setPicking(false);
                    setPickSearch("");
                  }}
                  className="w-full px-1 py-2 text-left text-[0.88rem] text-gray-800 hover:bg-gray-50"
                >
                  {s.first_name} {s.last_name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={m.searchPlaceholder}
        className="mt-4 w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-[0.88rem] outline-none focus:border-gray-400"
      />

      {loading ? (
        <div className="h-40" />
      ) : visible.length === 0 ? (
        <p className="mt-6 text-[0.88rem] text-gray-400">{m.empty}</p>
      ) : (
        <div className="app-card mt-3 overflow-x-auto">
          <table className="w-full text-left text-[0.84rem]">
            <thead className="border-b border-gray-100 text-[0.74rem] uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-2.5">{m.colVoucher}</th>
                <th className="px-4 py-2.5">{m.colDate}</th>
                <th className="px-4 py-2.5">{m.colStudent}</th>
                <th className="px-4 py-2.5 text-right">{m.colAmount}</th>
                <th className="px-4 py-2.5">{m.colMethod}</th>
                <th className="px-4 py-2.5">{m.colStatus}</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visible.map((v) => (
                <tr key={v.id} className={v.status === "cancelled" ? "text-gray-400" : "text-gray-800"}>
                  <td className="whitespace-nowrap px-4 py-2.5 font-semibold">{v.voucher_number}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">{new Date(v.paid_at).toLocaleDateString(dateLocale)}</td>
                  <td className="px-4 py-2.5">{v.students ? `${v.students.first_name} ${v.students.last_name}` : "—"}</td>
                  <td className={`whitespace-nowrap px-4 py-2.5 text-right ${v.status === "cancelled" ? "line-through" : "font-semibold"}`}>{fmt(Number(v.total_amount))} MAD</td>
                  <td className="px-4 py-2.5">{m.methods[v.method]}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-[0.72rem] font-semibold ${v.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {v.status === "paid" ? m.statusPaid : m.statusCancelled}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    <button type="button" onClick={async () => downloadVoucherPdf(await toVoucherData(v))} className="text-[0.78rem] text-gray-700 hover:underline">
                      {m.download}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {target && (
        <PaymentModal
          organizationId={organizationId}
          studentId={target.id}
          studentName={`${target.first_name} ${target.last_name}`}
          onClose={() => setTarget(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
