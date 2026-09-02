import { AttendanceRecord, AttendanceStats, DailyAttendanceRow } from "@/types/attendance";
import { Student } from "@/types/student";

/**
 * Merges the active student roster with daily attendance records.
 * For any active student without a record on the selected date, an ABSENT row is dynamically computed.
 */
export function calculateDailyReport(
  students: Student[],
  attendanceRecords: AttendanceRecord[],
  selectedDate: string
): {
  rows: DailyAttendanceRow[];
  stats: AttendanceStats;
} {
  // Map existing attendance records by uppercase studentId
  const recordMap = new Map<string, AttendanceRecord>();
  attendanceRecords.forEach((rec) => {
    recordMap.set(rec.studentId.toUpperCase(), rec);
  });

  const rows: DailyAttendanceRow[] = [];
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;

  // Iterate over active students
  students.forEach((student) => {
    const rec = recordMap.get(student.studentId.toUpperCase());
    
    if (rec) {
      // Student has attendance record
      if (rec.status === "PRESENT") presentCount++;
      else if (rec.status === "LATE") {
        lateCount++;
        presentCount++; // Late counts as present in overall rate
      } else if (rec.status === "ABSENT") {
        absentCount++;
      }

      rows.push({
        studentId: student.studentId,
        fullName: rec.studentNameSnapshot || student.fullName,
        class: rec.classSnapshot || student.class,
        section: rec.sectionSnapshot || "",
        status: rec.status,
        timeFormatted: rec.timeFormatted,
        markedByName: rec.markedByName,
        method: rec.method,
        date: selectedDate,
      });
    } else {
      // Dynamic absence computation for active students
      if (student.status === "ACTIVE") {
        absentCount++;
        rows.push({
          studentId: student.studentId,
          fullName: student.fullName,
          class: student.class,
          section: "",
          status: "ABSENT",
          timeFormatted: "--:-- --",
          markedByName: "System",
          date: selectedDate,
        });
      }
    }
  });

  // Sort rows: Present/Late first, then by Class and Student ID
  rows.sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === "PRESENT" || a.status === "LATE") return -1;
      return 1;
    }
    const classCmp = a.class.localeCompare(b.class);
    if (classCmp !== 0) return classCmp;
    return a.studentId.localeCompare(b.studentId);
  });

  const totalActive = presentCount + absentCount;
  const attendanceRate = totalActive > 0 ? Number(((presentCount / totalActive) * 100).toFixed(1)) : 0;

  const stats: AttendanceStats = {
    totalStudents: totalActive,
    presentCount,
    absentCount,
    lateCount,
    attendanceRate,
  };

  return { rows, stats };
}