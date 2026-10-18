import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { amountInFrench } from "./numberToFrench";

export interface VoucherData {
  voucher_number: string;
  paid_at: string; // yyyy-mm-dd
  period_label: string | null;
  method: "cash" | "transfer" | "cheque" | "card";
  total_amount: number;
  status: "paid" | "cancelled";
  studentName: string;
  guardianNames: string[];
  items: {
    label: string;
    amount: number;
    list_amount?: number | null;
    discount_name?: string | null;
    plan_total?: number | null;
    installment_no?: number;
    installments_total?: number;
  }[];
}

/** The label plus, when relevant, the term price, the discount and the instalment number. */
function itemText(i: VoucherData["items"][number]): string {
  const lines = [i.label];
  const monthly = (i.installments_total ?? 1) > 1;
  if (i.list_amount != null && (i.discount_name || monthly)) lines.push(`Prix du trimestre : ${money(i.list_amount)}`);
  if (i.discount_name && i.list_amount != null && i.plan_total != null) lines.push(`${i.discount_name} : ${money(i.plan_total)}`);
  if (monthly) lines.push(`Mensualité ${i.installment_no ?? 1}/${i.installments_total}${i.plan_total != null ? ` sur ${money(i.plan_total)}` : ""}`);
  return lines.join("\n");
}

const NAVY: [number, number, number] = [15, 42, 92];
const GOLD: [number, number, number] = [200, 150, 47];
const METHOD_FR: Record<VoucherData["method"], string> = { cash: "Espèces", transfer: "Virement", cheque: "Chèque", card: "Carte bancaire" };

const money = (n: number) => `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n).replace(/[  ]/g, " ")} MAD`;

async function logoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch("/email-logo.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Builds the "bon de paiement": logo, parent (if any), student, items and amount paid. No legal mentions. */
export async function buildVoucherPdf(v: VoucherData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const W = doc.internal.pageSize.getWidth();
  const margin = 14;

  const logo = await logoDataUrl();
  if (logo) doc.addImage(logo, "PNG", margin, 8, 40, 23.2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  doc.text("BON DE PAIEMENT", W - margin, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`N° ${v.voucher_number}`, W - margin, 24, { align: "right" });
  const [y, m, d] = v.paid_at.split("-");
  doc.text(`Date : ${d}/${m}/${y}`, W - margin, 29, { align: "right" });

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.7);
  doc.line(margin, 35, W - margin, 35);

  let cy = 44;
  const row = (label: string, value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(label, margin, cy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    const lines = doc.splitTextToSize(value, W - margin * 2 - 32) as string[];
    doc.text(lines, margin + 32, cy);
    cy += 6.5 * lines.length;
  };
  if (v.guardianNames.length > 0) row(v.guardianNames.length > 1 ? "Parents" : "Parent", v.guardianNames.join(", "));
  row("Élève", v.studentName);
  if (v.period_label) row("Période", v.period_label);

  autoTable(doc, {
    startY: cy + 3,
    margin: { left: margin, right: margin },
    head: [["Matière / Pack", "Montant"]],
    body: v.items.map((i) => [itemText(i), money(i.amount)]),
    foot: [["Total payé", money(v.total_amount)]],
    theme: "grid",
    styles: { font: "helvetica", fontSize: 10, cellPadding: 2.6, lineColor: [225, 225, 225], textColor: [40, 40, 40] },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [251, 248, 242], textColor: NAVY, fontStyle: "bold", fontSize: 11 },
    columnStyles: { 1: { halign: "right", cellWidth: 38 } },
  });

  const afterTable = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  const words = `Arrêté le présent bon à la somme de : ${amountInFrench(v.total_amount)}.`;
  const wl = doc.splitTextToSize(words, W - margin * 2) as string[];
  doc.text(wl, margin, afterTable + 8);

  const payY = afterTable + 8 + wl.length * 4.5 + 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(60, 60, 60);
  doc.text(`Mode de paiement : ${METHOD_FR[v.method]}`, margin, payY);

  const sigY = Math.max(payY + 14, 150);
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("Cachet et signature", W - margin, sigY, { align: "right" });
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(W - margin - 55, sigY + 2, 55, 24);

  if (v.status === "cancelled") {
    doc.setTextColor(200, 40, 40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(46);
    doc.text("ANNULÉ", W / 2, 110, { align: "center", angle: 30 });
  }
  return doc;
}

export async function downloadVoucherPdf(v: VoucherData) {
  const doc = await buildVoucherPdf(v);
  doc.save(`${v.voucher_number}.pdf`);
}
