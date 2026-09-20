"use client";

import React, { useState } from "react";
import { Student } from "@/types/student";
import { AlertTriangle, Mail, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { updateStudent } from "@/lib/students/studentService";

interface MissingEmailBannerProps {
  students: Student[];
  onUpdated: () => void;
}

export const MissingEmailBanner: React.FC<MissingEmailBannerProps> = ({
  students,
  onUpdated,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmails, setEditingEmails] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successIds, setSuccessIds] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const missingStudents = students.filter(
    (s) => !s.email || !s.email.trim() || !emailRegex.test(s.email.trim())
  );

  if (missingStudents.length === 0) {
    return null;
  }

  const handleEmailChange = (studentId: string, value: string) => {
    setEditingEmails((prev) => ({ ...prev, [studentId]: value }));
  };

  const handleSaveEmail = async (student: Student) => {
    const emailToSave = (editingEmails[student.studentId] || "").trim();
    if (!emailToSave || !emailRegex.test(emailToSave)) {
      setErrorMsg(`Please enter a valid email for ${student.fullName}`);
      return;
    }

    try {
      setErrorMsg(null);
      setSavingId(student.studentId);
      await updateStudent(student.studentId, { email: emailToSave });
      setSuccessIds((prev) => new Set(prev).add(student.studentId));
      onUpdated();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to update email.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-amber-900 text-sm">
                Data Migration Required: {missingStudents.length} Student{missingStudents.length > 1 ? "s" : ""} Missing Email
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Email addresses are now required to deliver instant attendance alerts and payment receipts.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            className="bg-amber-600 hover:bg-amber-700 text-white border-none shrink-0"
            onClick={() => setIsModalOpen(true)}
          >
            <Mail className="w-4 h-4 mr-1.5" />
            Update Missing Emails ({missingStudents.length})
          </Button>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Resolve Missing Student Emails"
      >
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          <p className="text-xs text-slate-500">
            Please provide an email address for each student below so they receive attendance and payment notifications.
          </p>

          {errorMsg && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-lg border border-rose-200">
              {errorMsg}
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {missingStudents.map((student) => {
              const isSaved = successIds.has(student.studentId);
              const currentVal = editingEmails[student.studentId] ?? student.email ?? "";

              return (
                <div
                  key={student.studentId}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {student.studentId}
                      </span>
                      <span className="font-medium text-sm text-slate-900">
                        {student.fullName}
                      </span>
                      <span className="text-xs text-slate-400">
                        ({student.class})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="w-full sm:w-64">
                      <Input
                        type="email"
                        placeholder="student@example.com"
                        value={currentVal}
                        onChange={(e) => handleEmailChange(student.studentId, e.target.value)}
                        disabled={savingId === student.studentId || isSaved}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant={isSaved ? "outline" : "primary"}
                      onClick={() => handleSaveEmail(student)}
                      isLoading={savingId === student.studentId}
                      disabled={isSaved}
                      className={isSaved ? "text-emerald-600 border-emerald-300" : ""}
                    >
                      {isSaved ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-500" />
                          Saved
                        </>
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </>
  );
};
