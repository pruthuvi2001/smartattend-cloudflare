"use client";

import React from "react";
import { clsx } from "clsx";
import { Badge } from "@/components/ui/Badge";
import { PaymentGridCell, rowTotals } from "@/lib/payments/paymentGrid";
import {
  CELL_STATUS_LABEL,
  CellShowMode,
  formatAmount,
  isCellClickable,
  MONTH_LONG,
  MONTH_SHORT,
  rangeLabel,
  shortDate,
} from "@/lib/payments/recordsDisplay";
import { STATUS_STYLE, StatusIcon } from "./RecordCell";
import type { PaymentRecordsViewProps } from "./PaymentRecordsTable";

function chipText(cell: PaymentGridCell, mode: CellShowMode): string {
  if (cell.status === "PAID") {
    return mode === "amount" ? formatAmount(cell.totalPaid || cell.monthlyFee) : shortDate(cell.lastPaymentDate) || "Paid";
  }
  if (cell.status === "UNPAID") return mode === "amount" ? "0" : "–";
  if (cell.status === "NO_CLASS") return "no fee";
  return " ";
}

/** Year view for phones: one card per student with a 6 x 2 grid of months. */
export const PaymentRecordsCards: React.FC<PaymentRecordsViewProps> = ({
  rows,
  year,
  fromMonth,
  toMonth,
  mode,
  currentMonthKey,
  currencySymbol,
  onCellClick,
}) => (
  <div className="md:hidden space-y-3">
    {rows.map((row) => {
      const t = rowTotals(row, fromMonth, toMonth);
      const cells = row.cells.slice(fromMonth, toMonth + 1);
      return (
        <div key={row.studentId} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-bold text-[15px] text-slate-900">{row.fullName}</h4>
              <p className="text-xs text-slate-500">
                <span className="font-mono">{row.studentId}</span> · {row.classLabel}
              </p>
            </div>
            {t.owed > 0 ? (
              <Badge variant="danger" size="sm" dot className="shrink-0">
                Owes {currencySymbol} {formatAmount(t.owed)}
              </Badge>
            ) : (
              <Badge variant="success" size="sm" dot className="shrink-0">
                Nothing owed
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-6 gap-1.5">
            {cells.map((cell) => {
              const now = cell.monthKey === currentMonthKey;
              const third = mode === "status" ? null : (
                <span className="text-[9.5px] font-semibold opacity-90 tabular-nums whitespace-nowrap">
                  {chipText(cell, mode)}
                </span>
              );
              const base = clsx(
                "flex flex-col items-center gap-0.5 rounded-lg border py-1.5 text-[11px] font-semibold min-w-0",
                now && "ring-1 ring-indigo-500"
              );
              if (cell.status === "NOT_ENROLLED") {
                return (
                  <span
                    key={cell.monthKey}
                    className={clsx(base, "border-slate-100 text-slate-400")}
                    title={CELL_STATUS_LABEL.NOT_ENROLLED}
                  >
                    <span>{MONTH_SHORT[cell.monthIndex]}</span>
                    <span>–</span>
                    {third && <span className="text-[9.5px]">{" "}</span>}
                  </span>
                );
              }
              if (!isCellClickable(cell)) {
                return (
                  <span key={cell.monthKey} className={clsx(base, STATUS_STYLE[cell.status])} title={CELL_STATUS_LABEL[cell.status]}>
                    <span>{MONTH_SHORT[cell.monthIndex]}</span>
                    <StatusIcon status={cell.status} className="w-3.5 h-3.5" />
                    {third}
                  </span>
                );
              }
              return (
                <button
                  key={cell.monthKey}
                  type="button"
                  onClick={() => onCellClick(row, cell)}
                  className={clsx(base, STATUS_STYLE[cell.status], "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500")}
                  aria-label={`${MONTH_LONG[cell.monthIndex]} ${year}: ${CELL_STATUS_LABEL[cell.status]}`}
                >
                  <span>{MONTH_SHORT[cell.monthIndex]}</span>
                  <StatusIcon status={cell.status} className="w-3.5 h-3.5" />
                  {third}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs text-slate-500">
            <span>Paid in {rangeLabel(year, fromMonth, toMonth)}</span>
            <strong className="tabular-nums text-emerald-700">
              {currencySymbol} {formatAmount(t.paid)}
            </strong>
          </div>
        </div>
      );
    })}
  </div>
);
