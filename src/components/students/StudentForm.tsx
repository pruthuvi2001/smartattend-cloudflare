"use client";

import React, { useState } from "react";
import { Student, StudentFormData } from "@/types/student";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

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
  const [studentClass, setStudentClass] = useState(initialData?.class || "Grade 10");
  const [section, setSection] = useState(initialData?.section || "A");
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

    try {
      await onSubmit({
        studentId: studentId.trim().toUpperCase(),
        fullName: fullName.trim(),
        class: studentClass.trim(),
        section: section.trim(),
        email: email.trim(),
        phone: phone.trim(),
        qrCodeValue: (qrCodeValue.trim() || studentId.trim()).toUpperCase(),
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
            setStudentId(e.target.value);
            if (!initialData && !qrCodeValue) {
              setQrCodeValue(e.target.value);
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Class / Grade *"
          value={studentClass}
          onChange={(e) => setStudentClass(e.target.value)}
          options={[
            { label: "Grade 10", value: "Grade 10" },
            { label: "Grade 11", value: "Grade 11" },
            { label: "Grade 12", value: "Grade 12" },
            { label: "Grade 13", value: "Grade 13" },
          ]}
        />

        <Input
          label="Section / Stream *"
          placeholder="e.g. A, B, Maths, Bio"
          value={section}
          onChange={(e) => setSection(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Email (Optional)"
          type="email"
          placeholder="student@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          helperText="Unique identifier encoded in the physical card QR."
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
