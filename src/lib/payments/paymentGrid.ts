import type { AttendanceRecord } from "@/types/attendance";
import type { Student } from "@/types/student";
import type { MonthlyFeeRecord, PaymentStatus } from "@/types/payment";
import {
  applyFeeRule,
  countAttendedDays,
  getAttendedDays,
  makeDynamicFeeRecord,
  monthKeysOfYear,
  primaryClassName,
  studentClassNames,
} from "./feeRules";

/**
 * Year view of monthly payments (Payment Records page): one row per student,
 * one cell per month. Pure functions only, so the rules can be tested.
 */

/** NOT_DUE: a future month. NOT_ENROLLED: before the student was added, with nothing recorded. */
export type GridCellStatus = PaymentStatus | "NOT_DUE" | "NOT_ENROLLED";

export interface PaymentGridCell {
  monthKey: string;
  monthIndex: number; // 0 = January
  status: GridCellStatus;
  monthlyFee: number;
  totalPaid: number;
  balance: number; // amount still owed (only for UNPAID)
  attendedDays: number;
  lastPaymentDate?: string;
  /** The month's record with the fee rule applied (an unsaved one if nothing is recorded). */
  record: MonthlyFeeRecord;
  hasSavedRecord: boolean;
}

export interface PaymentGridRow {
  studentId: string;
  fullName: string;
  classNames: string[];
  classLabel: string;
  cells: PaymentGridCell[]; // always 12, January to December
}

export interface BuildPaymentGridInput {
  students: Student[];
  feeRecords: MonthlyFeeRecord[];
  attendance: ReadonlyArray<Pick<AttendanceRecord, "studentId" | "date" | "status">>;
  year: number;
  currentMonthKey: string; // "YYYY-MM" today, in the academy's timezone
  defaultFee: number;
}

function joinedMonthKey(createdAt: string | undefined): string | null {
  return createdAt && /^\d{4}-\d{2}/.test(createdAt) ? createdAt.slice(0, 7) : null;
}

export function buildPaymentGrid(input: BuildPaymentGridInput): PaymentGridRow[] {
  const { students, feeRecords, attendance, year, currentMonthKey, defaultFee } = input;
  const keys = monthKeysOfYear(year);
  const days = countAttendedDays(attendance);
  const saved = new Map<string, MonthlyFeeRecord>();
  for (const r of feeRecords) {
    if (!r || !r.studentId || !r.monthKey) continue;
    saved.set(`${r.studentId.trim().toUpperCase()}|${r.monthKey}`, r);
  }

  const rows = students
    .filter((s) => s.status === "ACTIVE")
    .map((student): PaymentGridRow => {
      const id = student.studentId.trim().toUpperCase();
      const joined = joinedMonthKey(student.createdAt);
      const cells = keys.map((mk, monthIndex): PaymentGridCell => {
        const savedRecord = saved.get(`${id}|${mk}`);
        const attendedDays = getAttendedDays(days, id, mk);
        const record = applyFeeRule(savedRecord ?? makeDynamicFeeRecord(student, mk, defaultFee), attendedDays);
        let status: GridCellStatus = record.status;
        if (status === "UNPAID" || status === "NO_CLASS") {
          if (mk > currentMonthKey) status = "NOT_DUE";
          else if (status === "NO_CLASS" && !savedRecord && joined && mk < joined) status = "NOT_ENROLLED";
        }
        return {
          monthKey: mk,
          monthIndex,
          status,
          monthlyFee: record.monthlyFee,
          totalPaid: Number(record.totalPaid) || 0,
          balance: status === "UNPAID" ? record.balance : 0,
          attendedDays,
          lastPaymentDate: record.lastPaymentDate,
          record,
          hasSavedRecord: !!savedRecord,
        };
      });
      const classNames = studentClassNames(student);
      return {
        studentId: id,
        fullName: student.fullName,
        classNames,
        classLabel: classNames.join(", ") || primaryClassName(student) || "Unassigned",
        cells,
      };
    });

  rows.sort((a, b) => a.classLabel.localeCompare(b.classLabel) || a.studentId.localeCompare(b.studentId));
  return rows;
}

