"use client";

import React from "react";
import { clsx } from "clsx";
import {
  monthTotals,
  PaymentGridCell,
  PaymentGridRow,
  rowTotals,
  summarizeGrid,
} from "@/lib/payments/paymentGrid";
import {
  CELL_STATUS_LABEL,
  CellShowMode,
  cellMainText,
  cellSubText,
  formatAmount,
  isCellClickable,
  MONTH_LONG,
  MONTH_SHORT,
} from "@/lib/payments/recordsDisplay";
import { CellPill } from "./RecordCell";

export interface PaymentRecordsViewProps {
  rows: PaymentGridRow[];
  year: number;
  fromMonth: number;
  toMonth: number;
  mode: CellShowMode;
  currentMonthKey: string;
  currencySymbol: string;
  onCellClick: (row: PaymentGridRow, cell: PaymentGridCell) => void;
}

// Sticky cells need a solid background (the card itself is see-through glass on screen).
const HEAD_BG = "bg-[rgb(var(--c-bg-slate-100))]";
const CELL_BG = "bg-[rgb(var(--c-bg-white))]";
const NAME_EDGE = "shadow-[inset_-1px_0_0_rgb(var(--c-line-slate-200))]";
const TH = clsx("sticky top-0 py-3 px-2 border-b border-slate-200 text-center align-middle whitespace-nowrap", HEAD_BG);
const TD = "py-2.5 px-2 border-b border-slate-100 text-center align-middle whitespace-nowrap";
const TF = clsx("sticky bottom-0 py-2.5 px-2 border-t border-slate-200 text-center align-middle whitespace-nowrap", HEAD_BG);
const ID_COL = "w-[92px] min-w-[92px] max-w-[92px]";
const NAME_COL = "w-[184px] min-w-[184px] max-w-[184px]";

const MonthCell: React.FC<{
  row: PaymentGridRow;
  cell: PaymentGridCell;
  mode: CellShowMode;
  onClick: (row: PaymentGridRow, cell: PaymentGridCell) => void;
}> = ({ row, cell, mode, onClick }) => {
  if (cell.status === "NOT_ENROLLED") {
    return (
      <span className="font-semibold text-slate-400" title={CELL_STATUS_LABEL.NOT_ENROLLED}>
        –
      </span>
    );
  }
  if (!isCellClickable(cell)) {
    return (
      <span title={CELL_STATUS_LABEL[cell.status]}>
        <CellPill status={cell.status} />
      </span>
    );
  }
  const sub = cellSubText(cell, mode);
  return (
    <button
      type="button"
      onClick={() => onClick(row, cell)}
      className="w-full inline-flex flex-col items-center gap-0.5 rounded-lg py-0.5 transition hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      aria-label={`${row.fullName}, ${MONTH_LONG[cell.monthIndex]}: ${CELL_STATUS_LABEL[cell.status]}`}
    >
      <CellPill status={cell.status} text={cellMainText(cell, mode)} />
      {sub && (
        <span
          className={clsx(
            "text-[10.5px] font-medium tabular-nums",
            cell.status === "UNPAID" ? "text-rose-600" : "text-slate-400"
          )}
        >
          {sub}
        </span>
      )}
    </button>
  );
};

