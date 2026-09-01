"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";
import { getStudents } from "@/lib/students/studentService";
import { getAttendanceForDate, markAttendanceManually } from "@/lib/attendance/attendanceService";
import { calculateDailyReport } from "@/lib/attendance/attendanceStats";
import { getNormalizedDate, formatDisplayDate } from "@/lib/utils/dateUtils";
import { getSystemSettings } from "@/lib/settings/settingsService";
import { SystemSettings, DEFAULT_SETTINGS } from "@/types/settings";
import { DailyAttendanceRow, AttendanceStats } from "@/types/attendance";
import { Student } from "@/types/student";
import { AttendanceSummary } from "@/components/reports/AttendanceSummary";
import { AttendanceTable } from "@/components/reports/AttendanceTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { QrCode, PlusCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function AttendanceHubPage() {
  const { userProfile, user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [rows, setRows] = useState<DailyAttendanceRow[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    totalStudents: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    attendanceRate: 0,
  });
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualStudentId, setManualStudentId] = useState("");
  const [manualStatus, setManualStatus] = useState<"PRESENT" | "LATE" | "ABSENT">("PRESENT");
  const [savingManual, setSavingManual] = useState(false);
  const toast = useToast();

  const todayStr = getNormalizedDate(new Date(), settings.timezone);

  const loadData = async () => {
    setLoading(true);
    try {
      const appSettings = await getSystemSettings();
      setSettings(appSettings);

      const studentList = await getStudents();
      setStudents(studentList);

      const normToday = getNormalizedDate(new Date(), appSettings.timezone);
      const attList = await getAttendanceForDate(normToday);
      const report = calculateDailyReport(studentList, attList, normToday);
      setRows(report.rows);
      setStats(report.stats);
    } catch (err) {
      console.error("Attendance hub load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleManualMark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStudentId) return;

    setSavingManual(true);
    try {
      const markedBy = {
        uid: user?.uid || userProfile?.userId || "staff-001",
        displayName: userProfile?.displayName || "Staff Member",
      };

      await markAttendanceManually(
        manualStudentId,
        manualStatus,
        todayStr,
        markedBy,
        settings.timezone
      );

      toast.success("Attendance Updated", `Recorded ${manualStudentId} as ${manualStatus}`);
      setManualModalOpen(false);
      setManualStudentId("");
      await loadData();
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setSavingManual(false);
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Today&apos;s Attendance Records
              </h1>
              <p className="text-xs text-slate-500">
                {formatDisplayDate(todayStr, settings.timezone)} • Showing Present and Absent Students
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setManualModalOpen(true)}
                leftIcon={<PlusCircle className="w-4 h-4" />}
              >
                Manual Override
              </Button>
              <Link href="/attendance/scan">
                <Button
                  variant="primary"
                  size="sm"
                  className="font-bold"
                  leftIcon={<QrCode className="w-4 h-4" />}
                >
                  Launch QR Scanner
                </Button>
              </Link>
            </div>
          </div>

          <AttendanceSummary stats={stats} />

          <AttendanceTable rows={rows} />

          {/* Manual Attendance Modal */}
          <Modal
            isOpen={manualModalOpen}
            onClose={() => setManualModalOpen(false)}
            title="Manual Attendance Entry"
            description="Manually record or override student attendance status for today."
          >
            <form onSubmit={handleManualMark} className="space-y-4">
              <Select
                label="Select Student"
                value={manualStudentId}
                onChange={(e) => setManualStudentId(e.target.value)}
                options={[
                  { label: "-- Select a student --", value: "" },
                  ...students.map((s) => ({
                    label: `${s.studentId} - ${s.fullName} (${s.class})`,
                    value: s.studentId,
                  })),
                ]}
                required
              />

              <Select
                label="Status"
                value={manualStatus}
                onChange={(e) => setManualStatus(e.target.value as "PRESENT" | "LATE" | "ABSENT")}
                options={[
                  { label: "PRESENT", value: "PRESENT" },
                  { label: "LATE", value: "LATE" },
                  { label: "ABSENT", value: "ABSENT" },
                ]}
              />

              <div className="flex items-center justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setManualModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={savingManual}>
                  Save Attendance
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
