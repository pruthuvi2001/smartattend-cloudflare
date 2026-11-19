import type { GridCellStatus, PaymentGridCell } from "./paymentGrid";

/** What each month cell shows on the Payment Records page and in its PDF. */
export type CellShowMode = "amount" | "date" | "status";

export const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const CELL_STATUS_LABEL: Record<GridCellStatus, string> = {
  PAID: "Paid",
  UNPAID: "Unpaid",
  WAIVED: "Waived",
  NO_CLASS: "No class (no fee)",
  NOT_DUE: "Not due yet",
  NOT_ENROLLED: "Not enrolled yet",
};

export function formatAmount(n: number): string {
  return (Number(n) || 0).toLocaleString("en-US");
}

/** "2026-01-05" -> "05 Jan" */
export function shortDate(dateStr: string | undefined): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return "";
  const [, m, d] = dateStr.split("-");
  return `${d.slice(0, 2)} ${MONTH_SHORT[parseInt(m, 10) - 1] ?? ""}`.trim();
}

/** Month range label, e.g. "Jan – Dec 2026" or "Nov 2026". */
export function rangeLabel(year: number, fromMonth: number, toMonth: number): string {
  return fromMonth === toMonth
    ? `${MONTH_SHORT[fromMonth]} ${year}`
    : `${MONTH_SHORT[fromMonth]} – ${MONTH_SHORT[toMonth]} ${year}`;
}

/** Long month range, e.g. "January to December 2026". */
export function rangeLabelLong(year: number, fromMonth: number, toMonth: number): string {
  return fromMonth === toMonth
    ? `${MONTH_LONG[fromMonth]} ${year}`
    : `${MONTH_LONG[fromMonth]} to ${MONTH_LONG[toMonth]} ${year}`;
}

/** Main text inside a cell. */
export function cellMainText(cell: PaymentGridCell, mode: CellShowMode): string {
  switch (cell.status) {
    case "PAID":
      if (mode === "amount") return formatAmount(cell.totalPaid || cell.monthlyFee);
      if (mode === "date") return shortDate(cell.lastPaymentDate) || "Paid";
      return "Paid";
    case "UNPAID":
      return "Unpaid";
    case "WAIVED":
      return "Waived";
    case "NO_CLASS":
      return "No class";
    case "NOT_DUE":
      return "";
    case "NOT_ENROLLED":
      return "–";
  }
}

/** Small second line under a cell (empty when there is nothing to add). */
export function cellSubText(cell: PaymentGridCell, mode: CellShowMode): string {
  if (mode === "status") return "";
  if (cell.status === "UNPAID") return `${formatAmount(cell.balance)} due`;
  if (cell.status === "NO_CLASS") return "no fee";
  return "";
}

/** Cells that open the payment details when clicked. */
export function isCellClickable(cell: PaymentGridCell): boolean {
  return cell.status === "PAID" || cell.status === "UNPAID" || cell.status === "WAIVED" || cell.status === "NO_CLASS";
}
