import { supabase } from "./supabaseClient";
import type { VoucherData } from "./voucherPdf";

export interface VoucherRow {
  id: string;
  voucher_number: string;
  paid_at: string;
  period_label: string | null;
  method: VoucherData["method"];
  total_amount: number;
  status: "paid" | "cancelled";
  cancel_reason: string | null;
  student_id: string;
  students: { first_name: string; last_name: string } | null;
  payment_voucher_items: {
    label: string;
    amount: number;
    list_amount?: number | null;
    discount_name?: string | null;
    plan_total?: number | null;
    installment_no?: number;
    installments_total?: number;
  }[];
}

export const VOUCHER_SELECT =
  "id, voucher_number, paid_at, period_label, method, total_amount, status, cancel_reason, student_id, students(first_name, last_name), payment_voucher_items(label, amount, list_amount, discount_name, plan_total, installment_no, installments_total)";

/** Everything the PDF needs, including the parents' names (if the student has any). */
export async function toVoucherData(v: VoucherRow): Promise<VoucherData> {
  const { data } = await supabase.from("parent_students").select("parents(first_name, last_name)").eq("student_id", v.student_id);
  const guardianNames = (data ?? [])
    .map((r) => (r as unknown as { parents: { first_name: string; last_name: string } | null }).parents)
    .filter((p): p is { first_name: string; last_name: string } => p !== null)
    .map((p) => `${p.first_name} ${p.last_name}`);
  return {
    voucher_number: v.voucher_number,
    paid_at: v.paid_at,
    period_label: v.period_label,
    method: v.method,
    total_amount: Number(v.total_amount),
    status: v.status,
    studentName: v.students ? `${v.students.first_name} ${v.students.last_name}` : "—",
    guardianNames,
    items: v.payment_voucher_items.map((i) => ({
      label: i.label,
      amount: Number(i.amount),
      list_amount: i.list_amount != null ? Number(i.list_amount) : null,
      discount_name: i.discount_name ?? null,
      plan_total: i.plan_total != null ? Number(i.plan_total) : null,
      installment_no: i.installment_no ?? 1,
      installments_total: i.installments_total ?? 1,
    })),
  };
}
