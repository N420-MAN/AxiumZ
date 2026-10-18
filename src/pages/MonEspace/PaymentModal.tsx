import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useLocale } from "../../i18n/LocaleContext";
import { CLASS_LABEL_SELECT, classLabel } from "../../lib/programs";
import { downloadVoucherPdf } from "../../lib/voucherPdf";
import { toVoucherData, VOUCHER_SELECT, type VoucherRow } from "../../lib/voucherData";
import { money, round2, toDiscount, type Discount } from "../../lib/discount";

interface Line {
  key: string; // "class:<id>" | "pack:<id>"
  classId: string | null;
  packId: string | null;
  label: string;
  price: number | null;
  discount: Discount | null;
}
interface PaidRow {
  classId: string | null;
  packId: string | null;
  termId: string | null;
  amount: number;
  no: number;
  total: number;
  planTotal: number | null;
  discountName: string | null;
}
/** Where a line stands for the chosen period: nothing paid, a monthly plan under way, or fully paid. */
interface LineState {
  kind: "none" | "plan" | "done";
  nextNo: number;
  planTotal: number;
  paidSum: number;
  discountName: string | null;
}
interface Term {
  id: string;
  name: string;
  is_current: boolean;
}

const inputClass = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.9rem] text-gray-900 outline-none focus:border-gray-400";
const METHODS = ["cash", "transfer", "cheque", "card"] as const;

