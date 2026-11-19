import React from "react";
import { clsx } from "clsx";
import { CalendarX, Check, Clock, Gift, X, type LucideIcon } from "lucide-react";
import type { GridCellStatus } from "@/lib/payments/paymentGrid";
import { CELL_STATUS_LABEL } from "@/lib/payments/recordsDisplay";

/** Colours for each month status (theme-aware Tailwind colours). */
export const STATUS_STYLE: Record<GridCellStatus, string> = {
  PAID: "bg-emerald-50 border-emerald-200 text-emerald-700",
  UNPAID: "bg-rose-50 border-rose-200 text-rose-700",
  WAIVED: "bg-sky-50 border-sky-200 text-sky-700",
  NO_CLASS: "bg-slate-100 border-slate-200 text-slate-600",
  NOT_DUE: "bg-transparent border-dashed border-slate-300 text-slate-400",
  NOT_ENROLLED: "bg-transparent border-transparent text-slate-400",
};

const ICONS: Partial<Record<GridCellStatus, LucideIcon>> = {
  PAID: Check,
  UNPAID: X,
  WAIVED: Gift,
  NO_CLASS: CalendarX,
  NOT_DUE: Clock,
};

export const StatusIcon: React.FC<{ status: GridCellStatus; className?: string }> = ({ status, className }) => {
  const Icon = ICONS[status];
  return Icon ? <Icon className={className} strokeWidth={2.6} aria-hidden="true" /> : null;
};

/** Small rounded status label used in table cells and the legend. */
export const CellPill: React.FC<{ status: GridCellStatus; text?: string; className?: string }> = ({
  status,
  text,
  className,
}) => (
  <span
    className={clsx(
      "inline-flex items-center gap-1 rounded-full border py-0.5 text-xs font-semibold whitespace-nowrap tabular-nums",
      text ? "pl-1.5 pr-2" : "px-1.5",
      STATUS_STYLE[status],
      className
    )}
  >
    <StatusIcon status={status} className="w-3 h-3" />
    {text && <span>{text}</span>}
  </span>
);

export const RecordsLegend: React.FC = () => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
    {(["PAID", "UNPAID", "WAIVED", "NO_CLASS", "NOT_DUE"] as GridCellStatus[]).map((s) => (
      <span key={s} className="inline-flex items-center gap-1.5">
        <CellPill status={s} />
        {CELL_STATUS_LABEL[s]}
      </span>
    ))}
    <span className="inline-flex items-center gap-1.5">
      <span className="font-semibold text-slate-400">–</span>
      {CELL_STATUS_LABEL.NOT_ENROLLED}
    </span>
    <span className="sm:ml-auto text-slate-400">Tap or click a month to see payments and days attended.</span>
  </div>
);
