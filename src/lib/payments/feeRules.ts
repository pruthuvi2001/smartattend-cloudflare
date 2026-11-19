import type { AttendanceRecord } from "@/types/attendance";
import type { Student } from "@/types/student";
import type { MonthlyFeeRecord, PaymentStatus, StoredPaymentStatus } from "@/types/payment";

/**
 * Monthly fee rules, shared by every page that shows payments.
 *
 * 1. A month's fee is due only if the student was marked PRESENT or LATE on at
 *    least one day that month. ABSENT marks (including the automatic ones) do not
 *    count. A month with no such day shows as NO_CLASS: no fee, not owed.
 * 2. There are no part payments. A month is PAID, UNPAID or WAIVED. Old records
 *    saved as "PARTIALLY_PAID" are read as UNPAID until the rest is paid.
 *
 * Pure functions only (no Firestore), so they are easy to test.
 */

/** Attendance statuses that count as "came to class". */
export const ATTENDED_STATUSES: ReadonlyArray<AttendanceRecord["status"]> = ["PRESENT", "LATE"];

export function isAttended(status: string | undefined | null): boolean {
  return status === "PRESENT" || status === "LATE";
}

/** "2026-09" -> "September 2026" */
export function formatMonthName(monthKey: string): string {
  if (!monthKey || !monthKey.includes("-")) return monthKey || "";
  const [yearStr, monthStr] = monthKey.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const d = new Date(year, month, 1);
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

/** "2026-09-14" -> "2026-09" */
export function monthKeyOf(dateStr: string): string {
  return (dateStr || "").slice(0, 7);
}

/** First and last possible YYYY-MM-DD strings of a month (string range, safe for Firestore queries). */
export function monthDateRange(monthKey: string): { start: string; end: string } {
  return { start: `${monthKey}-01`, end: `${monthKey}-31` };
}

/** ["2026-01", ..., "2026-12"] */
export function monthKeysOfYear(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

/** studentId (upper case) -> monthKey -> number of different days marked Present or Late. */
export type AttendedDaysMap = Map<string, Map<string, number>>;

export function countAttendedDays(
  records: ReadonlyArray<Pick<AttendanceRecord, "studentId" | "date" | "status">>
): AttendedDaysMap {
  const days = new Map<string, Map<string, Set<string>>>();
  for (const r of records) {
    if (!r || !r.studentId || !r.date || !isAttended(r.status)) continue;
    const id = r.studentId.trim().toUpperCase();
    const mk = monthKeyOf(r.date);
    let byMonth = days.get(id);
    if (!byMonth) {
      byMonth = new Map();
      days.set(id, byMonth);
    }
    let dates = byMonth.get(mk);
    if (!dates) {
      dates = new Set();
      byMonth.set(mk, dates);
    }
    dates.add(r.date);
  }

  const counts: AttendedDaysMap = new Map();
  days.forEach((byMonth, id) => {
    const m = new Map<string, number>();
    byMonth.forEach((dates, mk) => m.set(mk, dates.size));
    counts.set(id, m);
  });
  return counts;
}

export function getAttendedDays(map: AttendedDaysMap, studentId: string, monthKey: string): number {
  return map.get(studentId.trim().toUpperCase())?.get(monthKey) ?? 0;
}

/**
 * Status of a saved fee record without part payments.
 * Old "PARTIALLY_PAID" records become UNPAID (or PAID if the payments cover the fee).
 */
export function normalizeStoredStatus(
  rec: { status?: string; monthlyFee?: number; totalPaid?: number }
): StoredPaymentStatus {
  if (rec.status === "WAIVED") return "WAIVED";
  if (rec.status === "PAID") return "PAID";
  const fee = Number(rec.monthlyFee) || 0;
  const paid = Number(rec.totalPaid) || 0;
  if (fee > 0 && paid >= fee) return "PAID";
  return "UNPAID";
}

/**
 * What to show for one student-month.
 * Paid and waived months stay as they are (money already received, or fee forgiven).
 * Otherwise the fee is due only if the student came to class at least once.
 */
export function resolveMonthStatus(
  saved: { status?: string; monthlyFee?: number; totalPaid?: number } | null | undefined,
  attendedDays: number
): PaymentStatus {
  if (saved) {
    const s = normalizeStoredStatus(saved);
    if (s !== "UNPAID") return s;
  }
  return attendedDays > 0 ? "UNPAID" : "NO_CLASS";
}

/** A fee record with the attendance rule applied, ready to display. Never save the result. */
export function applyFeeRule(record: MonthlyFeeRecord, attendedDays: number): MonthlyFeeRecord {
  const status = resolveMonthStatus(record, attendedDays);
  const paid = Number(record.totalPaid) || 0;
  const balance = status === "UNPAID" ? Math.max(0, (Number(record.monthlyFee) || 0) - paid) : 0;
  return { ...record, status, balance, attendedDays };
}

/** The class name shown for a student (same order the rest of the app uses). */
export function primaryClassName(student: Pick<Student, "class" | "classDisplayNames">): string {
  return (student.class || student.classDisplayNames?.[0] || "").trim();
}

/** Every class name a student belongs to, without duplicates. */
export function studentClassNames(student: Pick<Student, "class" | "classDisplayNames">): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const raw of [student.class, ...(student.classDisplayNames || [])]) {
    const name = (raw || "").trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    names.push(name);
  }
  return names;
}

/** In-memory record for a month with nothing saved yet. Shown only; not written to Firestore. */
export function makeDynamicFeeRecord(
  student: Pick<Student, "studentId" | "fullName" | "class" | "classIds" | "classDisplayNames">,
  monthKey: string,
  monthlyFee: number,
  nowIso: string = new Date().toISOString()
): MonthlyFeeRecord {
  const id = student.studentId.trim().toUpperCase();
  const record: MonthlyFeeRecord = {
    feeRecordId: `${id}_${monthKey}`,
    studentId: id,
    studentNameSnapshot: student.fullName,
    classSnapshot: primaryClassName(student) || "Unassigned",
    monthKey,
    monthName: formatMonthName(monthKey),
    monthlyFee,
    totalPaid: 0,
    balance: monthlyFee,
    status: "UNPAID",
    transactions: [],
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: "system",
    updatedBy: "system",
  };
  if (student.classIds?.[0]) record.classId = student.classIds[0];
  return record;
}
