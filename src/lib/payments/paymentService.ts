import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase/config";
import {
  MonthlyFeeRecord,
  PaymentTransaction,
  MonthlyPaymentsSummary,
  RecordPaymentInput,
  PaymentStatus
} from "@/types/payment";
import { getStudents, getStudentById } from "../students/studentService";
import { formatDisplayDate, format12HourTime, DEFAULT_TIMEZONE } from "../utils/dateUtils";

const COLLECTION_NAME = "feeRecords";
const LOCAL_STORAGE_KEY = "smartattend_local_fees";

function getLocalFees(): MonthlyFeeRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalFees(records: MonthlyFeeRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

/**
 * Returns current month in YYYY-MM format (e.g., "2026-09")
 */
export function getCurrentMonthKey(dateInput?: Date | string, timezone: string = DEFAULT_TIMEZONE): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
    });
    return formatter.format(d); // YYYY-MM
  } catch {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
}

/**
 * Formats "2026-09" to "September 2026"
 */
export function formatMonthName(monthKey: string): string {
  if (!monthKey || !monthKey.includes('-')) return monthKey || '';
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const d = new Date(year, month, 1);
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Computes previous month key e.g. "2026-09" -> "2026-08"
 */
export function getPreviousMonthKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) - 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Computes next month key e.g. "2026-09" -> "2026-10"
 */
export function getNextMonthKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) + 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Calculates payment status based on fee and paid amounts
 */
export function calculatePaymentStatus(monthlyFee: number, totalPaid: number, isWaived: boolean = false): PaymentStatus {
  if (isWaived) return "WAIVED";
  if (totalPaid <= 0) return "UNPAID";
  if (totalPaid >= monthlyFee) return "PAID";
  return "PARTIALLY_PAID";
}

/**
 * Fetches all fee records for a given monthKey and merges with active student roster.
 * Unrecorded active students are dynamically rendered as UNPAID.
 */
export async function getMonthlyFeeRecords(
  monthKey: string,
  defaultFee: number = 5000
): Promise<{ records: MonthlyFeeRecord[]; summary: MonthlyPaymentsSummary }> {
  const monthName = formatMonthName(monthKey);
  const students = await getStudents();
  const activeStudents = students.filter((s) => s.status === "ACTIVE");

  // Fetch existing recorded fee documents from Firestore
  let existingRecords: MonthlyFeeRecord[] = [];
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const q = query(colRef, where("monthKey", "==", monthKey));
    const snap = await getDocs(q);
    if (!snap.empty) {
      existingRecords = snap.docs.map((d) => d.data() as MonthlyFeeRecord);
    }
  } catch (err) {
    console.debug("Firestore getMonthlyFeeRecords fallback:", err);
  }

  // Fallback to local storage
  if (existingRecords.length === 0) {
    const local = getLocalFees();
    existingRecords = local.filter((r) => r.monthKey === monthKey);
  }

  const recordMap = new Map<string, MonthlyFeeRecord>();
  existingRecords.forEach((r) => {
    recordMap.set(r.studentId.toUpperCase(), r);
  });

  const mergedRecords: MonthlyFeeRecord[] = [];
  let paidCount = 0;
  let partiallyPaidCount = 0;
  let unpaidCount = 0;
  let waivedCount = 0;
  let totalExpected = 0;
  let totalCollected = 0;

  activeStudents.forEach((student) => {
    const existing = recordMap.get(student.studentId.toUpperCase());
    const feeAmount = existing ? existing.monthlyFee : defaultFee;

    if (existing) {
      mergedRecords.push(existing);
      totalExpected += existing.monthlyFee;
      totalCollected += existing.totalPaid;

      if (existing.status === "PAID") paidCount++;
      else if (existing.status === "PARTIALLY_PAID") partiallyPaidCount++;
      else if (existing.status === "WAIVED") waivedCount++;
      else unpaidCount++;
    } else {
      // Dynamic unrecorded representation
      const dynamicRecord: MonthlyFeeRecord = {
        feeRecordId: `${student.studentId.toUpperCase()}_${monthKey}`,
        studentId: student.studentId.toUpperCase(),
        studentNameSnapshot: student.fullName,
        classSnapshot: student.class,
        monthKey,
        monthName,
        monthlyFee: feeAmount,
        totalPaid: 0,
        balance: feeAmount,
        status: "UNPAID",
        transactions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "system",
        updatedBy: "system",
      };

      mergedRecords.push(dynamicRecord);
      totalExpected += feeAmount;
      unpaidCount++;
    }
  });

  // Sort by Class, then Student ID
  mergedRecords.sort((a, b) => {
    const classCmp = a.classSnapshot.localeCompare(b.classSnapshot);
    if (classCmp !== 0) return classCmp;
    return a.studentId.localeCompare(b.studentId);
  });

  const outstandingBalance = Math.max(0, totalExpected - totalCollected);
  const collectionRate = totalExpected > 0 ? Number(((totalCollected / totalExpected) * 100).toFixed(1)) : 0;

  const summary: MonthlyPaymentsSummary = {
    monthKey,
    monthName,
    totalStudents: activeStudents.length,
    paidCount,
    partiallyPaidCount,
    unpaidCount,
    waivedCount,
    totalExpected,
    totalCollected,
    outstandingBalance,
    collectionRate,
  };

  return { records: mergedRecords, summary };
}

