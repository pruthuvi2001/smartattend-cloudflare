"use client";

import React, { useState } from "react";
import { DailyAttendanceRow } from "@/types/attendance";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Search, CheckCircle2, XCircle, Clock } from "lucide-react";
import { formatDisplayDate } from "@/lib/utils/dateUtils";

export interface AttendanceTableProps {
  rows: DailyAttendanceRow[];
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({ rows }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [classFilter, setClassFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const classes = Array.from(new Set(rows.map((r) => r.class))).sort();

  const filtered = rows.filter((r) => {
    const matchesSearch =
      r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.studentId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    const matchesClass = classFilter === "ALL" || r.class === classFilter;

    return matchesSearch && matchesStatus && matchesClass;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar (Hidden on print) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
        <Input
          placeholder="Search student or ID..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          leftIcon={<Search className="w-4 h-4" />}
        />

        <Select
          value={classFilter}
          onChange={(e) => {
            setClassFilter(e.target.value);
            setCurrentPage(1);
          }}
          options={[
            { label: "All Classes", value: "ALL" },
            ...classes.map((c) => ({ label: c, value: c })),
          ]}
        />

        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          options={[
            { label: "All Statuses", value: "ALL" },
            { label: "Present Only", value: "PRESENT" },
            { label: "Absent Only", value: "ABSENT" },
          ]}
        />
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Student ID</th>
                <th className="py-3.5 px-4">Full Name</th>
                <th className="py-3.5 px-4">Class & Section</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Time Marked</th>
                <th className="py-3.5 px-4">Marked By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No attendance records found for this filter.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => {
                  const isPresent = row.status === "PRESENT" || row.status === "LATE";
                  return (
                    <tr key={`${row.studentId}_${row.date}_${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                        {formatDisplayDate(row.date)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {row.studentId}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        {row.fullName}
                      </td>
                      <td className="py-3.5 px-4">
                        {row.class} - <span className="font-semibold">{row.section}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={isPresent ? "success" : "danger"}
                          size="sm"
                          dot
                        >
                          {row.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {row.timeFormatted || "--:-- --"}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {row.markedByName || "System"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls (Hidden on print) */}
        {filtered.length > pageSize && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 no-print">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} records
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
    </div>
  );
};
