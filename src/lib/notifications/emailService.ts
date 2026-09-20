import { Student } from "@/types/student";
import { AttendanceRecord } from "@/types/attendance";
import { MonthlyFeeRecord, PaymentTransaction } from "@/types/payment";

interface SendAttendanceEmailOptions {
  student: Student;
  record: AttendanceRecord;
  schoolName?: string;
}

interface SendPaymentEmailOptions {
  student: Student;
  feeRecord: MonthlyFeeRecord;
  transaction: PaymentTransaction;
  schoolName?: string;
  currencySymbol?: string;
}

/**
 * Dispatch an attendance status notification email to the student.
 * Non-blocking fire-and-forget.
 */
export async function sendAttendanceEmailNotification(
  opts: SendAttendanceEmailOptions
): Promise<void> {
  const { student, record, schoolName = "SmartAttend Academy" } = opts;
  if (!student.email || !student.email.trim()) {
    return;
  }

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    PRESENT: { bg: "#ecfdf5", text: "#065f46", label: "Present" },
    ABSENT: { bg: "#fef2f2", text: "#991b1b", label: "Absent" },
    LATE: { bg: "#fffbeb", text: "#92400e", label: "Late" },
  };

  const statusStyle = statusColors[record.status] || {
    bg: "#f1f5f9",
    text: "#334155",
    label: record.status,
  };

  const subject = `Attendance Notice: ${statusStyle.label.toUpperCase()} on ${record.date} - ${schoolName}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #4f46e5; padding: 24px; text-align: center;">
        <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">${schoolName}</h2>
        <p style="color: #e0e7ff; margin: 4px 0 0 0; font-size: 13px;">Automated Attendance Verification</p>
      </div>

      <div style="padding: 24px;">
        <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
          Dear <strong>${student.fullName}</strong>,
        </p>

        <p style="font-size: 14px; color: #475569; line-height: 1.5;">
          This is an automated notification regarding your attendance session on <strong>${record.date}</strong>.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Student ID:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">${student.studentId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Class / Grade:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">${record.classSnapshot || student.class}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Date:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">${record.date}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Recorded Time:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">${record.timeFormatted || "--:--"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Marked Method:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">
                ${record.autoMarked ? "Automated Timetable Window" : record.method === "QR_SCAN" ? "QR ID Card Scan" : "Manual Staff Record"}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0 6px 0; color: #64748b; font-weight: 600;">Attendance Status:</td>
              <td style="padding: 10px 0 6px 0; text-align: right;">
                <span style="display: inline-block; background-color: ${statusStyle.bg}; color: ${statusStyle.text}; padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 13px;">
                  ${statusStyle.label} ${record.autoMarked ? "(Auto)" : ""}
                </span>
              </td>
            </tr>
          </table>
        </div>

        ${
          record.status === "ABSENT"
            ? `<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; border-radius: 4px; font-size: 13px; color: #991b1b; margin-bottom: 20px;">
                <strong>Notice:</strong> Your attendance was not recorded during the scheduled session window. If you were present or have an excused absence, please contact the academy administration.
              </div>`
            : ""
        }

        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          This is an automated system notification from ${schoolName}. Please do not reply directly to this email.
        </p>
      </div>
    </div>
  `;

  try {
    const res = await fetch("/api/notifications/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: student.email,
        subject,
        html,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.warn(`[Attendance Email Warning] Server HTTP ${res.status}:`, data?.error || "Dispatch failed");
    } else if (data?.mocked) {
      console.info(`[Attendance Email Simulation] Sent in mock mode for ${student.email}. ${data.warning}`);
    } else {
      console.log(`[Attendance Email Delivered] Sent to ${student.email} (ID: ${data?.messageId || "ok"})`);
    }
  } catch (err) {
    console.warn("Attendance email notification trigger error:", err);
  }
}

/**
 * Dispatch a payment receipt notification email to the student.
 * Non-blocking fire-and-forget.
 */
