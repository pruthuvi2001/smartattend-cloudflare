"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";
import { getStudents } from "@/lib/students/studentService";
import {
  getCurrentMonthKey,
  getMonthlyFeeRecords,
  recordStudentPayment,
  waiveStudentFee,
  exportMonthlyPaymentsToCsv,
  formatMonthName,
} from "@/lib/payments/paymentService";
import { getSystemSettings } from "@/lib/settings/settingsService";
import { Student } from "@/types/student";
import { MonthlyFeeRecord, MonthlyPaymentsSummary, RecordPaymentInput } from "@/types/payment";
import { SystemSettings, DEFAULT_SETTINGS } from "@/types/settings";
import { MonthSelector } from "@/components/payments/MonthSelector";
import { PaymentSummaryCards } from "@/components/payments/PaymentSummaryCards";
import { StudentPaymentTable } from "@/components/payments/StudentPaymentTable";
import { PaymentModal } from "@/components/payments/PaymentModal";
import { PaymentDetailsModal } from "@/components/payments/PaymentDetailsModal";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { PlusCircle, Download, RefreshCw, Receipt } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function MonthlyPaymentsPage() {
  const { userProfile, user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<MonthlyFeeRecord[]>([]);
  const [summary, setSummary] = useState<MonthlyPaymentsSummary>({
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

  // Modals state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<Student | null>(null);
  const [selectedRecordForPayment, setSelectedRecordForPayment] = useState<MonthlyFeeRecord | null>(null);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [activeDetailsRecord, setActiveDetailsRecord] = useState<MonthlyFeeRecord | null>(null);

  const [waiveModalOpen, setWaiveModalOpen] = useState(false);
  const [waiveRecord, setWaiveRecord] = useState<MonthlyFeeRecord | null>(null);
  const [waiveReason, setWaiveReason] = useState("");
  const [savingWaive, setSavingWaive] = useState(false);

  const [submittingPayment, setSubmittingPayment] = useState(false);
  const toast = useToast();

  useEffect(() => {
    getSystemSettings().then((s) => {
      setSettings(s);
      const currentMonth = getCurrentMonthKey(new Date(), s.timezone);
      setSelectedMonthKey(currentMonth);
    });
  }, []);

  const loadData = async (monthKey: string) => {
    if (!monthKey) return;
    setLoading(true);
    try {
      const [stuList, feeData] = await Promise.all([
        getStudents(),
        getMonthlyFeeRecords(monthKey, settings.defaultMonthlyFee || 5000),
      ]);
      setStudents(stuList);
      setRecords(feeData.records);
      setSummary(feeData.summary);
    } catch (err) {
      console.error("Monthly payments load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMonthKey) {
      loadData(selectedMonthKey);
    }
  }, [selectedMonthKey, settings.defaultMonthlyFee]);

  const handleRecordPaymentSubmit = async (input: RecordPaymentInput) => {
    setSubmittingPayment(true);
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

      // Refresh data
      await loadData(selectedMonthKey);

      // If details modal was open, refresh it
      if (detailsModalOpen && activeDetailsRecord?.studentId === updated.studentId) {
        setActiveDetailsRecord(updated);
      }
    } catch (err: any) {
      toast.error("Payment Error", err.message);
      throw err;
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleWaiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waiveRecord) return;
    setSavingWaive(true);
    try {
      const userObj = {
        uid: user?.uid || userProfile?.userId || "admin",
        displayName: userProfile?.displayName || "Admin",
      };
      await waiveStudentFee(waiveRecord.studentId, selectedMonthKey, waiveReason, userObj, waiveRecord.monthlyFee);
      toast.info("Fee Waived", `Fee marked as waived for ${waiveRecord.studentNameSnapshot}`);
      setWaiveModalOpen(false);
      setDetailsModalOpen(false);
      setWaiveRecord(null);
      setWaiveReason("");
      await loadData(selectedMonthKey);
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setSavingWaive(false);
    }
  };

  const handleExportCsv = () => {
    if (records.length === 0) {
      toast.warning("No Records", "No payment records to export.");
      return;
    }
    exportMonthlyPaymentsToCsv(
      records,
      formatMonthName(selectedMonthKey),
      settings.currencySymbol || "Rs."
    );
    toast.success("CSV Exported", `Monthly payments exported successfully.`);
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <Receipt className="w-4 h-4" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  MONTHLY PAYMENTS
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Manage and track student monthly fee payments.
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Export CSV
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedStudentForPayment(null);
                  setSelectedRecordForPayment(null);
                  setPaymentModalOpen(true);
                }}
                leftIcon={<PlusCircle className="w-4 h-4" />}
                className="font-bold"
              >
                Record Payment
              </Button>
            </div>
          </div>

          {/* Month Selector */}
          <MonthSelector
            selectedMonthKey={selectedMonthKey}
            onMonthChange={(newKey) => setSelectedMonthKey(newKey)}
          />

          {/* Summary Cards */}
          <PaymentSummaryCards
            summary={summary}
            currencySymbol={settings.currencySymbol || "Rs."}
          />

          {/* Student Payment Table */}
          <StudentPaymentTable
            records={records}
            currencySymbol={settings.currencySymbol || "Rs."}
            onViewDetails={(rec) => {
              setActiveDetailsRecord(rec);
              setDetailsModalOpen(true);
            }}
            onRecordPayment={(rec) => {
              setSelectedRecordForPayment(rec);
              const matchingStudent = students.find((s) => s.studentId === rec.studentId) || null;
              setSelectedStudentForPayment(matchingStudent);
              setPaymentModalOpen(true);
            }}
          />

          {/* Record Payment Modal */}
          <PaymentModal
            isOpen={paymentModalOpen}
            onClose={() => {
              setPaymentModalOpen(false);
              setSelectedStudentForPayment(null);
              setSelectedRecordForPayment(null);
            }}
            students={students}
            initialStudent={selectedStudentForPayment}
            initialRecord={selectedRecordForPayment}
            monthKey={selectedMonthKey}
            defaultMonthlyFee={settings.defaultMonthlyFee || 5000}
            currencySymbol={settings.currencySymbol || "Rs."}
            onSubmit={handleRecordPaymentSubmit}
            isLoading={submittingPayment}
          />

          {/* View Details Ledger Modal */}
          <PaymentDetailsModal
            isOpen={detailsModalOpen}
            onClose={() => {
              setDetailsModalOpen(false);
              setActiveDetailsRecord(null);
            }}
            record={activeDetailsRecord}
            currencySymbol={settings.currencySymbol || "Rs."}
            onRecordPayment={(rec) => {
              setSelectedRecordForPayment(rec);
              const matchingStudent = students.find((s) => s.studentId === rec.studentId) || null;
              setSelectedStudentForPayment(matchingStudent);
              setDetailsModalOpen(false);
              setPaymentModalOpen(true);
            }}
            onWaiveFee={(rec) => {
              setWaiveRecord(rec);
              setWaiveModalOpen(true);
            }}
          />

          {/* Waive Fee Reason Modal */}
          <Modal
            isOpen={waiveModalOpen}
            onClose={() => {
              setWaiveModalOpen(false);
              setWaiveRecord(null);
            }}
            title="Waive Monthly Fee"
            description={`Mark ${waiveRecord?.studentNameSnapshot}'s fee for ${formatMonthName(selectedMonthKey)} as waived.`}
          >
            <form onSubmit={handleWaiveSubmit} className="space-y-4">
              <Input
                label="Reason for Waiving Fee *"
                placeholder="e.g. Full scholarship / Management concession"
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
                required
                autoFocus
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setWaiveModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={savingWaive} className="bg-indigo-600">
                  Confirm Waive
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
