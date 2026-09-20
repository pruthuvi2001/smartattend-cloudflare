import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

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

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.EMAIL_FROM || `"SmartAttend Academy" <notifications@smartattend.edu>`;

    // If SMTP credentials are not configured, simulate delivery in development/demo mode
    if (!host || !user || !pass) {
      console.log("==================================================");
      console.log("📧 [EMAIL NOTIFICATION DISPATCHED - SIMULATION]");
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log("Status: Delivered (Mock mode - configure SMTP_* in .env.local to send live emails)");
      console.log("==================================================");

      return NextResponse.json({
        success: true,
        mocked: true,
        message: "Email queued in simulated mode. Add SMTP settings in .env.local for live dispatch.",
      });
    }

    // Configure live nodemailer transporter
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
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error("Email dispatch failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to dispatch email." },
      { status: 500 }
    );
  }
}
