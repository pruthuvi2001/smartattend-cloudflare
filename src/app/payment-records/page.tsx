"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { FileText, Loader2, RotateCcw, Search, SearchX, SlidersHorizontal, Table2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";
import { getSystemSettings } from "@/lib/settings/settingsService";
import { loadPaymentRecords } from "@/lib/payments/paymentRecordsService";
import { recordStudentPayment } from "@/lib/payments/paymentService";
import {
  filterGridRows,
  GRID_STATUS_OPTIONS,
  GridStatusFilter,
  PaymentGridCell,
  PaymentGridRow,
  summarizeGrid,
} from "@/lib/payments/paymentGrid";
import { CellShowMode, formatAmount, MONTH_SHORT, rangeLabel } from "@/lib/payments/recordsDisplay";
import { exportPaymentRecordsPdf } from "@/lib/payments/recordsPdfExport";
import { SystemSettings, DEFAULT_SETTINGS } from "@/types/settings";
import { Student } from "@/types/student";
import { MonthlyFeeRecord, RecordPaymentInput } from "@/types/payment";
import { PaymentRecordsTable } from "@/components/payments/records/PaymentRecordsTable";
import { PaymentRecordsCards } from "@/components/payments/records/PaymentRecordsCards";
import { RecordsLegend } from "@/components/payments/records/RecordCell";
import { PaymentDetailsModal } from "@/components/payments/PaymentDetailsModal";
import { PaymentModal } from "@/components/payments/PaymentModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

const MONTH_OPTIONS = MONTH_SHORT.map((m, i) => ({ label: m, value: String(i) }));
const MODE_OPTIONS: { value: CellShowMode; label: string }[] = [
  { value: "amount", label: "Amount" },
  { value: "date", label: "Date paid" },
  { value: "status", label: "Status" },
];
const LABEL = "block text-xs font-semibold uppercase tracking-wider text-slate-700";

/**
 * Payment Records: every student's monthly fees for one year, month by month.
 * Reads data only; the one thing that saves anything is the existing
 * "Record Payment" form, opened from a month's details.
 */
