export type StudentStatus = 'ACTIVE' | 'INACTIVE';

export interface Student {
  studentId: string; // Unique Primary ID (e.g. STU001)
  fullName: string;
  class: string;     // e.g. "Grade 10"
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
  class: string;
  email: string;     // Required for notifications
  phone?: string;
  photoUrl?: string;
  qrCodeValue?: string;
  status: StudentStatus;
}