"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";
import { getStudents, seedSampleStudents } from "@/lib/students/studentService";
import { getAttendanceForDate } from "@/lib/attendance/attendanceService";
import { evaluateAndMarkAutoAbsences } from "@/lib/attendance/autoAbsenceService";
import { calculateDailyReport } from "@/lib/attendance/attendanceStats";
import { getNormalizedDate, formatDisplayDate } from "@/lib/utils/dateUtils";
import { getSystemSettings } from "@/lib/settings/settingsService";
import { Student } from "@/types/student";
import { AttendanceRecord, DailyAttendanceRow, AttendanceStats } from "@/types/attendance";
import { SystemSettings, DEFAULT_SETTINGS } from "@/types/settings";
import { AttendanceSummary } from "@/components/reports/AttendanceSummary";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  QrCode,
  UserPlus,
  FileSpreadsheet,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  School,
  Receipt
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function DashboardPage() {
  const { userProfile, role, isAdmin } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
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
  const [seeding, setSeeding] = useState(false);
  const toast = useToast();

  const todayStr = getNormalizedDate(new Date(), settings.timezone);

  const loadData = async () => {
    try {
      setLoading(true);
      const appSettings = await getSystemSettings();
      setSettings(appSettings);

      // Lazily evaluate and backfill auto-absences for ended timetable sessions
      await evaluateAndMarkAutoAbsences();

      const studentList = await getStudents();
      setStudents(studentList);

      const normToday = getNormalizedDate(new Date(), appSettings.timezone);
      const attList = await getAttendanceForDate(normToday);
      setAttendance(attList);

      const report = calculateDailyReport(studentList, attList, normToday);
      setRows(report.rows);
      setStats(report.stats);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      const count = await seedSampleStudents();
      toast.success("Sample Data Loaded", `Added ${count} students to system`);
      await loadData();
    } catch (err: any) {
      toast.error("Seed Error", err.message);
    } finally {
      setSeeding(false);
    }
  };

  const recentScans = rows
    .filter((r) => r.status === "PRESENT" || r.status === "LATE")
    .slice(0, 6);

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {settings.schoolName}
                </span>
                <span className="text-xs text-slate-300">
                  {formatDisplayDate(todayStr, settings.timezone)}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Welcome back, {userProfile?.displayName || "Staff"}!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Ready to take attendance? Launch the scanner to begin continuous QR recognition.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link href="/attendance/scan">
                <Button
                  variant="primary"
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/40 border border-indigo-300/40 px-5 py-2.5"
                  leftIcon={<QrCode className="w-4 h-4" />}
                >
                  Open QR Scanner
                </Button>
              </Link>
            </div>
          </div>

          {/* Seed Banner if No Students */}
          {students.length === 0 && !loading && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Get Started with Sample Students</h4>
                  <p className="text-xs text-amber-700">
                    No students have been registered yet. Load pre-configured sample students to test scanning.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSeedData}
                isLoading={seeding}
                className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100 shrink-0"
              >
                Load Sample Students
              </Button>
            </div>
          )}

          {/* Key Metrics Cards */}
          <AttendanceSummary stats={stats} />

          {/* Quick Actions & Recent Activity Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Action Shortcuts */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 p-4">
                  <Link href="/attendance/scan" className="block">
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between hover:bg-indigo-100 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                          <QrCode className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-indigo-950">Launch Attendance Scanner</h5>
                          <p className="text-[11px] text-indigo-700">Scan ID card QR codes via camera</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-indigo-500 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>

                  <Link href="/students" className="block">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-100 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-800 text-white flex items-center justify-center">
                          <UserPlus className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-900">Manage Students</h5>
                          <p className="text-[11px] text-slate-500">View roster, edit details, print ID cards</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>

                  <Link href="/reports" className="block">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-100 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-800 text-white flex items-center justify-center">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-900">Attendance Reports</h5>
                          <p className="text-[11px] text-slate-500">Export CSV & print daily summary</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>

                  <Link href="/monthly-payments" className="block">
                    <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl flex items-center justify-between hover:bg-indigo-100 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-indigo-950">Monthly Payments</h5>
                          <p className="text-[11px] text-indigo-700">Track fee collections & balances</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-indigo-500 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                </CardContent>
              </Card>

              {/* Institution Meta Card */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                      <School className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{settings.schoolName}</h4>
                      <p className="text-[11px] text-slate-500">Timezone: {settings.timezone}</p>
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-600 border border-slate-100">
                    Default Monthly Fee: <strong>{settings.currencySymbol || "Rs."} {(settings.defaultMonthlyFee || 5000).toLocaleString()}</strong>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Today's Attendance Activity */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex items-center justify-between py-4 px-5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <CardTitle className="text-sm">Today&apos;s Attendance Activity</CardTitle>
                  </div>
                  <Link
                    href="/reports"
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    View All ({rows.length})
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </CardHeader>

                <div className="divide-y divide-slate-100">
                  {recentScans.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No attendance has been recorded yet today ({formatDisplayDate(todayStr, settings.timezone)}).
                    </div>
                  ) : (
                    recentScans.map((r) => (
                      <div key={r.studentId} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                            {r.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900">{r.fullName}</span>
                              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {r.studentId}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {r.class} - Section {r.section}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <Badge variant="success" size="sm" dot>
                            {r.status}
                          </Badge>
                          <p className="text-xs font-mono text-slate-500 mt-1">
                            {r.timeFormatted}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