/** Records a full-trimester payment for one student and downloads the "bon de paiement". */
export default function PaymentModal({
  organizationId,
  studentId,
  studentName,
  onClose,
  onSaved,
}: {
  organizationId: string;
  studentId: string;
  studentName: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { t, locale } = useLocale();
  const m = t.monEspace.payments;
  const pp = t.monEspace.payPlan;
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";

  const [lines, setLines] = useState<Line[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [termId, setTermId] = useState("");
  const [paidKeys, setPaidKeys] = useState<PaidRow[]>([]);
  const [guardians, setGuardians] = useState<string[]>([]);
  const [history, setHistory] = useState<VoucherRow[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({}); // only what the assistant typed by hand
  const [applyDisc, setApplyDisc] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState<"full" | "monthly">("full");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("cash");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function loadHistory() {
    const { data } = await supabase
      .from("payment_vouchers")
      .select(VOUCHER_SELECT)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    setHistory((data as unknown as VoucherRow[]) ?? []);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: stu }, { data: enr }, { data: termRows }, { data: gl }, { data: paid }] = await Promise.all([
        supabase.from("students").select("pack_id, packs(name, price_trimestre, discount_name, discount_price)").eq("id", studentId).maybeSingle(),
        supabase.from("class_students").select(`class_id, classes(id, price_trimestre, discount_name, discount_price, ${CLASS_LABEL_SELECT})`).eq("student_id", studentId),
        supabase.from("academic_terms").select("id, name, is_current").eq("organization_id", organizationId).order("start_date", { ascending: false }),
        supabase.from("parent_students").select("parents(first_name, last_name)").eq("student_id", studentId),
        supabase
          .from("payment_voucher_items")
          .select("class_id, pack_id, amount, installment_no, installments_total, plan_total, discount_name, payment_vouchers!inner(student_id, status, academic_term_id)")
          .eq("payment_vouchers.student_id", studentId)
          .eq("payment_vouchers.status", "paid"),
      ]);

      const next: Line[] = [];
      const pack = (stu as unknown as { pack_id: string | null; packs: { name: string; price_trimestre: number | null; discount_name: string | null; discount_price: number | null } | null } | null);
      if (pack?.pack_id && pack.packs) {
        next.push({ key: `pack:${pack.pack_id}`, classId: null, packId: pack.pack_id, label: m.packLabel.replace("{name}", pack.packs.name), price: pack.packs.price_trimestre, discount: toDiscount(pack.packs.discount_name, pack.packs.discount_price) });
      }
      // A student on a pack pays the pack: its classes are part of it and are never charged separately.
      for (const e of pack?.pack_id ? [] : (enr as unknown as { class_id: string; classes: (Parameters<typeof classLabel>[0] & { id: string; price_trimestre: number | null; discount_name: string | null; discount_price: number | null }) | null }[]) ?? []) {
        if (!e.classes) continue;
        next.push({ key: `class:${e.class_id}`, classId: e.class_id, packId: null, label: classLabel(e.classes), price: e.classes.price_trimestre, discount: toDiscount(e.classes.discount_name, e.classes.discount_price) });
      }
      setLines(next);

      const tl = (termRows as unknown as Term[]) ?? [];
      setTerms(tl);
      setTermId((tl.find((x) => x.is_current) ?? tl[0])?.id ?? "");

      setGuardians(
        (gl ?? [])
          .map((r) => (r as unknown as { parents: { first_name: string; last_name: string } | null }).parents)
          .filter((p): p is { first_name: string; last_name: string } => p !== null)
          .map((p) => `${p.first_name} ${p.last_name}`),
      );
      setPaidKeys(
        ((paid as unknown as { class_id: string | null; pack_id: string | null; amount: number; installment_no: number; installments_total: number; plan_total: number | null; discount_name: string | null; payment_vouchers: { academic_term_id: string | null } }[]) ?? []).map((r) => ({
          classId: r.class_id,
          packId: r.pack_id,
          termId: r.payment_vouchers.academic_term_id,
          amount: Number(r.amount),
          no: r.installment_no,
          total: r.installments_total,
          planTotal: r.plan_total != null ? Number(r.plan_total) : null,
          discountName: r.discount_name,
        })),
      );
      await loadHistory();
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, organizationId]);

  const stateOf = (l: Line): LineState => {
    const rows = termId ? paidKeys.filter((p) => p.termId === termId && ((l.classId && p.classId === l.classId) || (l.packId && p.packId === l.packId))) : [];
    if (rows.length === 0) return { kind: "none", nextNo: 1, planTotal: 0, paidSum: 0, discountName: null };
    const paidSum = round2(rows.reduce((a, r) => a + r.amount, 0));
    const first = rows.find((r) => r.no === 1) ?? rows[0];
    if (rows.some((r) => r.total === 1)) return { kind: "done", nextNo: 2, planTotal: first.planTotal ?? paidSum, paidSum, discountName: first.discountName };
    const lastNo = Math.max(...rows.map((r) => r.no));
    return { kind: lastNo >= 3 ? "done" : "plan", nextNo: lastNo + 1, planTotal: first.planTotal ?? paidSum, paidSum, discountName: first.discountName };
  };
  const isPaid = (l: Line) => stateOf(l).kind === "done";

  /** Net price of the trimester for a line that has not started a plan yet. */
  const netOf = (l: Line) => (l.price == null ? null : applyDisc[l.key] && l.discount ? l.discount.price : l.price);
  const defaultAmount = (l: Line): string => {
    const st = stateOf(l);
    if (st.kind === "plan") return String(st.nextNo >= 3 ? round2(st.planTotal - st.paidSum) : round2(st.planTotal / 3));
    const net = netOf(l);
    if (net == null) return "";
    return String(mode === "monthly" ? round2(net / 3) : net);
  };
  const amountOf = (l: Line) => amounts[l.key] ?? defaultAmount(l);

  // Default selection: the pack alone when the student has one, otherwise every class that is not fully paid.
  useEffect(() => {
    if (loading) return;
    const hasPack = lines.some((l) => l.packId);
    const c: Record<string, boolean> = {};
    for (const l of lines) c[l.key] = (hasPack ? !!l.packId : true) && !isPaid(l);
    setChecked(c);
    setAmounts({});
    setApplyDisc({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, lines, termId]);

  const total = useMemo(
    () => lines.filter((l) => checked[l.key]).reduce((sum, l) => sum + (Number(amountOf(l)) || 0), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines, checked, amounts, applyDisc, mode, paidKeys, termId],
  );

  async function handleSave() {
    setError(null);
    const chosen = lines.filter((l) => checked[l.key]);
    if (chosen.length === 0) return setError(m.errNoItems);
    if (chosen.some((l) => !(Number(amountOf(l)) >= 0)) || total <= 0) return setError(m.errAmount);
    if (!termId && chosen.some((l) => stateOf(l).kind === "plan" || mode === "monthly")) return setError(m.noPeriod);
    setSaving(true);
    const term = terms.find((x) => x.id === termId);
    const { data, error: rpcError } = await supabase.rpc("create_payment_voucher", {
      p_organization_id: organizationId,
      p_student_id: studentId,
      p_academic_term_id: termId || null,
      p_period_label: term?.name ?? "",
      p_method: method,
      p_paid_at: paidAt,
      p_items: chosen.map((l) => {
        const st = stateOf(l);
        const amount = Number(amountOf(l));
        if (st.kind === "plan") {
          return { class_id: l.classId, pack_id: l.packId, label: l.label, amount, list_amount: l.price, discount_name: st.discountName, plan_total: st.planTotal, installment_no: st.nextNo, installments_total: 3 };
        }
        const disc = applyDisc[l.key] && l.discount ? l.discount : null;
        const net = netOf(l);
        const monthly = mode === "monthly";
        return {
          class_id: l.classId,
          pack_id: l.packId,
          label: l.label,
          amount,
          list_amount: l.price,
          discount_name: disc?.name ?? null,
          plan_total: monthly ? (net ?? round2(amount * 3)) : amount,
          installment_no: 1,
          installments_total: monthly ? 3 : 1,
        };
      }),
    });
    if (rpcError || !data) {
      setSaving(false);
      const msg = rpcError?.message ?? "";
      setError(
        msg.includes("voucher_already_paid") ? m.errAlreadyPaid
        : msg.includes("voucher_bad_amount") ? m.errAmount
        : msg.includes("voucher_installment_order") ? t.monEspace.payPlan.errOrder
        : msg.includes("voucher_bad_discount") ? t.monEspace.payPlan.errDiscount
        : msg.includes("voucher_plan_mismatch") ? t.monEspace.payPlan.errPlan
        : m.errGeneric,
      );
      return;
    }
    // Download the voucher right away.
    const { data: rows } = await supabase.from("payment_vouchers").select(VOUCHER_SELECT).eq("voucher_number", data as string).eq("student_id", studentId).limit(1);
    const row = ((rows as unknown as VoucherRow[]) ?? [])[0];
    if (row) await downloadVoucherPdf(await toVoucherData(row));
    setSaving(false);
    setDone(m.saved.replace("{number}", String(data)));
    await loadHistory();
    onSaved?.();
  }

  async function handleCancel(v: VoucherRow) {
    const reason = window.prompt(m.cancelPrompt)?.trim();
    if (!reason) return;
    const { error: upErr } = await supabase.from("payment_vouchers").update({ status: "cancelled", cancel_reason: reason }).eq("id", v.id);
    if (upErr) return setError(m.errGeneric);
    await loadHistory();
    onSaved?.();
  }

  async function handleDownload(v: VoucherRow) {
    await downloadVoucherPdf(await toVoucherData(v));
  }

  const fmt = (n: number) => new Intl.NumberFormat(dateLocale, { maximumFractionDigits: 2 }).format(n);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/40 px-4 py-6" data-testid="payment-modal">
      <div className="max-h-full w-full max-w-xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-[1rem] font-semibold text-gray-900">{m.modalTitle}</h2>
          <button type="button" onClick={onClose} className="text-[0.85rem] text-gray-400 hover:text-gray-700">
            {m.close}
          </button>
        </div>

        <div className="mt-3 text-[0.85rem] text-gray-700">
          <p>
            <span className="text-gray-400">{m.student} : </span>
            <span className="font-semibold">{studentName}</span>
          </p>
          {guardians.length > 0 && (
            <p>
              <span className="text-gray-400">{m.guardians} : </span>
              {guardians.join(", ")}
            </p>
          )}
        </div>

        {loading ? (
          <div className="h-40" />
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-[0.8rem] font-medium text-gray-600">
                {m.period}
                <select className={`${inputClass} mt-1`} value={termId} onChange={(e) => setTermId(e.target.value)}>
                  {terms.length === 0 && <option value="">{m.noPeriod}</option>}
                  {terms.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[0.8rem] font-medium text-gray-600">
                {m.date}
                <input type="date" className={`${inputClass} mt-1`} value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
              </label>
            </div>
            <p className="mt-1 text-[0.74rem] text-gray-400">{m.periodHelp}</p>

            <h3 className="mt-4 text-[0.85rem] font-semibold text-gray-900">{pp.modeTitle}</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={pp.modeTitle}>
              {(["full", "monthly"] as const).map((k) => (
                <label key={k} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[0.85rem] ${mode === k ? "border-ink bg-ink/5 font-semibold text-ink" : "border-gray-200 text-gray-700"}`}>
                  <input type="radio" name="pay-mode" checked={mode === k} onChange={() => { setMode(k); setAmounts({}); }} />
                  {k === "full" ? pp.modeFull : pp.modeMonthly}
                </label>
              ))}
            </div>
            {mode === "monthly" && <p className="mt-1 text-[0.74rem] text-gray-500">{pp.modeMonthlyHelp}</p>}

            <h3 className="mt-4 text-[0.85rem] font-semibold text-gray-900">{m.itemsTitle}</h3>
            {lines.length === 0 ? (
              <p className="mt-2 text-[0.85rem] text-gray-400">{m.noItems}</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {lines.map((l) => {
                  const st = stateOf(l);
                  const paid = st.kind === "done";
                  const inPlan = st.kind === "plan";
                  return (
                    <li key={l.key} className={`flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 ${paid ? "bg-gray-50 opacity-70" : ""}`}>
                      <input
                        type="checkbox"
                        disabled={paid}
                        checked={!!checked[l.key]}
                        onChange={(e) => setChecked((c) => ({ ...c, [l.key]: e.target.checked }))}
                        aria-label={l.label}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.85rem] font-medium text-gray-800">{l.label}</p>
                        {paid && <p className="text-[0.74rem] font-semibold text-emerald-700">{st.planTotal > 0 && st.paidSum > 0 && st.nextNo > 2 ? pp.planDone : m.alreadyPaid}</p>}
                        {!paid && l.price == null && !inPlan && <p className="text-[0.74rem] text-amber-700">{m.noPrice}</p>}
                        {inPlan && (
                          <p className="text-[0.74rem] text-ink">
                            <span className="font-semibold">{pp.installmentOf.replace("{n}", String(st.nextNo))}</span> · {pp.planInProgress.replace("{total}", `${fmt(st.planTotal)} MAD`)} · {pp.remaining.replace("{amount}", `${fmt(round2(st.planTotal - st.paidSum))} MAD`)}
                            {st.discountName ? ` · ${st.discountName}` : ""}
                          </p>
                        )}
                        {!paid && !inPlan && l.price != null && l.discount && (
                          <label className="mt-0.5 flex items-center gap-1.5 text-[0.76rem] font-medium text-amber-800">
                            <input
                              type="checkbox"
                              checked={!!applyDisc[l.key]}
                              onChange={(e) => {
                                setApplyDisc((d) => ({ ...d, [l.key]: e.target.checked }));
                                setAmounts((a) => {
                                  const { [l.key]: _drop, ...rest } = a;
                                  return rest;
                                });
                              }}
                            />
                            {pp.applyDiscount.replace("{name}", l.discount.name).replace("{price}", money(l.discount.price, locale))}
                          </label>
                        )}
                        {!paid && !inPlan && l.price != null && (l.discount || mode === "monthly") && (
                          <p className="text-[0.72rem] text-gray-400">
                            {pp.listPrice.replace("{price}", `${fmt(l.price)} MAD`)}
                            {applyDisc[l.key] && l.discount ? ` → ${fmt(l.discount.price)} MAD` : ""}
                            {mode === "monthly" ? ` · ${pp.installmentOf.replace("{n}", "1")}` : ""}
                          </p>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={paid || !checked[l.key]}
                        value={amountOf(l)}
                        onChange={(e) => setAmounts((a) => ({ ...a, [l.key]: e.target.value }))}
                        className="w-28 rounded-md border border-gray-200 px-2 py-1.5 text-right text-[0.85rem] outline-none focus:border-gray-400"
                        aria-label={`${l.label} MAD`}
                      />
                      <span className="text-[0.78rem] text-gray-400">MAD</span>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-[0.8rem] font-medium text-gray-600">
                {m.method}
                <select className={`${inputClass} mt-1`} value={method} onChange={(e) => setMethod(e.target.value as (typeof METHODS)[number])}>
                  {METHODS.map((k) => (
                    <option key={k} value={k}>
                      {m.methods[k]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end justify-end">
                <p className="text-[1rem] font-bold text-gray-900">
                  {m.total} : {fmt(total)} MAD
                </p>
              </div>
            </div>

            {error && <p className="mt-3 text-[0.82rem] text-red-600">{error}</p>}
            {done && <p className="mt-3 text-[0.82rem] font-medium text-emerald-700">{done}</p>}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || lines.length === 0}
              className="mt-4 w-full rounded-lg bg-ink px-4 py-2.5 text-[0.88rem] font-semibold text-paper disabled:opacity-50"
            >
              {saving ? m.saving : m.save}
            </button>

            <h3 className="mt-6 text-[0.85rem] font-semibold text-gray-900">{m.history}</h3>
            {history.length === 0 ? (
              <p className="mt-2 text-[0.82rem] text-gray-400">{m.noHistory}</p>
            ) : (
              <ul className="mt-2 divide-y divide-gray-100">
                {history.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[0.82rem]">
                    <div>
                      <p className={`font-semibold ${v.status === "cancelled" ? "text-gray-400 line-through" : "text-gray-800"}`}>
                        {v.voucher_number} · {fmt(Number(v.total_amount))} MAD
                      </p>
                      <p className="text-[0.74rem] text-gray-500">
                        {new Date(v.paid_at).toLocaleDateString(dateLocale)}
                        {v.period_label ? ` · ${v.period_label}` : ""}
                        {v.payment_voucher_items.some((i) => (i.installments_total ?? 1) > 1) ? ` · ${pp.installmentOf.replace("{n}", String(Math.max(...v.payment_voucher_items.map((i) => i.installment_no ?? 1))))}` : ""}
                        {v.status === "cancelled" && v.cancel_reason ? ` · ${m.cancelledReason.replace("{reason}", v.cancel_reason)}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => handleDownload(v)} className="text-gray-700 hover:underline">
                        {m.download}
                      </button>
                      {v.status === "paid" && (
                        <button type="button" onClick={() => handleCancel(v)} className="text-red-600 hover:underline">
                          {m.cancelVoucher}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
