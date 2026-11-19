import { describe, it, expect } from "vitest";
import {
  applyFeeRule,
  countAttendedDays,
  getAttendedDays,
  makeDynamicFeeRecord,
  normalizeStoredStatus,
  resolveMonthStatus,
  studentClassNames,
} from "../src/lib/payments/feeRules";
import { buildPaymentGrid, filterGridRows, monthTotals, rowTotals, summarizeGrid } from "../src/lib/payments/paymentGrid";
import { cellMainText, cellSubText, shortDate } from "../src/lib/payments/recordsDisplay";
import { paymentRecordsPdfFileName } from "../src/lib/payments/recordsPdfExport";
import type { AttendanceRecord } from "../src/types/attendance";
import type { MonthlyFeeRecord } from "../src/types/payment";
import type { Student } from "../src/types/student";

function att(studentId: string, date: string, status: AttendanceRecord["status"]) {
  return { studentId, date, status };
}

function student(id: string, overrides: Partial<Student> = {}): Student {
  return {
    studentId: id,
    fullName: `Student ${id}`,
    class: "Grade 6",
    classIds: ["grade-6"],
    email: "",
    qrCodeValue: id,
    status: "ACTIVE",
    createdAt: "2025-01-10T00:00:00.000Z",
    updatedAt: "2025-01-10T00:00:00.000Z",
    ...overrides,
  };
}

function saved(studentId: string, monthKey: string, totalPaid: number, status: string, extra: Partial<MonthlyFeeRecord> = {}) {
  return {
    ...makeDynamicFeeRecord(student(studentId), monthKey, 2500),
    totalPaid,
    balance: Math.max(0, 2500 - totalPaid),
    status: status as MonthlyFeeRecord["status"],
    lastPaymentDate: totalPaid > 0 ? `${monthKey}-05` : undefined,
    ...extra,
  };
}

describe("Fee rule: a month is due only if the student came to class", () => {
  it("counts only Present and Late days, once per date", () => {
    const map = countAttendedDays([
      att("stu001", "2026-03-02", "PRESENT"),
      att("STU001", "2026-03-02", "PRESENT"), // same day twice
      att("STU001", "2026-03-09", "LATE"),
      att("STU001", "2026-03-16", "ABSENT"), // automatic absent marks don't count
      att("STU001", "2026-04-06", "ABSENT"),
    ]);
    expect(getAttendedDays(map, "STU001", "2026-03")).toBe(2);
    expect(getAttendedDays(map, "stu001", "2026-04")).toBe(0);
    expect(getAttendedDays(map, "STU999", "2026-03")).toBe(0);
  });

  it("no Present/Late day means NO_CLASS (no fee), otherwise UNPAID", () => {
    expect(resolveMonthStatus(null, 0)).toBe("NO_CLASS");
    expect(resolveMonthStatus(null, 1)).toBe("UNPAID");
  });

  it("paid and waived months stay paid/waived even without attendance", () => {
    expect(resolveMonthStatus({ status: "PAID", monthlyFee: 2500, totalPaid: 2500 }, 0)).toBe("PAID");
    expect(resolveMonthStatus({ status: "WAIVED", monthlyFee: 2500, totalPaid: 0 }, 0)).toBe("WAIVED");
  });

  it("old part payments read as UNPAID until the rest is paid", () => {
    expect(normalizeStoredStatus({ status: "PARTIALLY_PAID", monthlyFee: 2500, totalPaid: 1000 })).toBe("UNPAID");
    expect(normalizeStoredStatus({ status: "PARTIALLY_PAID", monthlyFee: 2500, totalPaid: 2500 })).toBe("PAID");
    expect(resolveMonthStatus({ status: "PARTIALLY_PAID", monthlyFee: 2500, totalPaid: 1000 }, 3)).toBe("UNPAID");
  });

  it("applyFeeRule sets balance only for UNPAID and never invents PARTIALLY_PAID", () => {
    const base = makeDynamicFeeRecord(student("STU001"), "2026-05", 2500);
    expect(applyFeeRule(base, 0)).toMatchObject({ status: "NO_CLASS", balance: 0, attendedDays: 0 });
    expect(applyFeeRule(base, 4)).toMatchObject({ status: "UNPAID", balance: 2500, attendedDays: 4 });
    const legacy = saved("STU001", "2026-05", 1000, "PARTIALLY_PAID");
    expect(applyFeeRule(legacy, 4)).toMatchObject({ status: "UNPAID", balance: 1500 });
  });

  it("lists every class a student belongs to without duplicates", () => {
    expect(studentClassNames(student("STU001", { class: "Grade 6", classDisplayNames: ["grade 6", "Spoken English"] }))).toEqual([
      "Grade 6",
      "Spoken English",
    ]);
  });
});