export type GridStatusFilter = "ALL" | "OWES" | "PAID" | "NO_CLASS" | "WAIVED";

export interface GridFilters {
  search: string;
  className: string; // "ALL" or a class name
  status: GridStatusFilter;
  fromMonth: number; // 0-11
  toMonth: number; // 0-11, >= fromMonth
}

export const GRID_STATUS_OPTIONS: { value: GridStatusFilter; label: string }[] = [
  { value: "ALL", label: "All students" },
  { value: "OWES", label: "Has unpaid months" },
  { value: "PAID", label: "All months paid" },
  { value: "NO_CLASS", label: "Has months with no class" },
  { value: "WAIVED", label: "Has waived months" },
];

export function cellsInRange(row: PaymentGridRow, fromMonth: number, toMonth: number): PaymentGridCell[] {
  return row.cells.slice(fromMonth, toMonth + 1);
}

export function filterGridRows(rows: PaymentGridRow[], f: GridFilters): PaymentGridRow[] {
  const q = f.search.trim().toLowerCase();
  const cls = f.className.trim().toLowerCase();
  return rows.filter((row) => {
    if (f.className !== "ALL" && !row.classNames.some((c) => c.toLowerCase() === cls)) return false;
    if (q && !row.fullName.toLowerCase().includes(q) && !row.studentId.toLowerCase().includes(q)) return false;
    const cells = cellsInRange(row, f.fromMonth, f.toMonth);
    if (cells.every((c) => c.status === "NOT_ENROLLED")) return false;
    const due = cells.filter((c) => c.status === "PAID" || c.status === "UNPAID" || c.status === "WAIVED");
    switch (f.status) {
      case "OWES":
        return due.some((c) => c.status === "UNPAID");
      case "PAID":
        return due.length > 0 && due.every((c) => c.status === "PAID" || c.status === "WAIVED");
      case "NO_CLASS":
        return cells.some((c) => c.status === "NO_CLASS");
      case "WAIVED":
        return due.some((c) => c.status === "WAIVED");
      default:
        return true;
    }
  });
}

export interface RowTotals {
  paid: number;
  owed: number;
}

/** Money received and money still owed for one student in the month range. */
export function rowTotals(row: PaymentGridRow, fromMonth: number, toMonth: number): RowTotals {
  let paid = 0;
  let owed = 0;
  for (const c of cellsInRange(row, fromMonth, toMonth)) {
    paid += c.totalPaid;
    if (c.status === "UNPAID") owed += c.balance;
  }
  return { paid, owed };
}

export interface GridSummary {
  students: number;
  collected: number;
  owed: number;
  unpaidMonths: number;
}

export function summarizeGrid(rows: PaymentGridRow[], fromMonth: number, toMonth: number): GridSummary {
  let collected = 0;
  let owed = 0;
  let unpaidMonths = 0;
  for (const row of rows) {
    for (const c of cellsInRange(row, fromMonth, toMonth)) {
      collected += c.totalPaid;
      if (c.status === "UNPAID") {
        owed += c.balance;
        unpaidMonths++;
      }
    }
  }
  return { students: rows.length, collected, owed, unpaidMonths };
}

export interface MonthTotal {
  monthKey: string;
  monthIndex: number;
  collected: number;
  paidCount: number;
  dueCount: number; // students who had to pay (paid + unpaid)
  notDue: boolean;
}

export function monthTotals(rows: PaymentGridRow[], fromMonth: number, toMonth: number): MonthTotal[] {
  const totals: MonthTotal[] = [];
  for (let m = fromMonth; m <= toMonth; m++) {
    let collected = 0;
    let paidCount = 0;
    let dueCount = 0;
    let notDue = false;
    for (const row of rows) {
      const c = row.cells[m];
      collected += c.totalPaid;
      if (c.status === "PAID") paidCount++;
      if (c.status === "PAID" || c.status === "UNPAID") dueCount++;
      if (c.status === "NOT_DUE") notDue = true;
    }
    totals.push({ monthKey: rows[0]?.cells[m]?.monthKey ?? "", monthIndex: m, collected, paidCount, dueCount, notDue });
  }
  return totals;
}
