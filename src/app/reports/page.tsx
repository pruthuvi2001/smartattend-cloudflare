"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";
import { getStudents } from "@/lib/students/studentService";
import { getAttendanceForDate } from "@/lib/attendance/attendanceService";
import { calculateDailyReport } from "@/lib/attendance/attendanceStats";
import {
  getCurrentMonthKey,
  getMonthlyFeeRecords,
  exportMonthlyPaymentsToCsv,
  formatMonthName,
} from "@/lib/payments/paymentService";
import { getNormalizedDate, formatDisplayDate } from "@/lib/utils/dateUtils";
import { getSystemSettings } from "@/lib/settings/settingsService";
import { exportAttendanceToCsv } from "@/lib/utils/csvExport";
import { Student } from "@/types/student";
import { AttendanceRecord, DailyAttendanceRow, AttendanceStats } from "@/types/attendance";
import { MonthlyFeeRecord, MonthlyPaymentsSummary } from "@/types/payment";
import { SystemSettings, DEFAULT_SETTINGS } from "@/types/settings";
import { AttendanceSummary } from "@/components/reports/AttendanceSummary";
import { AttendanceTable } from "@/components/reports/AttendanceTable";
import { MonthSelector } from "@/components/payments/MonthSelector";
import { PaymentSummaryCards } from "@/components/payments/PaymentSummaryCards";
import { StudentPaymentTable } from "@/components/payments/StudentPaymentTable";
import { Button } from "@/components/ui/Button";
import { Download, Printer, Calendar, RefreshCw, Receipt } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function ReportsPage() {
  const [reportTab, setReportTab] = useState<"attendance" | "payments">("attendance");
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonthKey, setSelectedMonthKey] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  
  // Attendance report state
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [rows, setRows] = useState<DailyAttendanceRow[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    totalStudents: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    attendanceRate: 0,
  });

  // Monthly Payments report state
  const [feeRecords, setFeeRecords] = useState<MonthlyFeeRecord[]>([]);
  const [feeSummary, setFeeSummary] = useState<MonthlyPaymentsSummary>({
    monthKey: "",
    monthName: "",
    totalStudents: 0,
    paidCount: 0,
    partiallyPaidCount: 0,
    unpaidCount: 0,
    waivedCount: 0,
    totalExpected: 0,
    totalCollected: 0,
    outstandingBalance: 0,
    collectionRate: 0,
  });

  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    getSystemSettings().then((s) => {
      setSettings(s);
      const today = getNormalizedDate(new Date(), s.timezone);
      setSelectedDate(today);
      const curMonth = getCurrentMonthKey(new Date(), s.timezone);
      setSelectedMonthKey(curMonth);
    });
  }, []);

  const loadAttendanceReport = async (dateStr: string) => {
    if (!dateStr) return;
    setLoading(true);
    try {
      const [stuList, attList] = await Promise.all([
        getStudents(),
        getAttendanceForDate(dateStr),
      ]);
      setStudents(stuList);
      setAttendance(attList);

      const computed = calculateDailyReport(stuList, attList, dateStr);
      setRows(computed.rows);
      setStats(computed.stats);
    } catch (err) {
      console.error("Report load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentsReport = async (monthKey: string) => {
    if (!monthKey) return;
    setLoading(true);
    try {
      const feeData = await getMonthlyFeeRecords(monthKey, settings.defaultMonthlyFee || 5000);
      setFeeRecords(feeData.records);
      setFeeSummary(feeData.summary);
    } catch (err) {
      console.error("Payment report load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportTab === "attendance" && selectedDate) {
      loadAttendanceReport(selectedDate);
    } else if (reportTab === "payments" && selectedMonthKey) {
      loadPaymentsReport(selectedMonthKey);
    }
  }, [reportTab, selectedDate, selectedMonthKey]);

  const handleExportCsv = () => {
    if (reportTab === "attendance") {
      if (rows.length === 0) {
        toast.warning("No Data", "No attendance records to export.");
        return;
      }
      const filename = `attendance_${selectedDate}_${settings.schoolName.replace(/\s+/g, "_")}.csv`;
      exportAttendanceToCsv(rows, filename);
      toast.success("CSV Exported", `Saved attendance report.`);
    } else {
      if (feeRecords.length === 0) {
        toast.warning("No Data", "No payment records to export.");
        return;
      }
      exportMonthlyPaymentsToCsv(feeRecords, formatMonthName(selectedMonthKey), settings.currencySymbol || "Rs.");
      toast.success("CSV Exported", `Saved monthly payment report.`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Reports & Analytics
              </h1>
              <p className="text-xs text-slate-500">
                Official registers, absence tracking, and monthly collection statements.
              </p>
            </div>

            <div className="flex items-center gap-2 no-print">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                leftIcon={<Printer className="w-3.5 h-3.5" />}
              >
                Print Report
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExportCsv}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Export CSV
              </Button>
            </div>
          </div>

          {/* Tab Selector Bar */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 no-print">
            <button
              onClick={() => setReportTab("attendance")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                reportTab === "attendance"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Attendance Reports</span>
            </button>

            <button
              onClick={() => setReportTab("payments")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                reportTab === "payments"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Monthly Payment Reports</span>
            </button>
          </div>

          {reportTab === "attendance" ? (
            <div className="space-y-6">
              {/* Date Selector Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Calendar className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold uppercase text-slate-600">Select Date:</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedDate(getNormalizedDate(new Date(), settings.timezone))}
                    className="text-xs"
                  >
                    Today
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => loadAttendanceReport(selectedDate)}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  >
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Stats Summary */}
              <AttendanceSummary stats={stats} />

              {/* Report Data Table */}
              <AttendanceTable rows={rows} />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Month Selector */}
              <MonthSelector
                selectedMonthKey={selectedMonthKey}
                onMonthChange={(newKey) => setSelectedMonthKey(newKey)}
              />

              {/* Fee Summary Cards */}
              <PaymentSummaryCards
                summary={feeSummary}
                currencySymbol={settings.currencySymbol || "Rs."}
              />

              {/* Student Payment Table */}
              <StudentPaymentTable
                records={feeRecords}
                currencySymbol={settings.currencySymbol || "Rs."}
                onViewDetails={() => {}}
                onRecordPayment={() => {}}
              />
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
