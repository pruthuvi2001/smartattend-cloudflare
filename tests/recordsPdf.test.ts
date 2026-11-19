import { describe, it, expect } from "vitest";
import { writeFileSync } from "fs";
import { buildPaymentRecordsPdf } from "../src/lib/payments/recordsPdfExport";
import { buildPaymentGrid } from "../src/lib/payments/paymentGrid";
import { makeDynamicFeeRecord } from "../src/lib/payments/feeRules";
import type { Student } from "../src/types/student";

function student(i: number): Student {
  const id = `STU${String(i).padStart(3, "0")}`;
  return {
    studentId: id,
    fullName: `Sample Student ${i}`,
    class: i % 2 ? "Grade 6" : "Grade 7",
    classIds: [],
    email: "",
    qrCodeValue: id,
    status: "ACTIVE",
    createdAt: "2025-06-01T00:00:00.000Z",
    updatedAt: "2025-06-01T00:00:00.000Z",
  };
}

describe("Payment Records PDF", () => {
  it("builds a multi-page A4 PDF of the filtered rows without errors", () => {
    const students = Array.from({ length: 30 }, (_, i) => student(i + 1));
    const attendance = students.flatMap((s, i) =>
      Array.from({ length: 11 }, (_, m) => ({
        studentId: s.studentId,
        date: `2026-${String(m + 1).padStart(2, "0")}-0${(i % 8) + 1}`,
        status: (i + m) % 7 === 0 ? ("ABSENT" as const) : ("PRESENT" as const),
      }))
    );
    const feeRecords = students.flatMap((s, i) =>
      Array.from({ length: 10 }, (_, m) => m)
        .filter((m) => (i + m) % 5 !== 0)
        .map((m) => {
          const mk = `2026-${String(m + 1).padStart(2, "0")}`;
          return { ...makeDynamicFeeRecord(s, mk, 2500), totalPaid: 2500, balance: 0, status: "PAID" as const, lastPaymentDate: `${mk}-04` };
        })
    );
    const rows = buildPaymentGrid({ students, feeRecords, attendance, year: 2026, currentMonthKey: "2026-11", defaultFee: 2500 });

    const doc = buildPaymentRecordsPdf({
      rows,
      year: 2026,
      fromMonth: 0,
      toMonth: 11,
      mode: "amount",
      currencySymbol: "Rs.",
      schoolName: "Sample Academy",
      classLabel: "All classes",
      statusLabel: "All students",
      search: "",
    });

    // 30 students do not fit on one A4 landscape page.
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    expect(doc.internal.pageSize.getWidth()).toBeGreaterThan(doc.internal.pageSize.getHeight());
    // Set RECORDS_PDF_OUT to a file path to look at the result by hand.
    if (process.env.RECORDS_PDF_OUT) writeFileSync(process.env.RECORDS_PDF_OUT, Buffer.from(doc.output("arraybuffer")));
  });
});
