"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";
import { recordAttendanceByQr, ScanAttendanceResult } from "@/lib/attendance/attendanceService";
import {
  getStudentFeeStatus,
  getCurrentMonthKey,
  recordStudentPayment,
} from "@/lib/payments/paymentService";
import { getStudents } from "@/lib/students/studentService";
import { getSystemSettings } from "@/lib/settings/settingsService";
import { SystemSettings, DEFAULT_SETTINGS } from "@/types/settings";
import { SessionScanItem } from "@/types/attendance";
import { MonthlyFeeRecord, RecordPaymentInput } from "@/types/payment";
import { Student } from "@/types/student";
import { UsbQrScanner } from "@/components/scanner/UsbQrScanner";
import { ScanSuccessCard } from "@/components/scanner/ScanSuccessCard";
import { ScanHistoryList } from "@/components/scanner/ScanHistoryList";
import { PaymentDetailsModal } from "@/components/payments/PaymentDetailsModal";
import { PaymentModal } from "@/components/payments/PaymentModal";
import { playSuccessBeep, playDuplicateBeep, playErrorBeep } from "@/lib/utils/soundEffects";
import { ArrowLeft, Sparkles, CheckCircle2, ShieldCheck, Receipt } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import confetti from "canvas-confetti";

export default function AttendanceScanPage() {
  const { user, userProfile, can, canAny } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [activeResult, setActiveResult] = useState<ScanAttendanceResult | null>(null);
  // Bumped on every result so the result card restarts its countdown.
  const [resultKey, setResultKey] = useState(0);
  const [sessionScans, setSessionScans] = useState<SessionScanItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // A USB scanner can read the next card before the previous one is saved,
  // so scans wait in a queue and are saved one at a time instead of being dropped.
  const scanQueueRef = useRef<string[]>([]);
  const queueRunningRef = useRef(false);

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

  const processScan = async (rawQr: string) => {
    try {
      const markedBy = {
        uid: user?.uid || userProfile?.userId || "staff-001",
        displayName: userProfile?.displayName || user?.email || "Staff Member",
      };

      const result = await recordAttendanceByQr(rawQr, markedBy, settings.timezone);
      setActiveResult(result);
      setResultKey((k) => k + 1);

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
            colors: ["#dc1f36", "#ff6b78", "#10b981", "#ffcc4d", "#ffffff"],
            shapes: ["circle", "star"],
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
      setResultKey((k) => k + 1);
    }
  };

  // Always run the latest processScan (it reads current settings and user).
  const processScanRef = useRef(processScan);
  processScanRef.current = processScan;

  const handleScan = useCallback((rawQr: string) => {
    scanQueueRef.current.push(rawQr);
    if (queueRunningRef.current) return;

    queueRunningRef.current = true;
    setIsProcessing(true);
    (async () => {
      try {
        while (scanQueueRef.current.length > 0) {
          const next = scanQueueRef.current.shift()!;
          await processScanRef.current(next);
        }
      } finally {
        queueRunningRef.current = false;
        setIsProcessing(false);
      }
    })();
  }, []);

  const handleDismissCard = useCallback(() => {
    setActiveResult(null);
  }, []);

  const handleClearSession = () => {
    setSessionScans([]);
  };

  const handleViewFeeStatus = async (studentId: string) => {
    try {
      const currentMonth = getCurrentMonthKey(new Date(), settings.timezone);
      const feeRec = await getStudentFeeStatus(
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
    <ProtectedRoute permission="attendance_scan">
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
                  USB QR Scanner • {settings.schoolName}
                </p>
              </div>
            </div>
          </div>

          {/* Scanner or Instant Result Overlay */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Scanner Column: the scanner stays mounted so it keeps listening while a result shows */}
            <div className="space-y-4">
              {activeResult && (
                <ScanSuccessCard
                  key={resultKey}
                  result={activeResult}
                  onDismiss={handleDismissCard}
                  autoDismissMs={3500}
                  onViewFeeStatus={canAny(["payments_view", "payments_record"]) ? handleViewFeeStatus : undefined}
                />
              )}
              <UsbQrScanner
                onScan={handleScan}
                isProcessing={isProcessing}
                enabled={!feeModalOpen && !payModalOpen}
              />
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
              isOpen={payModalOpen && can("payments_record")}
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
