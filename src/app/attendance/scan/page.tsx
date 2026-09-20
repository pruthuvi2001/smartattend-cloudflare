"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";
import { recordAttendanceByQr, ScanAttendanceResult } from "@/lib/attendance/attendanceService";
import {
  getStudentFeeRecord,
  getCurrentMonthKey,
  recordStudentPayment,
} from "@/lib/payments/paymentService";
import { getStudents } from "@/lib/students/studentService";
import { getSystemSettings } from "@/lib/settings/settingsService";
import { SystemSettings, DEFAULT_SETTINGS } from "@/types/settings";
import { SessionScanItem } from "@/types/attendance";
import { MonthlyFeeRecord, RecordPaymentInput } from "@/types/payment";
import { Student } from "@/types/student";
import { QrCameraScanner } from "@/components/scanner/QrCameraScanner";
import { ScanSuccessCard } from "@/components/scanner/ScanSuccessCard";
import { ScanHistoryList } from "@/components/scanner/ScanHistoryList";
import { PaymentDetailsModal } from "@/components/payments/PaymentDetailsModal";
import { PaymentModal } from "@/components/payments/PaymentModal";
import { playSuccessBeep, playDuplicateBeep, playErrorBeep } from "@/lib/utils/soundEffects";
import { ArrowLeft, Sparkles, CheckCircle2, ShieldCheck, Receipt } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import confetti from "canvas-confetti";

export default function AttendanceScanPage() {
  const { user, userProfile } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [activeResult, setActiveResult] = useState<ScanAttendanceResult | null>(null);
  const [sessionScans, setSessionScans] = useState<SessionScanItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fee Details Modal from Scanner
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [activeFeeRecord, setActiveFeeRecord] = useState<MonthlyFeeRecord | null>(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const toast = useToast();

  useEffect(() => {
    getSystemSettings().then(setSettings);
    getStudents().then(setStudents);
  }, []);

  const handleScan = async (rawQr: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const markedBy = {
        uid: user?.uid || userProfile?.userId || "staff-001",
        displayName: userProfile?.displayName || user?.email || "Staff Member",
      };

      const result = await recordAttendanceByQr(rawQr, markedBy, settings.timezone);
      setActiveResult(result);

      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

      // Trigger audio & visual effects based on scan status
      if (result.status === "SUCCESS") {
        playSuccessBeep();
        try {
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch {}
      } else if (result.status === "ALREADY_MARKED") {
        playDuplicateBeep();
      } else {
        playErrorBeep();
      }

      // Add to session feed
      const sessionItem: SessionScanItem = {
        id: `${Date.now()}_${Math.random()}`,
        studentId: result.student?.studentId || "UNKNOWN",
        studentName: result.student?.fullName || "Unrecognized Code",
        class: result.student ? (result.student.class || result.student.classDisplayNames?.[0] || "N/A") : "N/A",
        status: result.status,
        message: result.message,
        time: timeStr,
      };

      setSessionScans((prev) => [sessionItem, ...prev]);
    } catch (err: any) {
      console.error("Scan processing error:", err);
      playErrorBeep();
      setActiveResult({
        status: "ERROR",
        message: err?.message || "Failed to process attendance record.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismissCard = () => {
    setActiveResult(null);
  };

  const handleClearSession = () => {
    setSessionScans([]);
  };

  const handleViewFeeStatus = async (studentId: string) => {
    try {
      const currentMonth = getCurrentMonthKey(new Date(), settings.timezone);
      const feeRec = await getStudentFeeRecord(
        studentId,
        currentMonth,
        settings.defaultMonthlyFee || 5000
      );
      setActiveFeeRecord(feeRec);
      setFeeModalOpen(true);
    } catch (err: any) {
      toast.error("Error loading fee record", err.message);
    }
  };

  const handleScannerPaymentSubmit = async (input: RecordPaymentInput) => {
    try {
      const recorder = {
        uid: user?.uid || userProfile?.userId || "staff-001",
        displayName: userProfile?.displayName || "Staff Member",
      };

      const updated = await recordStudentPayment({
        ...input,
        recordedBy: recorder,
      });

      toast.success(
        "Payment Recorded",
        `Received ${settings.currencySymbol || "Rs."} ${input.amount.toLocaleString()} for ${updated.studentNameSnapshot}`
      );

      setActiveFeeRecord(updated);
      setPayModalOpen(false);
      setFeeModalOpen(true);
    } catch (err: any) {
      toast.error("Payment Error", err.message);
      throw err;
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Attendance Scanner
                </h1>
                <p className="text-xs text-slate-500">
                  Continuous Camera QR Recognition • {settings.schoolName}
                </p>
              </div>
            </div>
          </div>

          {/* Scanner or Instant Result Overlay */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Viewfinder Column */}
            <div className="space-y-4">
              {activeResult ? (
                <ScanSuccessCard
                  result={activeResult}
                  onDismiss={handleDismissCard}
                  autoDismissMs={3500}
                  onViewFeeStatus={handleViewFeeStatus}
                />
              ) : (
                <QrCameraScanner
                  onScan={handleScan}
                  isProcessing={isProcessing}
                />
              )}
            </div>

            {/* Session History Feed Column */}
            <div className="space-y-4">
              <ScanHistoryList
                scans={sessionScans}
                onClear={handleClearSession}
              />
            </div>
          </div>

          {/* Fee Details Modal */}
          <PaymentDetailsModal
            isOpen={feeModalOpen}
            onClose={() => {
              setFeeModalOpen(false);
              setActiveFeeRecord(null);
            }}
            record={activeFeeRecord}
            currencySymbol={settings.currencySymbol || "Rs."}
            onRecordPayment={(rec) => {
              setFeeModalOpen(false);
              setPayModalOpen(true);
            }}
            onWaiveFee={() => {}}
          />

          {/* Record Payment Modal */}
          {activeFeeRecord && (
            <PaymentModal
              isOpen={payModalOpen}
              onClose={() => {
                setPayModalOpen(false);
              }}
              students={students}
              initialRecord={activeFeeRecord}
              monthKey={activeFeeRecord.monthKey}
              defaultMonthlyFee={settings.defaultMonthlyFee || 5000}
              currencySymbol={settings.currencySymbol || "Rs."}
              onSubmit={handleScannerPaymentSubmit}
            />
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
