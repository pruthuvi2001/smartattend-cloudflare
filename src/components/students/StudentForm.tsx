"use client";

import React, { useState } from "react";
import { Student, StudentFormData } from "@/types/student";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ClassPicker } from "./ClassPicker";

export interface StudentFormProps {
  initialData?: Student;
  onSubmit: (formData: StudentFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const StudentForm: React.FC<StudentFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [studentId, setStudentId] = useState(initialData?.studentId || "");
  const [fullName, setFullName] = useState(initialData?.fullName || "");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(
    initialData?.classIds && initialData.classIds.length > 0
      ? initialData.classIds
      : [initialData?.class ? initialData.class.toLowerCase().replace(/\s+/g, "-") : "grade-10"]
  );
  const [selectedDisplayNames, setSelectedDisplayNames] = useState<string[]>(
    initialData?.classDisplayNames && initialData.classDisplayNames.length > 0
      ? initialData.classDisplayNames
      : [initialData?.class || "Grade 10"]
  );
  const [email, setEmail] = useState(initialData?.email || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [qrCodeValue, setQrCodeValue] = useState(initialData?.qrCodeValue || "");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">(initialData?.status || "ACTIVE");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!studentId.trim() || !fullName.trim()) {
      setError("Student ID and Full Name are required.");
      return;
    }

    if (selectedClassIds.length === 0) {
      setError("Please select at least one class for the student.");
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email address is required to send attendance and payment notifications.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address (e.g., student@example.com).");
      return;
    }

    const primaryClassName = selectedDisplayNames[0] || "Grade 10";

    try {
      await onSubmit({
        studentId: studentId.trim().toUpperCase(),
        fullName: fullName.trim(),
        class: primaryClassName,
        classIds: selectedClassIds,
        classDisplayNames: selectedDisplayNames,
        email: trimmedEmail,
        phone: phone.trim(),
        qrCodeValue: qrCodeValue.trim() || `{"std_ID":"${studentId.trim().toUpperCase()}"}`,
        status,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to save student record.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-lg border border-rose-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Student ID *"
          placeholder="e.g. STU001"
          value={studentId}
          onChange={(e) => {
            const val = e.target.value;
            setStudentId(val);
            if (!initialData) {
              setQrCodeValue(val ? `{"std_ID":"${val.toUpperCase()}"}` : "");
            }
          }}
          disabled={!!initialData}
          required
        />

        <Input
          label="Full Name *"
          placeholder="e.g. John Silva"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>

      <div>
        <ClassPicker
          selectedClassIds={selectedClassIds}
          onChange={(ids, names) => {
            setSelectedClassIds(ids);
            setSelectedDisplayNames(names);
          }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Email Address *"
          type="email"
          placeholder="student@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          helperText="Required for automated attendance and payment notifications"
        />

        <Input
          label="Phone (Optional)"
          placeholder="+94 77 123 4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="QR Code Value"
          placeholder="Defaults to Student ID"
          value={qrCodeValue}
          onChange={(e) => setQrCodeValue(e.target.value)}
          helperText='Auto-generated as {"std_ID":"..."} — edit only if using a custom format.'
        />

        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
          options={[
            { label: "ACTIVE (Can Mark Attendance)", value: "ACTIVE" },
            { label: "INACTIVE (Suspended / Left)", value: "INACTIVE" },
          ]}
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={isLoading}>
          {initialData ? "Save Changes" : "Register Student"}
        </Button>
      </div>
    </form>
  );
};