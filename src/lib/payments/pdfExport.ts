import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { MonthlyFeeRecord } from "@/types/payment";

interface ExportMonthlyPaymentsPdfOptions {
  records: MonthlyFeeRecord[];
  monthName: string;
  currencySymbol: string;
  schoolName?: string;
  classFilter?: string;
}

export function exportMonthlyPaymentsToPdf(opts: ExportMonthlyPaymentsPdfOptions) {
  const {
    records,
    monthName,
    currencySymbol = "Rs.",
    schoolName = "SmartAttend Academy",
    classFilter = "ALL",
  } = opts;

  // Filter records by class if a specific class is selected
  const filteredRecords =
    classFilter === "ALL"
      ? records
      : records.filter(
          (r) =>
            r.classSnapshot.trim().toLowerCase() === classFilter.trim().toLowerCase()
        );

  // Compute summary stats
  const totalStudents = filteredRecords.length;
  const totalExpected = filteredRecords.reduce((sum, r) => sum + r.monthlyFee, 0);
  const totalCollected = filteredRecords.reduce((sum, r) => sum + r.totalPaid, 0);
  const totalBalance = filteredRecords.reduce((sum, r) => sum + r.balance, 0);
  const paidCount = filteredRecords.filter((r) => r.status === "PAID").length;
  const partialCount = filteredRecords.filter((r) => r.status === "PARTIALLY_PAID").length;
  const unpaidCount = filteredRecords.filter((r) => r.status === "UNPAID").length;
  const waivedCount = filteredRecords.filter((r) => r.status === "WAIVED").length;

  const collectionRate =
    totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : "0.0";

  // Initialize PDF in landscape orientation for comfortable table columns
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // --- Header ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 27, 75); // Dark Indigo
  doc.text(schoolName, 14, 16);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`Monthly Fee Collection Report - ${monthName}`, 14, 23);

  const scopeLabel = classFilter === "ALL" ? "All Classes" : `Class: ${classFilter}`;
  const nowFormatted = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Filter Scope: ${scopeLabel}   |   Generated: ${nowFormatted}`, 14, 29);

  // --- Summary Metrics Box ---
  const summaryBoxY = 33;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, summaryBoxY, pageWidth - 28, 16, 2, 2, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);

  const colStep = (pageWidth - 28) / 5;
  const yLabels = summaryBoxY + 5;
  const yValues = summaryBoxY + 12;

  // Metric 1: Students
  doc.text("TOTAL STUDENTS", 18, yLabels);
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalStudents} (${paidCount} Paid, ${unpaidCount} Unpaid)`, 18, yValues);

  // Metric 2: Expected
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("EXPECTED FEES", 18 + colStep, yLabels);
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${currencySymbol} ${totalExpected.toLocaleString()}`, 18 + colStep, yValues);

  // Metric 3: Collected
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("TOTAL COLLECTED", 18 + colStep * 2, yLabels);
  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(`${currencySymbol} ${totalCollected.toLocaleString()}`, 18 + colStep * 2, yValues);

  // Metric 4: Outstanding
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("OUTSTANDING BALANCE", 18 + colStep * 3, yLabels);
  doc.setFontSize(11);
  doc.setTextColor(220, 38, 38); // red-600
  doc.text(`${currencySymbol} ${totalBalance.toLocaleString()}`, 18 + colStep * 3, yValues);

  // Metric 5: Collection Rate
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("COLLECTION RATE", 18 + colStep * 4, yLabels);
  doc.setFontSize(11);
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text(`${collectionRate}%`, 18 + colStep * 4, yValues);

  // --- Table Rows Data ---
  const tableData = filteredRecords.map((r, idx) => [
    idx + 1,
    r.studentId,
    r.studentNameSnapshot,
    r.classSnapshot,
    `${currencySymbol} ${r.monthlyFee.toLocaleString()}`,
    `${currencySymbol} ${r.totalPaid.toLocaleString()}`,
    `${currencySymbol} ${r.balance.toLocaleString()}`,
    r.status.replace("_", " "),
    r.lastPaymentDate || "--",
  ]);

  autoTable(doc, {
    startY: summaryBoxY + 20,
    head: [
      [
        "#",
        "Student ID",
        "Student Name",
        "Class",
        "Monthly Fee",
        "Paid",
        "Balance",
        "Status",
        "Last Payment",
      ],
    ],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [79, 70, 229], // Indigo 600
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: "bold",
      halign: "left",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 26, fontStyle: "bold" },
      2: { cellWidth: 46 },
      3: { cellWidth: 26 },
      4: { cellWidth: 28, halign: "right" },
      5: { cellWidth: 28, halign: "right", fontStyle: "bold" },
      6: { cellWidth: 28, halign: "right" },
      7: { cellWidth: 30, halign: "center", fontStyle: "bold" },
      8: { cellWidth: 28, halign: "center" },
    },
    didParseCell: (data) => {
      // Color-code the Status cell
      if (data.section === "body" && data.column.index === 7) {
        const text = String(data.cell.raw);
        if (text === "PAID") {
          data.cell.styles.textColor = [5, 150, 105]; // emerald-600
        } else if (text === "PARTIALLY PAID") {
          data.cell.styles.textColor = [217, 119, 6]; // amber-600
        } else if (text === "UNPAID") {
          data.cell.styles.textColor = [220, 38, 38]; // red-600
        } else if (text === "WAIVED") {
          data.cell.styles.textColor = [100, 116, 139]; // slate-500
        }
      }
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer page numbering
      const str = `Page ${doc.internal.pages.length - 1}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        str,
        pageWidth - 20,
        doc.internal.pageSize.getHeight() - 8,
        { align: "right" }
      );
      doc.text(
        `${schoolName} - Confidential Financial Document`,
        14,
        doc.internal.pageSize.getHeight() - 8
      );
    },
  });

  // Sanitize filename
  const cleanScope = classFilter === "ALL" ? "All_Classes" : classFilter.replace(/\s+/g, "_");
  const cleanMonth = monthName.replace(/\s+/g, "_");
  const filename = `Monthly_Payments_${cleanMonth}_${cleanScope}.pdf`;

  doc.save(filename);
}
