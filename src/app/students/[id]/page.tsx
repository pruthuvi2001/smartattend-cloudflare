"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { getStudentById, getStudents } from "@/lib/students/studentService";
import { getStudentAttendanceHistory } from "@/lib/attendance/attendanceService";
import {
  getStudentAllPaymentHistory,
  getCurrentMonthKey,
  recordStudentPayment,
} from "@/lib/payments/paymentService";
import { getSystemSettings } from "@/lib/settings/settingsService";
import { Student } from "@/types/student";
import { AttendanceRecord } from "@/types/attendance";
import { MonthlyFeeRecord, RecordPaymentInput } from "@/types/payment";
import { SystemSettings, DEFAULT_SETTINGS } from "@/types/settings";
import { StudentQrBadge } from "@/components/students/StudentQrBadge";
import { PaymentModal } from "@/components/payments/PaymentModal";
import { PaymentDetailsModal } from "@/components/payments/PaymentDetailsModal";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { formatDisplayDate } from "@/lib/utils/dateUtils";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Percent,
  Mail,
  Phone,
  QrCode,
  Loader2,
  Receipt,
  PlusCircle,
  FileSpreadsheet
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = params?.id as string;
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [feeHistory, setFeeHistory] = useState<MonthlyFeeRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"attendance" | "payments">("attendance");

  // Payment modals
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedFeeRecord, setSelectedFeeRecord] = useState<MonthlyFeeRecord | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [activeDetailsRecord, setActiveDetailsRecord] = useState<MonthlyFeeRecord | null>(null);
  const toast = useToast();

  const loadData = async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      const [appSettings, stu, att, fees, stuList] = await Promise.all([
        getSystemSettings(),
        getStudentById(studentId),
        getStudentAttendanceHistory(studentId),
        getStudentAllPaymentHistory(studentId),
        getStudents(),
      ]);
      setSettings(appSettings);
      setStudent(stu);
      setHistory(att);
      setFeeHistory(fees);
      setAllStudents(stuList);
    } catch (err) {
      console.error("Student detail load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studentId]);

  const handleRecordPaymentSubmit = async (input: RecordPaymentInput) => {
    try {
      const recorder = {
        uid: "staff",
        displayName: "Staff Member",
      };

      const updated = await recordStudentPayment({
        ...input,
        recordedBy: recorder,
      });

      toast.success(
        "Payment Recorded",
        `Received ${settings.currencySymbol || "Rs."} ${input.amount.toLocaleString()} for ${updated.monthName}`
      );

      await loadData();
    } catch (err: any) {
      toast.error("Payment Error", err.message);
      throw err;
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-xs text-slate-500">Loading student profile...</p>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (!student) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <h3 className="text-lg font-bold text-slate-800">Student Not Found</h3>
            <p className="text-xs text-slate-500">
              No student found with ID: <strong>{studentId}</strong>
            </p>
            <Link href="/students">
              <Button size="sm" variant="primary">
                Return to Student Directory
              </Button>
            </Link>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  const presentDays = history.filter((h) => h.status === "PRESENT" || h.status === "LATE").length;
  const totalDays = history.length > 0 ? history.length : 1;
  const attRate = history.length > 0 ? Number(((presentDays / totalDays) * 100).toFixed(1)) : 100;

  const currentMonthKey = getCurrentMonthKey(new Date(), settings.timezone);
  const currentMonthFee = feeHistory.find((f) => f.monthKey === currentMonthKey);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge variant="success" size="sm" dot>PAID</Badge>;
      case "PARTIALLY_PAID":
        return <Badge variant="warning" size="sm" dot>PARTIAL</Badge>;
      case "WAIVED":
        return <Badge variant="purple" size="sm" dot>WAIVED</Badge>;
      default:
        return <Badge variant="danger" size="sm" dot>UNPAID</Badge>;
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between no-print">
            <div className="flex items-center gap-3">
              <Link
                href="/students"
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {student.fullName}
                  </h1>
                  <Badge variant={student.status === "ACTIVE" ? "success" : "danger"} size="sm" dot>
                    {student.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  Student ID: <span className="font-mono font-bold text-slate-700">{student.studentId}</span> • Class: {student.class}
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSelectedFeeRecord(currentMonthFee || null);
                setPayModalOpen(true);
              }}
              leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
              className="font-bold"
            >
              Record Payment
            </Button>
          </div>

          {/* Main Grid: Left ID Badge / Details, Right Attendance & Payments */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Printable ID Card Badge */}
            <div className="space-y-6">
              <StudentQrBadge student={student} schoolName={settings.schoolName} />

              {/* Student Metadata Card */}
              <Card className="no-print">
                <CardHeader>
                  <CardTitle className="text-sm">Contact & Bio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex items-center gap-2.5 text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{student.email || "No email on file"}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{student.phone || "No phone on file"}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-600">
                    <QrCode className="w-4 h-4 text-slate-400" />
                    <span className="font-mono">Payload: {student.qrCodeValue}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Column 2 & 3: Tabs & Analytics */}
            <div className="lg:col-span-2 space-y-6 no-print">
              {/* Tab Selector */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  onClick={() => setActiveTab("attendance")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                    activeTab === "attendance"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Attendance History</span>
                </button>

                <button
                  onClick={() => setActiveTab("payments")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                    activeTab === "payments"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>Monthly Fee History</span>
                </button>
              </div>

              {activeTab === "attendance" ? (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard
                      title="Recorded Days"
                      value={history.length}
                      subtitle="Total sessions"
                      icon={<Calendar className="w-5 h-5" />}
                      variant="indigo"
                    />

                    <StatCard
                      title="Days Present"
                      value={presentDays}
                      subtitle="Verified sessions"
                      icon={<CheckCircle2 className="w-5 h-5" />}
                      variant="emerald"
                    />

                    <StatCard
                      title="Attendance Rate"
                      value={`${attRate}%`}
                      subtitle="Overall history"
                      icon={<Percent className="w-5 h-5" />}
                      variant="amber"
                    />
                  </div>

                  {/* History Table */}
                  <Card>
                    <CardHeader className="py-4 px-5">
                      <CardTitle className="text-sm">Attendance Log History</CardTitle>
                    </CardHeader>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Time</th>
                            <th className="py-3 px-4">Method</th>
                            <th className="py-3 px-4">Marked By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {history.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-400">
                                No attendance records logged for this student yet.
                              </td>
                            </tr>
                          ) : (
                            history.map((h) => (
                              <tr key={h.attendanceId} className="hover:bg-slate-50">
                                <td className="py-3 px-4 font-mono font-medium text-slate-900">
                                  {formatDisplayDate(h.date, settings.timezone)}
                                </td>
                                <td className="py-3 px-4">
                                  <Badge variant="success" size="sm" dot>
                                    {h.status}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 font-mono text-slate-600">
                                  {h.timeFormatted}
                                </td>
                                <td className="py-3 px-4 text-slate-500">
                                  {h.method}
                                </td>
                                <td className="py-3 px-4 text-slate-500">
                                  {h.markedByName || "Staff"}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Monthly Payments Table */}
                  <Card>
                    <CardHeader className="py-4 px-5 flex items-center justify-between">
                      <CardTitle className="text-sm">Monthly Payments Record</CardTitle>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedFeeRecord(null);
                          setPayModalOpen(true);
                        }}
                        className="text-xs"
                      >
                        + New Payment
                      </Button>
                    </CardHeader>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-500">
                          <tr>
                            <th className="py-3 px-4">Month</th>
                            <th className="py-3 px-4">Monthly Fee</th>
                            <th className="py-3 px-4">Paid</th>
                            <th className="py-3 px-4">Balance</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {feeHistory.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400">
                                No fee payments logged for this student yet.
                              </td>
                            </tr>
                          ) : (
                            feeHistory.map((f) => (
                              <tr key={f.feeRecordId} className="hover:bg-slate-50">
                                <td className="py-3 px-4 font-bold text-slate-900">
                                  {f.monthName}
                                </td>
                                <td className="py-3 px-4">
                                  {settings.currencySymbol || "Rs."} {f.monthlyFee.toLocaleString()}
                                </td>
                                <td className="py-3 px-4 font-bold text-emerald-700">
                                  {settings.currencySymbol || "Rs."} {f.totalPaid.toLocaleString()}
                                </td>
                                <td className="py-3 px-4 font-bold text-rose-700">
                                  {settings.currencySymbol || "Rs."} {f.balance.toLocaleString()}
                                </td>
                                <td className="py-3 px-4">
                                  {getStatusBadge(f.status)}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setActiveDetailsRecord(f);
                                      setDetailsModalOpen(true);
                                    }}
                                    className="text-xs px-2.5 py-1"
                                  >
                                    View
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>

          {/* Payment Modal */}
          <PaymentModal
            isOpen={payModalOpen}
            onClose={() => {
              setPayModalOpen(false);
              setSelectedFeeRecord(null);
            }}
            students={allStudents}
            initialStudent={student}
            initialRecord={selectedFeeRecord}
            monthKey={selectedFeeRecord?.monthKey || currentMonthKey}
            defaultMonthlyFee={settings.defaultMonthlyFee || 5000}
            currencySymbol={settings.currencySymbol || "Rs."}
            onSubmit={handleRecordPaymentSubmit}
          />

          {/* Details Modal */}
          <PaymentDetailsModal
            isOpen={detailsModalOpen}
            onClose={() => {
              setDetailsModalOpen(false);
              setActiveDetailsRecord(null);
            }}
            record={activeDetailsRecord}
            currencySymbol={settings.currencySymbol || "Rs."}
            onRecordPayment={(rec) => {
              setSelectedFeeRecord(rec);
              setDetailsModalOpen(false);
              setPayModalOpen(true);
            }}
            onWaiveFee={() => {}}
          />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}