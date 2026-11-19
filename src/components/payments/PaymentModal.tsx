"use client";

import React, { useState, useEffect } from "react";
import { Student } from "@/types/student";
import { MonthlyFeeRecord, PaymentMethod, RecordPaymentInput } from "@/types/payment";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge";
import { formatMonthName } from "@/lib/payments/paymentService";
import { Info } from "lucide-react";

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  initialStudent?: Student | null;
  initialRecord?: MonthlyFeeRecord | null;
  /** This month's records, used to find the fee and status when a student is picked from the list. */
  records?: MonthlyFeeRecord[];
  monthKey: string;
  defaultMonthlyFee?: number;
  currencySymbol?: string;
  onSubmit: (input: RecordPaymentInput) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Records a monthly fee payment. There are no part payments: the amount is always
 * the full amount still due for the month and cannot be changed here.
 */
export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  students,
  initialStudent,
  initialRecord,
  records,
  monthKey,
  defaultMonthlyFee = 5000,
  currencySymbol = "Rs.",
  onSubmit,
  isLoading = false,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialStudent) {
      setSelectedStudentId(initialStudent.studentId);
    } else if (initialRecord) {
      setSelectedStudentId(initialRecord.studentId);
    } else {
      setSelectedStudentId("");
    }
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("CASH");
    setReferenceNumber("");
    setNotes("");
    setError(null);
  }, [isOpen, initialStudent, initialRecord]);

  const selectedStudent = students.find((s) => s.studentId === selectedStudentId);
  const record =
    initialRecord ??
    records?.find((r) => r.studentId.toUpperCase() === selectedStudentId.toUpperCase()) ??
    null;
  const monthlyFee = record ? record.monthlyFee : defaultMonthlyFee;
  const alreadyPaid = record ? record.totalPaid || 0 : 0;
  const amountDue = Math.max(0, monthlyFee - alreadyPaid);
  const currentStatus = record?.status || "UNPAID";
  const cannotPay = currentStatus === "PAID" || currentStatus === "WAIVED" || amountDue <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedStudentId) {
      setError("Please select a student.");
      return;
    }

    if (currentStatus === "PAID") {
      setError(`This student has already paid for ${formatMonthName(monthKey)}.`);
      return;
    }
    if (currentStatus === "WAIVED") {
      setError(`The ${formatMonthName(monthKey)} fee is waived for this student.`);
      return;
    }
    if (amountDue <= 0) {
      setError("Nothing is due for this month.");
      return;
    }

    try {
      await onSubmit({
        studentId: selectedStudentId,
        monthKey,
        amount: amountDue,
        paymentDate,
        paymentMethod,
        referenceNumber,
        notes,
        monthlyFee,
        recordedBy: {
          uid: "staff",
          displayName: "Staff Member",
        },
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to record payment.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Monthly Payment"
      description={`Full monthly fee for ${formatMonthName(monthKey)}.`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        {!initialStudent && !initialRecord ? (
          <Select
            label="Select Student *"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            options={[
              { label: "-- Select student --", value: "" },
              ...students
                .filter((s) => s.status === "ACTIVE")
                .map((s) => ({
                  label: `${s.studentId} - ${s.fullName} (${s.class})`,
                  value: s.studentId,
                })),
            ]}
            required
          />
        ) : (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase text-slate-500">Student</p>
              <h4 className="text-sm font-bold text-slate-900">
                {initialRecord?.studentNameSnapshot || selectedStudent?.fullName}
              </h4>
              <p className="text-xs text-slate-500 font-mono">
                {selectedStudentId} • {initialRecord?.classSnapshot || selectedStudent?.class}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] font-semibold text-slate-500 block">Current Status</span>
              <PaymentStatusBadge status={currentStatus} />
            </div>
          </div>
        )}

        {selectedStudentId && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Amount to pay</p>
              <p className="text-xs text-emerald-700/90 mt-0.5">
                {alreadyPaid > 0
                  ? `Rest of the ${currencySymbol} ${monthlyFee.toLocaleString()} fee (${currencySymbol} ${alreadyPaid.toLocaleString()} was received earlier).`
                  : "Full monthly fee. Part payments are not allowed."}
              </p>
            </div>
            <strong className="text-xl font-black text-emerald-700 whitespace-nowrap">
              {currencySymbol} {amountDue.toLocaleString()}
            </strong>
          </div>
        )}

        {selectedStudentId && currentStatus === "NO_CLASS" && (
          <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-800 flex gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              This student has no Present or Late day in {formatMonthName(monthKey)} yet, so the fee is not due.
              Saving now records it as paid in advance.
            </span>
          </div>
        )}

        {selectedStudentId && (currentStatus === "PAID" || currentStatus === "WAIVED") && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            {currentStatus === "PAID"
              ? `Already paid for ${formatMonthName(monthKey)}. Nothing to record.`
              : `The fee for ${formatMonthName(monthKey)} is waived. Nothing to record.`}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Payment Date *"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
          />

          <Select
            label="Payment Method *"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            options={[
              { label: "Cash (Direct Handover)", value: "CASH" },
              { label: "Bank Transfer / Deposit", value: "BANK_TRANSFER" },
              { label: "Other (Cheque / Sponsor)", value: "OTHER" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Reference / Receipt # (Optional)"
            placeholder="e.g. REC-1049 / TXN-998"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
          />

          <Input
            label="Notes (Optional)"
            placeholder="e.g. Paid by father at the desk"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            disabled={!selectedStudentId || cannotPay}
            className="font-bold"
          >
            {selectedStudentId && !cannotPay
              ? `Save Payment (${currencySymbol} ${amountDue.toLocaleString()})`
              : "Save Payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
