export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

export type AttendanceMethod = 'QR_SCAN' | 'MANUAL';

export interface AttendanceRecord {
  attendanceId: string;        // Deterministic format: `${studentId}_${date}`
  studentId: string;
  studentNameSnapshot: string;
  classSnapshot: string;
  sectionSnapshot?: string;
  date: string;                // Normalized YYYY-MM-DD in institution timezone
  timestamp: string;           // ISO 8601 string or epoch
  timeFormatted: string;       // Formatted 12-hour string (e.g., "08:32 AM")
  status: AttendanceStatus;
  markedBy: string;            // Staff UID or email
  markedByName: string;        // Staff Display Name
  method: AttendanceMethod;
  deviceId?: string;
  autoMarked?: boolean;        // True if automatically marked by scheduled time window evaluator
  createdAt: string;
}

export interface DailyAttendanceRow {
  studentId: string;
  fullName: string;
  class: string;
  section?: string;
  status: AttendanceStatus;
  timeFormatted?: string;
  markedByName?: string;
  method?: AttendanceMethod;
  autoMarked?: boolean;        // True if automatically marked
  date: string;
}

export interface AttendanceStats {
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendanceRate: number; // percentage 0 to 100
}

export interface SessionScanItem {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  status: 'SUCCESS' | 'ALREADY_MARKED' | 'NOT_FOUND' | 'INACTIVE' | 'ERROR';
  message: string;
  time: string;
}