/** Year table for computers and tablets (hidden on phones; see PaymentRecordsCards). */
export const PaymentRecordsTable: React.FC<PaymentRecordsViewProps> = ({
  rows,
  year,
  fromMonth,
  toMonth,
  mode,
  currentMonthKey,
  currencySymbol,
  onCellClick,
}) => {
  const months: number[] = [];
  for (let m = fromMonth; m <= toMonth; m++) months.push(m);
  const totals = monthTotals(rows, fromMonth, toMonth);
  const grand = summarizeGrid(rows, fromMonth, toMonth);
  const keyOf = (m: number) => `${year}-${String(m + 1).padStart(2, "0")}`;

  return (
    <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-auto max-h-[70vh]">
        <table className="w-max min-w-full border-separate border-spacing-0 text-sm text-slate-600">
          <thead>
            <tr className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
              <th className={clsx(TH, ID_COL, "left-0 z-30 pl-4 text-left")}>Student ID</th>
              <th className={clsx(TH, NAME_COL, NAME_EDGE, "left-[92px] z-30 text-left")}>Student Name</th>
              <th className={clsx(TH, "z-20 min-w-[120px] pl-3 text-left")}>Class</th>
              {months.map((m) => {
                const now = keyOf(m) === currentMonthKey;
                return (
                  <th
                    key={m}
                    className={clsx(TH, "z-20 min-w-[92px]", now && "shadow-[inset_0_-2px_0_rgb(var(--c-bg-indigo-600))]")}
                  >
                    <span className={clsx("block text-xs", now ? "text-indigo-600" : "text-slate-700")}>
                      {MONTH_SHORT[m]}
                    </span>
                    <span className="block text-[10.5px] font-semibold text-slate-500">{year}</span>
                    {now && <span className="block text-[8.5px] text-indigo-600">This month</span>}
                  </th>
                );
              })}
              <th className={clsx(TH, "z-20 min-w-[136px] pr-4 text-right")}>Total</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const t = rowTotals(row, fromMonth, toMonth);
              return (
                <tr key={row.studentId}>
                  <td className={clsx(TD, CELL_BG, ID_COL, "sticky left-0 z-10 pl-4 text-left font-mono text-xs font-bold text-slate-900")}>
                    {row.studentId}
                  </td>
                  <td
                    className={clsx(
                      TD,
                      CELL_BG,
                      NAME_COL,
                      NAME_EDGE,
                      "sticky left-[92px] z-10 text-left font-semibold leading-snug text-slate-900 whitespace-normal"
                    )}
                  >
                    {row.fullName}
                  </td>
                  <td className={clsx(TD, "pl-3 text-left text-slate-500")}>{row.classLabel}</td>
                  {months.map((m) => {
                    const cell = row.cells[m];
                    return (
                      <td key={m} className={clsx(TD, cell.monthKey === currentMonthKey && "bg-indigo-50/40")}>
                        <MonthCell row={row} cell={cell} mode={mode} onClick={onCellClick} />
                      </td>
                    );
                  })}
                  <td className={clsx(TD, "pr-4 text-right")}>
                    <span className="block font-bold tabular-nums text-emerald-700">
                      {currencySymbol} {formatAmount(t.paid)}
                    </span>
                    {t.owed > 0 ? (
                      <span className="block text-[11px] font-semibold text-rose-700">
                        owes {currencySymbol} {formatAmount(t.owed)}
                      </span>
                    ) : (
                      <span className="block text-[11px] text-slate-400">nothing owed</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="text-xs">
              <td className={clsx(TF, ID_COL, "left-0 z-30 pl-4 text-left font-bold text-slate-900")}>Total</td>
              <td className={clsx(TF, NAME_COL, NAME_EDGE, "left-[92px] z-30 text-left font-bold text-slate-900")}>
                Collected ({currencySymbol})
              </td>
              <td className={clsx(TF, "z-20")} />
              {totals.map((t) => (
                <td key={t.monthIndex} className={clsx(TF, "z-20")}>
                  {t.dueCount === 0 ? (
                    <span className="block text-[10.5px] text-slate-400">
                      {t.collected > 0 ? formatAmount(t.collected) : t.notDue ? "Not due yet" : "–"}
                    </span>
                  ) : (
                    <>
                      <span className="block font-bold tabular-nums text-slate-900">{formatAmount(t.collected)}</span>
                      <span className="block text-[10.5px] text-slate-500">
                        {t.paidCount} of {t.dueCount} paid
                      </span>
                    </>
                  )}
                </td>
              ))}
              <td className={clsx(TF, "z-20 pr-4 text-right")}>
                <span className="block font-bold tabular-nums text-emerald-700">
                  {currencySymbol} {formatAmount(grand.collected)}
                </span>
                <span className="block text-[11px] font-semibold text-rose-700">
                  owed {currencySymbol} {formatAmount(grand.owed)}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
