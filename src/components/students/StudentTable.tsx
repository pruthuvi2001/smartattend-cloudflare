"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Student } from "@/types/student";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Search, Eye, Edit, UserCheck, UserX, QrCode } from "lucide-react";

export interface StudentTableProps {
  students: Student[];
  onEdit: (student: Student) => void;
  onToggleStatus: (studentId: string, currentStatus: "ACTIVE" | "INACTIVE") => void;
}

export const StudentTable: React.FC<StudentTableProps> = ({
  students,
  onEdit,
  onToggleStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Extract unique classes
  const classes = Array.from(new Set(students.map((s) => s.class))).sort();

  // Filter students
  const filtered = students.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.qrCodeValue.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClass = classFilter === "ALL" || s.class === classFilter;
    const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;

    return matchesSearch && matchesClass && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedStudents = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <Input
          placeholder="Search by ID, name, or QR..."
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
            { label: "Active Only", value: "ACTIVE" },
            { label: "Inactive Only", value: "INACTIVE" },
          ]}
        />
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">Student ID</th>
                <th className="py-3.5 px-4">Full Name</th>
                <th className="py-3.5 px-4">Class & Section</th>
                <th className="py-3.5 px-4">QR Payload</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No students match the criteria.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((s) => (
                  <tr key={s.studentId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {s.studentId}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {s.fullName.charAt(0)}
                        </div>
                        <span>{s.fullName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {s.qrCodeValue}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={s.status === "ACTIVE" ? "success" : "danger"}
                        size="sm"
                        dot
                      >
                        {s.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/students/${s.studentId}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                          title="View Profile & QR Badge"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => onEdit(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                          title="Edit Student"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onToggleStatus(s.studentId, s.status)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            s.status === "ACTIVE"
                              ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                          }`}
                          title={s.status === "ACTIVE" ? "Deactivate Student" : "Activate Student"}
                        >
                          {s.status === "ACTIVE" ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filtered.length > pageSize && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
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
    </div>
  );
};
