"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  getStudents,
  addStudent,
  updateStudent,
  toggleStudentStatus,
  clearAllStudents,
} from "@/lib/students/studentService";
import { Student, StudentFormData } from "@/types/student";
import { StudentTable } from "@/components/students/StudentTable";
import { StudentForm } from "@/components/students/StudentForm";
import { CsvImportModal } from "@/components/students/CsvImportModal";
import { MissingEmailBanner } from "@/components/students/MissingEmailBanner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { exportStudentsToCsv } from "@/lib/utils/csvExport";
import { UserPlus, Upload, Download, Sparkles, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

import { autoMigrateLegacyClasses } from "@/lib/migration/classMigration";

export default function StudentsPage() {
  const { isAdmin } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const toast = useToast();

  const loadStudents = async () => {
    try {
      setLoading(true);
      await autoMigrateLegacyClasses();
      const list = await getStudents();
      setStudents(list);
    } catch (err) {
      console.error("Error loading students:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleAddStudent = async (formData: StudentFormData) => {
    setFormLoading(true);
    try {
      const created = await addStudent(formData);
      toast.success("Student Registered", `${created.fullName} (${created.studentId}) registered.`);
      setAddModalOpen(false);
      await loadStudents();
    } catch (err: any) {
      toast.error("Registration Error", err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditStudent = async (formData: StudentFormData) => {
    if (!editingStudent) return;
    setFormLoading(true);
    try {
      await updateStudent(editingStudent.studentId, formData);
      toast.success("Student Updated", `Saved changes for ${editingStudent.fullName}.`);
      setEditModalOpen(false);
      setEditingStudent(null);
      await loadStudents();
    } catch (err: any) {
      toast.error("Update Error", err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (studentId: string, currentStatus: "ACTIVE" | "INACTIVE") => {
    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await toggleStudentStatus(studentId, nextStatus);
      toast.info(
        "Status Changed",
        `Student ${studentId} is now ${nextStatus}`
      );
      await loadStudents();
    } catch (err: any) {
      toast.error("Error", err.message);
    }
  };

  const handleBatchImport = async (parsedList: StudentFormData[]): Promise<number> => {
    let count = 0;
    for (const item of parsedList) {
      try {
        await addStudent(item);
        count++;
      } catch (e) {
        console.debug("Skip duplicate during import:", e);
      }
    }
    await loadStudents();
    return count;
  };

  const handleExportCsv = () => {
    if (students.length === 0) {
      toast.warning("No Students", "Student roster is currently empty.");
      return;
    }
    exportStudentsToCsv(students, `students_roster_${new Date().toISOString().substring(0, 10)}.csv`);
    toast.success("Export Downloaded", "Students CSV saved.");
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Student Directory
              </h1>
              <p className="text-xs text-slate-500">
                Manage registered students, configure QR codes, and generate printable ID badges.
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Export CSV
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportModalOpen(true)}
                leftIcon={<Upload className="w-3.5 h-3.5" />}
              >
                Import CSV
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setAddModalOpen(true)}
                leftIcon={<UserPlus className="w-3.5 h-3.5" />}
              >
                Add Student
              </Button>
            </div>
          </div>

          {/* Missing Email Migration Banner */}
          <MissingEmailBanner students={students} onUpdated={loadStudents} />

          {/* Table */}
          <StudentTable
            students={students}
            onEdit={(student) => {
              setEditingStudent(student);
              setEditModalOpen(true);
            }}
            onToggleStatus={handleToggleStatus}
          />

          {/* Add Student Modal */}
          <Modal
            isOpen={addModalOpen}
            onClose={() => setAddModalOpen(false)}
            title="Register New Student"
            description="Enter student information and assign a unique physical card QR code value."
            maxWidth="lg"
          >
            <StudentForm
              onSubmit={handleAddStudent}
              onCancel={() => setAddModalOpen(false)}
              isLoading={formLoading}
            />
          </Modal>

          {/* Edit Student Modal */}
          <Modal
            isOpen={editModalOpen}
            onClose={() => {
              setEditModalOpen(false);
              setEditingStudent(null);
            }}
            title="Edit Student Information"
            description="Update student academic profile and QR code assignment."
            maxWidth="lg"
          >
            {editingStudent && (
              <StudentForm
                initialData={editingStudent}
                onSubmit={handleEditStudent}
                onCancel={() => {
                  setEditModalOpen(false);
                  setEditingStudent(null);
                }}
                isLoading={formLoading}
              />
            )}
          </Modal>

          {/* CSV Import Modal */}
          <CsvImportModal
            isOpen={importModalOpen}
            onClose={() => setImportModalOpen(false)}
            onImport={handleBatchImport}
          />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
