import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase/config";
import { AttendanceRecord, AttendanceStatus, AttendanceMethod } from "@/types/attendance";
import { Student } from "@/types/student";
import { parseStudentQrPayload } from "../utils/qrUtils";
import { getStudentByQrCode, getStudentById } from "../students/studentService";
import { getNormalizedDate, format12HourTime, DEFAULT_TIMEZONE } from "../utils/dateUtils";
import { sendAttendanceEmailNotification } from "../notifications/emailService";

const COLLECTION_NAME = "attendance";
const LOCAL_STORAGE_KEY = "smartattend_local_attendance";

function getLocalAttendance(): AttendanceRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalAttendance(records: AttendanceRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

export type ScanResultStatus = "SUCCESS" | "ALREADY_MARKED" | "NOT_FOUND" | "INACTIVE" | "ERROR";

export interface ScanAttendanceResult {
  status: ScanResultStatus;
  student?: Student;
  record?: AttendanceRecord;
  existingRecord?: AttendanceRecord;
  message: string;
}

/**
 * Atomically records attendance from a raw QR code string.
 * Deterministic doc ID: `${studentId}_${normalizedDate}` guarantees zero duplicate records.
 */
export async function recordAttendanceByQr(
  rawQr: string,
  markedBy: { uid: string; displayName: string },
  timezone: string = DEFAULT_TIMEZONE
): Promise<ScanAttendanceResult> {
  const parsedId = parseStudentQrPayload(rawQr);
  if (!parsedId) {
    return {
      status: "NOT_FOUND",
      message: "The scanned QR code is empty or invalid.",
    };
  }

  // 1. Find Student
  const student = await getStudentByQrCode(parsedId);
  if (!student) {
    return {
      status: "NOT_FOUND",
      message: `The scanned QR code "${parsedId}" is not registered in the system.`,
    };
  }

  // 2. Check Active Status
  if (student.status !== "ACTIVE") {
    return {
      status: "INACTIVE",
      student,
      message: `Student ${student.fullName} (${student.studentId}) is marked as INACTIVE.`,
    };
  }

  // 3. Compute Normalized Date and Deterministic Attendance ID
  const todayStr = getNormalizedDate(new Date(), timezone);
  const attendanceId = `${student.studentId.toUpperCase()}_${todayStr}`;
  const now = new Date();
  const timeFormatted = format12HourTime(now, timezone);

  // 4. Check for Existing Attendance Record (Duplicate Prevention)
  try {
    const docRef = doc(db, COLLECTION_NAME, attendanceId);
    const existingSnap = await getDoc(docRef);

    if (existingSnap.exists()) {
      const existingData = existingSnap.data() as AttendanceRecord;
      return {
        status: "ALREADY_MARKED",
        student,
        existingRecord: existingData,
        message: `Attendance already recorded today at ${existingData.timeFormatted || "earlier"}.`,
      };
    }
  } catch (err) {
    console.debug("Firestore check existing attendance fallback:", err);
  }

  // Check local storage duplicate fallback
  const localList = getLocalAttendance();
  const existingLocal = localList.find((r) => r.attendanceId === attendanceId);
  if (existingLocal) {
    return {
      status: "ALREADY_MARKED",
      student,
      existingRecord: existingLocal,
      message: `Attendance already recorded today at ${existingLocal.timeFormatted || "earlier"}.`,
    };
  }

  // 5. Create Attendance Record
  const newRecord: AttendanceRecord = {
    attendanceId,
    studentId: student.studentId.toUpperCase(),
    studentNameSnapshot: student.fullName,
    classId: student.classIds?.[0] || "grade-10",
    classSnapshot: student.class || student.classDisplayNames?.[0] || "Grade 10",
    date: todayStr,
    timestamp: now.toISOString(),
    timeFormatted,
    status: "PRESENT",
    markedBy: markedBy.uid,
    markedByName: markedBy.displayName || "Staff",
    method: "QR_SCAN",
    createdAt: now.toISOString(),
  };

  try {
    const docRef = doc(db, COLLECTION_NAME, attendanceId);
    await setDoc(docRef, newRecord);
  } catch (err) {
    console.debug("Firestore write attendance fallback:", err);
  }

  // Save to local storage
  localList.push(newRecord);
  saveLocalAttendance(localList);

  // Send student email alert (async fire-and-forget)
  sendAttendanceEmailNotification({
    student,
    record: newRecord,
  });

  return {
    status: "SUCCESS",
    student,
    record: newRecord,
    message: "Attendance recorded successfully.",
  };
}

/**
 * Manually mark attendance (for admin/staff corrections)
 */
export async function markAttendanceManually(
  studentId: string,
  status: AttendanceStatus,
  dateStr: string,
  markedBy: { uid: string; displayName: string },
  timezone: string = DEFAULT_TIMEZONE
): Promise<AttendanceRecord> {
  const student = await getStudentById(studentId);
  if (!student) {
    throw new Error(`Student ${studentId} not found.`);
  }

  const attendanceId = `${student.studentId.toUpperCase()}_${dateStr}`;
  const now = new Date();
  const timeFormatted = format12HourTime(now, timezone);

  const record: AttendanceRecord = {
    attendanceId,
    studentId: student.studentId.toUpperCase(),
    studentNameSnapshot: student.fullName,
    classId: student.classIds?.[0] || "grade-10",
    classSnapshot: student.class || student.classDisplayNames?.[0] || "Grade 10",
    date: dateStr,
    timestamp: now.toISOString(),
    timeFormatted,
    status,
    markedBy: markedBy.uid,
    markedByName: markedBy.displayName || "Admin",
    method: "MANUAL",
    createdAt: now.toISOString(),
  };

  try {
    const docRef = doc(db, COLLECTION_NAME, attendanceId);
    await setDoc(docRef, record);
  } catch (err) {}

  const localList = getLocalAttendance();
  const idx = localList.findIndex((r) => r.attendanceId === attendanceId);
  if (idx !== -1) {
    localList[idx] = record;
  } else {
    localList.push(record);
  }
  saveLocalAttendance(localList);

  // Send student email alert (async fire-and-forget)
  sendAttendanceEmailNotification({
    student,
    record,
  });

  return record;
}

/**
 * Fetch all attendance records for a specific date (YYYY-MM-DD)
 */
export async function getAttendanceForDate(dateStr: string): Promise<AttendanceRecord[]> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const q = query(colRef, where("date", "==", dateStr));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as AttendanceRecord);
    }
  } catch (err) {
    console.debug("Firestore getAttendanceForDate fallback:", err);
  }

  const local = getLocalAttendance();
  return local.filter((r) => r.date === dateStr);
}

/**
 * Fetch attendance records for a student across all dates
 */
export async function getStudentAttendanceHistory(studentId: string): Promise<AttendanceRecord[]> {
  const upperId = studentId.trim().toUpperCase();
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const q = query(colRef, where("studentId", "==", upperId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const records = snap.docs.map((d) => d.data() as AttendanceRecord);
      records.sort((a, b) => b.date.localeCompare(a.date));
      return records;
    }
  } catch (err) {
    console.debug("Firestore getStudentAttendanceHistory fallback:", err);
  }

  const local = getLocalAttendance();
  return local
    .filter((r) => r.studentId.toUpperCase() === upperId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Fetch attendance records within a date range (YYYY-MM-DD)
 */
export async function getAttendanceForDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      return snap.docs
        .map((d) => d.data() as AttendanceRecord)
        .filter((r) => r.date >= startDate && r.date <= endDate);
    }
  } catch (err) {}

  const local = getLocalAttendance();
  return local.filter((r) => r.date >= startDate && r.date <= endDate);
}
