export type StudentStatus = 'ACTIVE' | 'INACTIVE';

export interface Student {
  studentId: string; // Unique Primary ID (e.g. STU001)
  fullName: string;
  class?: string;    // Legacy plain string (e.g. "Grade 10") - maintained for backwards compatibility
  classIds: string[]; // Linked Class Entity IDs (e.g. ["grade-10", "math-adv"])
  classDisplayNames?: string[]; // Display names corresponding to classIds
  email: string;     // Required for notifications
  phone?: string;
  photoUrl?: string;
  qrCodeValue: string; // Unique QR payload string
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StudentFormData {
  studentId: string;
  fullName: string;
  class?: string;    // Legacy fallback
  classIds?: string[]; // Linked Class Entity IDs
  classDisplayNames?: string[];
  email: string;     // Required for notifications
  phone?: string;
  photoUrl?: string;
  qrCodeValue?: string;
  status: StudentStatus;
}