describe("Payment Records year grid", () => {
  const students = [
    student("STU001"),
    student("STU002", { class: "Grade 7", classIds: ["grade-7"], createdAt: "2026-04-03T08:00:00.000Z" }),
    student("STU003", { status: "INACTIVE" }),
  ];
  const attendance = [
    att("STU001", "2026-01-05", "PRESENT"),
    att("STU001", "2026-02-02", "LATE"),
    att("STU001", "2026-03-02", "ABSENT"),
    att("STU001", "2026-11-03", "PRESENT"),
    att("STU002", "2026-05-04", "PRESENT"),
  ];
  const feeRecords = [
    saved("STU001", "2026-01", 2500, "PAID"),
    saved("STU001", "2026-12", 2500, "PAID"), // paid in advance
    saved("STU002", "2026-05", 1000, "PARTIALLY_PAID"),
  ];
  const rows = buildPaymentGrid({
    students,
    feeRecords,
    attendance,
    year: 2026,
    currentMonthKey: "2026-11",
    defaultFee: 2500,
  });
  const byId = (id: string) => rows.find((r) => r.studentId === id)!;

  it("includes active students only, with 12 months each", () => {
    expect(rows.map((r) => r.studentId)).toEqual(["STU001", "STU002"]);
    expect(byId("STU001").cells).toHaveLength(12);
  });

  it("works out each month's status", () => {
    const s1 = byId("STU001").cells.map((c) => c.status);
    expect(s1[0]).toBe("PAID"); // Jan paid
    expect(s1[1]).toBe("UNPAID"); // Feb came (Late), not paid
    expect(s1[2]).toBe("NO_CLASS"); // Mar only Absent marks
    expect(s1[10]).toBe("UNPAID"); // Nov (this month) came, not paid
    expect(s1[11]).toBe("PAID"); // Dec paid in advance

    const s2 = byId("STU002").cells.map((c) => c.status);
    expect(s2[0]).toBe("NOT_ENROLLED"); // before the student was added
    expect(s2[3]).toBe("NO_CLASS"); // April: added this month, no class
    expect(s2[4]).toBe("UNPAID"); // old part payment, rest still due
    expect(byId("STU002").cells[4].balance).toBe(1500);
  });

  it("future months with nothing paid are not due yet", () => {
    const rowsInOct = buildPaymentGrid({ students, feeRecords, attendance, year: 2026, currentMonthKey: "2026-10", defaultFee: 2500 });
    const s1 = rowsInOct.find((r) => r.studentId === "STU001")!.cells.map((c) => c.status);
    expect(s1[10]).toBe("NOT_DUE");
    expect(s1[11]).toBe("PAID");
  });

  it("totals money received and money still owed", () => {
    expect(rowTotals(byId("STU001"), 0, 11)).toEqual({ paid: 5000, owed: 5000 });
    expect(rowTotals(byId("STU002"), 0, 11)).toEqual({ paid: 1000, owed: 1500 });
    expect(summarizeGrid(rows, 0, 11)).toEqual({ students: 2, collected: 6000, owed: 6500, unpaidMonths: 3 });
    const jan = monthTotals(rows, 0, 0)[0];
    expect(jan).toMatchObject({ collected: 2500, paidCount: 1, dueCount: 1 });
  });

  it("filters by search, class, status and month range", () => {
    const base = { search: "", className: "ALL", status: "ALL" as const, fromMonth: 0, toMonth: 11 };
    expect(filterGridRows(rows, { ...base, search: "stu002" }).map((r) => r.studentId)).toEqual(["STU002"]);
    expect(filterGridRows(rows, { ...base, className: "grade 7" }).map((r) => r.studentId)).toEqual(["STU002"]);
    expect(filterGridRows(rows, { ...base, status: "OWES" })).toHaveLength(2);
    // Only January: STU001 paid, STU002 not enrolled yet (hidden)
    expect(filterGridRows(rows, { ...base, fromMonth: 0, toMonth: 0 }).map((r) => r.studentId)).toEqual(["STU001"]);
    expect(filterGridRows(rows, { ...base, fromMonth: 0, toMonth: 0, status: "PAID" }).map((r) => r.studentId)).toEqual(["STU001"]);
    expect(filterGridRows(rows, { ...base, status: "NO_CLASS" })).toHaveLength(2);
    expect(filterGridRows(rows, { ...base, status: "WAIVED" })).toHaveLength(0);
  });

  it("shows the right text in cells and names the PDF after the filters", () => {
    const jan = byId("STU001").cells[0];
    const feb = byId("STU001").cells[1];
    const mar = byId("STU001").cells[2];
    expect(cellMainText(jan, "amount")).toBe("2,500");
    expect(cellMainText(jan, "date")).toBe("05 Jan");
    expect(cellMainText(jan, "status")).toBe("Paid");
    expect(cellMainText(feb, "amount")).toBe("Unpaid");
    expect(cellSubText(feb, "amount")).toBe("2,500 due");
    expect(cellMainText(mar, "amount")).toBe("No class");
    expect(cellSubText(mar, "status")).toBe("");
    expect(shortDate("2026-11-19")).toBe("19 Nov");
    expect(paymentRecordsPdfFileName(2026, 0, 11, "All classes")).toBe("Payment_Records_2026_All_Classes.pdf");
    expect(paymentRecordsPdfFileName(2026, 10, 10, "Grade 10 (O/L)")).toBe("Payment_Records_2026_Nov_Grade_10_O_L.pdf");
  });
});