export async function sendPaymentEmailNotification(
  opts: SendPaymentEmailOptions
): Promise<void> {
  const {
    student,
    feeRecord,
    transaction,
    schoolName = "SmartAttend Academy",
    currencySymbol = "Rs.",
  } = opts;

  if (!student.email || !student.email.trim()) {
    return;
  }

  const subject = `Payment Receipt: ${currencySymbol} ${transaction.amount.toLocaleString()} received - ${schoolName}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #059669; padding: 24px; text-align: center;">
        <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">${schoolName}</h2>
        <p style="color: #d1fae5; margin: 4px 0 0 0; font-size: 13px;">Official Payment Receipt</p>
      </div>

      <div style="padding: 24px;">
        <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
          Dear <strong>${student.fullName}</strong>,
        </p>

        <p style="font-size: 14px; color: #475569; line-height: 1.5;">
          Thank you for your payment. We have successfully received and recorded your payment for the month of <strong>${feeRecord.monthName}</strong>.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Receipt / Payment ID:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right; font-family: monospace;">${transaction.paymentId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Student ID:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">${student.studentId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Month:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">${feeRecord.monthName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Payment Date:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">${transaction.paymentDateFormatted || transaction.paymentDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Payment Method:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">${transaction.paymentMethod}</td>
            </tr>
            ${
              transaction.referenceNumber
                ? `<tr>
                    <td style="padding: 6px 0; color: #64748b;">Reference / Slip #:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">${transaction.referenceNumber}</td>
                  </tr>`
                : ""
            }
            <tr style="border-top: 1px dashed #cbd5e1;">
              <td style="padding: 12px 0 6px 0; color: #065f46; font-weight: 700; font-size: 15px;">Amount Paid:</td>
              <td style="padding: 12px 0 6px 0; font-weight: 700; color: #059669; text-align: right; font-size: 16px;">
                ${currencySymbol} ${transaction.amount.toLocaleString()}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Total Paid This Month:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">${currencySymbol} ${feeRecord.totalPaid.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Remaining Balance:</td>
              <td style="padding: 6px 0; font-weight: 600; color: ${feeRecord.balance > 0 ? "#dc2626" : "#059669"}; text-align: right;">
                ${currencySymbol} ${feeRecord.balance.toLocaleString()}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Status:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #0f172a; text-align: right;">${feeRecord.status}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          This is an official transaction receipt issued by ${schoolName}. Please retain this for your records.
        </p>
      </div>
    </div>
  `;

  try {
    const res = await fetch("/api/notifications/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: student.email,
        subject,
        html,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.warn(`[Payment Email Warning] Server HTTP ${res.status}:`, data?.error || "Dispatch failed");
    } else if (data?.mocked) {
      console.info(`[Payment Email Simulation] Sent in mock mode for ${student.email}. ${data.warning}`);
    } else {
      console.log(`[Payment Email Delivered] Sent to ${student.email} (ID: ${data?.messageId || "ok"})`);
    }
  } catch (err) {
    console.warn("Payment email notification trigger error:", err);
  }
}

export interface EmailServiceStatus {
  configured: boolean;
  provider: "resend" | "smtp" | "none";
  smtpHost: string | null;
  smtpUser: string | null;
  emailFrom: string;
  message: string;
}

/**
 * Diagnostic tool to check backend SMTP / Resend configuration status.
 */
export async function checkEmailServiceStatus(): Promise<EmailServiceStatus> {
  try {
    const res = await fetch("/api/notifications/email", { method: "GET" });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    return {
      configured: false,
      provider: "none",
      smtpHost: null,
      smtpUser: null,
      emailFrom: "notifications@smartattend.edu",
      message: `Failed to check email service status: ${err?.message || "Unknown error"}`,
    };
  }
}

/**
 * Trigger a diagnostic test email to a target email address.
 */
export async function sendDiagnosticTestEmail(toEmail: string): Promise<{ success: boolean; mocked?: boolean; message: string }> {
  try {
    const res = await fetch("/api/notifications/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: toEmail,
        subject: "SmartAttend Diagnostic Test Email",
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4f46e5;">SmartAttend Email Diagnostics</h2>
            <p>If you are reading this email, your email transport settings (SMTP or Resend API) are working properly!</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          </div>
        `,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, message: data.error || "Failed to dispatch test email." };
    }

    if (data.mocked) {
      return {
        success: true,
        mocked: true,
        message: "Email dispatch succeeded in SIMULATION mode. (No environment credentials set).",
      };
    }

    return {
      success: true,
      mocked: false,
      message: `Test email dispatched successfully via ${data.provider.toUpperCase()} (ID: ${data.messageId || "ok"}). Check inbox/spam folder!`,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || "Network error while triggering test email." };
  }
}

