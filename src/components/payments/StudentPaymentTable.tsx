import React, { useState, useEffect } from "react";
import { MonthlyFeeRecord } from "@/types/payment";
import { ClassEntity } from "@/types/class";
import { getClasses } from "@/lib/classes/classService";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Search, FileText, Download } from "lucide-react";
import { formatDisplayDate } from "@/lib/utils/dateUtils";
import { exportMonthlyPaymentsToPdf } from "@/lib/payments/pdfExport";

export interface StudentPaymentTableProps {
  records: MonthlyFeeRecord[];
  currencySymbol?: string;
  monthName?: string;
  schoolName?: string;
  onViewDetails: (record: MonthlyFeeRecord) => void;
  onRecordPayment: (record: MonthlyFeeRecord) => void;
}

export const StudentPaymentTable: React.FC<StudentPaymentTableProps> = ({
  records,
  currencySymbol = "Rs.",
  monthName = "Current Month",
  schoolName = "SmartAttend Academy",
  onViewDetails,
  onRecordPayment,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [availableClasses, setAvailableClasses] = useState<ClassEntity[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    getClasses().then((list) => setAvailableClasses(list));
  }, []);

  const classOptions = Array.from(
    new Set([
      ...availableClasses.map((c) => c.name),
      ...records.map((r) => r.classSnapshot),
    ])
  ).filter(Boolean).sort();

  const handleExportPdf = () => {
    exportMonthlyPaymentsToPdf({
      records,
      monthName,
      currencySymbol,
      schoolName,
      classFilter,
    });
  };

  const filtered = records.filter((r) => {
    const matchesSearch =
      r.studentNameSnapshot.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.classSnapshot.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClass = classFilter === "ALL" || r.classSnapshot === classFilter;
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;

    return matchesSearch && matchesClass && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge variant="success" size="sm" dot>PAID</Badge>;
      case "PARTIALLY_PAID":
        return <Badge variant="warning" size="sm" dot>PARTIAL</Badge>;
      case "WAIVED":
        return <Badge variant="purple" size="sm" dot>WAIVED</Badge>;
      default:
        return <Badge variant="danger" size="sm" dot>UNPAID</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            leftIcon={<Search className="w-4 h-4" />}
          />

          <Select
            label="Filter Class"
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { label: "All Classes", value: "ALL" },
              ...classOptions.map((c) => ({ label: c, value: c })),
            ]}
          />

          <Select
            label="Filter Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { label: "All Statuses", value: "ALL" },
              { label: "Paid Only", value: "PAID" },
              { label: "Partially Paid", value: "PARTIALLY_PAID" },
              { label: "Unpaid Only", value: "UNPAID" },
              { label: "Waived Only", value: "WAIVED" },
            ]}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-500 font-medium">
            Showing {filtered.length} of {records.length} students {classFilter !== "ALL" ? `in ${classFilter}` : ""}
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              leftIcon={<FileText className="w-3.5 h-3.5 text-rose-600" />}
              className="text-xs font-semibold"
            >
              Export PDF {classFilter !== "ALL" ? `(${classFilter})` : ""}
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">Student ID</th>
                <th className="py-3.5 px-4">Student Name</th>
                <th className="py-3.5 px-4">Class</th>
                <th className="py-3.5 px-4">Monthly Fee</th>
                <th className="py-3.5 px-4">Paid</th>
                <th className="py-3.5 px-4">Balance</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Last Payment</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No students match the criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((r) => (
                  <tr key={r.feeRecordId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {r.studentId}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      {r.studentNameSnapshot}
                    </td>
                    <td className="py-3.5 px-4">
                      {r.classSnapshot} {r.sectionSnapshot}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {currencySymbol} {r.monthlyFee.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">
                      {currencySymbol} {r.totalPaid.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-rose-700">
                      {currencySymbol} {r.balance.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(r.status)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                      {r.lastPaymentDate ? formatDisplayDate(r.lastPaymentDate) : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDetails(r)}
                          className="text-xs px-2.5 py-1 text-slate-600 hover:text-indigo-600"
                        >
                          View
                        </Button>
                        {r.status !== "PAID" && r.status !== "WAIVED" && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onRecordPayment(r)}
                            className="text-xs px-2.5 py-1 font-bold"
                          >
                            Pay
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {paginated.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200 text-xs">
            No students found.
          </div>
        ) : (
          paginated.map((r) => (
            <div
              key={r.feeRecordId}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-base text-slate-900">{r.studentNameSnapshot}</h4>
                  <p className="text-xs text-slate-500 font-mono">
                    {r.studentId} • {r.classSnapshot} {r.sectionSnapshot}
                  </p>
                </div>
                <div>{getStatusBadge(r.status)}</div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Monthly Fee</span>
                  <strong className="text-slate-800">{currencySymbol} {r.monthlyFee.toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Paid</span>
                  <strong className="text-emerald-700">{currencySymbol} {r.totalPaid.toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Balance</span>
                  <strong className="text-rose-700">{currencySymbol} {r.balance.toLocaleString()}</strong>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Last: {r.lastPaymentDate ? formatDisplayDate(r.lastPaymentDate) : "None"}</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(r)}
                    className="text-xs px-3 py-1.5"
                  >
                    View
                  </Button>
                  {r.status !== "PAID" && r.status !== "WAIVED" && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onRecordPayment(r)}
                      className="text-xs px-3 py-1.5 font-bold"
                    >
                      Record Payment
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {filtered.length > pageSize && (
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} students
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="font-semibold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
