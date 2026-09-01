"use client";

import React from "react";
import { MonthlyFeeRecord } from "@/types/payment";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDisplayDate } from "@/lib/utils/dateUtils";
import { PlusCircle, FileText } from "lucide-react";

export interface PaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: MonthlyFeeRecord | null;
  currencySymbol?: string;
  onRecordPayment: (record: MonthlyFeeRecord) => void;
  onWaiveFee: (record: MonthlyFeeRecord) => void;
}

export const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({
  isOpen,
  onClose,
  record,
  currencySymbol = "Rs.",
  onRecordPayment,
  onWaiveFee,
}) => {
  if (!record) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge variant="success" size="md" dot>PAID</Badge>;
      case "PARTIALLY_PAID":
        return <Badge variant="warning" size="md" dot>PARTIALLY PAID</Badge>;
      case "WAIVED":
        return <Badge variant="purple" size="md" dot>WAIVED</Badge>;
      default:
        return <Badge variant="danger" size="md" dot>UNPAID</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Student Payment Ledger"
      description={`${record.monthName} Monthly Fee Record`}
      maxWidth="xl"
    >
      <div className="space-y-5">
        <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
              Student Information
            </p>
            <h3 className="text-xl font-extrabold text-white">{record.studentNameSnapshot}</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              ID: <span className="font-mono font-bold text-white">{record.studentId}</span> • Class: {record.classSnapshot} - {record.sectionSnapshot}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {getStatusBadge(record.status)}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Monthly Fee</p>
            <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
              {currencySymbol} {record.monthlyFee.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Paid</p>
            <p className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">
              {currencySymbol} {record.totalPaid.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Balance Due</p>
            <p className="text-base sm:text-lg font-black text-rose-700 mt-0.5">
              {currencySymbol} {record.balance.toLocaleString()}
            </p>
          </div>
        </div>

        {record.waiveReason && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900">
            <strong>Fee Waived:</strong> {record.waiveReason}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" /> Payment Transaction History ({record.transactions?.length || 0})
            </h4>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Reference / Notes</th>
                  <th className="py-2.5 px-3">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!record.transactions || record.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                      No payments recorded yet for this month.
                    </td>
                  </tr>
                ) : (
                  record.transactions.map((tx) => (
                    <tr key={tx.paymentId} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                        {tx.paymentDateFormatted || formatDisplayDate(tx.paymentDate)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-emerald-700">
                        {currencySymbol} {tx.amount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[10px]">
                          {tx.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {tx.referenceNumber ? <span className="font-mono text-slate-700">{tx.referenceNumber}</span> : null}
                        {tx.notes ? <span className="block text-[11px] text-slate-400">{tx.notes}</span> : "-"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {tx.recordedByName || "Staff"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {record.status !== "WAIVED" && record.status !== "PAID" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onWaiveFee(record)}
                className="text-xs text-slate-600 hover:text-indigo-700 hover:bg-indigo-50"
              >
                Waive Fee
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            {record.status !== "PAID" && record.status !== "WAIVED" && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onRecordPayment(record)}
                leftIcon={<PlusCircle className="w-4 h-4" />}
                className="font-bold"
              >
                Record Payment
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
