import { getClasses } from "../classes/classService";
import { getStudents } from "../students/studentService";
import { getAttendanceForDate } from "./attendanceService";
import { AttendanceRecord } from "@/types/attendance";
import { getNormalizedDate, DEFAULT_TIMEZONE } from "../utils/dateUtils";
import { getSystemSettings } from "../settings/settingsService";
import { db } from "../firebase/config";
import { doc, setDoc } from "firebase/firestore";
import { sendAttendanceEmailNotification } from "../notifications/emailService";
import { DayOfWeek } from "@/types/class";

const COLLECTION_NAME = "attendance";
const LOCAL_STORAGE_KEY = "smartattend_local_attendance";

let lastRunTimestamp = 0;
const RUN_DEBOUNCE_MS = 30000; // Run at most once every 30 seconds per browser session

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

/**
 * Returns current day of week and 24-hour time "HH:mm" in institution timezone.
 */
export function getCurrentTimeInTimezone(timezone: string = DEFAULT_TIMEZONE): {
  dayOfWeek: DayOfWeek;
  currentTimeStr: string; // "HH:mm"
  todayDateStr: string;   // "YYYY-MM-DD"
} {
  const now = new Date();
  
  // Day of week
  const dayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  });
  const dayOfWeek = dayFormatter.format(now) as DayOfWeek;

  // 24-hour HH:mm
  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const currentTimeStr = timeFormatter.format(now);

  const todayDateStr = getNormalizedDate(now, timezone);

  return { dayOfWeek, currentTimeStr, todayDateStr };
}

export interface AutoAbsenceEvaluationResult {
  evaluatedSessionsCount: number;
  autoAbsencesMarked: number;
  markedRecords: AttendanceRecord[];
}

/**
 * Evaluates past class schedules for the day and automatically marks unrecorded active students as Absent.
 */
export async function evaluateAndMarkAutoAbsences(
  force: boolean = false
): Promise<AutoAbsenceEvaluationResult> {
  const now = Date.now();
  if (!force && now - lastRunTimestamp < RUN_DEBOUNCE_MS) {
    return { evaluatedSessionsCount: 0, autoAbsencesMarked: 0, markedRecords: [] };
  }
  lastRunTimestamp = now;

  const settings = await getSystemSettings();
  const timezone = settings.timezone || DEFAULT_TIMEZONE;
  const { dayOfWeek, currentTimeStr, todayDateStr } = getCurrentTimeInTimezone(timezone);

  const [classes, students, existingAttendance] = await Promise.all([
    getClasses(),
    getStudents(),
    getAttendanceForDate(todayDateStr),
  ]);

  const existingMap = new Map<string, AttendanceRecord>();
  existingAttendance.forEach((rec) => {
    existingMap.set(rec.studentId.toUpperCase(), rec);
  });

  const activeStudents = students.filter((s) => s.status === "ACTIVE");
  const localList = getLocalAttendance();
  const newlyMarked: AttendanceRecord[] = [];
  let evaluatedSessionsCount = 0;

  // Check each class
  for (const classEntity of classes) {
    const matchingSessions = classEntity.schedules?.filter(
      (s) => s.dayOfWeek === dayOfWeek && s.endTime <= currentTimeStr
    ) || [];

    if (matchingSessions.length === 0) continue;
    evaluatedSessionsCount += matchingSessions.length;

    // Find students enrolled in this class entity (using relational classIds)
    const classStudents = activeStudents.filter((s) => {
      if (s.classIds && s.classIds.includes(classEntity.id)) return true;
      if (
        s.classDisplayNames &&
        s.classDisplayNames.map((n) => n.trim().toLowerCase()).includes(classEntity.name.trim().toLowerCase())
      ) {
        return true;
      }
      return s.class ? s.class.trim().toLowerCase() === classEntity.name.trim().toLowerCase() : false;
    });

    for (const student of classStudents) {
      const studentId = student.studentId.toUpperCase();
      // If student already has attendance marked for today, do not overwrite
      if (existingMap.has(studentId)) {
        continue;
      }

      const attendanceId = `${studentId}_${todayDateStr}`;
      const record: AttendanceRecord = {
        attendanceId,
        studentId,
        studentNameSnapshot: student.fullName,
        classId: classEntity.id,
        classSnapshot: classEntity.name,
        date: todayDateStr,
        timestamp: new Date().toISOString(),
        timeFormatted: "--:-- --",
        status: "ABSENT",
        markedBy: "system",
        markedByName: "System (Auto-Schedule)",
        method: "MANUAL",
        autoMarked: true,
        createdAt: new Date().toISOString(),
      };

      // Save to Firestore
      try {
        const docRef = doc(db, COLLECTION_NAME, attendanceId);
        await setDoc(docRef, record);
      } catch (err) {
        console.debug("Firestore auto-absence setDoc fallback:", err);
      }

      // Save to local cache
      const localIdx = localList.findIndex((r) => r.attendanceId === attendanceId);
      if (localIdx !== -1) {
        localList[localIdx] = record;
      } else {
        localList.push(record);
      }

      existingMap.set(studentId, record);
      newlyMarked.push(record);

      // Trigger email alert to the student
      sendAttendanceEmailNotification({
        student,
        record,
        schoolName: settings.schoolName,
      });
    }
  }

  if (newlyMarked.length > 0) {
    saveLocalAttendance(localList);
  }

  return {
    evaluatedSessionsCount,
    autoAbsencesMarked: newlyMarked.length,
    markedRecords: newlyMarked,
  };
}