export default function PaymentRecordsPage() {
  const { user, userProfile, can } = useAuth();
  const toast = useToast();
  const thisYear = new Date().getFullYear();

  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [settingsReady, setSettingsReady] = useState(false);
  const [rows, setRows] = useState<PaymentGridRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [currentMonthKey, setCurrentMonthKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [year, setYear] = useState(thisYear);
  const [search, setSearch] = useState("");
  const [className, setClassName] = useState("ALL");
  const [status, setStatus] = useState<GridStatusFilter>("ALL");
  const [fromMonth, setFromMonth] = useState(0);
  const [toMonth, setToMonth] = useState(11);
  const [mode, setMode] = useState<CellShowMode>("amount");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [detailsRecord, setDetailsRecord] = useState<MonthlyFeeRecord | null>(null);
  const [payRecord, setPayRecord] = useState<MonthlyFeeRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currencySymbol = settings.currencySymbol || "Rs.";
  const defaultFee = settings.defaultMonthlyFee || 5000;

  useEffect(() => {
    getSystemSettings()
      .then((s) => setSettings(s))
      .catch((err) => console.error("Settings load error:", err))
      .finally(() => setSettingsReady(true));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await loadPaymentRecords(year, defaultFee, settings.timezone);
      setRows(data.rows);
      setStudents(data.students);
      setCurrentMonthKey(data.currentMonthKey);
    } catch (err: any) {
      console.error("Payment records load error:", err);
      setRows([]);
      setLoadError(err?.message || "Could not load payment records. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [year, defaultFee, settings.timezone]);

  useEffect(() => {
    if (settingsReady) loadData();
  }, [settingsReady, loadData]);

  const classOptions = useMemo(
    () => Array.from(new Set(rows.flatMap((r) => r.classNames))).sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const filtered = useMemo(
    () => filterGridRows(rows, { search, className, status, fromMonth, toMonth }),
    [rows, search, className, status, fromMonth, toMonth]
  );
  const summary = useMemo(() => summarizeGrid(filtered, fromMonth, toMonth), [filtered, fromMonth, toMonth]);
  const totalInYear = useMemo(
    () => rows.filter((r) => !r.cells.every((c) => c.status === "NOT_ENROLLED")).length,
    [rows]
  );

  const activeFilterCount =
    Number(className !== "ALL") +
    Number(status !== "ALL") +
    Number(year !== thisYear) +
    Number(fromMonth !== 0 || toMonth !== 11);
  const classLabel = className === "ALL" ? "All classes" : className;
  const statusLabel = GRID_STATUS_OPTIONS.find((o) => o.value === status)?.label || "All students";

  const clearFilters = () => {
    setSearch("");
    setClassName("ALL");
    setStatus("ALL");
    setFromMonth(0);
    setToMonth(11);
    setYear(thisYear);
  };

  const handleCellClick = (_row: PaymentGridRow, cell: PaymentGridCell) => {
    setDetailsRecord(cell.record);
  };

  const handleRecordPayment = async (input: RecordPaymentInput) => {
    setSubmitting(true);
    try {
      const updated = await recordStudentPayment({
        ...input,
        recordedBy: {
          uid: user?.uid || userProfile?.userId || "staff-001",
          displayName: userProfile?.displayName || "Staff Member",
        },
      });
      toast.success(
        "Payment Recorded",
        `Received ${currencySymbol} ${input.amount.toLocaleString()} for ${updated.studentNameSnapshot} (${updated.monthName})`
      );
      await loadData();
    } catch (err: any) {
      toast.error("Payment Error", err?.message || "Failed to record payment.");
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportPdf = () => {
    if (filtered.length === 0) {
      toast.warning("No Data", "No students match these filters.");
      return;
    }
    exportPaymentRecordsPdf({
      rows: filtered,
      year,
      fromMonth,
      toMonth,
      mode,
      currencySymbol,
      schoolName: settings.schoolName,
      classLabel,
      statusLabel,
      search,
    });
    toast.success("PDF Exported", `Saved payment records for ${filtered.length} students.`);
  };

  const payStudent = payRecord
    ? students.find((s) => s.studentId.toUpperCase() === payRecord.studentId.toUpperCase()) || null
    : null;

  const stats = [
    { label: "Students", value: String(summary.students), note: "in this view", tone: "text-slate-900" },
    {
      label: "Collected",
      value: `${currencySymbol} ${formatAmount(summary.collected)}`,
      note: rangeLabel(year, fromMonth, toMonth),
      tone: "text-emerald-700",
    },
    { label: "Still owed", value: `${currencySymbol} ${formatAmount(summary.owed)}`, note: "from unpaid months", tone: "text-rose-700" },
    { label: "Unpaid months", value: String(summary.unpaidMonths), note: "came to class, not paid", tone: "text-slate-900" },
  ];

  return (
    <ProtectedRoute permission="payments_view">
      <AppLayout>
        <div className="space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <Table2 className="w-4 h-4" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">PAYMENT RECORDS</h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Every student&apos;s monthly fees for the year, month by month. A fee is due only in months the
                student came to class (Present or Late).
              </p>
            </div>
            {can("payments_export") && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportPdf}
              disabled={loading || filtered.length === 0}
              leftIcon={<FileText className="w-3.5 h-3.5" />}
              className="font-bold w-full sm:w-auto"
            >
              Export PDF
            </Button>
            )}
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2 space-y-1.5">
                <label htmlFor="pr-search" className={LABEL}>
                  Search
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0">
                    <Input
                      id="pr-search"
                      type="search"
                      placeholder="Student name or ID"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      leftIcon={<Search className="w-4 h-4" />}
                      autoComplete="off"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="md:hidden"
                    onClick={() => setFiltersOpen((o) => !o)}
                    aria-expanded={filtersOpen}
                    aria-controls="pr-more-filters"
                    leftIcon={<SlidersHorizontal className="w-4 h-4" />}
                  >
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="inline-grid place-items-center min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </div>
              </div>

              <div id="pr-more-filters" className={clsx(filtersOpen ? "grid" : "hidden", "grid-cols-1 gap-3 md:contents")}>
                <Select
                  id="pr-class"
                  label="Class"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  options={[{ label: "All classes", value: "ALL" }, ...classOptions.map((c) => ({ label: c, value: c }))]}
                />
                <Select
                  id="pr-status"
                  label="Payment status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as GridStatusFilter)}
                  options={GRID_STATUS_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
                />
                <Select
                  id="pr-year"
                  label="Year"
                  value={String(year)}
                  onChange={(e) => setYear(parseInt(e.target.value, 10))}
                  options={[thisYear, thisYear - 1, thisYear - 2].map((y) => ({ label: String(y), value: String(y) }))}
                />
                <div className="md:col-span-2 space-y-1.5">
                  <label htmlFor="pr-from" className={LABEL}>
                    Months
                  </label>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <Select
                      id="pr-from"
                      aria-label="From month"
                      value={String(fromMonth)}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        setFromMonth(v);
                        if (v > toMonth) setToMonth(v);
                      }}
                      options={MONTH_OPTIONS}
                    />
                    <span className="text-xs text-slate-500">to</span>
                    <Select
                      id="pr-to"
                      aria-label="To month"
                      value={String(toMonth)}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        setToMonth(v);
                        if (v < fromMonth) setFromMonth(v);
                      }}
                      options={MONTH_OPTIONS}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span id="pr-mode-label" className={LABEL}>
                    Cells show
                  </span>
                  <div
                    role="group"
                    aria-labelledby="pr-mode-label"
                    className="flex gap-0.5 p-[3px] rounded-lg border border-slate-300 bg-slate-50"
                  >
                    {MODE_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        aria-pressed={mode === o.value}
                        onClick={() => setMode(o.value)}
                        className={clsx(
                          "flex-1 rounded-md px-2 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                          mode === o.value
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        )}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-medium">
                Showing <strong className="text-slate-900">{filtered.length}</strong> of {totalInYear} students ·{" "}
                {classLabel} · {rangeLabel(year, fromMonth, toMonth)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                className="text-xs self-start sm:self-auto"
              >
                Clear filters
              </Button>
            </div>
          </div>

          {/* Totals for the rows on screen */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm grid grid-cols-2 md:grid-cols-4 overflow-hidden">
            {stats.map((s) => (
              <div
                key={s.label}
                className="p-4 space-y-0.5 min-w-0 shadow-[-1px_0_0_rgb(var(--c-line-slate-100)),0_-1px_0_rgb(var(--c-line-slate-100))]"
              >
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">{s.label}</p>
                <p className={clsx("text-lg sm:text-xl font-extrabold tabular-nums", s.tone)}>{s.value}</p>
                <p className="text-[11px] text-slate-500">{s.note}</p>
              </div>
            ))}
          </div>

          <RecordsLegend />

          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading payment records…
            </div>
          ) : loadError ? (
            <EmptyState
              title="Couldn't load payment records"
              description={loadError}
              actionLabel="Try again"
              onAction={loadData}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<SearchX className="w-6 h-6" />}
              title={totalInYear === 0 ? `No students for ${year}` : "No students match these filters"}
              description={
                totalInYear === 0
                  ? "Active students and their monthly payments will show here."
                  : "Try another class or month range, or check the spelling of the name or student ID."
              }
              actionLabel={totalInYear === 0 ? undefined : "Clear filters"}
              onAction={totalInYear === 0 ? undefined : clearFilters}
            />
          ) : (
            <>
              <PaymentRecordsTable
                rows={filtered}
                year={year}
                fromMonth={fromMonth}
                toMonth={toMonth}
                mode={mode}
                currentMonthKey={currentMonthKey}
                currencySymbol={currencySymbol}
                onCellClick={handleCellClick}
              />
              <PaymentRecordsCards
                rows={filtered}
                year={year}
                fromMonth={fromMonth}
                toMonth={toMonth}
                mode={mode}
                currentMonthKey={currentMonthKey}
                currencySymbol={currencySymbol}
                onCellClick={handleCellClick}
              />
            </>
          )}

          {/* Month details (existing payment ledger) */}
          <PaymentDetailsModal
            isOpen={!!detailsRecord}
            onClose={() => setDetailsRecord(null)}
            record={detailsRecord}
            currencySymbol={currencySymbol}
            onRecordPayment={(rec) => {
              setDetailsRecord(null);
              setPayRecord(rec);
            }}
          />

          {/* Existing payment form (full fee only) */}
          {payRecord && (
            <PaymentModal
              isOpen={!!payRecord && can("payments_record")}
              onClose={() => setPayRecord(null)}
              students={students}
              initialStudent={payStudent}
              initialRecord={payRecord}
              monthKey={payRecord.monthKey}
              defaultMonthlyFee={defaultFee}
              currencySymbol={currencySymbol}
              onSubmit={handleRecordPayment}
              isLoading={submitting}
            />
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
