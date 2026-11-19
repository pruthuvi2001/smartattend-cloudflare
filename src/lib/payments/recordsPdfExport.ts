import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { GridCellStatus, PaymentGridRow, rowTotals, summarizeGrid } from "./paymentGrid";
import {
  CellShowMode,
  cellMainText,
  formatAmount,
  MONTH_SHORT,
  rangeLabel,
  rangeLabelLong,
} from "./recordsDisplay";

type Rgb = [number, number, number];

/** Light colours for paper (the same family as the app's printed reports). */
const FILL: Partial<Record<GridCellStatus, Rgb>> = {
  PAID: [209, 250, 229], // emerald-100
  UNPAID: [255, 228, 230], // rose-100
  WAIVED: [224, 242, 254], // sky-100
  NO_CLASS: [241, 245, 249], // slate-100
};
const TEXT: Partial<Record<GridCellStatus, Rgb>> = {
  PAID: [4, 120, 87], // emerald-700
  UNPAID: [190, 18, 60], // rose-700
  WAIVED: [3, 105, 161], // sky-700
  NO_CLASS: [100, 116, 139], // slate-500
  NOT_ENROLLED: [148, 163, 184], // slate-400
};

export interface ExportPaymentRecordsPdfOptions {
  rows: PaymentGridRow[];
  year: number;
  fromMonth: number;
  toMonth: number;
  mode: CellShowMode;
  currencySymbol: string;
  schoolName: string;
  classLabel: string;
  statusLabel: string;
  search: string;
}

export function paymentRecordsPdfFileName(year: number, fromMonth: number, toMonth: number, classLabel: string): string {
  const cls = classLabel === "All classes" ? "All_Classes" : classLabel.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const range =
    fromMonth === 0 && toMonth === 11
      ? ""
      : `_${MONTH_SHORT[fromMonth]}${fromMonth === toMonth ? "" : `-${MONTH_SHORT[toMonth]}`}`;
  return `Payment_Records_${year}${range}_${cls || "Class"}.pdf`;
}

/** Saves the filtered Payment Records table as an A4 landscape PDF. */
export function exportPaymentRecordsPdf(opts: ExportPaymentRecordsPdfOptions): void {
  buildPaymentRecordsPdf(opts).save(paymentRecordsPdfFileName(opts.year, opts.fromMonth, opts.toMonth, opts.classLabel));
}

