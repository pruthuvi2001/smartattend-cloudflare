/**
 * Payment status the app shows for one student and one month.
 * - PAID / UNPAID / WAIVED are saved in Firestore.
 * - NO_CLASS is never saved: it means the student was not marked Present or Late
 *   on any day that month, so no fee is due (see src/lib/payments/feeRules.ts).
 * Part payments were removed. Old records may still say "PARTIALLY_PAID";
 * they are read as UNPAID (or PAID if fully covered) by normalizeStoredStatus().
 */
export type PaymentStatus = 'PAID' | 'UNPAID' | 'WAIVED' | 'NO_CLASS';

/** Statuses that are written to Firestore. */
export type StoredPaymentStatus = 'PAID' | 'UNPAID' | 'WAIVED';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'OTHER';

export interface PaymentTransaction {
  paymentId: string;
  feeRecordId: string;
  studentId: string;
  classId?: string;
  amount: number;
  paymentDate: string;        // e.g. "2026-09-05"
  paymentDateFormatted: string; // e.g. "05 Sep 2026"
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  recordedBy: string;
  recordedByName: string;
  recordedAt: string;         // ISO timestamp
}

export interface MonthlyFeeRecord {
  feeRecordId: string;        // Format: `${studentId}_${classId || 'default'}_${monthKey}`
  studentId: string;
  studentNameSnapshot: string;
  classId?: string;           // Linked ClassEntity ID
  classSnapshot: string;
  sectionSnapshot?: string;
  monthKey: string;           // Normalized YYYY-MM (e.g., "2026-09")
  monthName: string;          // e.g., "September 2026"
  monthlyFee: number;         // e.g., 5000
  totalPaid: number;          // e.g., 3000
  balance: number;            // e.g., 2000
  status: PaymentStatus;
  lastPaymentDate?: string;
  transactions: PaymentTransaction[];
  waiveReason?: string;
  /** Days marked Present or Late in this month. Worked out for display only; never saved. */
  attendedDays?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface MonthlyPaymentsSummary {
  monthKey: string;
  monthName: string;
  totalStudents: number;
  paidCount: number;
  unpaidCount: number;
  waivedCount: number;
  noClassCount: number;       // students with no Present/Late day this month (no fee)
  totalExpected: number;
  totalCollected: number;
  outstandingBalance: number;
  collectionRate: number;     // percentage 0 to 100
}

export interface RecordPaymentInput {
  studentId: string;
  monthKey: string;
  amount: number;
  paymentDate?: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  monthlyFee?: number;
  recordedBy: {
    uid: string;
    displayName: string;
  };
}