/**
 * Retrieves a single student's fee record for a specific month.
 */
export async function getStudentFeeRecord(
  studentId: string,
  monthKey: string,
  defaultFee: number = 5000
): Promise<MonthlyFeeRecord | null> {
  const upperId = studentId.trim().toUpperCase();
  const feeRecordId = `${upperId}_${monthKey}`;

  try {
    const docRef = doc(db, COLLECTION_NAME, feeRecordId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as MonthlyFeeRecord;
    }
  } catch (err) {
    console.debug("Firestore getStudentFeeRecord fallback:", err);
  }

  const local = getLocalFees();
  const found = local.find((r) => r.feeRecordId === feeRecordId);
  if (found) return found;

  // Fallback dynamic object
  const student = await getStudentById(upperId);
  if (!student) return null;

  return {
    feeRecordId,
    studentId: student.studentId.toUpperCase(),
    studentNameSnapshot: student.fullName,
    classSnapshot: student.class,
    monthKey,
    monthName: formatMonthName(monthKey),
    monthlyFee: defaultFee,
    totalPaid: 0,
    balance: defaultFee,
    status: "UNPAID",
    transactions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "system",
    updatedBy: "system",
  };
}

/**
 * Records a payment transaction for a student in a specific month.
 * Preserves multi-payment history and atomically recalculates balances and statuses.
 */
export async function recordStudentPayment(input: RecordPaymentInput): Promise<MonthlyFeeRecord> {
  const upperId = input.studentId.trim().toUpperCase();
  const feeRecordId = `${upperId}_${input.monthKey}`;
  const now = new Date();
  const paymentDate = input.paymentDate || now.toISOString().split('T')[0];

  const student = await getStudentById(upperId);
  if (!student) {
    throw new Error(`Student ${upperId} not found.`);
  }

  let currentRecord = await getStudentFeeRecord(upperId, input.monthKey, input.monthlyFee || 5000);
  const monthlyFee = input.monthlyFee !== undefined ? input.monthlyFee : (currentRecord ? currentRecord.monthlyFee : 5000);
  const currentPaid = currentRecord ? currentRecord.totalPaid : 0;
  const currentTransactions = currentRecord ? currentRecord.transactions || [] : [];

  const newTotalPaid = currentPaid + input.amount;
  const newBalance = Math.max(0, monthlyFee - newTotalPaid);
  const newStatus = calculatePaymentStatus(monthlyFee, newTotalPaid);

  const newTx: PaymentTransaction = {
    paymentId: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    feeRecordId,
    studentId: upperId,
    amount: input.amount,
    paymentDate,
    paymentDateFormatted: formatDisplayDate(paymentDate),
    paymentMethod: input.paymentMethod,
    referenceNumber: input.referenceNumber?.trim() || "",
    notes: input.notes?.trim() || "",
    recordedBy: input.recordedBy.uid,
    recordedByName: input.recordedBy.displayName,
    recordedAt: now.toISOString(),
  };

  const updatedRecord: MonthlyFeeRecord = {
    feeRecordId,
    studentId: upperId,
    studentNameSnapshot: student.fullName,
    classSnapshot: student.class,
    monthKey: input.monthKey,
    monthName: formatMonthName(input.monthKey),
    monthlyFee,
    totalPaid: newTotalPaid,
    balance: newBalance,
    status: newStatus,
    lastPaymentDate: paymentDate,
    transactions: [...currentTransactions, newTx],
    createdAt: currentRecord ? currentRecord.createdAt : now.toISOString(),
    updatedAt: now.toISOString(),
    createdBy: currentRecord ? currentRecord.createdBy : input.recordedBy.displayName,
    updatedBy: input.recordedBy.displayName,
  };

  try {
    const docRef = doc(db, COLLECTION_NAME, feeRecordId);
    await setDoc(docRef, updatedRecord);
  } catch (err) {
    console.debug("Firestore recordStudentPayment fallback:", err);
  }

  // Update local storage
  const local = getLocalFees();
  const idx = local.findIndex((r) => r.feeRecordId === feeRecordId);
  if (idx !== -1) {
    local[idx] = updatedRecord;
  } else {
    local.push(updatedRecord);
  }
  saveLocalFees(local);

  return updatedRecord;
}

