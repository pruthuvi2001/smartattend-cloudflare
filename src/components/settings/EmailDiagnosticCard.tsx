"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { Mail, CheckCircle2, AlertTriangle, Send, RefreshCw, Server, Key } from "lucide-react";
import { checkEmailServiceStatus, sendDiagnosticTestEmail, EmailServiceStatus } from "@/lib/notifications/emailService";

export function EmailDiagnosticCard() {
  const [status, setStatus] = useState<EmailServiceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const toast = useToast();

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await checkEmailServiceStatus();
      setStatus(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim()) {
      toast.error("Required Field", "Please enter a recipient email address.");
      return;
    }

    setSendingTest(true);
    try {
      const res = await sendDiagnosticTestEmail(testEmail.trim());
      if (res.success) {
        if (res.mocked) {
          toast.warning("Simulation Mode Active", res.message);
        } else {
          toast.success("Test Email Dispatched!", res.message);
        }
      } else {
        toast.error("Delivery Failed", res.message);
      }
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <Card className="border-indigo-100 bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2 text-slate-900">
            <Mail className="w-4 h-4 text-indigo-600" />
            Email Notification Transport Diagnostics
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStatus}
            isLoading={loading}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
          </Button>
        </div>
        <CardDescription>
          Verify backend SMTP / Resend credentials status for student attendance & payment receipt emails.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Indicator Banner */}
        {loading ? (
          <div className="p-4 rounded-xl bg-slate-50 animate-pulse text-xs text-slate-500">
            Checking email transport status...
          </div>
        ) : status?.configured ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold flex items-center gap-2">
                Live Email Dispatch Configured ({status.provider.toUpperCase()})
              </h4>
              <p className="text-[12px] text-emerald-800 leading-relaxed">
                {status.message}
              </p>

              <div className="mt-2 text-[11px] text-emerald-900/80 font-mono space-y-0.5">
                <div>From Address: {status.emailFrom}</div>
                {status.smtpHost && <div>SMTP Host: {status.smtpHost} ({status.smtpUser})</div>}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold">
                Simulation / Mock Mode Active (No Live Emails Will Be Sent)
              </h4>
              <p className="text-[12px] text-amber-800 leading-relaxed">
                SMTP or Resend credentials are missing from environment variables (`.env.local` or Vercel). Emails are currently logged to server output rather than delivered to real inboxes.
              </p>
            </div>
          </div>
        )}

        {/* Configuration Instructions */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-indigo-600" />
            How to Enable Live Delivery:
          </h4>
          <p className="text-[11px] text-slate-600 leading-normal">
            Add any of the following environment variables to your <strong>`.env.local`</strong> file or <strong>Vercel Project Environment Variables</strong>:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono mt-1">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
              <div className="font-bold text-indigo-700 flex items-center gap-1">
                <Key className="w-3 h-3" /> Standard SMTP (e.g. Gmail):
              </div>
              <div className="text-slate-600">SMTP_HOST=smtp.gmail.com</div>
              <div className="text-slate-600">SMTP_PORT=587</div>
              <div className="text-slate-600">SMTP_USER=your-email@gmail.com</div>
              <div className="text-slate-600">SMTP_PASS=your-16-char-app-password</div>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
              <div className="font-bold text-emerald-700 flex items-center gap-1">
                <Key className="w-3 h-3" /> Resend API (Recommended):
              </div>
              <div className="text-slate-600">RESEND_API_KEY=re_123456789...</div>
              <div className="text-slate-600">EMAIL_FROM=&quot;SmartAttend&quot; &lt;onboarding@resend.dev&gt;</div>
            </div>
          </div>
        </div>

        {/* Test Email Form */}
        <form onSubmit={handleSendTest} className="flex flex-col sm:flex-row items-end gap-3 pt-2">
          <div className="flex-1 w-full">
            <Input
              label="Recipient Email for Diagnostic Test"
              type="email"
              placeholder="e.g. your-email@gmail.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            isLoading={sendingTest}
            className="w-full sm:w-auto shrink-0 gap-1.5 font-semibold"
          >
            <Send className="w-3.5 h-3.5" /> Send Test Email
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
