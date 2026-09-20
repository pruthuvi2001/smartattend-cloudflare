"use client";

import React, { useState } from "react";
import { DailyAttendanceRow } from "@/types/attendance";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Search, Sparkles, Filter, X } from "lucide-react";
import { formatDisplayDate } from "@/lib/utils/dateUtils";

export interface AttendanceTableProps {
  rows: DailyAttendanceRow[];
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({ rows }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [classFilter, setClassFilter] = useState("ALL");
  const [studentFilter, setStudentFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Extract unique classes
  const classes = Array.from(new Set(rows.map((r) => r.class))).filter(Boolean).sort();

  // Extract students for the student-filter dropdown (optionally scoped to selected class)
  const availableStudents = Array.from(
    new Map(
      rows
        .filter((r) => classFilter === "ALL" || r.class === classFilter)
        .map((r) => [r.studentId, { id: r.studentId, name: r.fullName, class: r.class }])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const filtered = rows.filter((r) => {
    // Search text
    const matchesSearch =
      r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.studentId.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;

    // Class filter
    const matchesClass = classFilter === "ALL" || r.class === classFilter;

    // Specific student filter
    const matchesStudent =
      studentFilter === "ALL" || r.studentId.toUpperCase() === studentFilter.toUpperCase();

    // Date range filter
    const matchesStartDate = !startDate || r.date >= startDate;
    const matchesEndDate = !endDate || r.date <= endDate;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesClass &&
      matchesStudent &&
      matchesStartDate &&
      matchesEndDate
    );
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setClassFilter("ALL");
    setStudentFilter("ALL");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchTerm ||
    statusFilter !== "ALL" ||
    classFilter !== "ALL" ||
    studentFilter !== "ALL" ||
    startDate ||
    endDate;

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar (Hidden on print) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 no-print">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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
            label="Filter by Class"
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setStudentFilter("ALL"); // reset student filter when class changes
              setCurrentPage(1);
            }}
            options={[
              { label: "All Classes", value: "ALL" },
              ...classes.map((c) => ({ label: c, value: c })),
            ]}
          />

          <Select
            label="Filter by Student"
            value={studentFilter}
            onChange={(e) => {
              setStudentFilter(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { label: "All Students", value: "ALL" },
              ...availableStudents.map((s) => ({
                label: `${s.name} (${s.id})`,
                value: s.id,
              })),
            ]}
          />

          <Select
            label="Filter by Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { label: "All Statuses", value: "ALL" },
              { label: "Present Only", value: "PRESENT" },
              { label: "Absent Only", value: "ABSENT" },
              { label: "Late Only", value: "LATE" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-2 border-t border-slate-100">
          <div>
            <Input
              label="From Date"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div>
            <Input
              label="To Date"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                leftIcon={<X className="w-3.5 h-3.5" />}
                className="text-slate-600 hover:text-slate-900"
              >
                Clear Filters
              </Button>
            )}
            <span className="text-xs font-semibold text-slate-500 ml-auto">
              {filtered.length} record{filtered.length === 1 ? "" : "s"} found
            </span>
          </div>
        </div>
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
                <th className="py-3.5 px-4">Class &amp; Section</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Time Marked</th>
                <th className="py-3.5 px-4">Marked By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No attendance records found matching current filters.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => {
                  const isPresent = row.status === "PRESENT" || row.status === "LATE";
                  return (
                    <tr
                      key={`${row.studentId}_${row.date}_${idx}`}
                      className="hover:bg-slate-50 transition-colors"
                    >
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
                        <span className="font-semibold text-slate-800">{row.class}</span>
                        {row.section && (
                          <span className="text-slate-400"> - {row.section}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant={isPresent ? "success" : "danger"}
                            size="sm"
                            dot
                          >
                            {row.status}
                          </Badge>

                          {row.autoMarked && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200"
                              title="Automatically marked absent by scheduled timetable window"
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              Auto
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {row.timeFormatted || "--:-- --"}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {row.markedByName || (row.autoMarked ? "System (Auto)" : "System")}
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
