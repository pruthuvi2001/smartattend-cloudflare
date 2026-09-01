import React from "react";
import { MonthlyPaymentsSummary } from "@/types/payment";
import { StatCard } from "@/components/ui/StatCard";
import { Users, CheckCircle2, AlertCircle, XCircle, DollarSign, Wallet, TrendingUp } from "lucide-react";

export interface PaymentSummaryCardsProps {
  summary: MonthlyPaymentsSummary;
  currencySymbol?: string;
}

export const PaymentSummaryCards: React.FC<PaymentSummaryCardsProps> = ({
  summary,
  currencySymbol = "Rs.",
}) => {
  const formatMoney = (amount: number) => {
    return `${currencySymbol} ${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Students"
          value={summary.totalStudents}
          subtitle="Enrolled active roster"
          icon={<Users className="w-5 h-5" />}
          variant="indigo"
        />
        <StatCard
          title="Fully Paid"
          value={summary.paidCount}
          subtitle="100% balance cleared"
          icon={<CheckCircle2 className="w-5 h-5" />}
          variant="emerald"
        />
        <StatCard
          title="Partially Paid"
          value={summary.partiallyPaidCount}
          subtitle="Partial deposit received"
          icon={<AlertCircle className="w-5 h-5" />}
          variant="amber"
        />
        <StatCard
          title="Unpaid Students"
          value={summary.unpaidCount}
          subtitle="No payment recorded"
          icon={<XCircle className="w-5 h-5" />}
          variant="rose"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Expected</p>
            <h4 className="text-xl sm:text-2xl font-black text-slate-900">{formatMoney(summary.totalExpected)}</h4>
            <p className="text-xs text-slate-500">Gross monthly fee budget</p>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 p-4 sm:p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Total Collected</p>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded">
                {summary.collectionRate}%
              </span>
            </div>
            <h4 className="text-xl sm:text-2xl font-black text-emerald-700">{formatMoney(summary.totalCollected)}</h4>
            <p className="text-xs text-emerald-600/90">Received & recorded</p>
          </div>
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-rose-200 bg-rose-50/20 p-4 sm:p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Outstanding Balance</p>
            <h4 className="text-xl sm:text-2xl font-black text-rose-700">{formatMoney(summary.outstandingBalance)}</h4>
            <p className="text-xs text-rose-600/90">Pending fee collection</p>
          </div>
          <div className="p-3 bg-rose-100 text-rose-700 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
};
