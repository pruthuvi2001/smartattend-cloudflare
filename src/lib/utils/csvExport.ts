import { DailyAttendanceRow } from "@/types/attendance";
import { Student } from "@/types/student";

function escapeCsvField(field: unknown): string {
  if (field === null || field === undefined) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Exports daily attendance rows to a properly formatted CSV file.
 */
export function exportAttendanceToCsv(rows: DailyAttendanceRow[], filename: string = "attendance-report.csv") {
  const headers = [
    "Date",
    "Student ID",
    "Student Name",
    "Class",
    "Status",
    "Time Marked",
    "Marked By",
    "Method"
  ];

  const csvRows = [headers.join(',')];

  rows.forEach((row) => {
    const line = [
      escapeCsvField(row.date),
      escapeCsvField(row.studentId),
      escapeCsvField(row.fullName),
      escapeCsvField(row.class),
      escapeCsvField(row.status),
      escapeCsvField(row.timeFormatted || '--:--'),
      escapeCsvField(row.markedByName || 'System'),
      escapeCsvField(row.method || 'N/A')
    ];
    csvRows.push(line.join(','));
  });

  const csvContent = "\uFEFF" + csvRows.join('\r\n'); // UTF-8 BOM for Excel
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports student roster to CSV
 */
export function exportStudentsToCsv(students: Student[], filename: string = "students-list.csv") {
  const headers = [
    "Student ID",
    "Full Name",
    "Class",
    "QR Code Value",
    "Email",
    "Phone",
    "Status",
    "Created Date"
  ];

  const csvRows = [headers.join(',')];

  students.forEach((s) => {
    const line = [
      escapeCsvField(s.studentId),
      escapeCsvField(s.fullName),
      escapeCsvField(s.class),
      escapeCsvField(s.qrCodeValue),
      escapeCsvField(s.email || ''),
      escapeCsvField(s.phone || ''),
      escapeCsvField(s.status),
      escapeCsvField(s.createdAt ? s.createdAt.substring(0, 10) : '')
    ];
    csvRows.push(line.join(','));
  });

  const csvContent = "\uFEFF" + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}