/** Builds the Payment Records PDF document (A4 landscape) without saving it. */
export function buildPaymentRecordsPdf(opts: ExportPaymentRecordsPdfOptions): jsPDF {
  const { rows, year, fromMonth, toMonth, mode, currencySymbol, schoolName, classLabel, statusLabel, search } = opts;
  const months: number[] = [];
  for (let m = fromMonth; m <= toMonth; m++) months.push(m);
  const summary = summarizeGrid(rows, fromMonth, toMonth);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 14;
  const usable = pageWidth - left * 2;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 27, 75);
  doc.text(schoolName, left, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(71, 85, 105);
  doc.text(`Monthly Payment Records - ${rangeLabelLong(year, fromMonth, toMonth)}`, left, 23);

  const generated = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Class: ${classLabel}   |   Status: ${statusLabel}   |   Search: ${search.trim() || "none"}   |   Generated: ${generated}`,
    left,
    29
  );

  // Summary box
  const boxY = 33;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(left, boxY, usable, 16, 2, 2, "FD");
  const step = usable / 5;
  const metrics: { label: string; value: string; color: Rgb }[] = [
    { label: "STUDENTS", value: String(summary.students), color: [15, 23, 42] },
    { label: "MONTHS", value: rangeLabel(year, fromMonth, toMonth), color: [15, 23, 42] },
    { label: "TOTAL COLLECTED", value: `${currencySymbol} ${formatAmount(summary.collected)}`, color: [5, 150, 105] },
    { label: "STILL OWED", value: `${currencySymbol} ${formatAmount(summary.owed)}`, color: [220, 38, 38] },
    { label: "UNPAID MONTHS", value: String(summary.unpaidMonths), color: [15, 23, 42] },
  ];
  metrics.forEach((m, i) => {
    const x = left + 4 + step * i;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, x, boxY + 5);
    doc.setFontSize(11);
    doc.setTextColor(...m.color);
    doc.text(m.value, x, boxY + 12);
  });

  // Table
  const fixed = { num: 6, id: 16, name: 34, cls: 22, paid: 17, owing: 17 };
  const monthWidth = (usable - (fixed.num + fixed.id + fixed.name + fixed.cls + fixed.paid + fixed.owing)) / months.length;
  const firstMonthCol = 4;
  const paidCol = firstMonthCol + months.length;
  const owingCol = paidCol + 1;

  const statusGrid: GridCellStatus[][] = [];
  const body = rows.map((row, idx) => {
    const totals = rowTotals(row, fromMonth, toMonth);
    const cells = months.map((m) => row.cells[m]);
    statusGrid.push(cells.map((c) => c.status));
    return [
      String(idx + 1),
      row.studentId,
      row.fullName,
      row.classLabel,
      ...cells.map((c) => cellMainText(c, mode)),
      formatAmount(totals.paid),
      totals.owed > 0 ? formatAmount(totals.owed) : "-",
    ];
  });

  const columnStyles: Record<number, Record<string, unknown>> = {
    0: { cellWidth: fixed.num, halign: "center" },
    1: { cellWidth: fixed.id, fontStyle: "bold", halign: "left" },
    2: { cellWidth: fixed.name, halign: "left", overflow: "ellipsize" },
    3: { cellWidth: fixed.cls, halign: "left", overflow: "ellipsize" },
    [paidCol]: { cellWidth: fixed.paid, halign: "right", fontStyle: "bold", textColor: [4, 120, 87] },
    [owingCol]: { cellWidth: fixed.owing, halign: "right", fontStyle: "bold", textColor: [190, 18, 60] },
  };
  months.forEach((_, i) => {
    columnStyles[firstMonthCol + i] = { cellWidth: monthWidth, halign: "center" };
  });

  autoTable(doc, {
    startY: boxY + 20,
    head: [["#", "Student ID", "Student Name", "Class", ...months.map((m) => `${MONTH_SHORT[m]}\n${year}`), "Paid", "Owing"]],
    body,
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: "bold", halign: "center", valign: "middle" },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59], cellPadding: 1.6, valign: "middle", overflow: "linebreak" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles,
    margin: { left, right: left, bottom: 16 },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const col = data.column.index;
      if (col >= firstMonthCol && col < paidCol) {
        const status = statusGrid[data.row.index]?.[col - firstMonthCol];
        const fill = status ? FILL[status] : undefined;
        const text = status ? TEXT[status] : undefined;
        if (fill) data.cell.styles.fillColor = fill;
        if (text) data.cell.styles.textColor = text;
        if (status === "PAID" || status === "UNPAID" || status === "WAIVED") data.cell.styles.fontStyle = "bold";
        if (status === "NO_CLASS") data.cell.styles.fontStyle = "italic";
      }
      if (col === owingCol && String(data.cell.raw) === "-") data.cell.styles.textColor = [148, 163, 184];
    },
  });

  // Legend under the table
  let y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? boxY + 20) + 6;
  if (y > pageHeight - 22) {
    doc.addPage();
    y = 20;
  }
  const legend: { label: string; fill?: Rgb }[] = [
    { label: mode === "date" ? "Paid (date paid)" : mode === "amount" ? "Paid (amount received)" : "Paid", fill: FILL.PAID },
    { label: "Unpaid", fill: FILL.UNPAID },
    { label: "Waived", fill: FILL.WAIVED },
    { label: "No class = not marked Present or Late that month, no fee", fill: FILL.NO_CLASS },
    { label: "Blank = not due yet,  - = not enrolled yet" },
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  let x = left;
  legend.forEach((item) => {
    doc.setDrawColor(203, 213, 225);
    if (item.fill) {
      doc.setFillColor(...item.fill);
      doc.rect(x, y - 2.6, 3.2, 3.2, "FD");
    } else {
      doc.rect(x, y - 2.6, 3.2, 3.2, "S");
    }
    doc.setTextColor(71, 85, 105);
    doc.text(item.label, x + 4.6, y);
    x += 4.6 + doc.getTextWidth(item.label) + 7;
  });

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`${schoolName} - Confidential Financial Document`, left, pageHeight - 8);
    doc.text(`Page ${i} of ${pages}`, pageWidth - left, pageHeight - 8, { align: "right" });
  }

  return doc;
}
