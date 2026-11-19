import { Student } from "@/types/student";
import { getStudents } from "../students/studentService";
import { getAttendanceForDateRange } from "../attendance/attendanceService";
import { getCurrentMonthKey, getFeeRecordsForMonthRange } from "./paymentService";
import { buildPaymentGrid, PaymentGridRow } from "./paymentGrid";

export interface PaymentRecordsData {
  rows: PaymentGridRow[];
  students: Student[];
  currentMonthKey: string;
}

/**
 * Loads one year of the Payment Records table. Read-only: it reads students,
 * saved fee records and attendance for that year, and writes nothing.
 */
export async function loadPaymentRecords(
  year: number,
  defaultFee: number,
  timezone: string
): Promise<PaymentRecordsData> {
  const [students, feeRecords, attendance] = await Promise.all([
    getStudents(),
    getFeeRecordsForMonthRange(`${year}-01`, `${year}-12`),
    getAttendanceForDateRange(`${year}-01-01`, `${year}-12-31`),
  ]);
  const currentMonthKey = getCurrentMonthKey(new Date(), timezone);
  const rows = buildPaymentGrid({ students, feeRecords, attendance, year, currentMonthKey, defaultFee });
  return { rows, students, currentMonthKey };
}
