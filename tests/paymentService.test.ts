import { describe, it, expect } from "vitest";
import {
  getCurrentMonthKey,
  formatMonthName,
  getPreviousMonthKey,
  getNextMonthKey,
  calculatePaymentStatus
} from "../src/lib/payments/paymentService";

describe("Monthly Payments Service & Calculations", () => {
  it("should format month keys correctly", () => {
    expect(formatMonthName("2026-09")).toBe("September 2026");
    expect(formatMonthName("2026-01")).toBe("January 2026");
    expect(formatMonthName("2026-12")).toBe("December 2026");
  });

  it("should calculate previous and next month keys across year boundaries", () => {
    expect(getPreviousMonthKey("2026-09")).toBe("2026-08");
    expect(getNextMonthKey("2026-09")).toBe("2026-10");

    // Year boundary
    expect(getPreviousMonthKey("2026-01")).toBe("2025-12");
    expect(getNextMonthKey("2025-12")).toBe("2026-01");
  });

  it("should compute payment status accurately", () => {
    const fee = 5000;

    // 0 paid -> UNPAID
    expect(calculatePaymentStatus(fee, 0)).toBe("UNPAID");

    // Partial deposit -> PARTIALLY_PAID
    expect(calculatePaymentStatus(fee, 2000)).toBe("PARTIALLY_PAID");
    expect(calculatePaymentStatus(fee, 4999)).toBe("PARTIALLY_PAID");

    // Full payment or overpayment -> PAID
    expect(calculatePaymentStatus(fee, 5000)).toBe("PAID");
    expect(calculatePaymentStatus(fee, 6000)).toBe("PAID");

    // Waived fee -> WAIVED
    expect(calculatePaymentStatus(fee, 0, true)).toBe("WAIVED");
  });

  it("should calculate multi-payment transaction totals and balance accurately", () => {
    const monthlyFee = 5000;
    const transactions = [
      { amount: 2000, date: "2026-09-05" },
      { amount: 1000, date: "2026-09-10" },
      { amount: 2000, date: "2026-09-20" },
    ];

    const totalPaid = transactions.reduce((acc, t) => acc + t.amount, 0);
    const balance = Math.max(0, monthlyFee - totalPaid);
    const status = calculatePaymentStatus(monthlyFee, totalPaid);

    expect(totalPaid).toBe(5000);
    expect(balance).toBe(0);
    expect(status).toBe("PAID");
  });
});
