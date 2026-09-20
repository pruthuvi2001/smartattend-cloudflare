import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function GET() {
  const resendKey = process.env.RESEND_API_KEY;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const isResendConfigured = Boolean(resendKey);
  const isSmtpConfigured = Boolean(host && user && pass);

  return NextResponse.json({
    configured: isResendConfigured || isSmtpConfigured,
    provider: isResendConfigured ? "resend" : isSmtpConfigured ? "smtp" : "none",
    smtpHost: host || null,
    smtpUser: user || null,
    emailFrom: process.env.EMAIL_FROM || "notifications@smartattend.edu",
    message: isResendConfigured || isSmtpConfigured
      ? "Email dispatch service is fully configured for live delivery."
      : "Email service is running in SIMULATION/MOCK mode. Add SMTP_* or RESEND_API_KEY variables in environment settings to send live emails.",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, subject, html, text } = body;

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, and content." },
        { status: 400 }
      );
    }

    const resendKey = process.env.RESEND_API_KEY;
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.EMAIL_FROM || `"SmartAttend Academy" <notifications@smartattend.edu>`;

    // Option A: Resend API Integration
    if (resendKey) {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html,
          text,
        }),
      });

      const resendData = await resendRes.json();
      if (!resendRes.ok) {
        throw new Error(resendData.message || "Resend API delivery failed.");
      }

      return NextResponse.json({
        success: true,
        provider: "resend",
        messageId: resendData.id,
      });
    }

    // Option B: Standard SMTP / Gmail Integration
    if (host && user && pass) {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });

      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text: text || "SmartAttend Automated Notification",
        html: html || undefined,
      });

      return NextResponse.json({
        success: true,
        provider: "smtp",
        messageId: info.messageId,
      });
    }

    // Simulation / Fallback Mode (No credentials set)
    console.warn("==================================================");
    console.warn("⚠️ [EMAIL NOTIFICATION DISPATCH - SIMULATION MODE]");
    console.warn(`To: ${to}`);
    console.warn(`Subject: ${subject}`);
    console.warn("Status: Simulated (Set SMTP_HOST/SMTP_USER/SMTP_PASS or RESEND_API_KEY in .env.local / Vercel)");
    console.warn("==================================================");

    return NextResponse.json({
      success: true,
      mocked: true,
      warning: "Email dispatched in simulation mode. Configure SMTP_* or RESEND_API_KEY in environment variables for live delivery.",
    });
  } catch (error: any) {
    console.error("❌ Email dispatch failed error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to dispatch email." },
      { status: 500 }
    );
  }
}