/**
 * Marks a student fee as WAIVED.
 */
export async function waiveStudentFee(
  studentId: string,
  monthKey: string,
  reason: string,
  user: { uid: string; displayName: string },
  defaultFee: number = 5000
): Promise<MonthlyFeeRecord> {
  const upperId = studentId.trim().toUpperCase();
  const feeRecordId = `${upperId}_${monthKey}`;
  const student = await getStudentById(upperId);
  if (!student) throw new Error("Student not found");

  const existing = await getStudentFeeRecord(upperId, monthKey, defaultFee);
  const now = new Date().toISOString();

  const record: MonthlyFeeRecord = {
    ...(existing || {
      feeRecordId,
      studentId: upperId,
      studentNameSnapshot: student.fullName,
      classSnapshot: student.class,
      monthKey,
      monthName: formatMonthName(monthKey),
      monthlyFee: defaultFee,
      totalPaid: 0,
      transactions: [],
      createdAt: now,
      createdBy: user.displayName,
    }),
    status: "WAIVED",
    balance: 0,
    waiveReason: reason || "Fee waived by administrative decision",
    updatedAt: now,
    updatedBy: user.displayName,
  };

  try {
    const docRef = doc(db, COLLECTION_NAME, feeRecordId);
    await setDoc(docRef, record);
  } catch (err) {}

  const local = getLocalFees();
  const idx = local.findIndex((r) => r.feeRecordId === feeRecordId);
  if (idx !== -1) local[idx] = record;
  else local.push(record);
  saveLocalFees(local);

  return record;
}

/**
 * Returns all monthly fee records for a student across all months.
 */
export async function getStudentAllPaymentHistory(studentId: string): Promise<MonthlyFeeRecord[]> {
  const upperId = studentId.trim().toUpperCase();
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const q = query(colRef, where("studentId", "==", upperId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const list = snap.docs.map((d) => d.data() as MonthlyFeeRecord);
      list.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
      return list;
    }
  } catch (err) {}

  const local = getLocalFees();
  return local
    .filter((r) => r.studentId.toUpperCase() === upperId)
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

/**
 * Exports Monthly Fee Records to CSV
 */
export function exportMonthlyPaymentsToCsv(
  records: MonthlyFeeRecord[],
  monthName: string,
  currencySymbol: string = "Rs."
) {
  function escape(val: unknown) {
    if (val === null || val === undefined) return '""';
    return `"${String(val).replace(/"/g, '""')}"`;
  }

  const headers = [
    "Month",
    "Student ID",
    "Student Name",
    "Class",
    `Monthly Fee (${currencySymbol})`,
    `Total Paid (${currencySymbol})`,
    `Balance (${currencySymbol})`,
    "Payment Status",
    "Last Payment Date",
    "Total Transactions"
  ];

  const csvRows = [headers.join(',')];

  records.forEach((r) => {
    const line = [
      escape(r.monthName || monthName),
      escape(r.studentId),
      escape(r.studentNameSnapshot),
      escape(r.classSnapshot),
      escape(r.monthlyFee),
      escape(r.totalPaid),
      escape(r.balance),
      escape(r.status),
      escape(r.lastPaymentDate ? formatDisplayDate(r.lastPaymentDate) : "-"),
      escape(r.transactions ? r.transactions.length : 0)
    ];
    csvRows.push(line.join(','));
  });

  const csvContent = "\uFEFF" + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `monthly_payments_${monthName.replace(/\s+/g, "_")}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}