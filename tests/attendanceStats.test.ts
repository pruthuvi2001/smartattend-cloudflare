import { describe, it, expect } from "vitest";
import { calculateDailyReport } from "../src/lib/attendance/attendanceStats";
import { Student } from "../src/types/student";
import { AttendanceRecord } from "../src/types/attendance";

describe("Attendance Dynamic Absence & Stats Calculation", () => {
  const mockStudents: Student[] = [
    { studentId: "STU001", fullName: "John Silva", class: "Grade 10", section: "A", qrCodeValue: "STU001", status: "ACTIVE", createdAt: "", updatedAt: "" },
    { studentId: "STU002", fullName: "Sarah Perera", class: "Grade 10", section: "A", qrCodeValue: "STU002", status: "ACTIVE", createdAt: "", updatedAt: "" },
    { studentId: "STU003", fullName: "David Fernando", class: "Grade 10", section: "B", qrCodeValue: "STU003", status: "ACTIVE", createdAt: "", updatedAt: "" },
    { studentId: "STU004", fullName: "Inactive Student", class: "Grade 10", section: "B", qrCodeValue: "STU004", status: "INACTIVE", createdAt: "", updatedAt: "" }
  ];

  it("should compute PRESENT for recorded students and ABSENT for unrecorded active students", () => {
    const mockAttendance: AttendanceRecord[] = [
      {
        attendanceId: "STU001_2026-09-01",
        studentId: "STU001",
        studentNameSnapshot: "John Silva",
        classSnapshot: "Grade 10",
        sectionSnapshot: "A",
        date: "2026-09-01",
        timestamp: "2026-09-01T03:00:00Z",
        timeFormatted: "08:30 AM",
        status: "PRESENT",
        markedBy: "admin-1",
        markedByName: "Admin",
        method: "QR_SCAN",
        createdAt: "2026-09-01T03:00:00Z"
      }
    ];

    const report = calculateDailyReport(mockStudents, mockAttendance, "2026-09-01");

    // Total active: 3 (STU001, STU002, STU003). STU004 is INACTIVE so not counted in daily attendance.
    expect(report.stats.totalStudents).toBe(3);
    expect(report.stats.presentCount).toBe(1);
    expect(report.stats.absentCount).toBe(2);
    // Rate: 1 / 3 = 33.3%
    expect(report.stats.attendanceRate).toBe(33.3);

    const stu1Row = report.rows.find(r => r.studentId === "STU001");
    expect(stu1Row?.status).toBe("PRESENT");

    const stu2Row = report.rows.find(r => r.studentId === "STU002");
    expect(stu2Row?.status).toBe("ABSENT");
  });

  it("should safely handle 0 active students without divide by zero errors", () => {
    const report = calculateDailyReport([], [], "2026-09-01");
    expect(report.stats.totalStudents).toBe(0);
    expect(report.stats.attendanceRate).toBe(0);
  });
});
