"use client";

import React, { useState, useEffect } from "react";
import { Student } from "@/types/student";
import { MonthlyFeeRecord, PaymentMethod, RecordPaymentInput } from "@/types/payment";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDisplayDate } from "@/lib/utils/dateUtils";
import { formatMonthName, calculatePaymentStatus } from "@/lib/payments/paymentService";
import { DollarSign } from "lucide-react";

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  initialStudent?: Student | null;
  initialRecord?: MonthlyFeeRecord | null;
  monthKey: string;
  defaultMonthlyFee?: number;
  currencySymbol?: string;
  onSubmit: (input: RecordPaymentInput) => Promise<void>;
  isLoading?: boolean;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  students,
  initialStudent,
  initialRecord,
  monthKey,
  defaultMonthlyFee = 5000,
  currencySymbol = "Rs.",
  onSubmit,
  isLoading = false,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
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
    setPaymentAmount("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("CASH");
    setReferenceNumber("");
    setNotes("");
    setError(null);
  }, [isOpen, initialStudent, initialRecord]);

  const selectedStudent = students.find((s) => s.studentId === selectedStudentId);
  const monthlyFee = initialRecord ? initialRecord.monthlyFee : defaultMonthlyFee;
  const alreadyPaid = initialRecord ? initialRecord.totalPaid : 0;
  const currentBalance = Math.max(0, monthlyFee - alreadyPaid);

  const enteredAmount = parseFloat(paymentAmount) || 0;
  const newTotalPaid = alreadyPaid + enteredAmount;
  const newBalance = Math.max(0, monthlyFee - newTotalPaid);
  const newStatus = calculatePaymentStatus(monthlyFee, newTotalPaid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedStudentId) {
      setError("Please select a student.");
      return;
    }

    if (enteredAmount <= 0) {
      setError("Payment amount must be greater than 0.");
      return;
    }

    try {
      await onSubmit({
        studentId: selectedStudentId,
        monthKey,
        amount: enteredAmount,
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge variant="success" size="sm">PAID</Badge>;
      case "PARTIALLY_PAID":
        return <Badge variant="warning" size="sm">PARTIALLY PAID</Badge>;
      case "WAIVED":
        return <Badge variant="purple" size="sm">WAIVED</Badge>;
      default:
        return <Badge variant="danger" size="sm">UNPAID</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Monthly Payment"
      description={`Manual bookkeeping entry for ${formatMonthName(monthKey)}.`}
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
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-500">Student</p>
              <h4 className="text-sm font-bold text-slate-900">
                {initialRecord?.studentNameSnapshot || selectedStudent?.fullName}
              </h4>
              <p className="text-xs text-slate-500 font-mono">
                {selectedStudentId} • {initialRecord?.classSnapshot || selectedStudent?.class}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-500 block">Current Status</span>
              {getStatusBadge(initialRecord?.status || "UNPAID")}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Monthly Fee</span>
            <strong className="text-slate-900 text-sm font-black">{currencySymbol} {monthlyFee.toLocaleString()}</strong>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Already Paid</span>
            <strong className="text-emerald-700 text-sm font-black">{currencySymbol} {alreadyPaid.toLocaleString()}</strong>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Current Balance</span>
            <strong className="text-rose-700 text-sm font-black">{currencySymbol} {currentBalance.toLocaleString()}</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={`Payment Amount (${currencySymbol}) *`}
            type="number"
            min="1"
            step="1"
            placeholder={`e.g. ${currentBalance > 0 ? currentBalance : monthlyFee}`}
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            leftIcon={<DollarSign className="w-4 h-4" />}
            required
            autoFocus
          />

          <Input
            label="Payment Date *"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <Input
            label="Reference / Receipt # (Optional)"
            placeholder="e.g. REC-1049 / TXN-998"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
          />
        </div>

        <Input
          label="Notes (Optional)"
          placeholder="e.g. Paid by father at administration desk"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {enteredAmount > 0 && (
          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 text-xs text-indigo-950">
            <p className="font-bold text-[11px] uppercase tracking-wider text-indigo-700">
              Calculation Preview:
            </p>
            <div className="flex items-center justify-between border-b border-indigo-200/60 pb-1.5">
              <span>New Total Paid:</span>
              <strong className="font-mono text-sm">{currencySymbol} {newTotalPaid.toLocaleString()}</strong>
            </div>
            <div className="flex items-center justify-between border-b border-indigo-200/60 pb-1.5">
              <span>New Balance:</span>
              <strong className="font-mono text-sm">{currencySymbol} {newBalance.toLocaleString()}</strong>
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <span>New Status:</span>
              <div>{getStatusBadge(newStatus)}</div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} className="font-bold">
            Save Payment Record
          </Button>
        </div>
      </form>
    </Modal>
  );
};
